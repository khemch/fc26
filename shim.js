/* Stand-in for the claude.ai runtime: window.claude.use('db') / use('user') backed by the Worker API.
   Live updates by polling /api/rev every 3 s. Shared passcode kept in localStorage. */
(function(){
"use strict";
var KEY='fc26-passcode',docs={},rev=-1,subs=[],started=false,authed=false,pass='';
function getKey(){try{return localStorage.getItem(KEY)||'';}catch(e){return '';}}
function setKey(k){try{localStorage.setItem(KEY,k);}catch(e){}}
function api(path,opt){opt=opt||{};opt.headers=Object.assign({'x-passcode':pass},opt.headers||{});
  return fetch(path,opt).then(function(r){if(r.status===401){authed=false;throw Object.assign(new Error('unauthorized'),{code:'unauthorized'});}if(!r.ok)throw new Error('HTTP '+r.status);return r.json();});}
function ask(msg){return new Promise(function(res){
  var d=document.createElement('div');
  d.style.cssText='position:fixed;inset:0;background:#f2f4f7;display:grid;place-items:center;z-index:999;font:16px system-ui,sans-serif';
  d.innerHTML='<form style="background:#fff;padding:28px;border-radius:8px;box-shadow:inset 0 0 0 1px #e6e6e6;display:grid;gap:12px;width:min(92vw,340px)"><b style="font-size:20px">FC26 Tournament</b><span style="color:#6b6b6b;font-size:14px">'+msg+'</span><input type="password" autocomplete="current-password" required style="padding:10px 12px;border:1px solid #d4d4d4;border-radius:6px;font:inherit"><button style="background:#141414;color:#fff;border:0;border-radius:6px;padding:10px;font:inherit;font-weight:600;cursor:pointer">Enter</button></form>';
  document.body.appendChild(d);var i=d.querySelector('input');i.focus();
  d.querySelector('form').onsubmit=function(e){e.preventDefault();var v=i.value;d.remove();res(v);};
});}
async function login(){
  pass=getKey();var msg='Enter the league passcode.';
  for(;;){
    if(pass){try{await api('/api/rev');authed=true;setKey(pass);return;}catch(e){if(e.code!=='unauthorized')throw e;msg='Wrong passcode, try again.';}}
    pass=await ask(msg);
  }
}
function snapDoc(path){var d=docs[path];return {id:path.split('/').pop(),exists:d!==undefined,data:function(){return JSON.parse(JSON.stringify(d));}};}
function snapColl(c){var out=[];Object.keys(docs).forEach(function(p){if(p.indexOf(c+'/')===0&&p.indexOf('/',c.length+1)<0)out.push(snapDoc(p));});return {docs:out};}
function notify(){subs.forEach(function(s){s();});}
async function pull(){var r=await api('/api/all');rev=r.rev;docs=r.docs;notify();}
function start(){if(started)return;started=true;
  setInterval(async function(){if(document.hidden||!authed)return;try{var r=await api('/api/rev');if(r.rev!==rev)await pull();}catch(e){}},3000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&authed)pull().catch(function(){});});}
var db={
  doc:function(path){return {
    set:function(data){return api('/api/doc/'+encodeURI(path),{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(data)}).then(function(){docs[path]=JSON.parse(JSON.stringify(data));notify();return pull();});},
    delete:function(){return api('/api/doc/'+encodeURI(path),{method:'DELETE'}).then(function(){delete docs[path];notify();return pull();});},
    onSnapshot:function(cb){subs.push(function(){cb(snapDoc(path));});setTimeout(function(){cb(snapDoc(path));},0);}
  };},
  collection:function(c){return {onSnapshot:function(cb){subs.push(function(){cb(snapColl(c));});setTimeout(function(){cb(snapColl(c));},0);}};}
};
window.claude={use:async function(name){
  if(name==='db'){await login();await pull();start();return db;}
  if(name==='user')return {can:function(){return true;}};
  return null;
}};
})();
