'use strict';
// web/coingecko.cjs testleri (ağsız, sahte fetch + geçici dosyalar): node --test db/test-coingecko.cjs
// Eşleme (çarpan, aynı kısaltmalı adaylar arasından fiyatı tutan), anahtar yokken istek atılmaması, istek aralığı, önbelleğin diske yazılıp okunması.
const assert = require('node:assert/strict'), { test } = require('node:test'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const CG = require('../web/coingecko.cjs');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cg-'));
const LIST = [{ id: 'bitcoin', symbol: 'btc' }, { id: 'pepe', symbol: 'pepe' }, { id: 'pepe-sahte', symbol: 'pepe' }, { id: 'ai-gercek', symbol: 'ai' }, { id: 'ai-baska', symbol: 'ai' }, { id: 'tek', symbol: 'tek' }];
const MK = {
  bitcoin: { current_price: 95000, market_cap: 1.9e12, market_cap_rank: 1, fully_diluted_valuation: 2e12, total_volume: 3e10, circulating_supply: 19.9e6, total_supply: 19.9e6, max_supply: 21e6, ath: 110000, ath_change_percentage: -13.6, ath_date: '2026-01-01T00:00:00Z', price_change_percentage_7d_in_currency: 2, price_change_percentage_30d_in_currency: -4 },
  pepe: { current_price: 0.0000112, market_cap: 4.7e9, market_cap_rank: 30, circulating_supply: 4.2e14, total_supply: 4.2e14, max_supply: 4.2e14 },
  'pepe-sahte': { current_price: 0.5, market_cap: 9e9 },                  // piyasa değeri büyük ama fiyat tutmuyor → seçilmemeli
  'ai-gercek': { current_price: 0.3, market_cap: 2e7, max_supply: null, circulating_supply: 5e7, total_supply: 1e8 },
  'ai-baska': { current_price: 0.31, market_cap: 1e6 },                  // fiyat tutuyor ama piyasa değeri küçük → ikinci
  tek: { current_price: 10, market_cap: 1e8 },                           // fiyat %50 farklı → eşlenmez
};
function fake() {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, key: init.headers['x-cg-demo-api-key'] });
    const u = new URL(url);
    if (u.pathname.endsWith('/coins/list')) return new Response(JSON.stringify(LIST));
    if (u.pathname.endsWith('/coins/markets')) return new Response(JSON.stringify(u.searchParams.get('ids').split(',').filter(id => MK[id]).map(id => ({ id, name: id, ...MK[id] }))));
    return new Response('{}', { status: 404 });
  };
  return { f, calls };
}
const PRICES = { BTCUSDT: 95100, '1000PEPEUSDT': 0.0112, AIUSDT: 0.301, TEKUSDT: 15, YOKUSDT: 1 };
async function until(c, t = 2000) { const end = Date.now() + t; while (c.S.busy && Date.now() < end) await new Promise(r => setTimeout(r, 5)); }

test('baseOf çarpanları çözer, çarpansız adı bozmaz', () => {
  assert.deepEqual(CG.baseOf('1000PEPEUSDT'), ['pepe', 1000]);
  assert.deepEqual(CG.baseOf('1000000MOGUSDT'), ['mog', 1e6]);
  assert.deepEqual(CG.baseOf('1MBABYDOGEUSDT'), ['babydoge', 1e6]);
  assert.deepEqual(CG.baseOf('BTCUSDT'), ['btc', 1]);
  assert.deepEqual(CG.baseOf('1INCHUSDT'), ['1inch', 1]);       // 1INCH bir coin adı: çarpan sayılmaz
  assert.deepEqual(CG.baseOf('100USDT'), ['100', 1]);
  assert.deepEqual(CG.baseOf('LUNA2USDT'), ['luna', 1]);         // Binance adı farklı → takma ad
});

