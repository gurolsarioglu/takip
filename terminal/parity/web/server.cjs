'use strict';
// Sinyal Masası — local web dashboard for the parity engine.
// Shows our live signals next to Visivero's (public API follower), per-bot match scores, a Binance watchlist
// and a feedback/notes channel (data/feedback.jsonl) that Claude reads.
// Run: node web/server.cjs  → http://localhost:3100   (PORT env to change)
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { parse } = require('../lib/ref.cjs');

const ROOT = path.join(__dirname, '..', 'data');
const PUB = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 3100);
const HOST = process.env.HOST || '127.0.0.1';
const SITES = { [PORT + 1]: 'vv', [PORT + 2]: 'ours' };
const BOOT = Date.now();
const KEEP_MS = 26 * 3600e3;
const BOTS = {
  'm1': { name: 'M1-A', gap: 60e3, tol: 30e3, useStrategy: false },
  'm1-premium': { name: 'M1 Premium', gap: 60e3, tol: 30e3, useStrategy: false },
  'hammer': { name: 'Hammer', gap: 120e3, tol: 60e3, useStrategy: false },
  'hammer-pro': { name: 'Hammer Pro', gap: 120e3, tol: 60e3, useStrategy: true },
  'hammer-pro-plus': { name: 'Hammer Pro+', gap: 120e3, tol: 60e3, useStrategy: true },
  '1d-hammer-pro': { name: '1D Hammer Pro', gap: 3600e3, tol: 900e3, useStrategy: true },
  '4s': { name: '4S', gap: 3600e3, tol: 900e3, useStrategy: true },
  '4sniper': { name: '4S Sniper', gap: 3600e3, tol: 900e3, useStrategy: true },
  '1dws': { name: '1DWS', gap: 6 * 3600e3, tol: 1800e3, useStrategy: true },
  'div': { name: 'DIV', gap: 3600e3, tol: 900e3, useStrategy: true },
  'fr': { name: 'FR', gap: 1800e3, tol: 300e3, useStrategy: false },
  'v3': { name: 'V3', gap: 120e3, tol: 70e3, useStrategy: false }
};
const log = (...a) => console.log(new Date().toISOString(), ...a);

// ---------- raw messages (Visivero-style feed) ----------
let seq = 0;
const RAW_CAP = 3000;
const raw = new Map(); // src|bot -> [{seq,t,symbol,dir,strategy,text}]
const tsl = new Map(); // src|bot -> [t] (for counts beyond the raw cap)
function addRaw(src, m) {
  const k = src + '|' + m.bot; let a = raw.get(k); if (!a) raw.set(k, a = []);
  a.push({ seq: ++seq, t: m.t, symbol: m.symbol, dir: m.dir || null, strategy: m.strategy || null, text: m.text });
  if (a.length > RAW_CAP * 1.2) a.splice(0, a.length - RAW_CAP);
  let b = tsl.get(k); if (!b) tsl.set(k, b = []); b.push(m.t);
  if (b.length > 1000 && b[0] < Date.now() - KEEP_MS) { const c = Date.now() - KEEP_MS; let i = 0; while (i < b.length && b[i] < c) i++; b.splice(0, i); }
}

// ---------- episodes ----------
let rev = 0, nextId = 1;
const eps = new Map();          // id -> episode
const open = new Map();         // src|bot|key -> latest episode
function addMsg(src, m) {
  const cfg = BOTS[m.bot]; if (!cfg || !m.symbol || !Number.isFinite(m.t)) return;
  if (Date.now() - m.t > KEEP_MS) return;
  addRaw(src, m);
  const key = [m.symbol, m.dir || '-', cfg.useStrategy ? (m.strategy || '-') : '*'].join('|');
  const ok = `${src}|${m.bot}|${key}`;
  const last = open.get(ok);
  if (last && m.t - last.end <= cfg.gap && m.t >= last.start - cfg.gap) {
    if (m.t > last.end) { last.end = m.t; last.text = m.text; last.price = m.price; }
    last.n++; if (m.stars > last.stars) last.stars = m.stars;
    if (Number.isFinite(m.boost) && !(m.boost <= last.boost)) last.boost = m.boost;
    last.rev = ++rev; return;
  }
  const e = { id: nextId++, src, bot: m.bot, key, symbol: m.symbol, dir: m.dir || null, strategy: m.strategy || null, start: m.t, end: m.t, n: 1, text: m.text, firstText: m.text, price: m.price, boost: m.boost, stars: m.stars || 0, match: null, status: 'pending', rev: ++rev };
  eps.set(e.id, e); open.set(ok, e);
}
const starsOf = s => (String(s || '').split('\n')[0].match(/⭐/g) || []).length;

