'use strict';
// Salt okunur sağlık kontrolü: site yanıtı + son sinyaller (veritabanı).
const path = require('node:path'), fs = require('node:fs');
const V1 = path.resolve(__dirname, '..', '..', 'botlar-v1');
(async () => {
  try { const r = await fetch('http://127.0.0.1:3200/api/version'); console.log('site', r.status, (await r.text()).slice(0, 120)); } catch (e) { console.log('site HATA', e.message); }
  const { Client } = require(path.join(V1, 'node_modules', 'pg'));
  const c = new Client(JSON.parse(fs.readFileSync(path.join(V1, 'db', 'baglanti.json'), 'utf8'))); await c.connect();
  const r = await c.query("SELECT bot, count(*) FILTER (WHERE t > now() - interval '1 hour') AS son1s, max(t) AS son FROM signals WHERE t > now() - interval '1 day' GROUP BY bot ORDER BY bot");
  for (const x of r.rows) console.log(x.bot.padEnd(12), 'son 1 sa:', String(x.son1s).padStart(4), ' son:', x.son.toISOString());
  await c.end();
})().catch(e => { console.log('HATA', e.message); process.exitCode = 1; });
