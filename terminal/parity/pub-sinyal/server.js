'use strict';
// Visivero Botları — Visivero'nun bot mesajlarını (herkese açık API) izleyen ve Visivero görünümünde gösteren yerel site.
// Bağımlılık yok. Node.js 18+ gerekir.  Çalıştır: node server.js  →  http://localhost:3101
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const argPort = (() => { const i = process.argv.indexOf('--port'); return i > 0 ? process.argv[i + 1] : null; })();
const PORT = Number(argPort || process.env.PORT || 3101);
const HOST = process.env.HOST || '127.0.0.1';
const POLL_MS = Number(process.env.POLL_MS || 8000);
const API = 'https://terminal.visivero.com/api/bot-messages';
const DATA = path.join(__dirname, 'data');
const PUB = path.join(__dirname, 'public');
const BOOT = Date.now();
const KEEP_MS = 26 * 3600e3;
const RAW_CAP = 3000;
const BOTS = ['m1', 'm1-premium', 'fr', 'v3', 'hammer', 'hammer-pro', 'hammer-pro-plus', '1d-hammer-pro', '4s', '4sniper', '1dws', 'div'];
const NAMES = { 'm1': 'M1-A', 'm1-premium': 'M1 Premium', 'fr': 'FR', 'v3': 'V3', 'hammer': 'Hammer', 'hammer-pro': 'Hammer Pro', 'hammer-pro-plus': 'Hammer Pro+', '1d-hammer-pro': '1D Hammer Pro', '4s': '4S', '4sniper': '4S Sniper', '1dws': '1DWS', 'div': 'DIV' };
const log = (...a) => console.log(new Date().toISOString(), ...a);
fs.mkdirSync(DATA, { recursive: true });

// ---------- store ----------
let seq = 0, lastMsg = 0;
const raw = new Map(BOTS.map(b => [b, []]));   // bot -> [{seq,id,t,symbol,dir,text}]
const tsl = new Map(BOTS.map(b => [b, []]));   // bot -> [t]  (24 saatlik sayaç için)
const seen = new Map(BOTS.map(b => [b, new Set()]));

