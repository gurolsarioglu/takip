'use strict';
// Node 26 taşınabilir zip'i nodejs.org'dan indirir, SHA256 doğrular, jobs/node26 altına açar. Sisteme dokunmaz.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { execFileSync } = require('node:child_process');
const V = process.argv[2] || 'v26.12.1', F = `node-${V}-win-x64.zip`, OUT = path.join(__dirname, '..', 'jobs', 'node26');
(async () => {
  const sums = await (await fetch(`https://nodejs.org/dist/${V}/SHASUMS256.txt`)).text();
  const want = (sums.split('\n').find(l => l.endsWith('  ' + F)) || '').split(' ')[0];
  if (!/^[0-9a-f]{64}$/.test(want)) throw new Error('SHASUMS içinde yok: ' + F);
  const r = await fetch(`https://nodejs.org/dist/${V}/${F}`); if (!r.ok) throw new Error('indirme ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer()), got = crypto.createHash('sha256').update(buf).digest('hex');
  console.log('boyut', buf.length, 'sha256', got === want ? 'DOĞRU' : 'YANLIŞ ' + got);
  if (got !== want) process.exit(1);
  fs.mkdirSync(OUT, { recursive: true }); const z = path.join(OUT, F); fs.writeFileSync(z, buf);
  execFileSync('tar', ['-xf', z, '-C', OUT], { stdio: 'inherit' });
  const exe = path.join(OUT, `node-${V}-win-x64`, 'node.exe');
  console.log('açıldı', exe, execFileSync(exe, ['-v'], { encoding: 'utf8' }).trim());
})().catch(e => { console.log('HATA', e.message); process.exitCode = 1; });