test('anahtar yoksa hiç istek atılmaz', async () => {
  const d = tmp(), { f, calls } = fake(), c = CG.create({ keyFile: path.join(d, 'yok.json'), cacheFile: path.join(d, 'c.json'), log() {} });
  const r = c.get('BTCUSDT', f, async () => PRICES); await until(c);
  assert.equal(r.none, 'anahtar'); assert.equal(calls.length, 0);
});

test('eşleme: fiyatı tutan en büyük piyasa değerli aday; tutmayan eşlenmez; anahtar başlıkta gider; önbellek diske yazılır', async () => {
  const d = tmp(), kf = path.join(d, 'k.json'), cf = path.join(d, 'c.json'); fs.writeFileSync(kf, '﻿{"key":"CG-deneme-anahtari-123"}');
  const { f, calls } = fake(), c = CG.create({ keyFile: kf, cacheFile: cf, log() {}, sleep: async () => {} });
  assert.equal(c.get('BTCUSDT', f, async () => PRICES).none, 'bekle');
  await until(c);
  const b = c.get('BTCUSDT', f, async () => PRICES);
  assert.equal(b.ok, true); assert.equal(b.id, 'bitcoin'); assert.equal(b.max, 21e6); assert.equal(b.ch30, -4); assert.equal(b.mult, 1);
  const p = c.get('1000PEPEUSDT', f, async () => PRICES); assert.equal(p.id, 'pepe'); assert.equal(p.mult, 1000);
  assert.equal(c.get('AIUSDT', f, async () => PRICES).id, 'ai-gercek');
  assert.equal(c.get('TEKUSDT', f, async () => PRICES).none, 'eslesmedi');
  assert.equal(c.get('YOKUSDT', f, async () => PRICES).none, 'eslesmedi');
  assert.ok(calls.every(x => x.key === 'CG-deneme-anahtari-123'));
  assert.equal(calls.length, 2, 'liste + tek markets isteği');
  // yeniden oluştur: diskteki önbellekten gelir, istek atılmaz
  const c2 = CG.create({ keyFile: kf, cacheFile: cf, log() {}, sleep: async () => {} }), n = calls.length;
  assert.equal(c2.get('BTCUSDT', f, async () => PRICES).id, 'bitcoin'); await until(c2); assert.equal(calls.length, n);
});

test('30 dk sonra yalnız eşleşen coinler tazelenir; istekler arası en az 2,5 sn beklenir; 429 → bekleme', async () => {
  const d = tmp(), kf = path.join(d, 'k.json'); fs.writeFileSync(kf, '{"key":"CG-deneme-anahtari-123"}');
  let t = 1e12; const waits = [], { f, calls } = fake();
  const c = CG.create({ keyFile: kf, cacheFile: path.join(d, 'c.json'), log() {}, now: () => t, sleep: async ms => { waits.push(ms); t += ms; } });
  c.get('BTCUSDT', f, async () => PRICES); await until(c);
  assert.ok(waits.some(w => w >= 2400), 'ikinci istek öncesi bekleme');
  t += 31 * 60e3; const n = calls.length; c.get('BTCUSDT', f, async () => PRICES); await until(c);
  const fresh = calls.slice(n); assert.equal(fresh.length, 1); assert.ok(!fresh[0].url.includes('/coins/list'));
  assert.deepEqual(new URL(fresh[0].url).searchParams.get('ids').split(',').sort(), ['ai-gercek', 'bitcoin', 'pepe']);
  // 429: 90 sn istek yok
  t += 31 * 60e3; const f429 = async () => new Response('{}', { status: 429 });
  c.get('BTCUSDT', f429, async () => PRICES); await until(c); assert.match(c.S.err, /429/);
  const m = calls.length; c.get('BTCUSDT', f, async () => PRICES); await until(c); assert.equal(calls.length, m, '429 sonrası bekleme süresinde istek yok');
  t += 91e3; c.get('BTCUSDT', f, async () => PRICES); await until(c); assert.equal(calls.length, m + 1);
});
