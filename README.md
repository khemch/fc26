# FC26 tournament tracker (Cloudflare)

Two-player FC26 league: matchdays, results, transfers, team pages, stats.
Static page (`public/index.html`) + a small Worker API (`src/worker.js`) + a D1 database. One shared passcode protects it.

## Deploy (about 5 minutes)
Needs a free Cloudflare account and Node 20+.

```bash
git clone https://github.com/khemch/fc26 && cd fc26
npm install
npx wrangler login
npx wrangler d1 create fc26          # copy the database_id it prints into wrangler.toml
npx wrangler d1 execute fc26 --remote --file=schema.sql
npx wrangler d1 execute fc26 --remote --file=seed.sql    # current league data (42 games, 17 transfers, 36 teams)
npx wrangler secret put PASSCODE     # choose the passcode you and Tigran will share
npx wrangler deploy                  # prints https://fc26.<your-subdomain>.workers.dev
```

Open the URL on both phones, enter the passcode once (it is remembered per device).

## Local test
```bash
echo "PASSCODE=test123" > .dev.vars
npx wrangler d1 execute fc26 --local --file=schema.sql
npx wrangler d1 execute fc26 --local --file=seed.sql
npx wrangler dev
```

## Notes
- Data model: `docs(path, data)` rows with paths `config/main`, `teams/<slug>`, `matches/mdNN-sK`, `transfers/wNN-player-seq`; `meta.rev` bumps on every write and clients poll it every 3 s for live updates.
- Backup: `npx wrangler d1 export fc26 --remote --output=backup.sql`
- The passcode is shared and anyone with it can edit. Rotate it with `wrangler secret put PASSCODE`.
- `artifact/index.html` is the original claude.ai Artifact version.
- Crests come from open logo collections (luukhopman/football-logos, FCLOGO); they belong to their clubs.
