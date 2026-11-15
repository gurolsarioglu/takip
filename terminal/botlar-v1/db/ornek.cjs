'use strict';
// Araştırma: tek bir coin örneğini (kullanıcının gösterdiği pompa) saat saat döker: fiyat, hacim, açık pozisyon (OI),
// long/short oranları, alıcı payı, funding ve bizim botların o andaki sinyalleri. Binance'e ~10 istek atar.
// node db/ornek.cjs INITUSDT 2026-11-09T09:00:00Z 2026-11-10T16:00:00Z 2026-11-09T15:25:00Z(başlangıç işareti)
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const [SYM, A, B, S0] = process.argv.slice(2), from = Date.parse(A), to = Date.parse(B), start = Date.parse(S0 || A), H = 3600e3;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async u => { await sleep(700); const r = await fetch('https://fapi.binance.com' + u); const j = await r.json(); if (!r.ok) throw new Error(u + ' ' + JSON.stringify(j)); return j; };
const tr = t => new Date(t + 3 * H).toISOString().slice(5, 16).replace('T', ' ');
(async () => {
  const k = (await pool.query(`SELECT extract(epoch FROM t)*1000 AS t, o, h, l, c, qv FROM klines_5m WHERE symbol=$1 AND t >= $2 AND t < $3 ORDER BY t`, [SYM, new Date(from - 24 * H), new Date(to)])).rows.map(r => ({ ...r, t: Number(r.t) }));
  const span = `&startTime=${from}&endTime=${to}`, q = async (ep, per) => { const o = []; const step = per === '5m' ? 300e3 : 900e3; for (let a = from; a < to; a += 500 * step) o.push(...await get(`/futures/data/${ep}?symbol=${SYM}&period=${per}&limit=500&startTime=${a}&endTime=${Math.min(to, a + 500 * step) - 1}`)); return o; };
  const oi = await q('openInterestHist', '5m'), top = await q('topLongShortAccountRatio', '15m'), topP = await q('topLongShortPositionRatio', '15m'), glob = await q('globalLongShortAccountRatio', '15m'), tk = await q('takerlongshortRatio', '15m');
  const fr = await get(`/fapi/v1/fundingRate?symbol=${SYM}&startTime=${from - 24 * H}&endTime=${to}&limit=100`);
  let pk = []; try { pk = await get(`/fapi/v1/premiumIndexKlines?symbol=${SYM}&interval=1h&startTime=${from}&endTime=${to}&limit=200`); } catch (e) { console.log('premiumIndex yok:', e.message.slice(0, 80)); }
  const sig = (await pool.query(`SELECT bot, dir, strategy, t, price, left(text, 300) txt FROM karne_signals k JOIN LATERAL (SELECT text FROM signals s WHERE s.bot=k.bot AND s.symbol=k.symbol AND s.t=k.t LIMIT 1) x ON true WHERE symbol=$1 AND t >= $2 AND t < $3 ORDER BY t`, [SYM, new Date(from), new Date(to)])).rows;
  const raw = (await pool.query(`SELECT bot, dir, date_trunc('hour', t) h, count(*)::int n FROM signals WHERE symbol=$1 AND t >= $2 AND t < $3 GROUP BY 1,2,3`, [SYM, new Date(from), new Date(to)])).rows;
  const base = k.filter(x => x.t < start && x.t >= start - 24 * H), v24 = base.reduce((a, x) => a + x.qv, 0) / (base.length || 1), p0 = (k.find(x => x.t >= start) || k[0]).c;
  const oi0 = (oi.find(x => x.timestamp >= start) || oi[0]), at = (arr, t, f) => { let b = null; for (const x of arr) { if (x.timestamp <= t) b = x; else break; } return b ? f(b) : NaN; };
  console.log(`${SYM} | başlangıç işareti ${tr(start)} TR, fiyat ${p0} | önceki 24 sa ortalama 5 dk hacim: ${(v24 / 1e3).toFixed(0)} bin $ | funding aralığı: ${fr.length > 1 ? (fr[1].fundingTime - fr[0].fundingTime) / H : '?'} sa`);
  console.log('\n### Saat saat (TR saati). hacim× = o saatin 5 dk ort. hacmi / başlangıç öncesi 24 sa ortalaması');
  const T = {};
  for (let h = Math.floor(from / H) * H; h < to; h += H) {
    const kk = k.filter(x => x.t >= h && x.t < h + H); if (!kk.length) continue; const e = h + H - 1, c = kk[kk.length - 1].c;
    const tkh = tk.filter(x => x.timestamp >= h && x.timestamp < h + H), bv = tkh.reduce((a, x) => a + +x.buyVol, 0), sv = tkh.reduce((a, x) => a + +x.sellVol, 0);
    const sg = raw.filter(r => r.h.getTime() === h), ep = sig.filter(s => s.t.getTime() >= h && s.t.getTime() < h + H);
    const prem = pk.find(x => x[0] === h);
    T[tr(h)] = { kapanış: c, 'başa göre%': +((c / p0 - 1) * 100).toFixed(1), 'saat%': +((c / kk[0].o - 1) * 100).toFixed(1), 'hacim×': +(kk.reduce((a, x) => a + x.qv, 0) / kk.length / v24).toFixed(1), 'hacim M$': +(kk.reduce((a, x) => a + x.qv, 0) / 1e6).toFixed(1),
      'OI M$': +at(oi, e, x => x.sumOpenInterestValue / 1e6).toFixed(1), 'OI adet başa göre%': +((at(oi, e, x => +x.sumOpenInterest) / +oi0.sumOpenInterest - 1) * 100).toFixed(1),
      'üst hesap long%': +(at(top, e, x => x.longAccount * 100)).toFixed(1), 'üst pozisyon long%': +(at(topP, e, x => x.longAccount * 100)).toFixed(1), 'genel long%': +(at(glob, e, x => x.longAccount * 100)).toFixed(1), 'alıcı payı%': bv + sv ? +(100 * bv / (bv + sv)).toFixed(1) : NaN,
      'prim%': prem ? +(+prem[4] * 100).toFixed(3) : NaN, sinyaller: ep.map(s => `${s.bot}${s.dir === 'up' ? '🟢' : s.dir === 'down' ? '🔴' : ''}`).join(' ') || (sg.length ? '(tekrar)' : '') };
  }
  console.table(T);
  console.log('\n### Funding ödemeleri'); console.table(fr.map(x => ({ zaman: tr(x.fundingTime), 'oran%': +(x.fundingRate * 100).toFixed(4) })));
  console.log('\n### Başlangıç işaretinden ±2 saat, 15 dk adım');
  const T2 = {}; for (let t = start - 2 * H; t <= start + 4 * H; t += 900e3) { const kk = k.filter(x => x.t >= t && x.t < t + 900e3); if (!kk.length) continue; const e = t + 900e3 - 1, x = tk.find(y => y.timestamp === t);
    T2[tr(t)] = { kapanış: kk[kk.length - 1].c, '15dk%': +((kk[kk.length - 1].c / kk[0].o - 1) * 100).toFixed(2), 'hacim×': +(kk.reduce((a, y) => a + y.qv, 0) / kk.length / v24).toFixed(1), 'OI adet başa göre%': +((at(oi, e, y => +y.sumOpenInterest) / +oi0.sumOpenInterest - 1) * 100).toFixed(1), 'üst hesap long%': +(at(top, e, y => y.longAccount * 100)).toFixed(1), 'genel long%': +(at(glob, e, y => y.longAccount * 100)).toFixed(1), 'alıcı payı%': x ? +(100 * x.buyVol / (+x.buyVol + +x.sellVol)).toFixed(1) : NaN }; }
  console.table(T2);
  console.log('\n### Bizim botların tekrarsız sinyalleri (ilk 40)'); for (const s of sig.slice(0, 40)) console.log(tr(s.t.getTime()), s.bot, s.dir || '', s.strategy || '', s.price, '|', s.txt.split('\n').slice(1).filter(l => /Boost|Drop|Divergence|WT Cross|Hacim|Funding Rate|Volume/.test(l)).join(' · '));
  await pool.end();
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
