'use strict';
// For each hammer message: find price intervals p such that round(RSI_tf(live close=p)) == printed, per tf, for two
// structural variants: A = closed bars (closeTime<t) + new live bar; B = bars closed before the current minute started
// minus the just-closed bar, i.e. just-closed bar treated as live with close=p.
const fs = require('node:fs'), path = require('node:path');
const I = require('../../lib/ind.cjs'); const { parse } = require('../../lib/ref.cjs'); const { klinesAt, ROOT } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const BOT = arg('bot', 'hammer-pro-plus'), MAX = +arg('max', 150);
const TFS = BOT === '1d-hammer-pro' ? ['1h', '4h', '1d'] : ['1m', '5m', '1h'];
function rsiWith(closes, p) { const c = closes.slice(); c[c.length - 1] = p; return I.rsi(c).at(-1); }
function interval(closes, want, p0) {
  // RSI increasing in p. find p where rsi crosses want-0.5 and want+0.5
  const f = p => rsiWith(closes, p);
  const solve = target => { let lo = p0 * 0.5, hi = p0 * 1.5; if (f(lo) > target) return lo; if (f(hi) < target) return hi; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(m) < target) lo = m; else hi = m; } return (lo + hi) / 2; };
  return [solve(want - 0.5), solve(want + 0.5)];
}
(async () => {
  const rows = fs.readFileSync(path.join(ROOT, 'ref', BOT + '.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => parse(JSON.parse(l))).sort((a, b) => b.t - a.t).slice(0, MAX);
  const out = [];
  for (const r of rows) {
    const o = { id: r.id, sym: r.symbol, t: r.createdAt, strat: r.strategy, dir: r.direction, price: r.price, prev: r.prevPrice, rsi: r.rsi, srsi: r.srsi, A: {}, B: {} };
    try {
      for (const tf of TFS) {
        const bars = await klinesAt(r.symbol, tf, r.t, 1000);
        const closed = bars.filter(b => b.closeTime < r.t);
        const live = bars.find(b => b.openTime <= r.t && b.closeTime >= r.t);
        const want = r.rsi[tf]; if (!Number.isFinite(want)) continue;
        const ca = [...closed.map(b => b.close), r.price];
        o.A[tf] = interval(ca, want, r.price).map(x => x / r.price);
        // B: last closed bar treated as live
        const cb = closed.map(b => b.close);
        o.B[tf] = interval(cb, want, r.price).map(x => x / r.price);
        if (tf === TFS[0]) { const lc = closed.at(-1); o.lastClosed = { o: lc.open, h: lc.high, l: lc.low, c: lc.close, openTime: lc.openTime }; o.live = live && { o: live.open, h: live.high, l: live.low, c: live.close }; o.secIntoBar = live ? (r.t - live.openTime) / 1000 : null; }
      }
    } catch (e) { o.err = e.message; }
    out.push(o);
  }
  fs.mkdirSync(path.join(ROOT, 'analysis'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'analysis', 'hammer-solve-' + BOT + '.json'), JSON.stringify(out));
  console.log('done', out.length);
})();