// ---------- tailing ----------
const tails = new Map(); // file -> {pos, rest}
function tail(file, onLine) {
  let st = tails.get(file);
  if (!st) { st = { pos: 0, rest: '' }; tails.set(file, st); }
  let size; try { size = fs.statSync(file).size; } catch { return; }
  if (size < st.pos) { st.pos = 0; st.rest = ''; }
  if (size === st.pos) return;
  const fd = fs.openSync(file, 'r');
  try {
    const CH = 8 << 20;
    while (st.pos < size) {
      const len = Math.min(CH, size - st.pos), buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, st.pos); st.pos += len;
      const parts = (st.rest + buf.toString('utf8')).split('\n'); st.rest = parts.pop();
      for (const l of parts) if (l) { try { onLine(JSON.parse(l)); } catch { } }
    }
  } finally { fs.closeSync(fd); }
}
const day = t => new Date(t).toISOString().slice(0, 10);
function pollOurs() {
  const now = Date.now();
  for (const d of [...new Set([day(now - 24 * 3600e3), day(now)])]) {
    tail(path.join(ROOT, 'live', `signals-${d}.jsonl`), s => {
      if (!s.botId || s.botId.startsWith('exp-')) return;
      addMsg('ours', { bot: s.botId, symbol: s.symbol, dir: s.direction, strategy: s.strategy, t: s.t, text: s.text, price: s.price, boost: s.boostPct, stars: starsOf(s.text) });
    });
  }
}
function pollRef() {
  for (const bot of Object.keys(BOTS)) {
    tail(path.join(ROOT, 'ref', `${bot}.jsonl`), row => {
      if (!row.seenAt) return; // only live-followed rows (backfill rows lack seenAt)
      const r = parse(row);
      addMsg('vv', { bot, symbol: r.symbol, dir: r.direction, strategy: r.strategy || r.frFlip || null, t: r.t, text: row.message, price: r.price, boost: r.boostPct, stars: r.stars });
    });
  }
}

// ---------- matching ----------
function matchAll() {
  const now = Date.now();
  const groups = new Map();
  for (const e of eps.values()) { const g = `${e.bot}|${e.key}`; let a = groups.get(g); if (!a) groups.set(g, a = { ours: [], vv: [] }); a[e.src].push(e); }
  for (const [g, a] of groups) {
    const cfg = BOTS[g.split('|')[0]];
    a.vv.sort((x, y) => x.start - y.start); a.ours.sort((x, y) => x.start - y.start);
    const used = new Set(), res = new Map();
    for (const v of a.vv) {
      const o = a.ours.find(o => !used.has(o) && o.start <= v.end + cfg.tol && o.end >= v.start - cfg.tol);
      if (o) { used.add(o); res.set(v, o.id); res.set(o, v.id); }
    }
    const settle = cfg.tol + 90e3; // allow the other side to arrive (Visivero poll delay, scan offsets)
    for (const e of [...a.vv, ...a.ours]) {
      const m = res.get(e) || null;
      const status = m ? 'match' : (now - e.start < settle ? 'pending' : e.src === 'vv' ? 'missed' : 'extra');
      if (e.match !== m || e.status !== status) { e.match = m; e.status = status; e.rev = ++rev; }
    }
  }
}
function prune() {
  const cut = Date.now() - KEEP_MS;
  for (const [id, e] of eps) if (e.end < cut) eps.delete(id);
  for (const [k, e] of open) if (e.end < cut) open.delete(k);
}

