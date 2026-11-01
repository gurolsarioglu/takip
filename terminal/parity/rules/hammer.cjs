'use strict';
// Hammer family: Visivero bots `hammer`, `hammer-pro`, `hammer-pro-plus`, `1d-hammer-pro`.
// Rules recovered in research/hammer/REPORT.md (parity lab). Pure, deterministic, no network.
//
// Core engine ("Pro"): strategies #W1 (WaveTrend), #S1 (RSI/SMA reversal), #R1 (overbought exhaustion).
//   hammer          = Pro #S1 + #R1 signals, printed without Strategy/WT lines          (98.7 % overlap measured)
//   hammer-pro      = all Pro signals
//   hammer-pro-plus = Pro signals with Boost >= 2.00 %  OR  six-way extreme RSI/SRSI     (99 % / 100 % measured)
//   1d-hammer-pro   = same engine on the 1h | 4h | 1d layout, primary 1d (EXPERIMENTAL, not validated)
const I = require('../lib/ind.cjs');
const PIV = require('../lib/pivot.cjs');
const VVL = require('../lib/vv-last.cjs');
// Visivero W1 does not repeat the same direction within 96 h of its last W1 for the symbol (live 26–27.10: blocks
// 96/180 of our extra W1, keeps 52/52 matched). While the Visivero feed is followed, use its last W1 as state.
const W1_SAME_DIR_BLOCK_MS = 96 * 3600e3;

const isNum = Number.isFinite;
const COOLDOWN_MS = 32 * 3600e3; // (superseded by the direction toggle below)
// Live 26.10 02–06 UTC: #S1 78 signals / 3 correct, #R1 4 / 1 -> disabled until solved (W1 stays on: 12/13 recall).
const ENABLE = { S1: false, R1: false };
let SEED = {};
try { const raw = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'lib', 'hammer-seed.json'), 'utf8')); SEED = raw.state || {}; } catch { }          // per (symbol, strategy, direction); best fit 30–33 h, see REPORT
const LAYOUTS = {
  m: { tfs: ['1m', '5m', '1h'], primary: '1m', bots: ['hammer', 'hammer-pro', 'hammer-pro-plus'] },
  d: { tfs: ['1h', '4h', '1d'], primary: '1d', bots: ['1d-hammer-pro'] }
};
const P = { // thresholds (direction-normalised: "ext" = value for up, 100-value for down)
  W1: { wt2: 53, boostMin: 1.0, minExt5: 26.5 },
  S1: { rsiMax: 30, smaMax: 30, rsi5Max: 45, k5Max: 30, boostMin: 0.4 },
  R1: { rsi1Min: 71, rsi1Max: 85, rsi5Min: 72, rsi1hMin: 68, boostMin: 1.9 },
  PLUS: { boostMin: 2.0, ext: { r1: 22, r5: 23, r1h: 27, k: 10 } }
};

// ---------- indicator helpers on [closed..., live] bar arrays ----------
function seriesInfo(bars) {
  const closes = bars.map(b => b.close);
  const sr = I.stochRsi(closes, 14, 14, 3, 3);
  const sma = I.sma(sr.rsi, 14);
  return { closes, rsi: sr.rsi, k: sr.k, sma };
}
// Wilder RSI of closes[0..i-1] followed by price p at index i (used for "RSI at bar low/high")
function rsiAt(closes, i, p) { const c = closes.slice(0, i + 1); c[i] = p; return I.rsi(c).at(-1); }
const ext = (v, D) => D === 1 ? v : 100 - v;
function impulseBoost(bars, D, n = 5) {
  let m = 0; for (const b of bars.slice(-n)) { const v = D === 1 ? (b.open - b.low) / b.low * 100 : (b.high - b.open) / b.open * 100; if (v > m) m = v; } return m;
}
function wtCrossClosed(closedBars) {
  if (closedBars.length < 60) return 0;
  const wt = I.waveTrend(closedBars, 10, 21, 4, 'first');
  const i = closedBars.length - 1;
  return { x: I.crossAt(wt.wt1, wt.wt2, i), wt1: wt.wt1[i], wt2: wt.wt2[i] };
}
function divergence(bars, rsi, D) { // regular RSI divergence on the last two 2/2 pivots within 30 bars (unverified)
  const n = bars.length, lo = Math.max(0, n - 32);
  const src = D === 1 ? bars.map(b => b.low) : bars.map(b => b.high);
  const piv = (D === 1 ? I.pivotLows(src, 2, 2) : I.pivotHighs(src, 2, 2)).filter(i => i >= lo);
  if (piv.length < 2) return false;
  const [a, b] = piv.slice(-2);
  return D === 1 ? (src[b] < src[a] && rsi[b] > rsi[a] && rsi[a] <= 35) : (src[b] > src[a] && rsi[b] < rsi[a] && rsi[a] >= 65);
}