function add(bot, m, persist) {
  const ids = seen.get(bot); if (ids.has(m.id)) return false;
  const t = Date.parse(m.createdAt); if (!Number.isFinite(t) || Date.now() - t > KEEP_MS) return false;
  ids.add(m.id);
  const text = String(m.message || ''), first = text.split('\n')[0];
  const sym = m.symbol || (first.match(/#([A-Z0-9_]+)/) || [])[1] || '';
  const a = raw.get(bot);
  a.push({ seq: ++seq, id: m.id, t, symbol: sym, dir: first.startsWith('🟢') ? 'up' : first.startsWith('🔴') ? 'down' : null, text });
  if (a.length > RAW_CAP * 1.2) a.splice(0, a.length - RAW_CAP);
  tsl.get(bot).push(t);
  if (t > lastMsg) lastMsg = t;
  if (persist) fs.appendFileSync(path.join(DATA, `${bot}.jsonl`), JSON.stringify(m) + '\n');
  return true;
}
function prune() {
  const cut = Date.now() - KEEP_MS;
  for (const b of BOTS) {
    const ts = tsl.get(b); let i = 0; while (i < ts.length && ts[i] < cut) i++; ts.splice(0, i);
    const a = raw.get(b); let j = 0; while (j < a.length && a[j].t < cut) j++; a.splice(0, j);
  }
}
// önceki çalışmadan kalan son 26 saati yükle; dosyayı da küçült
function loadDisk() {
  for (const b of BOTS) {
    const f = path.join(DATA, `${b}.jsonl`); if (!fs.existsSync(f)) continue;
    const keep = [];
    for (const l of fs.readFileSync(f, 'utf8').split('\n')) { if (!l) continue; try { const m = JSON.parse(l); if (Date.now() - Date.parse(m.createdAt) <= KEEP_MS) { keep.push(l); add(b, m, false); } } catch { } }
    fs.writeFileSync(f, keep.length ? keep.join('\n') + '\n' : '');
  }
  for (const b of BOTS) { raw.get(b).sort((x, y) => x.t - y.t); tsl.get(b).sort((x, y) => x - y); }
}

// ---------- Visivero takibi ----------
async function fetchBot(bot, before) {
  const p = new URLSearchParams({ bot_id: bot, limit: '100', exchange: 'binance', market_type: 'FUTURES' });
  if (before) p.set('before', before);
  const r = await fetch(`${API}?${p}`, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  return (j.messages || []).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}
async function backfill() {
  for (const b of BOTS) {
    let before = null, n = 0;
    for (let page = 0; page < 30; page++) {
      let rows; try { rows = await fetchBot(b, before); } catch (e) { log(b, e.message); break; }
      if (!rows.length) break;
      for (const m of rows) if (add(b, m, true)) n++;
      const oldest = rows[0].createdAt;
      if (Date.now() - Date.parse(oldest) > 24 * 3600e3 || oldest === before) break;
      before = oldest;
    }
    raw.get(b).sort((x, y) => x.t - y.t); tsl.get(b).sort((x, y) => x - y);
    log('geçmiş', b, '+' + n);
  }
}
async function poll() {
  for (;;) {
    for (const b of BOTS) {
      try { let n = 0; for (const m of await fetchBot(b)) if (add(b, m, true)) n++; if (n) log(b, '+' + n); }
      catch (e) { log(b, e.message); }
    }
    await new Promise(r => setTimeout(r, POLL_MS));
  }
}

// ---------- http ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
http.createServer((req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (!['localhost', '127.0.0.1', '[::1]'].includes((req.headers.host || '').replace(/:\d+$/, ''))) { res.writeHead(403); return res.end('forbidden'); }
    if (u.pathname === '/api/messages') {
      const bot = u.searchParams.get('bot') || 'm1', after = Number(u.searchParams.get('after') || 0);
      const limit = Math.min(1000, Number(u.searchParams.get('limit') || 300)), q = (u.searchParams.get('q') || '').toUpperCase();
      const a = raw.get(bot) || [], out = [];
      for (let i = a.length - 1; i >= 0 && out.length < limit; i--) { const m = a[i]; if (m.seq <= after) continue; if (q && !m.symbol.includes(q)) continue; out.push(m); }
      return send(res, 200, { seq, messages: out });
    }
    if (u.pathname === '/api/msgcounts') {
      const cut = Date.now() - Math.min(26, Number(u.searchParams.get('hours') || 24)) * 3600e3, q = (u.searchParams.get('q') || '').toUpperCase();
      const vv = {};
      for (const b of BOTS) { let n = 0; if (q) { for (const m of raw.get(b)) if (m.t >= cut && m.symbol.includes(q)) n++; } else { for (const t of tsl.get(b)) if (t >= cut) n++; } vv[b] = n; }
      return send(res, 200, { seq, counts: { vv, ours: {} }, bots: NAMES });
    }
    if (u.pathname === '/api/version') { let v = 0; for (const f of fs.readdirSync(PUB)) { try { v = Math.max(v, fs.statSync(path.join(PUB, f)).mtimeMs); } catch { } } return send(res, 200, { v: Math.round(v), boot: BOOT }); }
    if (u.pathname === '/api/status') return send(res, 200, { now: Date.now(), lastVV: lastMsg, engine: {} });
    let p = decodeURIComponent(u.pathname); if (p === '/') p = '/index.html';
    const f = path.resolve(PUB, '.' + p);
    if (!f.startsWith(PUB + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  } catch (e) { send(res, 500, { error: e.message }); }
}).on('error', e => { if (e.code === 'EADDRINUSE') { console.error(`Port ${PORT} kullanımda. Başka port için: node server.js --port 3201`); process.exit(1); } throw e; })
  .listen(PORT, HOST, () => log(`Visivero Botları → http://localhost:${PORT}`));

loadDisk();
log('diskten yüklendi:', BOTS.map(b => `${b}=${raw.get(b).length}`).join(' '));
setInterval(prune, 600e3);
backfill().then(poll);
