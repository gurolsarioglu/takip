'use strict';
// Botlar V1 — yerel web arayüzü. Motorun yazdığı data/live/signals-*.jsonl dosyalarını okur.
// Çalıştır: node web/server.cjs  → http://localhost:3200   (PORT ortam değişkeniyle değiştirilebilir)
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createFeed } = require('./signal-feed.cjs');
const { createArchive } = require('./signal-archive.cjs');
const terminal = require('./terminal.cjs'); // Terminal sayfasının /api/t/* uçları (GOREV-TERMINAL.md)

const VERSION = fs.readFileSync(path.join(__dirname, '..', 'VERSION'), 'utf8').trim();
const ROOT = path.join(__dirname, '..', 'data');
const PUB = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 3200);
const HOST = process.env.HOST || '127.0.0.1';
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
  { id: 'hammer', gap: 3600e3, name: 'Hammer', desc: 'Hareket uyarısı: 1 dk WaveTrend dönüşü + ani fitil (#W1). Yön tahmini değil.' },
];
const IDS = new Set(BOTS.map(b => b.id));
const log = (...a) => console.log(new Date().toISOString(), ...a);

const feed = createFeed({ bots: BOTS });
let feedErrAt = 0;
async function poll() {
  try { await feed.poll(q); }
  catch (e) { if (Date.now() - feedErrAt > 60e3) { feedErrAt = Date.now(); log('akış okunamadı (veritabanı):', e.message); } }
}
setInterval(feed.prune, 60e3);

function versionStamp() {
  let m = 0;
  for (const f of fs.readdirSync(PUB)) { try { m = Math.max(m, fs.statSync(path.join(PUB, f)).mtimeMs); } catch { } }
  return `${BOOT}-${Math.round(m)}`;
}
function engineStatus() {
  try { const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'live', 'status.json'), 'utf8')); return { ok: Date.now() - Date.parse(s.at) < 60e3, at: s.at, readyAt: s.readyAt, symbols: s.symbols, errors: s.errors, mem: s.mem }; }
  catch { return { ok: false }; }
}

