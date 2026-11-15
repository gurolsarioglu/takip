'use strict';
// "BTC Status" satırı. Kural (db/btc-durum.cjs, 20–30.10.2026, 10.247 dakika, Visivero M1 mesajlarındaki etikete göre):
// BTCUSDT'nin son 10 adet 1 dk mumunda (canlı mum dahil) en yüksek/en düşük aralığı ≥ %0,5 → "Volatilite ⚡️", değilse "Normal".
// Visivero'nun "Volatilite" dediği dakikaların %99'unu yakalar; yanlış alarm %3,4 (bizim etiket biraz daha sık yanar).
const RANGE_PCT = 0.5, BARS = 10;
function btcRangePct(bars) {
  if (!Array.isArray(bars) || bars.length < BARS) return NaN;
  let hi = -Infinity, lo = Infinity;
  for (const b of bars.slice(-BARS)) { if (b.high > hi) hi = b.high; if (b.low < lo) lo = b.low; }
  return lo > 0 ? (hi / lo - 1) * 100 : NaN;
}
function btcStatus(btc) {
  let r = NaN; try { r = btcRangePct(btc && btc.bars && btc.bars['1m']); } catch (e) { }
  return { volatile: r >= RANGE_PCT, rangePct: Number.isFinite(r) ? +r.toFixed(2) : null, text: r >= RANGE_PCT ? 'Volatilite ⚡️' : 'Normal' };
}
module.exports = { btcStatus, btcRangePct, RANGE_PCT, BARS };
