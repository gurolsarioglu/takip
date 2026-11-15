'use strict';
// Botlar V1 web sunucusunu (port 3200) yeniden başlatır: o portu dinleyen node web\server.cjs sürecini kapatır.
const { execSync } = require('node:child_process');
const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
const pids = [...new Set(out.split('\n').filter(l => /^\s*TCP\s+127\.0\.0\.1:3200\s/.test(l)).map(l => l.trim()).filter(l => !/\s0$/.test(l)).map(l => l.trim().split(/\s+/).pop()))];
for (const pid of pids) {
  let cmd = ''; try { cmd = execSync(`powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}').CommandLine"`, { encoding: 'utf8' }).trim(); } catch { }
  console.log('pid', pid, cmd);
  if (/node/i.test(cmd) && /server\.cjs/i.test(cmd)) { execSync(`taskkill /PID ${pid} /F`); console.log('kapatıldı', pid); } else console.log('dokunulmadı (bizim web sunucusu değil)');
}
if (!pids.length) console.log('3200 portunda süreç yok');