// ---------- formatting ----------
const fmtNum = v => { if (!isNum(v)) return '—'; const s = String(+v.toPrecision(10)); return s.includes('e') ? v.toFixed(10).replace(/0+$/, '') : s; };
const rsiTxt = (tf, v) => `${tf}.${Math.round(v)}${Math.round(v) <= 30 || Math.round(v) >= 70 ? '❗️' : ''}`;
const srsiTxt = (tf, v) => `${tf}.${Math.round(v)}${Math.round(v) <= 10 || Math.round(v) >= 90 ? '❗️' : ''}`;
const stars = b => b >= 5 ? '⭐️⭐️⭐️' : b >= 3 ? '⭐️⭐️' : b >= 2 ? '⭐️' : '';
function slots(tfs, tags) { return tfs.map(tf => tags[tf] || '').join(' '); }
function formatText(botId, s) {
  const L = [`${s.direction === 'up' ? '🟢' : '🔴'} #${s.symbol} ${stars(s.boostPct)}`];
  if (botId !== 'hammer') L.push(`Strategy: ${s.strategy}`);
  L.push(`Boost Value: +${s.boostPct.toFixed(2)}% `, `Current Price: ${fmtNum(s.price)}`, `Previous Price: ${fmtNum(s.prevPrice)}`);
  L.push(`RSI: <b>${s.tfs.map(tf => rsiTxt(tf, s.rsi[tf])).join(' | ')} </b>`);
  L.push(`SRSI: <b>${s.tfs.map(tf => srsiTxt(tf, s.srsi[tf])).join(' | ')} </b>`);
  const f = s.fields;
  if (botId !== 'hammer') {
    if (f.divergence) L.push(`Divergence: ${f.divergence}`);
    if (f.wt) L.push(`WT: <b>${f.wt}</b>`);
    if (isNum(f.pivotPct)) L.push(`Pivot: %${f.pivotPct.toFixed(2)} ⚠️`);
    if (isNum(f.ema200Pct)) L.push(`4H.E200: %${f.ema200Pct.toFixed(2)} ⚠️`);
  }
  if (isNum(f.frPct)) L.push(`FR: ${f.frPct.toFixed(2)} ⚠️`);
  if (f.coinNew && botId !== 'hammer') L.push('Coin Status: New ⚠️');
  if (f.btcVolatile) L.push('BTC Status: Volatilite ⚡️');
  return L.join('\n');
}

