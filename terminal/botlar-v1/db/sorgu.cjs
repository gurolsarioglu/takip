'use strict';
// Salt-okunur sorgu aracı: node db/sorgu.cjs <dosya.sql>  → sonuçları tablo olarak yazar (sadece SELECT/WITH)
const fs = require('node:fs'), path = require('node:path'), { Client } = require('pg');
(async () => {
  const q = fs.readFileSync(process.argv[2], 'utf8');
  const c = new Client(JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')));
  await c.connect(); await c.query('SET default_transaction_read_only = on'); // temp tablolar salt-okunur oturumda da serbest
  for (const part of q.split(/;\s*\n/).map(s => s.trim()).filter(Boolean)) {
    const t0 = Date.now(), r = await c.query(part);
    console.log('--', part.split('\n')[0].slice(0, 90), `(${Date.now() - t0} ms)`);
    console.table(r.rows);
  }
  await c.end();
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
