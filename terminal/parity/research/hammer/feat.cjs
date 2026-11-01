'use strict';
// Per-1m-bar feature extraction for the Hammer family, evaluated at each 1m bar close and at the bar's intrabar extremes.
// Usage: node feat.cjs --from 2026-10-23T16:00:00Z --to 2026-10-25T16:00:00Z [--symbols A,B] [--out name] [--primary 1m]
// --primary 1d switches to the 1d-hammer-pro layout (primary 1d, secondaries 4h & 1h, evaluated at each 1h close).
const fs = require('node:fs'), path = require('node:path');
const I = require('../../lib/ind.cjs'); const { klinesRange, exchangeInfo, ROOT, IMS } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FROM = Date.parse(arg('from')), TO = Date.parse(arg('to'));
const PRIMARY = arg('primary', '1m');
const LAYOUT = PRIMARY === '1m' ? { step: '1m', tfs: ['1m', '5m', '1h'] } : { step: '1h', tfs: ['1d', '4h', '1h'] };
const WARM = 400;

// incremental Wilder RSI state over closes
function rsiStates(closes) {
  const n = 14, st = new Array(closes.length).fill(null);
  let g = 0, l = 0;
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1], up = Math.max(d, 0), dn = Math.max(-d, 0);
    if (i < n) { g += up; l += dn; continue; }
    if (i === n) { g = (g + up) / n; l = (l + dn) / n; } else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; }
    st[i] = { g, l };
  }
  return st;
}
const rsiFrom = (g, l) => l === 0 ? (g === 0 ? 50 : 100) : g === 0 ? 0 : 100 - 100 / (1 + g / l);
function liveRsi(st, closes, i, p) { // closes[0..i] closed, live price p
  const s = st[i]; if (!s) return NaN; const d = p - closes[i];
  const g = (s.g * 13 + Math.max(d, 0)) / 14, l = (s.l * 13 + Math.max(-d, 0)) / 14; return rsiFrom(g, l);
}

class TF {
  constructor(bars) {
    this.bars = bars; this.closes = bars.map(b => b.close); this.st = rsiStates(this.closes);
    this.rsi = this.st.map(s => s ? rsiFrom(s.g, s.l) : NaN);
    const lo = I.rollMin(this.rsi, 14), hi = I.rollMax(this.rsi, 14);
    this.raw = this.rsi.map((v, i) => Number.isFinite(lo[i]) ? (hi[i] - lo[i] === 0 ? 0 : 100 * (v - lo[i]) / (hi[i] - lo[i])) : NaN);
    this.rsiSma = I.sma(this.rsi, 14);
    const wt = I.waveTrend(bars, 10, 21, 4, 'first'); this.wt1 = wt.wt1; this.wt2 = wt.wt2;
    this.idxByOpen = new Map(bars.map((b, i) => [b.openTime, i]));
  }
  lastClosedIdx(t) { let lo = 0, hi = this.bars.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (this.bars[m].closeTime < t) { r = m; lo = m + 1; } else hi = m - 1; } return r; }
  // indicators with closed bars up to i and a live bar closing at p
  live(i, p) {
    const r = liveRsi(this.st, this.closes, i, p);
    const win = [...this.rsi.slice(i - 12, i + 1), r];
    const mn = Math.min(...win), mx = Math.max(...win);
    const rawL = mx - mn === 0 ? 0 : 100 * (r - mn) / (mx - mn);
    const k = (this.raw[i - 1] + this.raw[i] + rawL) / 3;
    const sma = (this.rsi.slice(i - 12, i + 1).reduce((a, b) => a + b, 0) + r) / 14;
    return { rsi: r, k, sma };
  }
}

