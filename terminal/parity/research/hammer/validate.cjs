'use strict';
// Replays rules/hammer.cjs over Binance 1m history and compares with Visivero reference messages.
// Usage: node validate.cjs --from ISO --to ISO [--symbols A,B] [--out name] [--seed 1]
// Evaluation points per 1m bar: (a) 2 s after the bar closed (live bar = flat new bar),
// (b) intrabar at the bar's low and at its high (30 s into the bar). Prefilter: 5-bar impulse >= 0.4 %.
const fs = require('node:fs'), path = require('node:path');
const H = require('../../rules/hammer.cjs');
const { parse } = require('../../lib/ref.cjs');
const { klinesRange, exchangeInfo, ROOT, IMS } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FROM = Date.parse(arg('from')), TO = Date.parse(arg('to')), WARM = 400, HIST = 300;
const SEED = arg('seed', '1') === '1';
const BOTS = ['hammer', 'hammer-pro', 'hammer-pro-plus'];

function loadRefs() {
  const R = {};
  for (const b of BOTS) R[b] = fs.readFileSync(path.join(ROOT, 'ref', b + '.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => parse(JSON.parse(l))).map(r => ({ ...r, strategy: r.strategy || '#S1' }));
  return R;
}
(async () => {
  const refs = loadRefs();
  let symbols = arg('symbols');
  if (symbols) symbols = symbols.split(',');
  else { const info = await exchangeInfo(); symbols = info.symbols.filter(s => s.contractType === 'PERPETUAL' && s.status === 'TRADING' && ['USDT', 'USDC'].includes(s.quoteAsset)).map(s => s.symbol); }
  const signals = [];
  let done = 0;
  for (const sym of symbols) {
    let T = {};
    try {
      for (const tf of ['1m', '5m', '1h']) { const ms = IMS[tf]; T[tf] = await klinesRange(sym, tf, Math.floor(FROM / ms) * ms - WARM * ms, TO); if (T[tf].length < 100) throw new Error('short'); }
    } catch (e) { continue; }
    const state = {};
    if (SEED) { // seed cooldowns with the reference history before the window (bot hammer-pro)
      const last = {}; for (const r of refs['hammer-pro']) if (r.symbol === sym && r.t < FROM) { const k = `${r.strategy}|${r.direction === 'up' ? 1 : -1}`; last[k] = Math.max(last[k] || 0, r.t); }
      state['1m'] = { last, lastClosedOpen: null };
    }
    const m1 = T['1m'], m5 = T['5m'], h1 = T['1h'];
    let j5 = 0, jh = 0;
    for (let i = HIST; i < m1.length; i++) {
      const b = m1[i]; if (b.openTime < FROM || b.closeTime > TO) continue;
      // prefilter on impulse
      const last5 = m1.slice(i - 4, i + 1); let mx = 0; for (const x of last5) mx = Math.max(mx, (x.open - x.low) / x.low * 100, (x.high - x.open) / x.open * 100);
      const prevHot = (() => { let m = 0; for (const x of m1.slice(i - 5, i)) m = Math.max(m, (x.open - x.low) / x.low * 100, (x.high - x.open) / x.open * 100); return m; })();
      const points = [];
      if (prevHot >= 0.4) points.push({ t: b.openTime + 2000, price: b.open, live: { openTime: b.openTime, open: b.open, high: b.open, low: b.open, close: b.open, closeTime: b.closeTime, isLive: true } });
      if (mx >= 0.4) {
        points.push({ t: b.openTime + 30000, price: b.low, live: { openTime: b.openTime, open: b.open, high: Math.max(b.open, b.low), low: b.low, close: b.low, closeTime: b.closeTime, isLive: true } });
        points.push({ t: b.openTime + 31000, price: b.high, live: { openTime: b.openTime, open: b.open, high: b.high, low: Math.min(b.open, b.high), close: b.high, closeTime: b.closeTime, isLive: true } });
      }
      // also evaluate the bounce point after the extreme (close) for S1
      if (mx >= 0.4) points.push({ t: b.openTime + 55000, price: b.close, live: { openTime: b.openTime, open: b.open, high: b.high, low: b.low, close: b.close, closeTime: b.closeTime, isLive: true } });
      for (const pt of points) {
        const c1 = m1.slice(i - HIST, i).concat([pt.live]);
        const mk = (arr, ms) => {
          let k = arr.findIndex(x => x.openTime + ms > pt.t); if (k < 0) k = arr.length;
          const closed = arr.slice(Math.max(0, k - HIST), k);
          const bucket = Math.floor(pt.t / ms) * ms; const parts = m1.slice(0, i).filter(x => x.openTime >= bucket).concat([pt.live]);
          const lv = { openTime: bucket, open: parts[0].open, high: Math.max(...parts.map(x => x.high)), low: Math.min(...parts.map(x => x.low)), close: pt.price, closeTime: bucket + ms - 1, isLive: true };
          return closed.concat([lv]);
        };
        const ctx = { symbol: sym, t: pt.t, price: pt.price, bars: { '1m': c1, '5m': mk(m5, 300e3), '1h': mk(h1, 3600e3) }, state };
        for (const s of H.evaluate(ctx)) signals.push({ botId: s.botId, symbol: sym, strategy: s.strategy, direction: s.direction, t: pt.t, boost: s.boostPct, rsi: s.rsi });
      }
    }
    if (++done % 25 === 0) console.log('symbols', done, '/', symbols.length, 'signals', signals.length);
  }
  // match
  const symSet = new Set(symbols);
  const report = {};
  for (const bot of BOTS) {
    const R = refs[bot].filter(r => symSet.has(r.symbol) && r.t >= FROM + 60e3 && r.t <= TO);
    const L = signals.filter(s => s.botId === bot);
    const used = new Set();
    const per = {};
    const get = k => per[k] = per[k] || { tp: 0, fp: 0, fn: 0, dt: [] };
    for (const s of L) {
      const k = `${s.strategy}|${s.direction}`;
      const m = R.find(r => !used.has(r.id) && r.symbol === s.symbol && r.direction === s.direction && (bot === 'hammer' || r.strategy === s.strategy) && Math.abs(r.t - s.t) <= 90e3);
      if (m) { used.add(m.id); get(k).tp++; get(k).dt.push(Math.round((m.t - s.t) / 1000)); } else get(k).fp++;
    }
    for (const r of R) if (!used.has(r.id)) get(`${bot === 'hammer' ? '#S1' : r.strategy}|${r.direction}`).fn++;
    for (const [k, v] of Object.entries(per)) { v.precision = +(v.tp / Math.max(1, v.tp + v.fp)).toFixed(3); v.recall = +(v.tp / Math.max(1, v.tp + v.fn)).toFixed(3); v.dt.sort((a, b) => a - b); v.dtMedian = v.dt[Math.floor(v.dt.length / 2)] ?? null; delete v.dt; }
    report[bot] = per;
  }
  const out = { from: new Date(FROM).toISOString(), to: new Date(TO).toISOString(), symbols: symbols.length, seededCooldown: SEED, report };
  fs.mkdirSync(path.join(ROOT, 'analysis'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'analysis', 'hammer-validate-' + arg('out', 'run') + '.json'), JSON.stringify({ ...out, signals }, null, 0));
  console.log(JSON.stringify(out, null, 1));
})();