// ---------- status / score ----------
const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
function status() {
  const s = readJson(path.join(ROOT, 'live', 'status.json')) || {};
  let lastVV = 0; for (const e of eps.values()) if (e.src === 'vv' && e.end > lastVV) lastVV = e.end;
  let lastOurs = 0; for (const e of eps.values()) if (e.src === 'ours' && e.end > lastOurs) lastOurs = e.end;
  return { now: Date.now(), engine: { at: s.at, startedAt: s.startedAt, readyAt: s.readyAt, symbols: s.symbols, modules: s.modules, errors: s.errors, mem: s.mem }, lastOurs, lastVV, episodes: eps.size, bots: Object.fromEntries(Object.entries(BOTS).map(([k, v]) => [k, v.name])) };
}
function score(hours) {
  const s = readJson(path.join(ROOT, 'live', 'status.json')) || {};
  const ready = Date.parse(s.readyAt || 0) + 120e3;
  const from = Math.max(Date.now() - hours * 3600e3, ready || 0);
  const out = {};
  for (const b of Object.keys(BOTS)) out[b] = { tp: 0, fn: 0, fp: 0, pending: 0, ours: 0, vv: 0 };
  for (const e of eps.values()) {
    if (e.start < from) continue;
    const o = out[e.bot]; o[e.src]++;
    if (e.status === 'pending') o.pending++;
    else if (e.src === 'vv') o[e.status === 'match' ? 'tp' : 'fn']++;
    else if (e.status === 'extra') o.fp++;
  }
  for (const o of Object.values(out)) { o.recall = o.tp + o.fn ? +(o.tp / (o.tp + o.fn)).toFixed(3) : null; o.precision = o.tp + o.fp ? +(o.tp / (o.tp + o.fp)).toFixed(3) : null; }
  return { from, hours, bots: out };
}

// ---------- watchlist (Binance REST, cached) ----------
let wl = { at: 0, rows: [] };
async function watchlist() {
  if (Date.now() - wl.at < 20e3 && wl.rows.length) return wl;
  const F = 'https://fapi.binance.com';
  const [info, tick, prem, fi] = await Promise.all([
    fetch(`${F}/fapi/v1/exchangeInfo`).then(r => r.json()),
    fetch(`${F}/fapi/v1/ticker/24hr`).then(r => r.json()),
    fetch(`${F}/fapi/v1/premiumIndex`).then(r => r.json()),
    fetch(`${F}/fapi/v1/fundingInfo`).then(r => r.json()).catch(() => [])
  ]);
  const T = new Map(tick.map(x => [x.symbol, x])), P = new Map(prem.map(x => [x.symbol, x])), FI = new Map(fi.map(x => [x.symbol, x]));
  const rows = [];
  for (const s of info.symbols) {
    if (s.status !== 'TRADING' || !/PERPETUAL/.test(s.contractType) || !['USDT', 'USDC'].includes(s.quoteAsset)) continue;
    const t = T.get(s.symbol), p = P.get(s.symbol); if (!t) continue;
    rows.push({ s: s.symbol, q: s.quoteAsset, tradfi: s.underlyingType === 'COMMODITY' || (s.underlyingSubType || []).some(x => /TRADFI|STOCK|EQUITY|COMMODITY|INDEX|FOREX/i.test(x)), p: +t.lastPrice, ch: +t.priceChangePercent, v: +t.quoteVolume, hi: +t.highPrice, lo: +t.lowPrice, fr: p ? +p.lastFundingRate * 100 : null, nf: p ? p.nextFundingTime : null, fh: FI.get(s.symbol)?.fundingIntervalHours || 8 });
  }
  wl = { at: Date.now(), rows };
  return wl;
}

// ---------- feedback ----------
const FB = path.join(ROOT, 'feedback.jsonl');
function feedbackList() { try { return fs.readFileSync(FB, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).slice(-1000); } catch { return []; } }

