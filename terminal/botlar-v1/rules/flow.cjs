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

// --- FR bağlam satırları (11.11.2026, kendi eklememiz; hangi mesajın geldiğini DEĞİŞTİRMEZ, yalnız satır ekler) ---
// Seri = aynı coinde art arda 🟢 (funding daha da eksiye gitti); arada 🔴 yok ve iki yeşil arası ≤ SERI_GAP_MS.
// Ölçüm (db/fr-seri.cjs, Visivero FR arşivi 15.09–30.10.2026, 7.319 mesaj): "merdiven = long" tek başına tutmuyor; bağlam belirleyici:
//   funding < −1 → long kötü (4 sa kazanan %20–35) · coin 24 saatte ≤ −%10 → kötü (%26) · ödemeye < 30 dk → kötü (%21)
//   seri durduktan 10 dk sonra short küçük artı (4 sa ort. +%1,7…+%3,3). Bu yüzden uyarılar ve "seri durdu" mesajı eklenir.
const SERI_GAP_MS = 6 * MIN, SERI_FREN_MS = 10 * MIN, SERI_FREN_MIN_N = 3;
const UYARI = { odemeDk: 30, dusus24: -10, derinFr: -1, yukselen: 25, sira: 10 };
const GAIN = new Map();        // symbol → 24 saatlik değişim % (günün yükselenleri sırası için; her dakika güncellenir)
function gainRank(sym) { const v = GAIN.get(sym); if (!Number.isFinite(v)) return null; let r = 1; for (const x of GAIN.values()) if (x > v) r++; return r; }
const sgn = (v, d = 2) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
function baglam(ctx, cur, remMs) {
  const L = [], w = [], chg = ctx.ticker24h && Number(ctx.ticker24h.changePct), rank = gainRank(ctx.symbol);
  if (Number.isFinite(chg)) L.push(`24s: ${sgn(chg, 1)}%` + (chg >= UYARI.yukselen || (rank && rank <= UYARI.sira && chg > 0) ? ` 🔝${rank ? ' günün ' + rank + '. yükseleni' : ''}` : ''));
  if (Number.isFinite(remMs) && remMs >= 0 && remMs < UYARI.odemeDk * MIN) w.push(`⚠️ Funding ödemesine ${Math.max(0, Math.floor(remMs / MIN))} dk`);
  if (Number.isFinite(chg) && chg <= UYARI.dusus24) w.push('⚠️ 24 saatte %10+ düşmüş');
  if (cur <= UYARI.derinFr) w.push('⚠️ Funding −1 altında');
  return { lines: L.concat(w), chg: Number.isFinite(chg) ? +chg.toFixed(2) : null, rank, warns: w.length };
}

