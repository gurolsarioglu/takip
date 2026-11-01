'use strict';
// Visivero 4S / 4S Sniper / 1DWS reproduction (family "four-s"). Pure, deterministic, no network.
// Recovered by sub-agent foursn — see research/foursn/REPORT.md for evidence and measured match rates.
//
// Scan schedule (measured): 4s + 4sniper are evaluated ONCE per symbol per 4h cycle, during the first ~15 min after
// each 4h candle open (UTC 00/04/08/12/16/20), symbols scanned in alphabetical order. 1dws once per 12h (00/12 UTC).
// No cooldown: the same symbol/strategy fires again every cycle while the condition holds.
// The engine may call evaluate() often; this module emits at most once per symbol per bot per cycle (state).
const I = require('../lib/ind.cjs');
const SCHED = require('../lib/schedule.cjs');

const H4 = 4 * 3600e3, H12 = 12 * 3600e3;
const P = {
  // 4S: live-4h WaveTrend(10,21,4) cross + WT1 beyond ±WT_LEVEL
  wtLevel: 55,
  // 4S Sniper NW (4h, h=8, mult=3, repaint, last 500 values incl. live price)
  nw4: { h: 8, mult: 3, win: 500, rsiUpMax: 100, rsiDnMin: 0 },
  // 1DWS NW (1d, h=8, mult=3, repaint, last 200 values incl. live price)
  nw1d: { h: 8, mult: 3, win: 200, rsiUpMax: 100, rsiDnMin: 0 },
  // RSI(14) vs SMA14(RSI) cross on live bar, with zone
  // RSI(14) crosses its SMA14 on the live bar while the LAST CLOSED bar's RSI was oversold/overbought
  smaX4: { prevUpMax: 30, prevDnMin: 70 },
  smaX1d: { prevUpMax: 30, prevDnMin: 70 },
  // divergence: experimental (see REPORT) — disabled by default because of false positives
  divergence: { enabled: false, pivotLeft: 5, minGap: 5, maxGap: 60, upMax: 35, dnMin: 65 },
  // 4H RSI DIVERGENCE via the shared Visivero anchor detector (same as DIV 1h, research/m1/divhtf.cjs):
  // anchor = extreme RSI in last N closed bars (local ±pivR), divergence on the just-closed bar, one signal per anchor.
  // Extra gates fitted on 30 d of 4sniper (hold-out: precision .50–.72, recall .42–.54).
  anchorDiv4: { enabled: true, N: 80, minDist: 2, pivR: 5, anchorRsi: 30, liveUp: 40, liveDown: 57, anchorMax: 22, maxDist: 20, closedMax: 40 },
  scanWindowMs: 30 * 60e3, // evaluate only within the first 30 min of a cycle
};

const r0 = v => Math.round(v);
function rsiTxt(v, dir) { if (!Number.isFinite(v)) return '-'; const a = (dir === 'up' && v <= 30) || (dir === 'down' && v >= 70); return `${r0(v)}${a ? '❗️' : ''}`; }
function srsiTxt(v, dir, tf) { if (!Number.isFinite(v)) return '-'; const a = (dir === 'up' && v <= 10 && tf !== '1h') || (dir === 'down' && v >= 90); return `${r0(v)}${a ? '❗️' : ''}`; }
function fmtPrice(p) { return String(+p.toPrecision(12)).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, ''); }
function dominant(longFrac) { if (!Number.isFinite(longFrac)) return null; const L = longFrac * 100, S = 100 - L; return L >= 50 ? { pct: +L.toFixed(2), dot: '🟢' } : { pct: +S.toFixed(2), dot: '🔴' }; }
function impulse(bars, dir) { const b5 = bars.slice(-5); return Math.max(...b5.map(b => dir === 'up' ? (b.open - b.low) / b.low * 100 : (b.high - b.open) / b.open * 100)); }