// ---------- http ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
const send = (res, code, obj) => { const b = JSON.stringify(obj); res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(b); };
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const allowed = new Set(['localhost', '127.0.0.1', '[::1]']);
    if (!allowed.has((req.headers.host || '').replace(/:\d+$/, ''))) { res.writeHead(403); return res.end('forbidden'); }
    if (u.pathname === '/api/version') { let v = 0; for (const f of fs.readdirSync(PUB)) { try { v = Math.max(v, fs.statSync(path.join(PUB, f)).mtimeMs); } catch { } } return send(res, 200, { v: Math.round(v), boot: BOOT }); }
    if (u.pathname === '/api/status') return send(res, 200, status());
    if (u.pathname === '/api/episodes') {
      const since = Number(u.searchParams.get('since') || 0), hours = Math.min(26, Number(u.searchParams.get('hours') || 6));
      const cut = Date.now() - hours * 3600e3;
      let list = [...eps.values()].filter(e => e.rev > since && e.end >= cut);
      list.sort((a, b) => b.start - a.start);
      if (list.length > 8000) list = list.slice(0, 8000);
      return send(res, 200, { rev, now: Date.now(), episodes: list });
    }
    if (u.pathname === '/api/messages') {
      const src = u.searchParams.get('src') === 'ours' ? 'ours' : 'vv', bot = u.searchParams.get('bot') || 'm1';
      const after = Number(u.searchParams.get('after') || 0), limit = Math.min(1000, Number(u.searchParams.get('limit') || 300));
      const q = (u.searchParams.get('q') || '').toUpperCase();
      const a = raw.get(src + '|' + bot) || [];
      const out = [];
      for (let i = a.length - 1; i >= 0 && out.length < limit; i--) { const m = a[i]; if (m.seq <= after) break; if (q && !m.symbol.includes(q)) continue; out.push(m); }
      return send(res, 200, { seq, messages: out });
    }
    if (u.pathname === '/api/msgcounts') {
      const hours = Math.min(26, Number(u.searchParams.get('hours') || 24)), cut = Date.now() - hours * 3600e3, q = (u.searchParams.get('q') || '').toUpperCase();
      const out = { vv: {}, ours: {} };
      for (const [k, a] of raw) {
        const [src, bot] = k.split('|'); let n = 0;
        if (q) { for (let i = a.length - 1; i >= 0 && a[i].t >= cut; i--) if (a[i].symbol.includes(q)) n++; }
        else { const b = tsl.get(k) || []; for (let i = b.length - 1; i >= 0 && b[i] >= cut; i--) n++; }
        out[src][bot] = n;
      }
      return send(res, 200, { seq, counts: out, bots: Object.fromEntries(Object.entries(BOTS).map(([k, v]) => [k, v.name])) });
    }
    if (u.pathname === '/api/score') return send(res, 200, score(Math.min(26, Number(u.searchParams.get('hours') || 6))));
    if (u.pathname === '/api/watchlist') { try { return send(res, 200, await watchlist()); } catch (e) { return send(res, 502, { error: e.message }); } }
    if (u.pathname === '/api/feedback' && req.method === 'GET') return send(res, 200, feedbackList());
    if (u.pathname === '/api/feedback' && req.method === 'POST') {
      let body = ''; for await (const c of req) { body += c; if (body.length > 20000) break; }
      const j = JSON.parse(body || '{}');
      const rec = { at: new Date().toISOString(), kind: String(j.kind || 'note').slice(0, 20), vote: ['up', 'down'].includes(j.vote) ? j.vote : null, note: String(j.note || '').slice(0, 4000), epId: j.epId ?? null, src: j.src || null, bot: j.bot || null, symbol: j.symbol || null, dir: j.dir || null, strategy: j.strategy || null, t: j.t || null, status: j.status || null };
      fs.appendFileSync(FB, JSON.stringify(rec) + '\n');
      return send(res, 200, { ok: true, rec });
    }
    // static
    let p = decodeURIComponent(u.pathname); if (p === '/') p = SITES[req.socket.localPort] ? '/bots.html' : '/index.html';
    const f = path.resolve(PUB, '.' + p);
    if (!f.startsWith(PUB + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  } catch (e) { send(res, 500, { error: e.message }); }
});

log('loading history…');
const t0 = Date.now();
pollOurs(); pollRef(); matchAll();
log(`loaded ${eps.size} episodes in ${Date.now() - t0} ms`);
setInterval(() => { try { pollOurs(); pollRef(); } catch (e) { log('poll', e.message); } }, 2000);
setInterval(() => { try { matchAll(); } catch (e) { log('match', e.message); } }, 4000);
setInterval(prune, 600e3);
server.listen(PORT, HOST, () => log(`Sinyal Masası → http://localhost:${PORT}`));
// separate sites: Visivero bots (3101) and our bots (3102), same data API, page locked to one source
for (const [port, src] of Object.entries(SITES)) { const s2 = http.createServer((q, r) => server.emit('request', q, r)); s2.listen(Number(port), HOST, () => log(`${src === 'vv' ? 'Visivero botları' : 'Bizim botlar'} → http://localhost:${port}`)); }
