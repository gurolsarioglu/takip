'use strict';
// Araştırma: funding'in İKİ yönü (artı = long'lar ödüyor, eksi = short'lar ödüyor) ve sonrasındaki fiyat. Veritabanına dokunmaz.
// Girdi: data\arastirma\funding.jsonl (db/fr-gecmis.cjs) + data\arastirma\k5b, k5 (db/ozgun-arsiv.cjs indir b|a; 24 ay 5 dk mum)
// Çıktı: data\arastirma\fr-arti.csv → her funding ödemesi bir satır: ödeme anındaki oran ve fiyatın öncesi/sonrası
// Bakış hatası yok: "öncesi" ödeme anından önce kapanan mumlardan, "sonrası" ödeme anından sonraki mumlardan.
const fs = require('node:fs'), path = require('node:path'), readline = require('node:readline');
const DIR = path.join(__dirname, '..', 'data', 'arastirma'), M5 = 300e3, NF = 6;
const SETS = [['k5b', Date.parse('2024-11-01T00:00:00Z'), Date.parse('2025-11-01T00:00:00Z')], ['k5', Date.parse('2025-11-01T00:00:00Z'), Date.parse('2026-11-01T00:00:00Z')]];
const TA = SETS[0][1], TB = SETS[1][2], N = (TB - TA) / M5, r3 = v => Number.isFinite(v) ? Math.round(v * 1000) / 1000 : '';
function load(sym) {                       // iki kümeyi tek zaman ızgarasında birleştir
  const C = new Float32Array(N).fill(NaN), Hh = new Float32Array(N).fill(NaN), L = new Float32Array(N).fill(NaN), Q = new Float32Array(N); let any = false;
  for (const [d, t0, t1] of SETS) {
    const p = path.join(DIR, d, sym + '.bin'); if (!fs.existsSync(p)) continue; any = true;
    const b = fs.readFileSync(p), A = new Float32Array(b.buffer, b.byteOffset, (t1 - t0) / M5 * NF), off = (t0 - TA) / M5;
    for (let i = 0; i < (t1 - t0) / M5; i++) { C[off + i] = A[i * NF + 3]; Hh[off + i] = A[i * NF + 1]; L[off + i] = A[i * NF + 2]; Q[off + i] = A[i * NF + 4] || 0; }
  }
  return any ? { C, Hh, L, Q } : null;
}
(async () => {
  const out = fs.createWriteStream(path.join(DIR, 'fr-arti.csv')); out.write('s,t,saat,oran,onceki,onceki2,r1,r4,r24,q24,c4,c24,c48,mfe,mae\n'); let rows = 0, coins = 0;
  for await (const line of readline.createInterface({ input: fs.createReadStream(path.join(DIR, 'funding.jsonl')) })) {
    if (!line) continue; const { s, d } = JSON.parse(line); if (d.length < 5) continue; const K = load(s); if (!K) continue; coins++;
    for (let j = 2; j < d.length; j++) {
      const [t, oran] = d[j], tt = Math.round(t / M5) * M5, i = (tt - TA) / M5 - 1;      // i = ödeme anından hemen önce kapanan mum
      if (i < 288 || i + 576 >= N) continue; const c = K.C[i]; if (!(c > 0)) continue;
      const saat = Math.round((t - d[j - 1][0]) / 3600e3); if (saat < 1 || saat > 8) continue;
      const ret = n => K.C[i - n] > 0 ? (c / K.C[i - n] - 1) * 100 : NaN, fwd = n => K.C[i + n] > 0 ? (K.C[i + n] / c - 1) * 100 : NaN;
      let q = 0, mfe = 0, mae = 0, ok = true; for (let k = i - 287; k <= i; k++) q += K.Q[k];
      for (let k = i + 1; k <= i + 288; k++) { if (!(K.C[k] > 0)) { ok = false; break; } mfe = Math.max(mfe, (K.Hh[k] / c - 1) * 100); mae = Math.max(mae, (1 - K.L[k] / c) * 100); }
      if (!ok) continue;
      out.write([s, tt, saat, oran, d[j - 1][1], d[j - 2][1], r3(ret(12)), r3(ret(48)), r3(ret(288)), Math.round(q / 1e4) / 100, r3(fwd(48)), r3(fwd(288)), r3(fwd(576)), r3(mfe), r3(mae)].join(',') + '\n'); rows++;
    }
  }
  await new Promise(r => out.end(r)); console.log('bitti: coin', coins, 'satır', rows);
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