function tfInfo(bars) {
  const closes = bars.map(b => b.close);
  const sr = I.stochRsi(closes);
  const rsiSma = I.sma(sr.rsi, 14);
  const n = closes.length - 1;
  return { closes, rsi: sr.rsi, k: sr.k, rsiNow: sr.rsi[n], rsiPrev: sr.rsi[n - 1], kNow: sr.k[n], smaX: I.crossAt(sr.rsi, rsiSma, n) };
}

function nwSide(closes, price, p) {
  const nw = I.nwRepaint(closes, p.h, p.mult, p.win);
  return price < nw.lower ? 'up' : price > nw.upper ? 'down' : null;
}

// Experimental RSI divergence: last closed bar is a price pivot (lowest/highest of pivotLeft+1 bars, live bar above/below),
// compared with the nearest earlier pivot (1-1 pivot) at least minGap bars back: lower low + higher RSI (bull) or mirror.
function divergence(bars, rsi, p) {
  const i = bars.length - 2; const lo = bars.map(b => b.low), hi = bars.map(b => b.high);
  const isPL = (j, L, R) => { for (let k = j - L; k <= j + R; k++) { if (k === j) continue; if (k < 0 || k >= lo.length) return false; if (k < j ? !(lo[k] > lo[j]) : !(lo[k] >= lo[j])) return false; } return true; };
  const isPH = (j, L, R) => { for (let k = j - L; k <= j + R; k++) { if (k === j) continue; if (k < 0 || k >= hi.length) return false; if (k < j ? !(hi[k] < hi[j]) : !(hi[k] <= hi[j])) return false; } return true; };
  if (isPL(i, p.pivotLeft, 1)) for (let j = i - p.minGap; j >= Math.max(0, i - p.maxGap); j--) if (isPL(j, 1, 1)) { if (lo[i] < lo[j] && rsi[i] > rsi[j] && rsi[i] <= p.upMax) return 'up'; break; }
  if (isPH(i, p.pivotLeft, 1)) for (let j = i - p.minGap; j >= Math.max(0, i - p.maxGap); j--) if (isPH(j, 1, 1)) { if (hi[i] > hi[j] && rsi[i] < rsi[j] && rsi[i] >= p.dnMin) return 'down'; break; }
  return null;
}

function anchorDiv(bars, rsi, i, bull, o) {
  const fin = Number.isFinite, a = i - o.N, b = i - o.minDist;
  if (a < o.pivR || !fin(rsi[i])) return -1;
  let j = -1;
  for (let k = a; k <= b; k++) { if (!fin(rsi[k])) continue; if (j < 0 || (bull ? rsi[k] < rsi[j] : rsi[k] > rsi[j])) j = k; }
  if (j < 0) return -1;
  const rj = rsi[j];
  if (bull ? rj > o.anchorRsi : rj < 100 - o.anchorRsi) return -1;
  for (let k = j - o.pivR; k <= j + o.pivR; k++) if (k !== j && fin(rsi[k]) && (bull ? rsi[k] < rj : rsi[k] > rj)) return -1;
  const pi = bull ? bars[i].low : bars[i].high, pj = bull ? bars[j].low : bars[j].high;
  if (bull ? !(pi < pj && rsi[i] > rj) : !(pi > pj && rsi[i] < rj)) return -1;
  for (let k = j + 1; k < i; k++) if (bull ? bars[k].low < pi : bars[k].high > pi) return -1;
  return j;
}
function anchorDiv4(bars, rsi, st, o) {
  const L = bars.length - 1, i = L - 1, rl = rsi[L], res = [];
  st.div4 = st.div4 || {};
  for (const dir of ['up', 'down']) {
    const bull = dir === 'up';
    if (bull ? rl > o.liveUp : rl < o.liveDown) continue;
    const j = anchorDiv(bars, rsi, i, bull, o);
    if (j < 0) continue;
    const at = bars[j].openTime;
    if (st.div4[dir] === at) continue;
    st.div4[dir] = at;
    const n = v => (bull ? v : 100 - v);
    if (n(rsi[j]) <= o.anchorMax && i - j <= o.maxDist && n(rsi[i]) <= o.closedMax) res.push(dir);
  }
  return res;
}

