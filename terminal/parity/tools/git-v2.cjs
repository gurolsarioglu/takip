'use strict';
// V2 dalını getirir ve a7cbb02 ile farkını çıkarır (yalnız okuma; çalışma kopyasına dokunmaz).
// node tools/git-v2.cjs <commit>  → jobs/v2/ altına değişen dosyaların V2 hallerini ve fark listesini yazar
const { execFileSync } = require('node:child_process'), path = require('node:path'), fs = require('node:fs');
const REPO = path.resolve(__dirname, '..', '..', '..'), OUT = path.join(__dirname, '..', 'jobs', 'v2'), C = process.argv[2] || '0394dcb3198822a98a5b28c23d513caf7af288a8';
const g = (...a) => execFileSync('git', a, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256e6 });
try {
  console.log(g('fetch', 'takip', '--prune'));
  console.log(g('ls-remote', '--heads', 'takip'));
  console.log(g('log', '--oneline', '-15', C));
  const stat = g('diff', '--stat', 'a7cbb02', C); console.log(stat);
  const names = g('diff', '--name-status', 'a7cbb02', C).trim().split('\n');
  fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, '_liste.txt'), names.join('\n'));
  for (const ln of names) {
    const [st, ...ps] = ln.split('\t'), f = ps[ps.length - 1]; if (st.startsWith('D')) continue;
    if (!/^(terminal\/)?(botlar-v1|docs|TODO|README)/.test(f) && !/\.(md|cjs|js|css|html|json|sql)$/.test(f)) continue;
    const dst = path.join(OUT, f.replace(/\//g, '__'));
    try { fs.writeFileSync(dst, execFileSync('git', ['show', C + ':' + f], { cwd: REPO, maxBuffer: 256e6 })); } catch (e) { console.log('alınamadı', f); }
  }
  fs.writeFileSync(path.join(OUT, '_fark.diff'), g('diff', 'a7cbb02', C, '--', 'terminal/botlar-v1/web', 'terminal/botlar-v1/db'));
  console.log('TAMAM', names.length, 'dosya');
} catch (e) { console.log('HATA', e.message, e.stderr || ''); process.exitCode = 1; }
