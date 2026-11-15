'use strict';
// Sınama (ağ ve veritabanı yok): rules/flow.cjs içindeki Kurulum puanı, kaçın işaretleri, mesaj satırları ve "⭐ FR Kurulum" tetikleri.
// node db/test-fr-kurulum.cjs  → her denetim için TAMAM / HATA; hata varsa çıkış kodu 1.
const R = require('../rules/flow.cjs');
let bad = 0; const ok = (c, m) => { console.log((c ? 'TAMAM ' : 'HATA  ') + m); if (!c) bad++; };
// 1) puan fonksiyonu
let k = R.kurulumPuan({ px4h: -4, oi4h: -1, crowdLong: 71, vol1h: 6, px24h: -6, fr: -0.104 });
ok(k.puan === 6 && k.bilinen === 6 && k.kacin.length === 0 && k.sinyal, 'tam kurulum: 6/6, işaret yok, sinyal');
k = R.kurulumPuan({ px4h: 3, oi4h: 12, crowdLong: 40, vol1h: 1, px24h: 35, fr: -0.5 });
ok(k.puan === 0 && k.kacin.length === 4 && !k.sinyal, 'kovalama: 0/6, 4 işaret, sinyal yok');
k = R.kurulumPuan({ px4h: -4, oi4h: null, crowdLong: null, vol1h: 6, px24h: -6, fr: -0.1 });
ok(k.bilinen === 4 && k.puan === 4 && !k.sinyal, 'eksik veri: bilinen 4, puan 4 → sinyal yok');
k = R.kurulumPuan({ px4h: -4, oi4h: null, crowdLong: 70, vol1h: 6, px24h: -6, fr: -0.1 });
ok(k.bilinen === 5 && k.puan === 5 && k.sinyal, 'eksik veri: 5/5 → sinyal');
k = R.kurulumPuan({ px4h: null, oi4h: null, crowdLong: null, vol1h: 6, px24h: -6, fr: -0.1 });
ok(k.bilinen === 3 && !k.sinyal, '3 bilinen → sinyal yok');
k = R.kurulumPuan({ px4h: -4, oi4h: -1, crowdLong: 71, vol1h: 6, px24h: 4, fr: -0.104 });
ok(k.puan === 6 && k.kacin.join() === 'px24h' && k.sinyal, 'sınır: px24h = 4 → puan ve tek işaret birlikte (≤ ve ≥), sinyal yine var');
// 2) canlı akış benzetimi
R.resetGlobal();
const M5 = 300e3, T0 = Date.UTC(2026, 10, 11, 10, 0, 0) + 300;
function bars5(t, p4, p24, volMul) {          // 300 adet 5 dk mum; son 12 mum hacmi volMul kat
  const b0 = Math.floor(t / M5) * M5, out = [];
  for (let i = 299; i >= 0; i--) { const ot = b0 - i * M5; let c = 100; if (ot === b0 - 4 * 3600e3) c = p4; if (ot === b0 - 24 * 3600e3) c = p24; out.push({ openTime: ot, open: c, high: c, low: c, close: c, quoteVolume: i < 12 ? 1000 * volMul : 1000 }); }
  return out;
}
const st = {}, sigs = [];
const step = (i, fr, o = {}) => { const t = T0 + i * 60e3; const ctx = { symbol: 'XYZUSDT', t, price: 100, priceStr: '100', state: st, funding: { rate: fr / 100, nextFundingTime: t + 3 * 3600e3 }, ticker24h: { changePct: -6, volume: 1e9 },
  bars: { '1m': [], '5m': bars5(t, o.p4 ?? 104.5, o.p24 ?? 106.5, o.vol ?? 6) }, ratios: { topLongAccount: 0.74, globalLongAccount: o.crowd ?? 0.71, t: t - 5 * 60e3 }, oi: { oi: 1, t, chg1h: 0, chg4h: o.oi4 ?? -1.2, chg24h: 3 }, info: {} };
  for (const s of R.evaluate(ctx)) sigs.push({ i, ...s }); };
