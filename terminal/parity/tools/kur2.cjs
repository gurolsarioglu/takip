'use strict';
// kur2-baslat.ps1'i bağımsız başlatır; çıktısı ve hataları jobs/kur2-ps.log'a yazılır.
const fs = require('node:fs'), path = require('node:path'), { spawn } = require('node:child_process');
const ps1 = path.join(__dirname, '..', 'kur', 'kur2-baslat.ps1'), fd = fs.openSync(path.join(__dirname, '..', 'jobs', 'kur2-ps.log'), 'w');
const p = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1], { detached: false, windowsHide: true, stdio: ['ignore', fd, fd] });
p.on('error', e => console.log('spawn HATA', e.message));
p.unref(); console.log('başlatıldı pid', p.pid);
setTimeout(() => process.exit(0), 3000);