// --- Kurulum puanı, kaçın işaretleri, OI / long-short satırları ve "⭐ FR Kurulum" sinyali (11.11.2026, V1.6.0) ---
// Görev: GOREV-FR-OI.md · Ölçüm: db/fr-oi.cjs (13.10–10.11.2026, 409 coin; long 10x stopsuz 48 sa, −%9,5'ten önce +%10).
// FR ortalamada "silkeleme sonrası toparlanma" olarak çalışıyor (fiyat düşmüş, OI şişmemiş, kalabalık long, hacim gelmiş, funding sığ);
// "kovalama" olarak çalışmıyor. Funding ilk kez ≤ −0,10 anında puan 5–6: n=76 (51 coin) hedef %57 / tasfiye %13 / ort +43 ROE;
// puan 0–2: %16 / %37 / −20. Eşikler tüm veriye bakılarak seçildi (iki dönemde aynı yön) → canlı Karne ile izlenmeli.
const KURULUM = {                       // sağlanan her koşul +1 (0–6)
  px4h: v => v <= -2.5,                 // fiyat son 4 saatte en az %2,5 düşmüş
  oi4h: v => v <= 3,                    // OI son 4 saatte %3'ten fazla artmamış
  crowdLong: v => v >= 65,              // hesapların en az %65'i long
  vol1h: v => v >= 3,                   // son 1 saat hacmi 24 saatlik saatlik ortalamanın 3 katı
  px24h: v => v <= 4,                   // fiyat son 24 saatte %4'ten fazla yükselmemiş
  fr: v => v >= -0.20,                  // funding −0,20'den derin değil
};
const KACIN = { oi4h: v => v >= 3.3, px24h: v => v >= 4, fr: v => v <= -0.20, crowdLong: v => v <= 55 };
const KACIN_AD = { oi4h: 'OI 4sa', px24h: 'fiyat 24sa', fr: 'funding', crowdLong: 'kalabalık long' };
const KURULUM_MIN = 5, KURULUM_BILINEN = 4, KACIN_MAX = 1, EPI_SESSIZ_MS = 12 * 3600e3, FR_B = -0.10, LOADED_AT = Date.now();
const fin = Number.isFinite;
function kurulumPuan(f) {               // f: { px4h, oi4h, crowdLong, vol1h, px24h, fr } — db/fr-oi.cjs de bunu kullanır
  let puan = 0, bilinen = 0; const kacin = [];
  for (const [k, fn] of Object.entries(KURULUM)) { const v = f[k]; if (v == null || !fin(v)) continue; bilinen++; if (fn(v)) puan++; }
  for (const [k, fn] of Object.entries(KACIN)) { const v = f[k]; if (v != null && fin(v) && fn(v)) kacin.push(k); }
  return { puan, bilinen, kacin, sinyal: bilinen >= KURULUM_BILINEN && puan >= KURULUM_MIN && kacin.length <= KACIN_MAX };
}
function ozellik(ctx, cur) {
  const M5 = 300e3, b5 = ctx.bars && ctx.bars['5m'] || [], b0 = Math.floor(ctx.t / M5) * M5, p = ctx.price;
  const closeAt = ot => { for (let i = b5.length - 1; i >= 0; i--) { const b = b5[i]; if (b.openTime === ot) return b.close; if (b.openTime < ot) break; } return null; };
  const pc = (a, b) => a > 0 && b > 0 ? +((a / b - 1) * 100).toFixed(2) : null;
  let v1 = 0, v24 = 0, n = 0; for (let i = b5.length - 1; i >= 0 && n < 288; i--, n++) { const q = b5[i].quoteVolume || 0; if (n < 12) v1 += q; v24 += q; }
  const r = ctx.ratios, rOk = r && fin(r.t) && ctx.t - r.t <= 20 * MIN, oi = ctx.oi;
  return { px4h: pc(p, closeAt(b0 - 4 * 3600e3)), px24h: pc(p, closeAt(b0 - 24 * 3600e3)), oi4h: oi ? oi.chg4h : null, oi24h: oi ? oi.chg24h : null,
    crowdLong: rOk && fin(r.globalLongAccount) ? +(r.globalLongAccount * 100).toFixed(1) : null, topLong: rOk && fin(r.topLongAccount) ? +(r.topLongAccount * 100).toFixed(1) : null,
    vol1h: n >= 200 && v24 > 0 ? +(v1 / (v24 / (n / 12))).toFixed(2) : null, fr: +cur.toFixed(4) };
}
const pS = v => v == null ? '?' : sgn(v, 1) + '%';
const oiSatir = f => [`OI: 4sa ${pS(f.oi4h)} · 24sa ${pS(f.oi24h)}`, `Long: kalabalık ${f.crowdLong == null ? '?' : '%' + Math.round(f.crowdLong)} · büyükler ${f.topLong == null ? '?' : '%' + Math.round(f.topLong)}`];
function kurulumSatir(f, k) {
  const L = [`OI: 4sa ${pS(f.oi4h)} · 24sa ${pS(f.oi24h)}`, `Fiyat: 4sa ${pS(f.px4h)} · 24sa ${pS(f.px24h)}`, oiSatir(f)[1], `Hacim: ${f.vol1h == null ? '?' : f.vol1h.toFixed(1) + '×'}`];
  let ks = k.bilinen < KURULUM_BILINEN ? `Kurulum: ? (veri eksik, ${k.bilinen}/6 bilinen)` : `Kurulum: ${k.puan}/${k.bilinen}${k.puan >= KURULUM_MIN && k.kacin.length < 2 ? ' ✅' : ''}`;
  if (k.kacin.length >= 2) ks += ' · ⚠️ Kaçın: ' + k.kacin.map(x => `${KACIN_AD[x]} ${x === 'fr' ? f.fr.toFixed(2) : x === 'crowdLong' ? '%' + Math.round(f[x]) : pS(f[x])}`).join(', ');
  return { lines: L, kurulum: ks };
}
const fFields = (f, k, ctx) => ({ px4h: f.px4h, px24h: f.px24h, oi4h: f.oi4h, oi24h: f.oi24h, crowdLong: f.crowdLong, topLong: f.topLong, vol1h: f.vol1h,
  kurulum: k ? k.puan : null, kurulumN: k ? k.bilinen : null, kacin: k ? k.kacin : null, underlyingType: ctx.info && ctx.info.underlyingType || null });
