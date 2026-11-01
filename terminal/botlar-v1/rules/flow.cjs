'use strict';
// Visivero "FR" (Funding Rate) and "V3" (V3-A Hacim) bots — recovered rules (research/flow/REPORT.md).
//
// Engine contract (in addition to AGENTS.md):
//  * Call evaluate() often (cadenceMs 1000); the module acts only on the FIRST call of each minute, which should
//    happen right after the boundary (≈ :00.2–:00.6), with data sampled in that minute:
//      ctx.funding   = { rate, nextFundingTime }   ← premiumIndex lastFundingRate or !markPrice@arr@1s 'r' (raw fraction)
//      ctx.ticker24h = { volume }                  ← !ticker@arr 'v' or REST /fapi/v1/ticker/24hr (base volume)
//      ctx.bars['1m']                              ← closed 1m bars + live bar (the bar that closed at :00 is bars[len-2])
//    ctx.t must be the wall-clock time of evaluation (used for "Time Remaining").
//  * State: per-symbol ctx.state (previous funding sample, last minute processed). The FR periodic scan (iconless
//    messages) is GLOBAL, kept in module-level SCAN; call resetGlobal() between independent runs.
//  * Market streams note: wss://fstream.binance.com/stream no longer delivers data; use .../market/stream.

const MIN = 60000;
const FR_DIFF_PP = 0.009;      // |Δ predicted funding| between consecutive 1-minute samples, in percentage points
const FR_SCAN_PCT = -0.20;     // periodic scan lists symbols with predicted funding ≤ −0.20 %
const FR_SCAN_GAP_MS = 600000; // scan repeats when ≥10 min passed since the previous scan (minute ticks → 10/11 min)
const V3_MIN_PCT = 8.0;        // last closed 1m base volume / (24h volume − that 1m volume) ≥ 8 %

const SCAN = { lastAt: -Infinity, minute: null };
function resetGlobal() { SCAN.lastAt = -Infinity; SCAN.minute = null; }

const p2 = x => (x < 10 ? '0' + x : String(x)); // Visivero quirk: negative values print as "0-1"
function timeRemaining(nextFundingTime, now) {
  const ms = nextFundingTime - now;
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  return `${p2(h)}:${p2(m)}:${p2(s)}`;
}
const baseAsset = sym => sym.replace(/(USDT|USDC)$/, '');

