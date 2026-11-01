'use strict';
// Kullanıcının Windows'undaki git ile (kendi GitHub girişi) bir klasörü GitHub reposuna yükler.
// node tools/publish-repo.cjs <kaynakKlasör(parity'ye göre)> <hedefKlasör> <remoteURL> <commit mesajı>
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const [src, dest, remote, msg] = process.argv.slice(2);
const S = path.resolve(__dirname, '..', src);
const run = (...a) => { console.log('> git', a.join(' ')); const o = execFileSync('git', a, { cwd: dest, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); if (o.trim()) console.log(o.trim()); return o; };
try {
  console.log(execFileSync('git', ['--version'], { encoding: 'utf8' }).trim());
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(S, dest, { recursive: true });
  if (!fs.existsSync(path.join(dest, '.git'))) { run('init', '-b', 'main'); }
  try { run('remote', 'add', 'origin', remote); } catch { run('remote', 'set-url', 'origin', remote); }
  run('add', '-A');
  try { run('-c', 'user.name=gurolsarioglu', '-c', 'user.email=gurolsarioglu@gmail.com', 'commit', '-m', msg); } catch (e) { console.log('commit:', (e.stdout || '') + (e.stderr || '')); }
  run('push', '-u', 'origin', 'main');
  console.log('PUSH OK');
} catch (e) { console.log('ERROR', e.message, e.stdout || '', e.stderr || ''); process.exitCode = 1; }