function kurulumSinyal(ctx, cur, tr, f, k, tip) {
  const ks = kurulumSatir(f, k);
  const lines = [`⭐ #${ctx.symbol} — FR Kurulum (${tip})`, `Funding Rate: ${cur.toFixed(4)}`, ks.kurulum, ...ks.lines];
  if (tr) lines.push(`Time Remaining: ${tr}`);
  return { botId: 'fr', symbol: ctx.symbol, direction: 'up', strategy: 'FR Kurulum', boostPct: null, price: ctx.price ?? null, prevPrice: null, rsi: {}, srsi: {},
    fields: { fundingRate: cur, tetik: tip, timeRemaining: tr, ...fFields(f, k, ctx) }, text: lines.join('\n') };
}

const SCAN = { lastAt: -Infinity, minute: null };
function resetGlobal() { SCAN.lastAt = -Infinity; SCAN.minute = null; GAIN.clear(); }

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
  const remMs = Number.isFinite(f.nextFundingTime) ? f.nextFundingTime - tNom : NaN;
  { const c = ctx.ticker24h && Number(ctx.ticker24h.changePct); if (Number.isFinite(c)) GAIN.set(ctx.symbol, c); }
  // seri durdu ("frenleme"): SERI_FREN_MIN_N+ yeşillik seri SERI_FREN_MS boyunca yeni yeşil almadı
  if (st.ser && ctx.t - st.ser.last >= SERI_FREN_MS) {
    const z = st.ser; st.ser = null;
    if (z.n >= SERI_FREN_MIN_N) {
      const b = baglam(ctx, cur, remMs), dk = Math.round((z.last - z.t0) / MIN);
      const lines = [`⏸ #${ctx.symbol}`, 'FR serisi durdu', `Seri: ${z.n} 🟢 · ${dk} dk · toplam ${sgn(-(z.fr0 - z.fr), 4)}`, `Funding Rate: ${cur.toFixed(4)}`, ...b.lines.filter(l => !/Funding −1/.test(l))];
      const fz = ozellik(ctx, cur); lines.push(...oiSatir(fz));
      if (tr) lines.push(`Time Remaining: ${tr}`);
      out.push({ botId: 'fr', symbol: ctx.symbol, direction: null, strategy: 'FR seri durdu', boostPct: null, price: ctx.price ?? null, prevPrice: null, rsi: {}, srsi: {},
        fields: { fundingRate: cur, seriN: z.n, seriDk: dk, seriDelta: +(z.fr0 - z.fr).toFixed(4), chg24: b.chg, rank: b.rank, timeRemaining: tr, ...fFields(fz, null, ctx) }, text: lines.join('\n') });
    }
  }
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
      // --- bağlam ---
      const ex = { seriN: null, seriDk: null, seriDelta: null };
      if (kind === 'easing') {
        if (st.ser && st.ser.n >= 2) lines.push(`Seri bitti: ${st.ser.n} 🟢 · ${Math.round((st.ser.last - st.ser.t0) / MIN)} dk`);
        st.ser = null;
      } else {
        if (st.ser && ctx.t - st.ser.last > SERI_GAP_MS) st.ser = null;
        if (!st.ser) st.ser = { n: 0, t0: ctx.t, fr0: pv };
        st.ser.n++; st.ser.last = ctx.t; st.ser.fr = cur;
        ex.seriN = st.ser.n; ex.seriDk = Math.round((ctx.t - st.ser.t0) / MIN); ex.seriDelta = +(st.ser.fr0 - cur).toFixed(4);
        if (st.ser.n >= 2) lines.push(`Seri: ${st.ser.n}. 🟢 · ${ex.seriDk} dk · toplam ${sgn(-(st.ser.fr0 - cur), 4)}`);
      }
      const bg = baglam(ctx, cur, remMs), fz = ozellik(ctx, cur);
      let kp = null, kurA = null;
      if (kind === 'easing') { lines.push(...bg.lines.filter(l => !l.startsWith('⚠️')), ...oiSatir(fz)); }
      else {
        kp = kurulumPuan(fz); const ks = kurulumSatir(fz, kp), w = bg.lines.filter(l => l.startsWith('⚠️'));
        lines.push(...bg.lines.filter(l => !l.startsWith('⚠️')), ...ks.lines, ks.kurulum, ...w);
        // yakalama (epizot): önceki 🟢'den ≥ 12 sa sonra gelen 🟢. Geçmiş bilinmiyorsa (kural yeni yüklendi) funding sığsa yeni sayılır.
        const unknown = st.lastGreen == null && ctx.t - LOADED_AT < EPI_SESSIZ_MS;
        const isNew = unknown ? cur > -0.05 : (st.lastGreen == null || ctx.t - st.lastGreen >= EPI_SESSIZ_MS);
        if (isNew || !st.epi) st.epi = { t0: ctx.t, aDone: !isNew, frDone: !isNew && cur <= FR_B };
        st.lastGreen = ctx.t;
        if (!st.epi.aDone) { st.epi.aDone = true; if (kp.sinyal) { kurA = kurulumSinyal(ctx, cur, tr, fz, kp, 'A'); if (cur <= FR_B) st.epi.frDone = true; } }
      }
      out.push({ botId: 'fr', symbol: ctx.symbol, direction: kind === 'easing' ? 'down' : 'up',
        strategy: kind === 'flip' ? 'Funding changed from + to -' : kind === 'deeper' ? 'FR deeper' : 'FR easing',
        boostPct: null, price: ctx.price ?? null, prevPrice: null, rsi: {}, srsi: {},
        fields: { fundingRate: cur, previousFunding: pv, difference: pv - cur, timeRemaining: tr, ...ex, chg24: bg.chg, rank: bg.rank, warns: bg.warns, ...fFields(fz, kp, ctx) }, text: lines.join('\n') });
      if (kurA) out.push(kurA);
    }
  }
  // ⭐ FR Kurulum (B): yakalama içinde funding ilk kez ≤ −0,10 (dakikalık örneklemede) ve puan ≥ 5
  if (st.epi && !st.epi.frDone && cur <= FR_B) {
    st.epi.frDone = true; const fz = ozellik(ctx, cur), kp = kurulumPuan(fz);
    if (kp.sinyal) out.push(kurulumSinyal(ctx, cur, tr, fz, kp, 'B'));
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
  needs: { '1m': 2, '5m': 300 },
  extras: ['funding', 'ticker24h', 'ratios', 'oi'],
  cadenceMs: 1000,
  minuteSweep: true, // engine evaluates every symbol once per minute (FR scan must list illiquid symbols too)
  constants: { FR_DIFF_PP, FR_SCAN_PCT, FR_SCAN_GAP_MS, V3_MIN_PCT },
  timeRemaining, resetGlobal, kurulumPuan, KURULUM, KACIN, ozellik,
  evaluate(ctx) {
    const st = ctx.state || (ctx.state = {});
    const out = [];
    evalFunding(ctx, st, out);
    evalV3(ctx, st, out);
    return out;
  }
};
