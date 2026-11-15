'use strict';
// Hammer (bot "hammer") — kendi sürümümüz, Visivero Hammer Pro'nun #W1 stratejisi üzerine kurulu. 10.11.2026.
// Yön tahmini DEĞİL, "bu coinde şimdi hareket var" uyarısıdır (ölçüm: sinyalden sonraki 1 saatte lehte ≥%1 hareket %66–70).
// Kural (db/hammer-w1.cjs + hammer-w1-izgara.cjs, 20–30.10.2026, 746 coin; Visivero #W1 olaylarının %73'ünü ±3 dk içinde yakalar, ~265 sinyal/gün):
//   1) yeni kapanan 1 dk mumda WaveTrend(10,21,4) kesişimi; yukarı kesişim & wt2 ≤ −57 → 🟢, aşağı kesişim & wt2 ≥ 57 → 🔴
//   2) son 5 kapanmış mumda itki (Boost) ≥ %1:  🟢 (açılış−en düşük)/en düşük,  🔴 (en yüksek−açılış)/açılış
//   3) son 5 mumun birinde, mumun ucundaki (🟢 en düşük / 🔴 en yüksek) RSI(14) ≤ 26,5 (🔴 için ≥ 73,5)
//   4) son 24 saatin en yüksek/en düşük aralığı ≤ %15 (çok oynak coinler hariç), haftalık Fibonacci pivota uzaklık ≤ %9
//   5) aynı coinde son sinyal aynı yöndeyse 24 saat tekrar etmez
// "BTC Status: Volatilite ⚡️" satırı yalnız BTC oynakken yazılır (Hammer Pro'daki gibi; kural lib/btc.cjs).
// Yıldız: Boost ≥2 ⭐, ≥3 ⭐⭐, ≥5 ⭐⭐⭐ (Visivero ile aynı eşikler).
const I = require('../lib/ind.cjs');
const PIV = require('../lib/pivot.cjs');
const BTC = require('../lib/btc.cjs');
const P = { wt2: 57, boostMin: 1.0, rsiExt: 26.5, range24Max: 15, pivotMax: 9, sameDirMs: 24 * 3600e3 };
const fin = Number.isFinite;
const stars = b => (b >= 5 ? ' ⭐️⭐️⭐️' : b >= 3 ? ' ⭐️⭐️' : b >= 2 ? ' ⭐️' : '');
const rsiTxt = (tf, v) => `${tf}.${fin(v) ? Math.round(v) : '-'}${fin(v) && (Math.round(v) <= 30 || Math.round(v) >= 70) ? '❗️' : ''}`;
const srsiTxt = (tf, v) => `${tf}.${fin(v) ? Math.round(v) : '-'}${fin(v) && (Math.round(v) <= 10 || Math.round(v) >= 90) ? '❗️' : ''}`;
const fmt = v => String(+(+v).toPrecision(10));
function wtCross(closed) {
  if (closed.length < 60) return null;
  const wt = I.waveTrend(closed, 10, 21, 4, 'first'), i = closed.length - 1;
  return { x: I.crossAt(wt.wt1, wt.wt2, i), wt2: wt.wt2[i] };
}
module.exports = {
  family: 'hammer',
  bots: ['hammer'],
  needs: { '1m': 400, '5m': 300, '1h': 100, '1w': 3 },
  extras: ['funding'],
  cadenceMs: 1000,
  params: P,
  evaluate(ctx) {
    const st = ctx.state, m = ctx.bars['1m'];
    if (!m || m.length < 120) return [];
    const closed = m.slice(0, -1), lastOpen = closed[closed.length - 1].openTime;
    if (st.seen === lastOpen) return [];                       // her kapanan mum bir kez değerlendirilir
    st.seen = lastOpen;
    const w = wtCross(closed); if (!w || !w.x || !fin(w.wt2)) return [];
    const D = w.x; if (D === 1 ? w.wt2 > -P.wt2 : w.wt2 < P.wt2) return [];
    if (st.last && st.last.D === D && ctx.t - st.last.t < P.sameDirMs) return [];
    const n = closed.length, closes = closed.map(b => b.close);
    let boost = 0, ext = 99;
    for (let j = n - 5; j < n; j++) {
      const b = closed[j], v = D === 1 ? (b.open - b.low) / b.low * 100 : (b.high - b.open) / b.open * 100; if (v > boost) boost = v;
      const c = closes.slice(0, j + 1); c[j] = D === 1 ? b.low : b.high; const r = I.rsi(c).at(-1); if (fin(r)) ext = Math.min(ext, D === 1 ? r : 100 - r);
    }
    if (!(boost >= P.boostMin) || !(ext <= P.rsiExt)) return [];
    const b5 = (ctx.bars['5m'] || []).slice(-289);
    const range24 = b5.length >= 100 ? (Math.max(...b5.map(b => b.high)) / Math.min(...b5.map(b => b.low)) - 1) * 100 : NaN;
    if (fin(range24) && range24 > P.range24Max) return [];
    const pivD = PIV.weeklyFibPivotDistPct(ctx.bars['1w'], ctx.price);
    if (fin(pivD) && pivD > P.pivotMax) return [];
    st.last = { D, t: ctx.t };
    const dir = D === 1 ? 'up' : 'down', rsi = {}, srsi = {}, tags = [];
    for (const tf of ['1m', '5m', '1h']) {
      const b = ctx.bars[tf] || []; if (b.length < 20) continue;
      const s = I.stochRsi(b.map(x => x.close)); rsi[tf] = s.rsi.at(-1); srsi[tf] = s.k.at(-1);
      const c = tf === '1m' ? w : wtCross(b.slice(0, -1)); tags.push(c && c.x ? `${tf}${c.x === 1 ? '🟢' : '🔴'}` : '');
    }
    const prevPrice = closed[n - 1].close, fr = ctx.funding && fin(ctx.funding.rate) ? ctx.funding.rate * 100 : null;
    const L = [`${D === 1 ? '🟢' : '🔴'} #${ctx.symbol}${stars(boost)}`, 'Strategy: #W1', `Boost Value: +${boost.toFixed(2)}% `, `Current Price: ${ctx.priceStr ? String(+ctx.priceStr) : fmt(ctx.price)}`, `Previous Price: ${fmt(prevPrice)}`,
      `RSI: <b>${['1m', '5m', '1h'].map(tf => rsiTxt(tf, rsi[tf])).join(' | ')} </b>`, `SRSI: <b>${['1m', '5m', '1h'].map(tf => srsiTxt(tf, srsi[tf])).join(' | ')} </b>`];
    if (tags.some(Boolean)) L.push(`WT: <b>${tags.join(' ')}</b>`);
    if (fin(pivD) && pivD < 1) L.push(`Pivot: %${pivD.toFixed(2)} ⚠️`);
    if (fr !== null && fr <= -0.2) L.push(`FR: ${fr.toFixed(2)} ⚠️`);
    const bs = BTC.btcStatus(ctx.btc); if (bs.volatile) L.push('BTC Status: Volatilite ⚡️');
    const r0 = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fin(v) ? Math.round(v) : null]));
    return [{ botId: 'hammer', symbol: ctx.symbol, direction: dir, strategy: '#W1', boostPct: +boost.toFixed(2), price: ctx.price, prevPrice, rsi: r0(rsi), srsi: r0(srsi),
      fields: { wt2: +w.wt2.toFixed(1), rsiExt: +ext.toFixed(1), range24: fin(range24) ? +range24.toFixed(1) : null, pivotPct: fin(pivD) ? +pivD.toFixed(2) : null, frPct: fr, btcVolatile: bs.volatile, stars: boost >= 5 ? 3 : boost >= 3 ? 2 : boost >= 2 ? 1 : 0 }, text: L.join('\n') }];
  }
};