(async () => {
  let symbols = arg('symbols');
  if (symbols) symbols = symbols.split(',');
  else { const info = await exchangeInfo(); symbols = info.symbols.filter(s => s.contractType === 'PERPETUAL' && s.status === 'TRADING' && ['USDT', 'USDC'].includes(s.quoteAsset)).map(s => s.symbol); }
  const outFile = path.join(ROOT, 'analysis', 'hammer-feat-' + arg('out', PRIMARY) + '.jsonl');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const w = fs.createWriteStream(outFile);
  let done = 0;
  for (const sym of symbols) {
    try {
      const T = {};
      for (const tf of LAYOUT.tfs.concat(LAYOUT.step === '1m' ? [] : ['1h'])) {
        if (T[tf]) continue;
        const ms = IMS[tf];
        const bars = await klinesRange(sym, tf, Math.floor(FROM / ms) * ms - WARM * ms, TO);
        if (bars.length < 60) throw new Error('short ' + tf);
        T[tf] = new TF(bars);
      }
      const stepTF = T[LAYOUT.step];
      const [P, S2, S3] = LAYOUT.tfs.map(tf => T[tf]);
      for (let i = 0; i < stepTF.bars.length; i++) {
        const b = stepTF.bars[i]; const t = b.closeTime + 1; if (t < FROM || t > TO) continue;
        const rec = { s: sym, t, o: b.open, h: b.high, l: b.low, c: b.close };
        // primary tf: closed-bar view (bar i of primary that closes at t) when step==primary, else live view
        const evalTF = (X, p) => {
          const j = X.lastClosedIdx(t); // closed bars strictly before t (bar closing at t-1 included)
          if (X === stepTF) return { rsiC: X.rsi[j], kC: (X.raw[j] + X.raw[j - 1] + X.raw[j - 2]) / 3, smaC: X.rsiSma[j], rsiP: X.rsi[j - 1], smaP: X.rsiSma[j - 1], wt1: X.wt1[j], wt2: X.wt2[j], wt1p: X.wt1[j - 1], wt2p: X.wt2[j - 1] };
          // live bar of X at time t (X bar containing t-1)
          const jj = X.lastClosedIdx(t - 1); const L = X.live(jj, p);
          return { rsi: L.rsi, k: L.k, sma: L.sma, rsiPrevClosed: X.rsi[jj], smaPrevClosed: X.rsiSma[jj], wt1: X.wt1[jj], wt2: X.wt2[jj] };
        };
        // At step-bar close: primary closed view; secondaries live with price = close
        rec.P = evalTF(P, b.close);
        if (LAYOUT.step !== LAYOUT.tfs[0]) { // 1d layout: primary is live
          const jj = P.lastClosedIdx(t - 1); rec.Pl = P.live(jj, b.close); rec.Plo = P.live(jj, b.low); rec.Phi = P.live(jj, b.high);
          rec.Pwt = { wt1: P.wt1[jj], wt2: P.wt2[jj], wt1p: P.wt1[jj - 1], wt2p: P.wt2[jj - 1] };
        }
        rec.S2 = evalTF(S2, b.close); rec.S3 = evalTF(S3, b.close);
        // intrabar extremes for the step bar (previous closed + bar i as live at low/high)
        const lowL = stepTF.live(i - 1, b.low), highL = stepTF.live(i - 1, b.high);
        rec.lo = { rsi: lowL.rsi, k: lowL.k, sma: lowL.sma }; rec.hi = { rsi: highL.rsi, k: highL.k, sma: highL.sma };
        const j5 = S2.lastClosedIdx(t - 1); rec.S2lo = S2.live(j5, b.low); rec.S2hi = S2.live(j5, b.high);
        const j6 = S3.lastClosedIdx(t - 1); rec.S3lo = S3.live(j6, b.low); rec.S3hi = S3.live(j6, b.high);
        // keep only potentially interesting rows to bound size
        const wtX = I.crossAt(stepTF.wt1, stepTF.wt2, i);
        rec.wtX = wtX;
        const interesting = wtX !== 0 || lowL.rsi < 35 || highL.rsi > 65 || (rec.Plo && (rec.Plo.rsi < 35 || rec.Phi.rsi > 65)) || (rec.Pwt && I.crossAt(P.wt1, P.wt2, P.lastClosedIdx(t - 1)) !== 0);
        if (!interesting) continue;
        // 5-bar impulse boosts (4 closed + bar i)
        const last5 = stepTF.bars.slice(Math.max(0, i - 4), i + 1);
        rec.bUp = Math.max(...last5.map(x => (x.open - x.low) / x.low * 100)); rec.bDn = Math.max(...last5.map(x => (x.high - x.open) / x.open * 100));
        const l5b = stepTF.bars.slice(Math.max(0, i - 3), i + 1).concat([{ open: b.close, high: b.close, low: b.close }]);
        rec.bUp2 = Math.max(...l5b.map(x => (x.open - x.low) / x.low * 100)); rec.bDn2 = Math.max(...l5b.map(x => (x.high - x.open) / x.open * 100));
        w.write(JSON.stringify(rec, (k, v) => typeof v === 'number' ? +v.toFixed(4) : v) + '\n');
      }
    } catch (e) { console.error(sym, e.message); }
    if (++done % 25 === 0) console.log('symbols', done, '/', symbols.length);
  }
  w.end(); console.log('done');
})();
