'use strict';
// Botlar V1 — yerel web arayüzü. Motorun yazdığı data/live/signals-*.jsonl dosyalarını okur.
// Çalıştır: node web/server.cjs  → http://localhost:3200   (PORT ortam değişkeniyle değiştirilebilir)
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const VERSION = fs.readFileSync(path.join(__dirname, '..', 'VERSION'), 'utf8').trim();
const ROOT = path.join(__dirname, '..', 'data');
const PUB = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 3200);
const HOST = process.env.HOST || '127.0.0.1';
const KEEP_MS = 48 * 3600e3, CAP = 5000;
const BOOT = Date.now();
const BOTS = [
  { id: 'm1', gap: 60e3, name: 'M1', desc: '1 dakikalık ani yükseliş/düşüş, RSI ve Stochastic ile' },
  { id: 'm1-premium', gap: 60e3, name: 'M1 Premium', desc: 'M1 + 1m/5m/1h RSI-SRSI, uyumsuzluk ve WT Cross satırı' },
  { id: '4s', gap: 3600e3, name: '4S', desc: '1h/4h/1d RSI-SRSI, trader pozisyon ve piyasa maruziyeti' },
  { id: '4sniper', gap: 3600e3, name: '4S Sniper', desc: 'Nadaraya-Watson stratejileri + 4H RSI uyumsuzluğu' },
  { id: '1dws', gap: 6 * 3600e3, name: '1DWS', desc: 'Günlük Nadaraya-Watson stratejileri' },
  { id: 'div', gap: 3600e3, name: 'DIV', desc: '1H RSI uyumsuzluğu' },
  { id: 'fr', gap: 1800e3, name: 'FR', desc: 'Funding rate değişimi ve periyodik tarama' },
  { id: 'v3', gap: 120e3, name: 'V3', desc: '1 dakikalık hacim patlaması (V3-A)' },
];
const IDS = new Set(BOTS.map(b => b.id));
const log = (...a) => console.log(new Date().toISOString(), ...a);

