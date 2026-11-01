'use strict';
// M1-A (bot m1) and M1 Premium (bot m1-premium).
// Measured: trigger |price/open(live 1m) - 1| > 1.00 % ; Previous Price = last closed 1m close;
// RSI(14) / StochRSI(14,14,3,3) on closed bars + live bar at current price (1m 94 %, 5m 87 % exact).
// M1 Premium fires on the same tick as M1-A with >= 10 s spacing per symbol.
const I = require('../lib/ind.cjs');

const THR = 1.0;
const A_SPACING_MS = 1000;   // M1-A re-emits while the condition holds (observed gaps 0.3–10 s)
const P_SPACING_MS = 10000;  // M1 Premium: >= 10 s per symbol

// M1 Premium "Divergence:" line — shared Visivero anchor detector (research/m1/divsweep.cjs, label = divergence
// OPPOSITE to the signal direction): 1m rec .94/prec .70, 5m .92/.74, 1h .84/.76.
const DIVTF = { '1m': { N: 80, src: 'hl', at: 'live' }, '5m': { N: 30, src: 'close', at: 'either' }, '1h': { N: 50, src: 'hl', at: 'either' } };
function anchorDiv(bars, rsi, i, bull, o) {
  const fin = Number.isFinite, a = i - o.N, b = i - 2, pivR = 5;
  if (a < pivR || !fin(rsi[i])) return false;
  let j = -1;
  for (let k = a; k <= b; k++) { if (!fin(rsi[k])) continue; if (j < 0 || (bull ? rsi[k] < rsi[j] : rsi[k] > rsi[j])) j = k; }
  if (j < 0) return false;
  const rj = rsi[j];
  if (bull ? rj > 30 : rj < 70) return false;
  for (let k = j - pivR; k <= j + pivR; k++) if (k !== j && fin(rsi[k]) && (bull ? rsi[k] < rj : rsi[k] > rj)) return false;
  const P = x => (o.src === 'close' ? x.close : bull ? x.low : x.high);
  const pi = P(bars[i]), pj = P(bars[j]);
  if (bull ? !(pi < pj && rsi[i] > rj) : !(pi > pj && rsi[i] < rj)) return false;
  for (let k = j + 1; k < i; k++) if (bull ? bars[k].low < pi : bars[k].high > pi) return false;
  return true;
}
function divLine(bars, dir) {
  const slots = Object.entries(DIVTF).map(([tf, o]) => {
    const b = bars[tf] || []; if (b.length < 100) return '';
    const rsi = I.rsi(b.map(x => x.close)), n = b.length - 1, bull = dir === 'down';
    const hit = (o.at !== 'closed' && anchorDiv(b, rsi, n, bull, o)) || (o.at !== 'live' && anchorDiv(b, rsi, n - 1, bull, o));
    return hit ? `${tf}✅` : '';
  });
  return slots.some(Boolean) ? `Divergence: ${slots.join(' ')}` : null;
}
// M1 Premium "WT Cross:" line (Visivero added it 2026-10-25): recent WaveTrend cross AGAINST the signal direction
// in the overbought/oversold zone; colour = cross direction (🟢 up-cross, 🔴 down-cross). research/m1/wtcross.cjs:
// 1m rec .83/prec .82, 5m .87/.87, 1h .97/.83.
const WTX = { '1m': { p: [10, 21, 4], live: false, k: 2, L: 53 }, '5m': { p: [10, 21, 4], live: true, k: 4, L: 60 }, '1h': { p: [9, 12, 3], live: false, k: 5, L: 53 } };
function wtLine(bars, dir) {
  const sd = dir === 'up' ? 1 : -1;
  const slots = Object.entries(WTX).map(([tf, o]) => {
    let b = bars[tf] || []; if (!o.live) b = b.slice(0, -1); if (b.length < 80) return '';
    const wt = I.waveTrend(b, o.p[0], o.p[1], o.p[2], 'first'), i = b.length - 1;
    for (let j = i; j > i - o.k; j--) {
      const c = I.crossAt(wt.wt1, wt.wt2, j);
      if (c === sd) return '';
      if (c === -sd) return (sd === 1 ? wt.wt2[j] : -wt.wt2[j]) >= o.L ? `${tf}${c === 1 ? '🟢' : '🔴'}` : '';
    }
    return '';
  });
  return slots.some(Boolean) ? `WT Cross: ${slots.join(' ')}` : null;
}