function header(dir, symbol) { return `${dir === 'up' ? '🟢' : '🔴'} #${symbol}  `; }

function evaluate(ctx) {
  const { symbol, t, price, bars, ratios } = ctx;
  const st = ctx.state || (ctx.state = {});
  const out = [];
  const b1h = bars['1h'], b4h = bars['4h'], b1d = bars['1d'];
  if (!b1h || !b4h || !b1d || b1h.length < 60 || b4h.length < 60 || b1d.length < 30) return out;
  const i1 = tfInfo(b1h), i4 = tfInfo(b4h), id = tfInfo(b1d);
  const rsiLine = dir => `RSI: <b>1h.${rsiTxt(i1.rsiNow, dir)} | 4h.${rsiTxt(i4.rsiNow, dir)} | 1d.${rsiTxt(id.rsiNow, dir)} </b>`;
  const srsiLine = dir => `SRSI: <b>1h.${srsiTxt(i1.kNow, dir, '1h')} | 4h.${srsiTxt(i4.kNow, dir, '4h')} | 1d.${srsiTxt(id.kNow, dir, '1d')} </b>`;
  const prev1h = b1h[b1h.length - 2].close;
  const tp = dominant(ratios?.topLongAccount), me = dominant(ratios?.globalLongAccount);
  const posLines = () => (tp ? `\nTrader Positioning: ${tp.pct}% ${tp.dot}` : '') + (me ? `\nMarket Exposure: ${me.pct}% ${me.dot}` : '');
  const base = (botId, dir, strategy, boost, prev, rsi, srsi, text) => ({ botId, symbol, direction: dir, strategy, boostPct: +boost.toFixed(2), price, prevPrice: prev, rsi, srsi, fields: { traderPositioning: tp, marketExposure: me }, text });

  // ---------- 4h cycle: 4s + 4sniper ----------
  const c4 = Math.floor(t / H4) * H4;
  if (t - c4 <= P.scanWindowMs && st.c4 !== c4 && t - c4 >= SCHED.offsetMs('four-s-4h', symbol, 0)) {
    st.c4 = c4;
    const rs = { '1h': r0(i1.rsiNow), '4h': r0(i4.rsiNow), '1d': r0(id.rsiNow) }, ss = { '1h': r0(i1.kNow), '4h': r0(i4.kNow), '1d': r0(id.kNow) };
    // 4S
    const wt = I.waveTrend(b4h, 10, 21, 4, 'first'); const n = b4h.length - 1;
    const x = I.crossAt(wt.wt1, wt.wt2, n);
    let d4s = null;
    if (x === 1 && wt.wt1[n] <= -P.wtLevel) d4s = 'up'; else if (x === -1 && wt.wt1[n] >= P.wtLevel) d4s = 'down';
    if (d4s) {
      const boost = impulse(b4h, d4s);
      const text = `${header(d4s, symbol)}\nMarket: FUTURES\nBoost Value: +${boost.toFixed(2)}% \nCurrent Price: ${fmtPrice(price)}\nPrevious Price: ${fmtPrice(prev1h)}\n${rsiLine(d4s)}\n${srsiLine(d4s)}${posLines()}`;
      out.push(base('4s', d4s, null, boost, prev1h, rs, ss, text));
    }
    // 4S Sniper
    const sn = [];
    const nw = nwSide(i4.closes, price, P.nw4);
    if (nw === 'up' && i4.rsiNow <= P.nw4.rsiUpMax) sn.push(['up', 'NW UP']);
    if (nw === 'down' && i4.rsiNow >= P.nw4.rsiDnMin) sn.push(['down', 'NW DOWN']);
    if (i4.smaX === 1 && i4.rsiPrev <= P.smaX4.prevUpMax) sn.push(['up', '4H RSI SMA CROSSED']);
    if (i4.smaX === -1 && i4.rsiPrev >= P.smaX4.prevDnMin) sn.push(['down', '4H RSI SMA CROSSED']);
    if (P.divergence.enabled) { const dv = divergence(b4h, i4.rsi, P.divergence); if (dv) sn.push([dv, '4H RSI DIVERGENCE']); }
    if (P.anchorDiv4.enabled) for (const dv of anchorDiv4(b4h, i4.rsi, st, P.anchorDiv4)) sn.push([dv, '4H RSI DIVERGENCE']);
    for (const [dir, strategy] of sn) {
      const boost = impulse(b4h, dir);
      const text = `${header(dir, symbol)}\nStrategy: ${strategy}\nBoost Value: +${boost.toFixed(2)}% \nCurrent Price: ${fmtPrice(price)}\nPrevious Price: ${fmtPrice(prev1h)}\n${rsiLine(dir)}\n${srsiLine(dir)}${posLines()}`;
      out.push(base('4sniper', dir, strategy, boost, prev1h, rs, ss, text));
    }
  }

  // ---------- 12h cycle: 1dws ----------
  const c12 = Math.floor(t / H12) * H12;
  if (t - c12 <= P.scanWindowMs && st.c12 !== c12 && t - c12 >= SCHED.offsetMs('1dws', symbol, 0)) {
    st.c12 = c12;
    const prev1d = b1d[b1d.length - 2].close;
    const sn = [];
    const nw = nwSide(id.closes, price, P.nw1d);
    if (nw === 'up' && id.rsiNow <= P.nw1d.rsiUpMax) sn.push(['up', 'NW UP']);
    if (nw === 'down' && id.rsiNow >= P.nw1d.rsiDnMin) sn.push(['down', 'NW DOWN']);
    if (id.smaX === 1 && id.rsiPrev <= P.smaX1d.prevUpMax) sn.push(['up', '1D RSI SMA CROSSED']);
    if (id.smaX === -1 && id.rsiPrev >= P.smaX1d.prevDnMin) sn.push(['down', '1D RSI SMA CROSSED']);
    if (P.divergence.enabled) { const dv = divergence(b1d, id.rsi, P.divergence); if (dv) sn.push([dv, '1D RSI DIVERGENCE']); }
    for (const [dir, strategy] of sn) {
      const boost = impulse(b1d, dir);
      const rl = `RSI: <b>1h.${rsiTxt(i1.rsiNow, dir)} | 1d.${rsiTxt(id.rsiNow, dir)} | 1d.${rsiTxt(id.rsiNow, dir)} </b>`;
      const sl = `SRSI: <b>1h.${srsiTxt(i1.kNow, dir, '1h')} | 1d.${srsiTxt(id.kNow, dir, '1d')} | 1d.${srsiTxt(id.kNow, dir, '1d')} </b>`;
      const text = `${header(dir, symbol)}\nStrategy: ${strategy}\nBoost Value: +${boost.toFixed(2)}% \nCurrent Price: ${fmtPrice(price)}\nPrevious Price: ${fmtPrice(prev1d)}\n${rl}\n${sl}`;
      out.push(base('1dws', dir, strategy, boost, prev1d, { '1h': r0(i1.rsiNow), '1d': r0(id.rsiNow) }, { '1h': r0(i1.kNow), '1d': r0(id.kNow) }, text));
    }
  }
  return out;
}

module.exports = {
  family: 'four-s',
  bots: ['4s', '4sniper', '1dws'],
  needs: { '1h': 300, '4h': 520, '1d': 300 },
  extras: ['ratios'],
  cadenceMs: 5000,
  params: P,
  evaluate,
  _internal: { tfInfo, nwSide, divergence, impulse, dominant, rsiTxt, srsiTxt, fmtPrice },
};
