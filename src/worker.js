// FC26 tracker API on Cloudflare Workers + D1. Static files are served by the assets binding.
// Every /api call needs the shared passcode (secret PASSCODE) in the X-Passcode header.
const PATH_OK = /^(config|teams|matches|transfers)\/[A-Za-z0-9_.-]{1,80}$/;
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

async function same(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const xa = new Uint8Array(x), ya = new Uint8Array(y);
  let d = 0; for (let i = 0; i < xa.length; i++) d |= xa[i] ^ ya[i];
  return d === 0;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    if (!env.PASSCODE) return json({ error: 'PASSCODE secret is not set' }, 500);
    const key = req.headers.get('x-passcode') || '';
    if (!(await same(key, env.PASSCODE))) return json({ error: 'unauthorized' }, 401);

    if (url.pathname === '/api/rev' && req.method === 'GET') {
      const r = await env.DB.prepare("SELECT v FROM meta WHERE k='rev'").first();
      return json({ rev: r ? r.v : 0 });
    }
    if (url.pathname === '/api/all' && req.method === 'GET') {
      const [rows, r] = await Promise.all([env.DB.prepare('SELECT path, data FROM docs').all(), env.DB.prepare("SELECT v FROM meta WHERE k='rev'").first()]);
      const docs = {};
      for (const row of rows.results) docs[row.path] = JSON.parse(row.data);
      return json({ rev: r ? r.v : 0, docs });
    }
    if (url.pathname.startsWith('/api/doc/')) {
      const path = decodeURIComponent(url.pathname.slice('/api/doc/'.length));
      if (!PATH_OK.test(path)) return json({ error: 'bad path' }, 400);
      if (req.method === 'PUT') {
        const text = await req.text();
        if (text.length > 20000) return json({ error: 'too large' }, 413);
        let obj; try { obj = JSON.parse(text); } catch (e) { return json({ error: 'bad json' }, 400); }
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return json({ error: 'object required' }, 400);
        await env.DB.batch([
          env.DB.prepare('INSERT INTO docs (path, data, updated) VALUES (?1, ?2, ?3) ON CONFLICT(path) DO UPDATE SET data=?2, updated=?3').bind(path, JSON.stringify(obj), Date.now()),
          env.DB.prepare("UPDATE meta SET v=v+1 WHERE k='rev'"),
        ]);
        return json({ ok: true });
      }
      if (req.method === 'DELETE') {
        await env.DB.batch([
          env.DB.prepare('DELETE FROM docs WHERE path=?1').bind(path),
          env.DB.prepare("UPDATE meta SET v=v+1 WHERE k='rev'"),
        ]);
        return json({ ok: true });
      }
    }
    return json({ error: 'not found' }, 404);
  },
};