// ---------- core evaluation ----------
function evaluateLayout(ctx, layout) {
  const st = ctx.state || (ctx.state = {});
  const key = layout.primary;
  st[key] = st[key] || { last: {}, lastClosedOpen: null };
  const S = st[key];
  const tfs = layout.tfs, prim = layout.primary;
  const bars = ctx.bars || {};
  if (!tfs.every(tf => Array.isArray(bars[tf]) && bars[tf].length > 80)) return [];
  const info = {}; for (const tf of tfs) info[tf] = seriesInfo(bars[tf]);
  const pb = bars[prim], n = pb.length, live = pb[n - 1], closed = pb.slice(0, -1);
  const pi = info[prim];
  const price = ctx.price;
  const out = [];
  const newBar = S.lastClosedOpen !== closed[closed.length - 1].openTime; // first call after a primary bar closed
  S.lastClosedOpen = closed[closed.length - 1].openTime;
  // filters use the second (5m / 4h) and the 1h timeframe
  const sec = layout === LAYOUTS.m ? '5m' : '4h', ter = layout === LAYOUTS.m ? '1h' : '1h';
  const cand = [];

  // #W1: WaveTrend cross on the just-closed primary bar, in the OB/OS zone, after an impulse
  if (newBar) {
    const w = wtCrossClosed(closed);
    if (w && w.x !== 0) {
      const D = w.x;
      const zoneOk = D === 1 ? w.wt2 <= -P.W1.wt2 : w.wt2 >= P.W1.wt2;
      const boost = impulseBoost(closed, D, 5);
      let minExt = 99;
      for (let j = closed.length - 5; j < closed.length; j++) { const b = closed[j]; minExt = Math.min(minExt, ext(rsiAt(pi.closes, j, D === 1 ? b.low : b.high), D)); }
      // weekly Fibonacci pivot proximity gate (live 26.10, 189 labelled W1: all 53 true <= 8.6 %, removes 36/136 false;
      // stable in both halves of the day). Tighter 4.3 % would remove 61 false but lose 5/53 true -> not used yet.
      const pivD = PIV.weeklyFibPivotDistPct(ctx.bars['1w'], price);
      const pivOk = !Number.isFinite(pivD) || pivD <= 9;
      // volatility cap (Hammer guide: alarms only for coins with "the volume and volatility we want"; live 26.10, 189 labelled
      // W1: all 53 true had 24h high/low range <= 22.6 %, 45 of 136 false were above -> cap 23 %, consistent in both halves)
      const h24 = (ctx.bars['1h'] || []).slice(-25);
      const range24 = h24.length >= 12 ? (Math.max(...h24.map(b => b.high)) / Math.min(...h24.map(b => b.low)) - 1) * 100 : NaN;
      const volOk = !Number.isFinite(range24) || range24 <= 23;
      let vvOk = true;
      if (layout === LAYOUTS.m) { const v = VVL.last('hammer-pro', ctx.symbol, '#W1'); if (v && v.d === D && ctx.t - v.t > 120e3 && ctx.t - v.t < W1_SAME_DIR_BLOCK_MS) vvOk = false; }
      if (zoneOk && pivOk && volOk && vvOk && boost >= P.W1.boostMin && minExt <= P.W1.minExt5) cand.push({ strategy: '#W1', D, boost, wtTag: true });
    }
  }
  // intrabar strategies on the live bar
  const r1 = pi.rsi[n - 1], sma1 = pi.sma[n - 1], r1p = pi.rsi[n - 2], sma1p = pi.sma[n - 2];
  const r5 = info[sec].rsi.at(-1), k5 = info[sec].k.at(-1), r1h = info[ter].rsi.at(-1);
  for (const D of [1, -1]) {
    const boost = impulseBoost(pb, D, 5);
    // #S1: RSI(14) crosses its SMA(14) inside the live bar while deeply oversold/overbought
    const crossed = D * (r1p - sma1p) < 0 && D * (r1 - sma1) >= 0;
    const oldS1 = crossed && ext(r1, D) < P.S1.rsiMax && ext(sma1, D) <= P.S1.smaMax && ext(r5, D) <= P.S1.rsi5Max && ext(k5, D) <= P.S1.k5Max && boost >= P.S1.boostMin;
    if (oldS1 && ENABLE.S1) cand.push({ strategy: '#S1', D, boost });
    // EXPERIMENT (26.10, user hint): 145/150 Visivero #S1 had a Trader Club reversal diamond (RSI21 < 30 & RSI21 < EMA10(RSI21),
    // mirrored for down) on the live bar or one of the last 3 closed 1m bars. Logged under botId 'exp-hammer-s1' only
    // (not a Visivero bot id) so precision can be measured live without polluting hammer outputs.
    if (crossed && layout === LAYOUTS.m && ext(r1, D) < 40) {
      const cl = pi.closes, r21 = I.rsi(cl.slice(-300), 21), av = I.ema(r21.map(v => (Number.isFinite(v) ? v : 0)), 10, 'sma'), L = r21.length - 1;
      const dia = i => (D === 1 ? r21[i] < 30 && r21[i] < av[i] : r21[i] > 70 && r21[i] > av[i]);
      const diaRecent = dia(L) || dia(L - 1) || dia(L - 2) || dia(L - 3);
      const ek = 'exp|' + D;
      if (diaRecent && !(isNum(S.last[ek]) && ctx.t - S.last[ek] < 180e3)) {
        S.last[ek] = ctx.t;
        out.push({ botId: 'exp-hammer-s1', symbol: ctx.symbol, direction: D === 1 ? 'up' : 'down', strategy: '#S1', boostPct: +boost.toFixed(2), price, prevPrice: closed[closed.length - 1].close,
          rsi: { '1m': r1, '5m': r5, '1h': r1h }, srsi: { '5m': k5 }, fields: { oldS1, sma1, diaLive: dia(L), r21: r21[L], pivot: PIV.weeklyFibPivotDistPct(ctx.bars['1w'], price) }, text: '' });
      }
    }
  }
  { // #R1 (down only): exhaustion after a sharp rise
    const D = -1, boost = impulseBoost(pb, D, 5);
    if (r1 >= P.R1.rsi1Min && r1 <= P.R1.rsi1Max && r5 >= P.R1.rsi5Min && r1h >= P.R1.rsi1hMin && boost >= P.R1.boostMin && r1 < r1p) // R1 rule only partially recovered
      if (ENABLE.R1) cand.push({ strategy: '#R1', D, boost });
  }
  for (const c of cand) {
    // Direction toggle (measured live 25.10: W1 precision 0.17 -> 0.37 at equal recall): after a signal in direction D,
    // the same strategy for this symbol re-arms only after a signal in the opposite direction. Visivero resets this on
    // restart (all symbols armed -> message flood). Initial state comes from lib/hammer-seed.json when available.
    if (!S.dir) S.dir = layout === LAYOUTS.m ? { ...(SEED[ctx.symbol] || {}) } : {};
    if (S.dir[c.strategy] === c.D) continue;
    const ck = `${c.strategy}|${c.D}`;
    if (isNum(S.last[ck]) && ctx.t - S.last[ck] < 10 * 60e3) continue; // safety against duplicates
    S.last[ck] = ctx.t; S.dir[c.strategy] = c.D;
    const rsi = {}, srsi = {};
    for (const tf of tfs) { rsi[tf] = info[tf].rsi.at(-1); srsi[tf] = info[tf].k.at(-1); }
    // WT line: tags for each tf whose last closed bar shows a WT cross in signal direction
    const tags = {};
    for (const tf of tfs) {
      const wc = tf === prim ? wtCrossClosed(closed) : wtCrossClosed(bars[tf].slice(0, -1));
      if (wc && wc.x !== 0) tags[tf] = `${tf}${wc.x === 1 ? '🟢' : '🔴'}`;
    }
    const divTags = {};
    for (const tf of tfs) if (divergence(bars[tf], info[tf].rsi, c.D)) divTags[tf] = `${tf}✅`;
    // Pivot (weekly Fibonacci pivots) and 4H EMA200 proximity (< 1 %)
    let pivotPct = null, ema200Pct = null;
    { const d = PIV.weeklyFibPivotDistPct(ctx.bars['1w'], price); if (d < 1) pivotPct = d; } // weekly Fibonacci pivots (verified)
    if (Array.isArray(ctx.bars['4h']) && ctx.bars['4h'].length >= 200) { const e = I.ema(ctx.bars['4h'].map(b => b.close), 200).at(-1); const d = Math.abs(price - e) / e * 100; if (d < 1) ema200Pct = d; }
    const frPct = ctx.funding && isNum(ctx.funding.rate) && ctx.funding.rate * 100 <= -0.20 ? ctx.funding.rate * 100 : null;
    let btcVolatile = false; // EXPERIMENTAL: |BTC 1h change| >= 0.5 % (rule not recovered)
    const bb = ctx.btc && ctx.btc.bars && ctx.btc.bars['1h']; if (Array.isArray(bb) && bb.length) { const b = bb.at(-1); btcVolatile = Math.abs(b.close / b.open - 1) * 100 >= 0.5; }
    const sig = {
      symbol: ctx.symbol, direction: c.D === 1 ? 'up' : 'down', strategy: c.strategy, boostPct: +c.boost.toFixed(2), price, prevPrice: closed.at(-1).close,
      rsi, srsi, tfs,
      fields: { wt: Object.keys(tags).length ? slots(tfs, tags) : null, divergence: Object.keys(divTags).length ? slots(tfs, divTags) : null, pivotPct, ema200Pct, frPct, btcVolatile, coinNew: !!ctx.coinNew }
    };
    const plusExtreme = tfs.length === 3 && ext(rsi[tfs[0]], c.D) <= P.PLUS.ext.r1 && ext(rsi[tfs[1]], c.D) <= P.PLUS.ext.r5 && ext(rsi[tfs[2]], c.D) <= P.PLUS.ext.r1h && tfs.every(tf => ext(srsi[tf], c.D) <= P.PLUS.ext.k);
    const targets = layout === LAYOUTS.d ? ['1d-hammer-pro'] : ['hammer-pro', ...(c.boost >= P.PLUS.boostMin || plusExtreme ? ['hammer-pro-plus'] : []), ...(c.strategy !== '#W1' ? ['hammer'] : [])];
    for (const botId of targets) {
      const s = { botId, ...sig, rsi: { ...rsi }, srsi: { ...srsi } };
      s.text = formatText(botId, s);
      delete s.tfs;
      out.push(s);
    }
  }
  return out;
}

module.exports = {
  family: 'hammer',
  bots: ['hammer', 'hammer-pro', 'hammer-pro-plus', '1d-hammer-pro'],
  needs: { '1m': 300, '5m': 300, '1h': 300, '4h': 250, '1d': 120 },
  extras: ['funding', 'btc'],
  cadenceMs: 1000,
  params: P,
  COOLDOWN_MS,
  evaluate(ctx) {
    const out = evaluateLayout(ctx, LAYOUTS.m);
    // 1d-hammer-pro: only evaluated if the caller provides the daily layout (EXPERIMENTAL)
    if (ctx.enable1d) out.push(...evaluateLayout(ctx, LAYOUTS.d));
    return out;
  },
  _internal: { evaluateLayout, LAYOUTS, formatText, impulseBoost, wtCrossClosed }
};
