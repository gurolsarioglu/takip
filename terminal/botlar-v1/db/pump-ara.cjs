'use strict';
// Araştırma: büyük yükselişler (pump) önceden ayırt edilebiliyor mu? 24 aylık arşiv mumlarından SAATLİK panel üretir. Veritabanına dokunmaz.
// Girdi: data\arastirma\k5b, k5 (db/ozgun-arsiv.cjs).  Çıktı: data\arastirma\pump-panel.csv
// Her satır = bir coin, bir saat kapanışı: o ana kadarki durum (yalnız geçmiş) + sonraki 48 saatte olan (yalnız gelecek).
// Örnekleme: sonraki 48 saatte en az +%50 gören bütün saatler (w=1) + diğer saatlerin 40'ta biri (w=40).
const fs = require('node:fs'), path = require('node:path');
const DIR = path.join(__dirname, '..', 'data', 'arastirma'), M5 = 300e3, NF = 6, HR = 3600e3;
const SETS = [['k5b', Date.parse('2024-11-01T00:00:00Z'), Date.parse('2025-11-01T00:00:00Z')], ['k5', Date.parse('2025-11-01T00:00:00Z'), Date.parse('2026-11-01T00:00:00Z')]];
const TA = SETS[0][1], TB = SETS[1][2], N5 = (TB - TA) / M5, NH = N5 / 12, r2 = v => Number.isFinite(v) ? Math.round(v * 100) / 100 : '';
const hash = s => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
function hourly(sym) {
  const O = new Float32Array(NH).fill(NaN), H = new Float32Array(NH).fill(NaN), L = new Float32Array(NH).fill(NaN), C = new Float32Array(NH).fill(NaN), Q = new Float32Array(NH), T = new Float32Array(NH); let any = false;
  for (const [d, t0, t1] of SETS) {
    const p = path.join(DIR, d, sym + '.bin'); if (!fs.existsSync(p)) continue; any = true;
    const b = fs.readFileSync(p), A = new Float32Array(b.buffer, b.byteOffset, (t1 - t0) / M5 * NF), off = (t0 - TA) / HR;
    for (let h = 0; h < (t1 - t0) / HR; h++) {
      let o = NaN, hi = 0, lo = Infinity, c = NaN, q = 0, tb = 0, ok = true;
      for (let k = 0; k < 12; k++) { const i = (h * 12 + k) * NF; if (!(A[i + 3] > 0)) { ok = false; break; } if (k === 0) o = A[i]; hi = Math.max(hi, A[i + 1]); lo = Math.min(lo, A[i + 2]); c = A[i + 3]; q += A[i + 4] || 0; tb += A[i + 5] || 0; }
      if (ok) { O[off + h] = o; H[off + h] = hi; L[off + h] = lo; C[off + h] = c; Q[off + h] = q; T[off + h] = tb; }
    }
  }
  return any ? { O, H, L, C, Q, T } : null;
}
const UPL = [20, 50, 100, 200], DNL = [10, 20, 30];
(async () => {
  const syms = new Set(); for (const [d] of SETS) for (const f of fs.readdirSync(path.join(DIR, d))) if (f.endsWith('.bin')) syms.add(f.slice(0, -4));
  const B = hourly('BTCUSDT'), out = fs.createWriteStream(path.join(DIR, 'pump-panel.csv'));
  out.write('s,t,w,r1,r4,r24,r72,r168,mx48,sp48,hsp,rt48,up48,mx168,sp168,rng24,rng72,pos7,dd7,up7,v24,vr,v1r,vr6,tb24,tb6,age,b24,mfe,tmfe,maeb,mae,c24,c48,u20,u50,u100,u200,d10,d20,d30\n');
  let rows = 0, pos = 0, done = 0;
  for (const sym of [...syms].sort()) {
    const K = hourly(sym); done++; if (!K) continue; const { O, H, L, C, Q, T } = K, hh = hash(sym);
    let first = -1; for (let h = 0; h < NH; h++) if (C[h] > 0) { first = h; break; } if (first < 0) continue;
    const P = new Float64Array(NH + 1), PT = new Float64Array(NH + 1), NV = new Int32Array(NH + 1);
    for (let h = 0; h < NH; h++) { P[h + 1] = P[h] + Q[h]; PT[h + 1] = PT[h] + T[h]; NV[h + 1] = NV[h] + (C[h] > 0 ? 0 : 1); }
    for (let h = first + 168; h + 48 < NH; h++) {
      if (!(C[h] > 0) || NV[h + 1] - NV[h - 168] > 4 || NV[h + 49] - NV[h + 1] > 0) continue;
      const c = C[h]; let mfe = 0, tmfe = 0, mae = 0, maeb = 0; const u = UPL.map(() => 0), dn = DNL.map(() => 0);
      for (let k = 1; k <= 48; k++) { const up = (H[h + k] / c - 1) * 100, d = (1 - L[h + k] / c) * 100; if (d > mae) mae = d; if (up > mfe) { mfe = up; tmfe = k; maeb = mae; } UPL.forEach((x, j) => { if (!u[j] && up >= x) u[j] = k; }); DNL.forEach((x, j) => { if (!dn[j] && d >= x) dn[j] = k; }); }
      const isPos = mfe >= 50; if (!isPos && (h + hh) % 40 !== 0) continue;
      const ret = n => C[h - n] > 0 ? (c / C[h - n] - 1) * 100 : NaN;
      let mx48 = 0, sp48 = 0, hsp = '', up48 = 0, hi48 = 0, mx168 = 0, sp168 = 0, hi24 = 0, lo24 = Infinity, hi72 = 0, lo72 = Infinity, hi7 = 0, lo7 = Infinity;
      for (let k = 0; k < 168; k++) {
        const j = h - k; if (!(C[j] > 0)) continue; const s = (H[j] / O[j] - 1) * 100;
        if (s > mx168) mx168 = s; if (s >= 8) sp168++;
        if (k < 48) { if (s > mx48) { mx48 = s; hsp = k; } if (s >= 8) sp48++; if ((C[j] / O[j] - 1) * 100 >= 5) up48++; if (H[j] > hi48) hi48 = H[j]; }
        if (k < 24) { hi24 = Math.max(hi24, H[j]); lo24 = Math.min(lo24, L[j]); } if (k < 72) { hi72 = Math.max(hi72, H[j]); lo72 = Math.min(lo72, L[j]); }
        hi7 = Math.max(hi7, H[j]); lo7 = Math.min(lo7, L[j]);
      }
      const v24 = P[h + 1] - P[h - 23], vprev = (P[h - 23] - P[h - 167]) / 6, v6 = P[h + 1] - P[h - 5];
      out.write([sym, TA + (h + 1) * HR, isPos ? 1 : 40, r2(ret(1)), r2(ret(4)), r2(ret(24)), r2(ret(72)), r2(ret(168)), r2(mx48), sp48, hsp, r2((c / hi48 - 1) * 100), up48, r2(mx168), sp168,
        r2((hi24 / lo24 - 1) * 100), r2((hi72 / lo72 - 1) * 100), r2((c - lo7) / (hi7 - lo7 || NaN)), r2((c / hi7 - 1) * 100), r2((c / lo7 - 1) * 100), r2(v24 / 1e6), r2(v24 / (vprev || NaN)), r2(Q[h] / (v24 / 24 || NaN)), r2(v6 * 4 / (v24 || NaN)),
        r2((PT[h + 1] - PT[h - 23]) / (v24 || NaN) * 100), r2((PT[h + 1] - PT[h - 5]) / (v6 || NaN) * 100), Math.round((h - first) / 24), r2(B.C[h] > 0 && B.C[h - 24] > 0 ? (B.C[h] / B.C[h - 24] - 1) * 100 : NaN),
        r2(mfe), tmfe, r2(maeb), r2(mae), r2((C[h + 24] / c - 1) * 100), r2((C[h + 48] / c - 1) * 100), ...u, ...dn].join(',') + '\n'); rows++; if (isPos) pos++;
    }
    if (done % 150 === 0) console.log(done, '/', syms.size, 'satır', rows, 'pozitif', pos);
  }
  await new Promise(r => out.end(r)); console.log('bitti: satır', rows, '| +%50 gören saat', pos);
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
