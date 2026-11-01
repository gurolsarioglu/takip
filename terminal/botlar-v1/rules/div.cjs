'use strict';
// Visivero "div" bot replica (1H/4H RSI DIVERGENCE, 1H/4H RSI SMA CROSSED). Pure, deterministic.
// Evidence and measured accuracy: research/div/REPORT.md
const I = require('../lib/ind.cjs');
const PIV = require('../lib/pivot.cjs');
const SCHED = require('../lib/schedule.cjs');
// Live 26.10 02–06 UTC: SMA CROSSED (1H/4H) and 4H DIVERGENCE produced 29 signals, 0 matched Visivero -> disabled until solved.
const ENABLE = { smaCross: false, tf4h: false };

const HOUR = 3600e3;
const SCAN_WINDOW_MS = 15 * 60e3;      // Visivero scans all symbols alphabetically during ~:00–:13 of each hour
const DIV_OPTS = { N: 80, minDist: 2, anchorRsi: 30, pivR: 5, liveUp: 40, liveDown: 57, coolBars: 3 };
const SMA_OPTS = { len: 14, closedUp: 30, closedDown: 70, coolMs: 24 * HOUR };

const fin = Number.isFinite;

/**
 * Reusable "anchor" RSI divergence on the LAST CLOSED bar (index i = bars.length-2 when the last bar is live).
 * bull: anchor j = bar with the lowest RSI in [i-N, i-minDist]; requires RSI[j] <= anchorRsi, RSI[j] is a local
 *       RSI minimum (±pivR), low[i] < low[j], RSI[i] > RSI[j], and no low between j and i is below low[i].
 * bear: mirror (highest RSI, >= 100-anchorRsi, highs).
 * @param bars closed bars (+ optional live bar at the end, flagged isLive) {high,low,close}
 * @param rsi  RSI series aligned with bars
 * @returns {up:{anchorIndex,anchorTime}|null, down:{...}|null, i}
 */
function anchorDivergence(bars, rsi, opts = {}) {
  const o = { ...DIV_OPTS, ...opts };
  const i = bars.length - 1 - (bars.at(-1)?.isLive ? 1 : 0);
  const out = { up: null, down: null, i };
  const a = i - o.N, b = i - o.minDist;          // inclusive window for anchor
  if (a < o.pivR || !fin(rsi[i])) return out;
  for (const bull of [true, false]) {
    let j = -1;
    for (let k = a; k <= b; k++) {
      if (!fin(rsi[k])) continue;
      if (j < 0 || (bull ? rsi[k] < rsi[j] : rsi[k] > rsi[j])) j = k;
    }
    if (j < 0) continue;
    const rj = rsi[j];
    if (bull ? rj > o.anchorRsi : rj < 100 - o.anchorRsi) continue;
    let piv = true;
    for (let k = j - o.pivR; k <= j + o.pivR; k++) if (fin(rsi[k]) && (bull ? rsi[k] < rj : rsi[k] > rj)) piv = false;
    if (!piv) continue;
    const pi = bull ? bars[i].low : bars[i].high, pj = bull ? bars[j].low : bars[j].high;
    if (bull ? !(pi < pj && rsi[i] > rj) : !(pi > pj && rsi[i] < rj)) continue;
    let clean = true;
    for (let k = j + 1; k < i; k++) if (bull ? bars[k].low < pi : bars[k].high > pi) { clean = false; break; }
    if (!clean) continue;
    out[bull ? 'up' : 'down'] = { anchorIndex: j, anchorTime: bars[j].openTime, rsiAnchor: rj, rsiNow: rsi[i] };
  }
  return out;
}

function rsiSmaCross(rsiLive, len = 14) {
  const s = I.sma(rsiLive, len);
  const n = rsiLive.length - 1;
  if (n < 1 || !fin(s[n]) || !fin(s[n - 1])) return 0;
  return I.crossAt(rsiLive, s, n);
}

function impulse5(bars, direction) {
  let best = null;
  for (const k of bars.slice(-5)) {
    const v = direction === 'up' ? (k.open - k.low) / k.low * 100 : (k.high - k.open) / k.open * 100;
    if (fin(v) && (best === null || v > best)) best = v;
  }
  return best;
}

const rsiTxt = v => fin(v) ? `${Math.round(v)}${v <= 30 || v >= 70 ? '❗️' : ''}` : '-';
const srsiTxt = v => fin(v) ? `${Math.round(v)}${v <= 10 || v >= 90 ? '❗️' : ''}` : '-';

function formatText(sig) {
  const dot = sig.direction === 'up' ? '🟢' : '🔴';
  const r = sig.rsi, s = sig.srsi;
  return [
    `${dot} #${sig.symbol}  `,
    `Strategy: ${sig.strategy}`,
    `Boost Value: +${fin(sig.boostPct) ? sig.boostPct.toFixed(2) : '0.00'}% `,
    `Current Price: ${sig.price}`,
    `Previous Price: ${sig.prevPrice}`,
    `RSI: <b>1h.${rsiTxt(r['1h'])} | 4h.${rsiTxt(r['4h'])} | 1d.${rsiTxt(r['1d'])} </b>`,
    `SRSI: <b>1h.${srsiTxt(s['1h'])} | 4h.${srsiTxt(s['4h'])} | 1d.${srsiTxt(s['1d'])} </b>`,
    ...(fin(sig.fields?.pivotPct) && sig.fields.pivotPct < 1 ? [`Pivot: %${sig.fields.pivotPct.toFixed(2)} ⚠️`] : [])
  ].join('\n');
}