// Geçmiş bilinmiyor + funding sığ → yeni yakalama sayılır
step(0, 0.0); step(1, -0.02); step(2, -0.04); step(3, -0.06); step(4, -0.08); step(5, -0.104); step(6, -0.11);
const kA = sigs.filter(s => s.strategy === 'FR Kurulum'), green = sigs.filter(s => s.strategy === 'Funding changed from + to -' || s.strategy === 'FR deeper');
ok(green.length >= 4, 'yeşil mesajlar geliyor (' + green.length + ')');
ok(kA.length === 2 && kA[0].fields.tetik === 'A' && kA[1].fields.tetik === 'B', 'Kurulum A (ilk yeşil) ve B (funding ≤ −0,10) birer kez: ' + kA.map(s => s.fields.tetik + '@' + s.i).join(','));
ok(/Kurulum: 6\/6 ✅/.test(green[0].text) && /OI: 4sa −1\.2%/.test(green[0].text) && /Long: kalabalık %71 · büyükler %74/.test(green[0].text) && /Hacim: 5\.0×/.test(green[0].text) && /Fiyat: 4sa −4\.3%/.test(green[0].text), 'yeşil mesaj satırları');
ok(/^⭐ #XYZUSDT — FR Kurulum \(A\)\nFunding Rate: /.test(kA[0].text) && /Time Remaining: /.test(kA[0].text), 'Kurulum mesaj biçimi');
ok(green[0].text.split('\n').slice(0, 2).join('|') === '🟢 #XYZUSDT|⚠️ Funding changed from + to -' && /^Funding Rate: -0\.0200$/m.test(green[0].text), 'Visivero satırları değişmedi');
console.log('\n--- örnek yeşil mesaj ---\n' + green[1].text + '\n--- örnek Kurulum ---\n' + kA[1].text);
// 3) kovalama coini: kaçın işaretleri, sinyal yok
const st2 = {}; const s2 = [];
for (let i = 0; i < 6; i++) { const t = T0 + 2 * 3600e3 + i * 60e3; const ctx = { symbol: 'KOVUSDT', t, price: 100, state: st2, funding: { rate: (-0.05 - i * 0.05) / 100, nextFundingTime: t + 3 * 3600e3 }, ticker24h: { changePct: 35 }, bars: { '1m': [], '5m': bars5(t, 97, 74, 1) }, ratios: { topLongAccount: 0.5, globalLongAccount: 0.40, t }, oi: { oi: 1, t, chg1h: 2, chg4h: 12, chg24h: 40 }, info: {} };
  for (const s of R.evaluate(ctx)) s2.push(s); }
const g2 = s2.filter(s => s.direction === 'up');
ok(g2.length > 0 && !g2.some(s => s.strategy === 'FR Kurulum'), 'kovalama coininde Kurulum sinyali yok');
ok(g2.some(s => /⚠️ Kaçın: /.test(s.text)), 'kaçın işaretleri yazılıyor: ' + (g2.find(s => /Kaçın/.test(s.text)) || {}).text?.split('\n').find(l => /Kurulum/.test(l)));
// 4) yakalama içinde ikinci kez tetik yok; 12 sa sonra yeni yakalama
const before = sigs.length; step(10, -0.2); step(11, -0.25);
ok(!sigs.slice(before).some(s => s.strategy === 'FR Kurulum'), 'aynı yakalamada tekrar Kurulum yok');
step(12 * 60 + 30, -0.01); step(12 * 60 + 31, -0.03);
ok(sigs.slice(before).filter(s => s.strategy === 'FR Kurulum' && s.fields.tetik === 'A').length === 1, '12 saat sessizlikten sonra yeni yakalama → yeni A');
console.log(bad ? `\n${bad} HATA` : '\nhepsi TAMAM'); process.exit(bad ? 1 : 0);