// ---------- Veritabanı (PostgreSQL) — karne, coin geçmişi, kasa yansıması ----------
let pool = null;
function db() {
  if (pool) return pool;
  try { const { Pool } = require('pg'); pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'db', 'baglanti.json'), 'utf8')), max: 4 }); pool.on('error', e => log('pg', e.message)); }
  catch (e) { log('pg yok:', e.message); pool = null; }
  return pool;
}
const q = async (sql, args) => { const p = db(); if (!p) throw new Error('veritabanı bağlantısı yok'); return (await p.query(sql, args)).rows; };
const archive = createArchive({ bots: IDS, query: q });
const KC = new Map(); // karne önbelleği (60 sn)
const R = x => x == null ? null : Math.round(Number(x) * 100) / 100;
async function karne(days) {
  const key = 'k' + days, c = KC.get(key); if (c && Date.now() - c.at < 60e3) return c.data;
  const W = `t >= now() - make_interval(days => $1::int)`;
  const agg = `count(*)::int n, count(r60)::int n60, count(r240)::int n240,
    avg(r15) o15, avg(r60) o60, avg(r240) o240, avg((r60>0)::int) k60, avg((r240>0)::int) k240,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY r60) m60, avg(mfe60) mfe, avg(mae60) mae,
    avg((mfe60 >= 1)::int) tp1, avg((mae60 <= -1)::int) sl1`;
  const [bots, dirs, prem, strat, last] = await Promise.all([
    q(`SELECT bot, ${agg} FROM karne_signals WHERE ${W} GROUP BY 1 ORDER BY 1`, [days]),
    q(`SELECT bot, dir, ${agg} FROM karne_signals WHERE ${W} GROUP BY 1,2 ORDER BY 1,2`, [days]),
    q(`SELECT dir, star, (div1 AND div5) d15, wt, ${agg} FROM karne_signals WHERE bot='m1-premium' AND ${W} GROUP BY 1,2,3,4 ORDER BY 1,2,3,4`, [days]),
    q(`SELECT bot, strategy, dir, ${agg} FROM karne_signals WHERE bot NOT IN ('m1','m1-premium') AND ${W} GROUP BY 1,2,3 HAVING count(*) >= 10 ORDER BY 1,2,3`, [days]),
    q(`SELECT max(t) son, min(t) ilk FROM karne_signals WHERE ${W}`, [days])]);
  const PCT = new Set(['k60', 'k240', 'tp1', 'sl1']), NUM = new Set(['o15', 'o60', 'o240', 'm60', 'mfe', 'mae']);
  const fix = r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v == null ? null : PCT.has(k) ? Math.round(Number(v) * 100) : NUM.has(k) ? R(v) : v]));
  const data = { days, ilk: last[0].ilk, son: last[0].son, bots: bots.map(fix), dirs: dirs.map(fix), prem: prem.map(fix), strat: strat.map(fix) };
  KC.set(key, { at: Date.now(), data }); return data;
}
async function coinHist(sym, days) {
  return (await q(`SELECT s.bot, s.dir, s.strategy, extract(epoch FROM s.t) * 1000 AS t, s.price, k.r60, k.r240
    FROM karne_signals k JOIN LATERAL (SELECT bot, dir, strategy, t, price FROM signals WHERE symbol = k.symbol AND bot = k.bot AND t = k.t LIMIT 1) s ON true
    WHERE k.symbol = $1 AND k.t >= now() - make_interval(days => $2::int) ORDER BY k.t DESC LIMIT 400`, [sym, days])).map(r => ({ ...r, t: Number(r.t), r60: R(r.r60), r240: R(r.r240) }));
}
// ---------- Kasa (kişisel işlem kaydı, %30 hedef) — ASIL KAYIT VERİTABANI (kasa_periods, kasa_trades) ----------
// 11.11.2026'ya kadar asıl kayıt data\kasa.json'du; artık dosya kullanılmıyor (ilk açılışta arşiv adına çevrilir).
// Bellekteki biçim: { active, nextId, periods:[{id,start:'YYYY-MM-DD',capital,closedAt,trades:[{id,coin,date,time,kasa|null,pnl|null,note,bot,dir}]}] }
const KASA = path.join(ROOT, 'kasa.json');
const trDate = (t = Date.now()) => new Date(t + 3 * 3600e3).toISOString().slice(0, 10);
const nn = v => v == null ? null : Number(v);
async function kasaLoad(c) {
  const run = (sql, a) => c ? c.query(sql, a).then(r => r.rows) : q(sql, a);
  let ps = await run('SELECT id, start::text AS start, capital, closed_at::text AS closed_at FROM kasa_periods ORDER BY id');
  if (!ps.length) { await run('INSERT INTO kasa_periods (id, start, capital, closed_at) VALUES (1, $1, 500, NULL) ON CONFLICT DO NOTHING', [trDate()]); ps = await run('SELECT id, start::text AS start, capital, closed_at::text AS closed_at FROM kasa_periods ORDER BY id'); }
  const ts = await run('SELECT id, period_id, coin, date::text AS date, time, kasa, pnl, note, bot, dir FROM kasa_trades ORDER BY id');
  const periods = ps.map(p => ({ id: p.id, start: p.start, capital: Number(p.capital), closedAt: p.closed_at || null, trades: ts.filter(t => t.period_id === p.id).map(t => ({ id: t.id, coin: t.coin || '', date: t.date, time: t.time || '', kasa: nn(t.kasa), pnl: nn(t.pnl), note: t.note || '', bot: t.bot || null, dir: t.dir || null })) }));
  const open = periods.filter(p => !p.closedAt);
  return { active: (open.length ? open[open.length - 1] : periods[periods.length - 1]).id, nextId: Math.max(0, ...ts.map(t => t.id)) + 1, periods };
}
async function kasaWrite(c, d) {
  await c.query('DELETE FROM kasa_trades'); await c.query('DELETE FROM kasa_periods');
  for (const per of d.periods) {
    await c.query('INSERT INTO kasa_periods (id, start, capital, closed_at) VALUES ($1,$2,$3,$4)', [per.id, per.start, per.capital, per.closedAt || null]);
    for (const t of per.trades) await c.query('INSERT INTO kasa_trades (id, period_id, coin, date, time, kasa, pnl, note, bot, dir) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [t.id, per.id, t.coin, t.date, t.time, t.kasa, t.pnl, t.note, t.bot || null, t.dir || null]);
  }
}
// Değişiklikler sırayla ve tek işlemde (transaction): oku → değiştir → yaz. Hata olursa hiçbir şey değişmez ve kullanıcıya hata döner.
let kasaQ = Promise.resolve();
function kasaTx(fn) {
  const run = async () => { const p = db(); if (!p) throw new Error('veritabanı bağlantısı yok'); const c = await p.connect();
    try { await c.query('BEGIN'); await c.query('LOCK TABLE kasa_periods IN EXCLUSIVE MODE'); const d = await kasaLoad(c); fn(d); await kasaWrite(c, d); await c.query('COMMIT'); return d; }
    catch (e) { await c.query('ROLLBACK').catch(() => { }); throw e; } finally { c.release(); } };
  const r = kasaQ.then(run, run); kasaQ = r.catch(() => { }); return r;
}
// Tek seferlik: eski kasa.json → veritabanı (tablo boşsa) ve dosyanın arşive çevrilmesi
async function kasaMigrate() {
  if (!fs.existsSync(KASA)) return;
  const j = JSON.parse(fs.readFileSync(KASA, 'utf8')), nJ = j.periods.reduce((a, p) => a + p.trades.length, 0);
  const cur = await kasaLoad(), nD = cur.periods.reduce((a, p) => a + p.trades.length, 0);
  if (nD < nJ || cur.periods.length < j.periods.length) { await kasaTx(d => { d.periods = j.periods; }); log('kasa.json veritabanına aktarıldı:', j.periods.length, 'dönem,', nJ, 'işlem'); }
  const chk = await kasaLoad(), nC = chk.periods.reduce((a, p) => a + p.trades.length, 0);
  if (nC >= nJ && chk.periods.length >= j.periods.length) { const arch = path.join(ROOT, `kasa-arsiv-${trDate()}.json`); fs.renameSync(KASA, arch); log('kasa artık yalnız veritabanında; eski dosya arşivlendi:', path.basename(arch)); }
  else log('UYARI kasa aktarımı doğrulanamadı; kasa.json yerinde bırakıldı');
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
  return { quarters: agg(r => `${r.date.slice(0, 4)} Ç${Math.floor((+r.date.slice(5, 7) - 1) / 3) + 1}`), months: agg(r => r.date.slice(0, 7)), years: agg(r => r.date.slice(0, 4)), bots: agg(r => r.bot || '-') };
}
function kasaView(d, pid) {
  const p = d.periods.find(x => x.id === (pid || d.active)) || d.periods.find(x => x.id === d.active);
  const c = kasaCalc(p);
  return { active: d.active, period: { id: p.id, start: p.start, capital: p.capital, closedAt: p.closedAt }, periods: d.periods.map(x => ({ id: x.id, start: x.start, capital: x.capital, closedAt: x.closedAt, n: x.trades.length })), ...c, reports: kasaReports(d) };
}
async function kasaAction(b) {
  const clean = t => ({ coin: String(t.coin || '').toUpperCase().trim().slice(0, 30), date: /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : trDate(), time: /^\d{1,2}:\d{2}$/.test(t.time || '') ? t.time.padStart(5, '0') : '', kasa: num(t.kasa), pnl: num(t.pnl), note: String(t.note || '').slice(0, 200), bot: IDS.has(t.bot) ? t.bot : null, dir: t.dir === 'up' || t.dir === 'down' ? t.dir : null });
  const d = await kasaTx(d => {
    const p = d.periods.find(x => x.id === d.active);
    if (b.action === 'settings') { if (/^\d{4}-\d{2}-\d{2}$/.test(b.start)) p.start = b.start; if (num(b.capital) > 0) p.capital = num(b.capital); }
    else if (b.action === 'add') { const t = clean(b); if (t.kasa == null && t.pnl == null) throw new Error('Kasa ya da kazanç/zarar girin'); if (t.kasa != null) t.pnl = null; p.trades.push({ id: d.nextId++, ...t }); }
    else if (b.action === 'update') { const i = p.trades.findIndex(x => x.id === Number(b.id)); if (i < 0) throw new Error('kayıt yok'); const t = clean(b); if (t.kasa != null) t.pnl = null; p.trades[i] = { id: p.trades[i].id, ...t }; }
    else if (b.action === 'delete') { p.trades = p.trades.filter(x => x.id !== Number(b.id)); }
    else if (b.action === 'newPeriod') { const cur = kasaCalc(p).sum.current; p.closedAt = trDate(); const id = Math.max(...d.periods.map(x => x.id)) + 1; d.periods.push({ id, start: trDate(), capital: Math.round(cur * 100) / 100, closedAt: null, trades: [] }); d.active = id; }
    else throw new Error('bilinmeyen işlem');
  });
  return kasaView(await kasaLoad());
}
const KL = new Map();
const readBody = req => new Promise((ok, no) => { let s = ''; req.on('data', c => { s += c; if (s.length > 1e6) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch (e) { no(e); } }); });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };

http.createServer((req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (u.pathname.startsWith('/api/t/') && terminal.handle(req, res, u, { q, send, readBody, log })) return;
    if (u.pathname === '/api/t/signal-archive') {
      if (req.method !== 'GET') return send(res, 405, { error: 'GET gerekli' });
      archive(u.searchParams).then(data => send(res, 200, data)).catch(e => send(res, e.status || 500, { error: e.message }));
      return;
    }
    if (u.pathname === '/api/version') return send(res, 200, { version: VERSION, stamp: versionStamp() });
    if (u.pathname === '/api/status') return send(res, 200, { version: VERSION, engine: engineStatus(), now: Date.now() });
    if (u.pathname === '/api/kasa' && req.method === 'GET') { kasaLoad().then(d => send(res, 200, kasaView(d, Number(u.searchParams.get('period')) || null))).catch(e => send(res, 503, { error: 'Kasa okunamadı: ' + e.message })); return; }
    if (u.pathname === '/api/kasa' && req.method === 'POST') { readBody(req).then(b => kasaAction(b)).then(v => send(res, 200, v)).catch(e => send(res, 400, { error: e.message })); return; }
    if (u.pathname === '/api/karne') { const days = Math.min(30, Math.max(1, Number(u.searchParams.get('days') || 7))); karne(days).then(d => send(res, 200, d)).catch(e => send(res, 503, { error: e.message })); return; }
    if (u.pathname === '/api/coinhist') { const sym = (u.searchParams.get('symbol') || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), days = Math.min(14, Math.max(1, Number(u.searchParams.get('days') || 7))); coinHist(sym, days).then(d => send(res, 200, d)).catch(e => send(res, 503, { error: e.message })); return; }
    if (u.pathname === '/api/klines') {
      const sym = (u.searchParams.get('symbol') || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), iv = ['1m', '5m', '15m', '1h', '4h'].includes(u.searchParams.get('interval')) ? u.searchParams.get('interval') : '5m';
      const lim = Math.min(500, Number(u.searchParams.get('limit') || 200)), key = `${sym}|${iv}|${lim}`, c = KL.get(key);
      if (c && Date.now() - c.at < 15e3) return send(res, 200, c.data);
      fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${sym}&interval=${iv}&limit=${lim}`).then(r => r.json()).then(a => {
        if (!Array.isArray(a)) return send(res, 400, { error: a.msg || 'Binance hata' });
        const data = a.map(k => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] })); KL.set(key, { at: Date.now(), data }); if (KL.size > 200) KL.delete(KL.keys().next().value); send(res, 200, data);
      }).catch(e => send(res, 502, { error: e.message }));
      return;
    }
    if (u.pathname === '/api/bots') return send(res, 200, feed.summary());
    if (u.pathname === '/api/messages') return send(res, 200, feed.messages(u.searchParams));
    const f = path.join(PUB, u.pathname === '/' ? 'index.html' : path.normalize(u.pathname).replace(/^([/\\])+/, ''));
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('yok'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  } catch (e) { send(res, 500, { error: e.message }); }
}).listen(PORT, HOST, () => { log(`Botlar ${VERSION} → http://localhost:${PORT}`); kasaMigrate().catch(e => log('kasa aktarım hatası:', e.message)); poll(); setInterval(poll, 1000); });