function tfIndicators(bars) {
  const closes = bars.map(b => b.close);
  const sr = I.stochRsi(closes);
  return { rsi: sr.rsi, k: sr.k };
}

function evaluate(ctx) {
  const { symbol, t, price, bars } = ctx;
  const st = ctx.state || (ctx.state = {});
  const out = [];
  const hourStart = Math.floor(t / HOUR) * HOUR;
  if (t - hourStart > SCAN_WINDOW_MS || st.lastScan === hourStart) return out;
  // evaluate at the moment Visivero's alphabetical scan reaches this symbol (calibrated offsets)
  if (t - hourStart < SCHED.offsetMs('div', symbol, 0)) return out;
  if (!bars?.['1h'] || bars['1h'].length < 120) return out;
  st.lastScan = hourStart;
  const ind = {};
  for (const tf of ['1h', '4h', '1d']) if (bars[tf]?.length > 20) ind[tf] = tfIndicators(bars[tf]);
  const rsiNow = Object.fromEntries(Object.entries(ind).map(([tf, v]) => [tf, v.rsi.at(-1)]));
  const srsiNow = Object.fromEntries(Object.entries(ind).map(([tf, v]) => [tf, v.k.at(-1)]));
  const make = (tf, direction, strategy) => {
    const b = bars[tf];
    const sig = {
      botId: 'div', symbol, direction, strategy, price,
      prevPrice: b.at(-2)?.close,
      boostPct: (v => fin(v) ? Math.round(v * 100) / 100 : null)(impulse5(b, direction)),
      rsi: rsiNow, srsi: srsiNow, fields: { timeframe: tf, pivotPct: PIV.weeklyFibPivotDistPct(bars['1w'], price) }
    };
    sig.text = formatText(sig);
    return sig;
  };
  const scanTf = (tf, label) => {
    const b = bars[tf]; const R = ind[tf]?.rsi;
    if (!b || !R || b.length < 100) return false;
    const L = R.length - 1, rl = R[L];
    let fired = false;
    const d = anchorDivergence(b, R);
    st[tf] = st[tf] || { anchor: {}, lastDiv: {}, lastSma: {} };
    const S = st[tf];
    const barMs = tf === '1h' ? HOUR : 4 * HOUR;
    for (const dir of ['up', 'down']) {
      const hit = d[dir];
      if (!hit) continue;
      if (dir === 'up' ? rl > DIV_OPTS.liveUp : rl < DIV_OPTS.liveDown) continue;
      if (S.anchor[dir] === hit.anchorTime) continue;                       // one signal per anchor
      if (t - (S.lastDiv[dir] ?? -Infinity) < DIV_OPTS.coolBars * barMs) continue;
      S.anchor[dir] = hit.anchorTime; S.lastDiv[dir] = t;
      out.push(make(tf, dir, `${label} RSI DIVERGENCE`)); fired = true;
    }
    if (!ENABLE.smaCross) return fired;
    const x = rsiSmaCross(R, SMA_OPTS.len), rc = R[L - 1];
    const dir = x > 0 && rc <= SMA_OPTS.closedUp ? 'up' : x < 0 && rc >= SMA_OPTS.closedDown ? 'down' : null;
    if (dir && t - (S.lastSma[dir] ?? -Infinity) >= SMA_OPTS.coolMs && !out.some(s => s.fields.timeframe === tf && s.direction === dir)) {
      S.lastSma[dir] = t; out.push(make(tf, dir, `${label} RSI SMA CROSSED`)); fired = true;
    }
    return fired;
  };
  const fired1h = scanTf('1h', '1H');
  // 4H strategies are only reported at 4h boundaries and never in the same scan as a 1H DIVERGENCE (observed 0/44).
  if (ENABLE.tf4h && hourStart % (4 * HOUR) === 0 && !out.some(s => s.strategy === '1H RSI DIVERGENCE')) scanTf('4h', '4H');
  void fired1h;
  return out;
}

module.exports = {
  family: 'div',
  bots: ['div'],
  needs: { '1h': 300, '4h': 300, '1d': 200, '1w': 10 },
  extras: [],
  cadenceMs: 5_000,
  // engine replays the last 96 hourly scans at start-up (signals discarded) to rebuild cooldown / anchor state
  warmup: { stepMs: 3600e3, steps: 96, offsetMs: 14.5 * 60e3 },
  evaluate,
  anchorDivergence,
  rsiSmaCross,
  impulse5,
  formatText,
  DIV_OPTS,
  SMA_OPTS
};
