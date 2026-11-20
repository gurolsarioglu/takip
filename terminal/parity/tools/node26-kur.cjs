'use strict';
// node26-baslat.ps1'i bağımsız (detached) başlatır; bu süreç kapansa da betik çalışmaya devam eder.
const path = require('node:path'), { spawn } = require('node:child_process');
const ps1 = path.join(__dirname, '..', 'kur', 'node26-baslat.ps1');
spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
console.log('başlatıldı', ps1);
