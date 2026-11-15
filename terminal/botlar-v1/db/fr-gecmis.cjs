'use strict';
// Araştırma: bütün coinlerin KESİNLEŞMİŞ funding geçmişini indirir (Binance açık uç /fapi/v1/fundingRate, anahtarsız). Veritabanına dokunmaz.
// Çıktı: data\arastirma\funding.jsonl  → satır başına bir coin: {"s":"BTCUSDT","d":[[zaman_ms, oran_yüzde], ...]}
// Kullanım: node db/fr-gecmis.cjs [başlangıç=2024-11-01]   · kaldığı yerden sürer · istek arası 700 ms (uç sınırı 500 istek / 5 dk)
const fs = require('node:fs'), path = require('node:path');
const DIR = path.join(__dirname, '..', 'data', 'arastirma'), OUT = path.join(DIR, 'funding.jsonl'), T0 = Date.parse((process.argv[2] || '2024-11-01') + 'T00:00:00Z');
const sleep = ms => new Promise(r => setTimeout(r, ms)), log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
async function get(u) {
  for (let i = 0; i < 5; i++) {
    await sleep(700); let r; try { r = await fetch('https://fapi.binance.com' + u); } catch (e) { await sleep(5000); continue; }
    if (r.status === 418) throw new Error('418: IP engellendi, dur');
    if (r.status === 429) { const w = Number(r.headers.get('retry-after') || 60); log('429, bekleme', w, 'sn'); await sleep((w + 5) * 1000); continue; }
    if (r.status === 400) return [];
    if (r.ok) return r.json();
    await sleep(3000);
  }
  throw new Error('alınamadı ' + u);
}
(async () => {
  const syms = new Set(); for (const d of ['k5', 'k5b', 'k5c']) { const p = path.join(DIR, d); if (fs.existsSync(p)) for (const f of fs.readdirSync(p)) if (f.endsWith('.bin')) syms.add(f.slice(0, -4)); }
  const done = new Set(fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).s) : []);
  const list = [...syms].sort().filter(s => !done.has(s)); log('coin', syms.size, 'kalan', list.length); let n = 0, req = 0;
  for (const s of list) {
    const d = []; let cur = T0;
    for (;;) { const j = await get(`/fapi/v1/fundingRate?symbol=${s}&startTime=${cur}&limit=1000`); req++; for (const x of j) d.push([x.fundingTime, +(Number(x.fundingRate) * 100).toFixed(5)]); if (j.length < 1000) break; cur = j[j.length - 1].fundingTime + 1; }
    fs.appendFileSync(OUT, JSON.stringify({ s, d }) + '\n');
    if (++n % 50 === 0) log(n, '/', list.length, 'istek', req);
  }
  log('bitti: coin', n, 'istek', req);
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