const r0 = v => (Number.isFinite(v) ? Math.round(v) : NaN);
const fmtPx = p => String(+p);
function lastClosed(bars) { return bars.length >= 2 ? bars[bars.length - 2] : null; }
function ind(bars) {
  const closes = bars.slice(-300).map(b => b.close);
  if (closes.length < 16) return { rsi: 0, k: NaN, d: NaN };
  const s = I.stochRsi(closes);
  return { rsi: s.rsi.at(-1), k: s.k.at(-1), d: s.d.at(-1) };
}
const mark = (v, lo, hi, sym = '❗️') => (Number.isFinite(v) && (v <= lo || v >= hi) ? sym : '');

module.exports = {
  family: 'm1',
  bots: ['m1', 'm1-premium'],
  needs: { '1m': 400, '5m': 400, '1h': 400 },
  extras: ['funding'],
  cadenceMs: 250,
  evaluate(ctx) {
    const m = ctx.bars['1m'];
    if (!m || m.length < 2) return [];
    const live = m[m.length - 1];
    const boost = (ctx.price / live.open - 1) * 100;
    if (!(Math.abs(boost) > THR)) return [];
    const st = ctx.state;
    const out = [];
    const dir = boost > 0 ? 'up' : 'down';
    const dot = dir === 'up' ? '🟢' : '🔴';
    const prev = lastClosed(m);
    const prevPrice = prev ? prev.close : live.open;
    const boostTxt = (boost > 0 ? '+' : '') + boost.toFixed(2) + '%';
    const i1 = ind(m);

    if (!st.aT || ctx.t - st.aT >= A_SPACING_MS) {
      st.aT = ctx.t;
      const rsi = r0(i1.rsi), k = r0(i1.k), d = r0(i1.d);
      const lines = [
        `${dot} #${ctx.symbol}`,
        `${dir === 'up' ? 'Boost' : 'Drop'} Value: ${boostTxt}`,
        `Current Price: ${fmtPx(ctx.price)}`,
        `Previous Price: ${fmtPx(prevPrice)}`,
        `Volume: ?`,
        `RSI: <b>${rsi}${mark(rsi, 30, 70, '⚠️')}</b>`,
        `Stochastic (K/D): <b>${k}/${d} ${(k <= 20 && d <= 20) || (k >= 80 && d >= 80) ? '⚠️' : ''}</b>`,
        `BTC Status: Normal`
      ];
      out.push({ botId: 'm1', symbol: ctx.symbol, direction: dir, strategy: null, boostPct: +boost.toFixed(2), price: ctx.price, prevPrice, rsi: { '1m': rsi }, srsi: { '1m': k }, fields: { stochD: d }, text: lines.join('\n') });
    }
    if (!st.pT || ctx.t - st.pT >= P_SPACING_MS) {
      st.pT = ctx.t;
      const i5 = ind(ctx.bars['5m'] || []), ih = ind(ctx.bars['1h'] || []);
      const R = { '1m': r0(i1.rsi), '5m': r0(i5.rsi), '1h': r0(ih.rsi) };
      const K = { '1m': r0(i1.k), '5m': r0(i5.k), '1h': r0(ih.k) };
      const rs = Object.entries(R).map(([tf, v]) => `${tf}.${v}${mark(v, 30, 70)}`).join(' | ');
      const ks = Object.entries(K).map(([tf, v]) => `${tf}.${Number.isFinite(v) ? v : 'NaN'}${mark(v, 10, 90)}`).join(' | ');
      // ⭐️ when the live 1m bar's excursion so far (open→high/low in signal direction) >= 1.7 % (93 % agreement on 6.6k msgs)
      const exc = dir === 'up' ? (live.high / live.open - 1) * 100 : (1 - live.low / live.open) * 100;
      const star = exc >= 1.7 ? ' ⭐️' : '';
      const lines = [`${dot} #${ctx.symbol}${star} `, `Boost Value: ${boostTxt} `, `Current Price: ${fmtPx(ctx.price)}`, `Previous Price: ${fmtPx(prevPrice)}`, `RSI: <b>${rs} </b>`, `SRSI: <b>${ks} </b>`];
      const dl = divLine(ctx.bars, dir); if (dl) lines.push(dl);
      const wl = wtLine(ctx.bars, dir); if (wl) lines.push(wl);
      const fr = ctx.funding && Number.isFinite(ctx.funding.rate) ? ctx.funding.rate * 100 : null;
      if (fr !== null && fr <= -0.2) lines.push(`FR: ${fr.toFixed(2)} ⚠️`);
      if ((ctx.bars['1h'] || []).length < 16) lines.push('Coin Status: New ⚠️');
      out.push({ botId: 'm1-premium', symbol: ctx.symbol, direction: dir, strategy: null, boostPct: +boost.toFixed(2), price: ctx.price, prevPrice, rsi: R, srsi: K, fields: {}, text: lines.join('\n') });
    }
    return out;
  }
};