function evalFunding(ctx, st, out) {
  const f = ctx.funding;
  if (!f || !Number.isFinite(f.rate)) return;
  const minute = Math.floor(ctx.t / MIN);
  if (st.frMinute === minute) return; // one sample per minute: the first evaluation after the minute boundary
  st.frMinute = minute;
  const prev = st.frPrev; // previous minute's raw sample
  st.frPrev = { rate: f.rate, minute };
  const cur = f.rate * 100;
  // Visivero stamps ≈ :00.5; if we are called later in the minute, print as of :00.55 like Visivero would.
  const tNom = ctx.t - minute * MIN < 2000 ? ctx.t : minute * MIN + 550;
  const tr = Number.isFinite(f.nextFundingTime) ? timeRemaining(f.nextFundingTime, tNom) : null;
  // Change messages need the sample from the immediately preceding minute
  if (prev && prev.minute === minute - 1 && cur < 0) {
    const pv = prev.rate * 100;
    let kind = null;
    if (prev.rate === 0) { if (Number(cur.toFixed(4)) < 0) kind = 'flip'; } // exact 0 → printed-negative (≤ −0.0001 %)
    else if (pv - cur >= FR_DIFF_PP - 1e-12) kind = 'deeper';   // more negative → 🟢
    else if (cur - pv >= FR_DIFF_PP - 1e-12) kind = 'easing';   // less negative → 🔴
    if (kind) {
      const dot = kind === 'easing' ? '🔴' : '🟢';
      const lines = [`${dot} #${ctx.symbol}`];
      if (kind === 'flip') lines.push('⚠️ Funding changed from + to -');
      lines.push(`Funding Rate: ${cur.toFixed(4)}`, `Previous Funding: ${pv.toFixed(4)}`, `Difference: ${(pv - cur).toFixed(6)}`);
      if (tr) lines.push(`Time Remaining: ${tr}`);
      out.push({ botId: 'fr', symbol: ctx.symbol, direction: kind === 'easing' ? 'down' : 'up',
        strategy: kind === 'flip' ? 'Funding changed from + to -' : kind === 'deeper' ? 'FR deeper' : 'FR easing',
        boostPct: null, price: ctx.price ?? null, prevPrice: null, rsi: {}, srsi: {},
        fields: { fundingRate: cur, previousFunding: pv, difference: pv - cur, timeRemaining: tr }, text: lines.join('\n') });
    }
  }
  // Global periodic scan (iconless)
  // decide the scan minute on the NOMINAL minute time, so every symbol evaluated in that minute is listed (27.10: using
  // the actual eval time made symbols evaluated before :00.55 drop out of the scan)
  const nom = minute * MIN + 550;
  if (SCAN.minute !== minute && nom - SCAN.lastAt >= FR_SCAN_GAP_MS - 1000) { SCAN.minute = minute; SCAN.lastAt = nom; }
  if (SCAN.minute === minute && cur <= FR_SCAN_PCT + 1e-12) {
    out.push({ botId: 'fr', symbol: ctx.symbol, direction: null, strategy: 'FR scan', boostPct: null, price: ctx.price ?? null,
      prevPrice: null, rsi: {}, srsi: {}, fields: { fundingRate: cur, timeRemaining: tr },
      text: `#${ctx.symbol}\nFunding Rate: ${cur.toFixed(4)}` + (tr ? `\nTime Remaining: ${tr}` : '') });
  }
}

function evalV3(ctx, st, out) {
  const bars = ctx.bars && ctx.bars['1m'];
  const v24 = ctx.ticker24h && Number(ctx.ticker24h.volume);
  if (!bars || bars.length < 2 || !Number.isFinite(v24)) return;
  const minute = Math.floor(ctx.t / MIN);
  if (st.v3Minute === minute) return;
  const last = bars[bars.length - 1].isLive ? bars[bars.length - 2] : bars[bars.length - 1];
  if (!last || last.openTime !== (minute - 1) * MIN) return; // must be the bar that just closed
  st.v3Minute = minute;
  const v = last.volume;
  if (!(v > 0) || !(v24 > v)) return;
  const pct = v / (v24 - v) * 100;
  if (pct < V3_MIN_PCT) return;
  const pctTxt = Number(pct.toFixed(2));
  out.push({ botId: 'v3', symbol: ctx.symbol, direction: null, strategy: 'V3-A', boostPct: null, price: ctx.price ?? null,
    prevPrice: null, rsi: {}, srsi: {}, fields: { hacimPct: pctTxt, volume1m: v, volume24h: v24 },
    text: `#${ctx.symbol}\nHacim: +${pctTxt}%\n24s Hacim: ${v24.toLocaleString('tr-TR')} ${baseAsset(ctx.symbol)}` });
}

module.exports = {
  family: 'flow',
  bots: ['fr', 'v3'],
  needs: { '1m': 2 },
  extras: ['funding', 'ticker24h'],
  cadenceMs: 1000,
  minuteSweep: true, // engine evaluates every symbol once per minute (FR scan must list illiquid symbols too)
  constants: { FR_DIFF_PP, FR_SCAN_PCT, FR_SCAN_GAP_MS, V3_MIN_PCT },
  timeRemaining, resetGlobal,
  evaluate(ctx) {
    const st = ctx.state || (ctx.state = {});
    const out = [];
    evalFunding(ctx, st, out);
    evalV3(ctx, st, out);
    return out;
  }
};