// Aynı bot + coin + yön (+ strateji) kısa sürede tekrar ederse tek kart: n artar, metin/zaman güncellenir.
let seq = 0, nextId = 1;
const GAP = Object.fromEntries(BOTS.map(b => [b.id, b.gap]));
const msgs = new Map(BOTS.map(b => [b.id, []])); // bot -> [{id,seq,t,first,n,symbol,dir,strategy,text,price}]
const openEp = new Map(); // bot|symbol|dir|strategy -> item
const tails = new Map();
function tail(file, onLine) {
  let st = tails.get(file); if (!st) { st = { pos: 0, rest: '' }; tails.set(file, st); }
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
function poll() {
  const now = Date.now();
  for (const d of [...new Set([day(now - 2 * 24 * 3600e3), day(now - 24 * 3600e3), day(now)])]) {
    tail(path.join(ROOT, 'live', `signals-${d}.jsonl`), s => {
      if (!IDS.has(s.botId) || now - s.t > KEEP_MS) return;
      const a = msgs.get(s.botId), k = [s.botId, s.symbol, s.direction || '-', s.strategy || '-'].join('|'), o = openEp.get(k);
      if (o && s.t - o.t <= GAP[s.botId] && s.t >= o.t) { o.t = s.t; o.n++; o.text = s.text || o.text; o.price = s.price; o.seq = ++seq; return; }
      const it = { id: nextId++, seq: ++seq, t: s.t, first: s.t, n: 1, symbol: s.symbol, dir: s.direction || null, strategy: s.strategy || null, text: s.text || '', price: s.price };
      a.push(it); openEp.set(k, it);
      if (a.length > CAP * 1.2) a.splice(0, a.length - CAP);
    });
  }
}
poll(); setInterval(poll, 1000);

function versionStamp() {
  let m = 0;
  for (const f of fs.readdirSync(PUB)) { try { m = Math.max(m, fs.statSync(path.join(PUB, f)).mtimeMs); } catch { } }
  return `${BOOT}-${Math.round(m)}`;
}
function engineStatus() {
  try { const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'live', 'status.json'), 'utf8')); return { ok: Date.now() - Date.parse(s.at) < 60e3, at: s.at, readyAt: s.readyAt, symbols: s.symbols, errors: s.errors, mem: s.mem }; }
  catch { return { ok: false }; }
}
// ---------- Kasa (kişisel işlem kaydı, %30 hedef) ----------
// data/kasa.json: { active, periods:[{id,start:'YYYY-MM-DD',capital,closedAt,trades:[{id,coin,date,time,kasa|null,pnl|null,note}]}] }
const KASA = path.join(ROOT, 'kasa.json');
const trDate = (t = Date.now()) => new Date(t + 3 * 3600e3).toISOString().slice(0, 10);
function kasaLoad() {
  try { return JSON.parse(fs.readFileSync(KASA, 'utf8')); }
  catch { return { active: 1, nextId: 1, periods: [{ id: 1, start: trDate(), capital: 500, closedAt: null, trades: [] }] }; }
}
function kasaSave(d) {
  fs.mkdirSync(ROOT, { recursive: true });
  try { if (fs.existsSync(KASA)) fs.copyFileSync(KASA, KASA + '.yedek'); } catch { }
  fs.writeFileSync(KASA + '.tmp', JSON.stringify(d, null, 1)); fs.renameSync(KASA + '.tmp', KASA);
}
const num = v => { if (v === null || v === undefined || v === '') return null; const n = Number(String(v).replace(/[$\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const sortT = a => [...a].sort((x, y) => (x.date + ' ' + (x.time || '')).localeCompare(y.date + ' ' + (y.time || '')) || x.id - y.id);
function kasaCalc(p) {
  let prev = p.capital, wins = 0; const rows = [];
  for (const t of sortT(p.trades)) {
    const kasa = t.kasa != null ? t.kasa : prev + (t.pnl || 0);
    const pnl = kasa - prev; if (pnl > 0) wins++;
    rows.push({ ...t, kasaCalc: kasa, pnlCalc: pnl, pct: prev ? pnl / prev : 0 }); prev = kasa;
  }
  const C = p.capital, total = prev - C, hedef = C * 1.3;
  const end = p.closedAt || trDate();
  const daysPassed = Math.round((Date.parse(end) - Date.parse(p.start)) / 864e5);
  const kalanGun = 30 - daysPassed, kalan = (hedef - C) - total;
  return { rows, sum: { capital: C, total, current: C + total, pct: C ? total / C : 0, hedef, kalan, kalanGun, gunluk: kalanGun > 0 ? kalan / kalanGun : null, hedefKalanPct: 0.3 - (C ? total / C : 0), maxPoz: (C + total) * 0.1, ilerleme: hedef > C ? total / (hedef - C) : 0, n: rows.length, wins } };
}
function kasaReports(d) {
  const all = []; for (const p of d.periods) for (const r of kasaCalc(p).rows) all.push({ ...r, period: p.id });
  all.sort((x, y) => (x.date + ' ' + (x.time || '')).localeCompare(y.date + ' ' + (y.time || '')));
  const agg = key => { const m = new Map(); for (const r of all) { const k = key(r); let a = m.get(k); if (!a) m.set(k, a = { key: k, n: 0, wins: 0, pnl: 0, startKasa: r.kasaCalc - r.pnlCalc, endKasa: 0 }); a.n++; if (r.pnlCalc > 0) a.wins++; a.pnl += r.pnlCalc; a.endKasa = r.kasaCalc; } return [...m.values()].map(a => ({ ...a, pct: a.startKasa ? a.pnl / a.startKasa : 0 })); };
  return { quarters: agg(r => `${r.date.slice(0, 4)} Ç${Math.floor((+r.date.slice(5, 7) - 1) / 3) + 1}`), months: agg(r => r.date.slice(0, 7)), years: agg(r => r.date.slice(0, 4)) };
}
function kasaView(d, pid) {
  const p = d.periods.find(x => x.id === (pid || d.active)) || d.periods.find(x => x.id === d.active);
  const c = kasaCalc(p);
  return { active: d.active, period: { id: p.id, start: p.start, capital: p.capital, closedAt: p.closedAt }, periods: d.periods.map(x => ({ id: x.id, start: x.start, capital: x.capital, closedAt: x.closedAt, n: x.trades.length })), ...c, reports: kasaReports(d) };
}
function kasaAction(b) {
  const d = kasaLoad(); const p = d.periods.find(x => x.id === d.active);
  const clean = t => ({ coin: String(t.coin || '').toUpperCase().trim().slice(0, 30), date: /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : trDate(), time: /^\d{1,2}:\d{2}$/.test(t.time || '') ? t.time.padStart(5, '0') : '', kasa: num(t.kasa), pnl: num(t.pnl), note: String(t.note || '').slice(0, 200) });
  if (b.action === 'settings') { if (/^\d{4}-\d{2}-\d{2}$/.test(b.start)) p.start = b.start; if (num(b.capital) > 0) p.capital = num(b.capital); }
  else if (b.action === 'add') { const t = clean(b); if (t.kasa == null && t.pnl == null) throw new Error('Kasa ya da kazanç/zarar girin'); if (t.kasa != null) t.pnl = null; d.nextId = (d.nextId || 1); p.trades.push({ id: d.nextId++, ...t }); }
  else if (b.action === 'update') { const i = p.trades.findIndex(x => x.id === Number(b.id)); if (i < 0) throw new Error('kayıt yok'); const t = clean(b); if (t.kasa != null) t.pnl = null; p.trades[i] = { id: p.trades[i].id, ...t }; }
  else if (b.action === 'delete') { p.trades = p.trades.filter(x => x.id !== Number(b.id)); }
  else if (b.action === 'newPeriod') { const cur = kasaCalc(p).sum.current; p.closedAt = trDate(); const id = Math.max(...d.periods.map(x => x.id)) + 1; d.periods.push({ id, start: trDate(), capital: Math.round(cur * 100) / 100, closedAt: null, trades: [] }); d.active = id; }
  else throw new Error('bilinmeyen işlem');
  kasaSave(d); return kasaView(d);
}
const readBody = req => new Promise((ok, no) => { let s = ''; req.on('data', c => { s += c; if (s.length > 1e6) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch (e) { no(e); } }); });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };

http.createServer((req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/api/version') return send(res, 200, { version: VERSION, stamp: versionStamp() });
    if (u.pathname === '/api/status') return send(res, 200, { version: VERSION, engine: engineStatus(), now: Date.now() });
    if (u.pathname === '/api/kasa' && req.method === 'GET') return send(res, 200, kasaView(kasaLoad(), Number(u.searchParams.get('period')) || null));
    if (u.pathname === '/api/kasa' && req.method === 'POST') { readBody(req).then(b => send(res, 200, kasaAction(b))).catch(e => send(res, 400, { error: e.message })); return; }
    if (u.pathname === '/api/bots') {
      const now = Date.now();
      return send(res, 200, BOTS.map(({ gap, ...b }) => { const a = msgs.get(b.id); const n24 = a.filter(m => now - m.first < 24 * 3600e3).length, n1 = a.filter(m => now - m.first < 3600e3).length; return { ...b, n24, n1, last: a.length ? a[a.length - 1].t : null }; }));
    }
    if (u.pathname === '/api/messages') {
      const bot = u.searchParams.get('bot') || 'all', q = (u.searchParams.get('q') || '').toUpperCase().trim();
      const dir = u.searchParams.get('dir') || '', after = Number(u.searchParams.get('after') || 0), limit = Math.min(500, Number(u.searchParams.get('limit') || 200));
      let list = [];
      for (const [id, a] of msgs) if (bot === 'all' || bot === id) for (const m of a) list.push({ bot: id, ...m });
      if (q) list = list.filter(m => m.symbol && m.symbol.includes(q));
      if (dir) list = list.filter(m => m.dir === dir);
      if (after) list = list.filter(m => m.seq > after);
      list.sort((x, y) => y.t - x.t || y.seq - x.seq);
      return send(res, 200, { maxSeq: seq, items: list.slice(0, limit) });
    }
    const f = path.join(PUB, u.pathname === '/' ? 'index.html' : path.normalize(u.pathname).replace(/^([/\\])+/, ''));
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('yok'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  } catch (e) { send(res, 500, { error: e.message }); }
}).listen(PORT, HOST, () => log(`Botlar ${VERSION} → http://localhost:${PORT}`));
