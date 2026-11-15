'use strict';
// Araştırma: 12 aylık arşiv mumlarında (data\arastirma\k5\*.bin) aday olayları ve sonuçlarını döker. Veritabanına dokunmaz.
// Çağrı: node db/ozgun-arsiv.cjs olay   → data\arastirma\arsiv-olay-1..4.jsonl (çeyrek başına bir dosya)
// Bakış hatası yok: giriş = mumun kapanışı; bütün özellikler o mum ve öncesinden; piyasa genişliği aynı mumun kapanışından.
const fs = require('node:fs'), path = require('node:path');
const { T_START, N, NF, M5, K5, DIR, log, SET } = require('./ozgun-arsiv.cjs');
const HOR = 576, UP = [0.5, 1, 1.5, 2, 3, 4, 5, 7, 10, 15, 20], DN = [1, 2, 3, 4, 5, 6, 8, 9.5, 19], CL = [12, 24, 48, 96, 144, 288, 576];
const r2 = v => v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100;
const hash = s => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const read = s => { const b = fs.readFileSync(path.join(K5, s + '.bin')); return new Float32Array(b.buffer, b.byteOffset, N * NF); };
async function olay() {
  const syms = fs.readdirSync(K5).filter(f => f.endsWith('.bin')).map(f => f.slice(0, -4)).sort();
  log('coin', syms.length);
  // 1. geçiş: piyasa genişliği (her mum için bütün coinlerin ortak durumu)
  const cnt = new Uint16Array(N), s1 = new Float32Array(N), s24 = new Float32Array(N), n1 = new Uint16Array(N), n5 = new Uint16Array(N), n10 = new Uint16Array(N), u10 = new Uint16Array(N);
  for (const sym of syms) {
    const A = read(sym);
    for (let i = 288; i < N; i++) {
      const c = A[i * NF + 3], c1 = A[(i - 12) * NF + 3], c24 = A[(i - 288) * NF + 3]; if (!(c > 0) || !(c1 > 0) || !(c24 > 0)) continue;
      const a = (c / c1 - 1) * 100, b = (c / c24 - 1) * 100; cnt[i]++; s1[i] += Math.max(-20, Math.min(20, a)); s24[i] += Math.max(-50, Math.min(50, b));
      if (a <= -2) n1[i]++; if (b <= -5) n5[i]++; if (b <= -10) n10[i]++; if (b >= 10) u10[i]++;
    }
  }
  log('piyasa genişliği hazır');
  if (!fs.existsSync(path.join(K5, 'BTCUSDT.bin'))) throw new Error('BTCUSDT yok');
  const B = read('BTCUSDT'), bc = i => B[i * NF + 3], btc = (i, n) => bc(i) > 0 && bc(i - n) > 0 ? (bc(i) / bc(i - n) - 1) * 100 : null;
  const outs = [1, 2, 3, 4].map(q => fs.createWriteStream(path.join(DIR, `arsiv-olay-${SET}${q}.jsonl`)));
  let rows = 0, done = 0; const tc = {};
  for (const sym of syms) {
    const A = read(sym), O = i => A[i * NF], Hh = i => A[i * NF + 1], L = i => A[i * NF + 2], C = i => A[i * NF + 3];
    const P = new Float64Array(N + 1), PT = new Float64Array(N + 1), NN = new Int32Array(N + 1); let first = -1;
    for (let i = 0; i < N; i++) { const ok = C(i) > 0; if (ok && first < 0) first = i; P[i + 1] = P[i] + (ok ? A[i * NF + 4] : 0); PT[i + 1] = PT[i] + (ok ? A[i * NF + 5] : 0); NN[i + 1] = NN[i] + (ok ? 0 : 1); }
    done++; if (first < 0) continue;
    const sum = (a, b) => P[b + 1] - P[a], full = (a, b) => NN[b + 1] - NN[a] === 0, hh = hash(sym);
    for (let i = Math.max(first + 300, 300); i < N; i++) {
      if (!full(i - 300, i)) continue;
      const c = C(i), o = O(i), ret = n => (c / C(i - n) - 1) * 100, r1 = ret(12), r24 = ret(288), body = (c / o - 1) * 100;
      const bv = A[i * NF + 4] / (sum(i - 288, i - 1) / 288 || NaN);
      let tag = '', hi6 = null, lo6 = null;
      const six = () => { if (hi6 == null) { hi6 = 0; lo6 = Infinity; for (let j = i - 72; j < i; j++) { if (Hh(j) > hi6) hi6 = Hh(j); if (L(j) < lo6) lo6 = L(j); } } };
      if (r1 <= -3 && r24 <= -8) tag += 'A';                                                   // düşmüş coinde saatlik sert satış
      if (bv >= 5) { six(); if ((hi6 / lo6 - 1) * 100 <= 4 && c > hi6) tag += 'C'; }            // dar bant + hacimli kırılım
      let hi24 = null, lo24 = null, lo24p = Infinity;
      const day = () => { if (hi24 == null) { hi24 = 0; lo24 = Infinity; for (let j = i - 287; j <= i; j++) { if (Hh(j) > hi24) hi24 = Hh(j); if (L(j) < lo24) lo24 = L(j); if (j < i && L(j) < lo24p) lo24p = L(j); } if (L(i - 288) < lo24p) lo24p = L(i - 288); } };
      if (body >= 2 && bv >= 8) { let h = 0; for (let j = i - 288; j < i; j++) if (Hh(j) > h) h = Hh(j); if (c > h) tag += 'M'; }   // hacimli 24 sa zirve kırılımı (pump başlangıcı adayı)
      if ((i + hh) % 300 === 0) tag += 'R';
      const tagS = r1 >= 8 && r24 >= 15 ? 'F' : '';                                             // short adayı: sert yükseliş
      if (!tag && !tagS) continue;
      six(); day();
      let hi1 = 0; for (let j = i - 12; j < i; j++) if (Hh(j) > hi1) hi1 = Hh(j);
      let hi7 = null, lo7 = null; if (i >= first + 2016 && full(i - 2016, i)) { hi7 = 0; lo7 = Infinity; for (let j = i - 2016; j <= i; j++) { if (Hh(j) > hi7) hi7 = Hh(j); if (L(j) < lo7) lo7 = L(j); } }
      const v1 = sum(i - 11, i), vb = sum(i - 299, i - 12) / 24, k = { o, h: Hh(i), l: L(i), c };
      const f = {
        r15: r2(ret(3)), r1: r2(r1), r4: r2(ret(48)), r24: r2(r24), r72: i >= first + 864 && full(i - 864, i) ? r2(ret(864)) : null,
        dd7: hi7 ? r2((c / hi7 - 1) * 100) : null, up7: lo7 ? r2((c / lo7 - 1) * 100) : null,
        v1: r2(v1 / vb), bv: r2(bv), q24: Math.round(sum(i - 287, i) / 1e4) / 100, rng6: r2((hi6 / lo6 - 1) * 100), d6: r2((c / hi6 - 1) * 100),
        pos24: r2((c - lo24) / (hi24 - lo24 || NaN)), rng24: r2((hi24 / lo24 - 1) * 100), h1d: r2((c / hi1 - 1) * 100), nl: k.l < lo24p ? 1 : 0,
        uw: r2((k.h / Math.max(o, c) - 1) * 100), brng: r2((k.h / k.l - 1) * 100), gr: c > o ? 1 : 0, ph: c > Hh(i - 1) ? 1 : 0, body: r2(body), wick: r2((Math.min(o, c) / k.l - 1) * 100),
        tb1: r2((PT[i + 1] - PT[i - 11]) / (v1 || NaN) * 100), tbb: r2(A[i * NF + 5] / (A[i * NF + 4] || NaN) * 100),
        b1: r2(btc(i, 12)), b4: r2(btc(i, 48)), b24: r2(btc(i, 288)),
        mr1: r2(s1[i] / cnt[i]), mr24: r2(s24[i] / cnt[i]), s1: r2(n1[i] / cnt[i] * 100), sd5: r2(n5[i] / cnt[i] * 100), sd10: r2(n10[i] / cnt[i] * 100), su10: r2(u10[i] / cnt[i] * 100), nc: cnt[i],
        age: Math.round((i - first) / 288),
      };
      const t = T_START + (i + 1) * M5;
      for (const [tg, d] of [[tag, 1], [tagS, -1]]) {
        if (!tg) continue;
        const u = UP.map(() => 0), w = DN.map(() => 0), cl = []; let mfe = 0, mae = 0, n = 0;
        for (let j = i + 1; j < N && j <= i + HOR; j++) {
          if (!(C(j) > 0)) break; n = j - i;
          const up = d === 1 ? (Hh(j) / c - 1) * 100 : (1 - L(j) / c) * 100, dn = d === 1 ? (1 - L(j) / c) * 100 : (Hh(j) / c - 1) * 100;
          if (up > mfe) mfe = up; if (dn > mae) mae = dn;
          for (let x = 0; x < UP.length; x++) if (!u[x] && up >= UP[x]) u[x] = n;
          for (let x = 0; x < DN.length; x++) if (!w[x] && dn >= DN[x]) w[x] = n;
          if (CL.includes(n)) cl.push(r2((C(j) / c - 1) * 100 * d));
        }
        outs[Math.min(3, Math.floor(i / (N / 4)))].write(JSON.stringify({ s: sym, t, g: tg, d, p: c, f, u, w, cl, mfe: r2(mfe), mae: r2(mae), n }) + '\n'); rows++;
        for (const ch of tg) tc[ch] = (tc[ch] || 0) + 1;
      }
    }
    if (done % 100 === 0) { log(done, '/', syms.length, 'satır', rows); await new Promise(r => setImmediate(r)); }
  }
  await Promise.all(outs.map(o => new Promise(r => o.end(r))));
  log('bitti: satır', rows, JSON.stringify(tc));
}
module.exports = { olay };
