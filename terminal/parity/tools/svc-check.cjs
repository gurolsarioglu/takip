const { execSync } = require('node:child_process'); const r = c => { try { return execSync(c, { encoding: 'utf8' }); } catch (e) { return 'ERR ' + (e.stdout || e.message); } };
console.log(r('sc query BotlarPostgres')); console.log(r('sc qc BotlarPostgres').split('\n').filter(l => /START_TYPE|SERVICE_START_NAME/.test(l)).join('\n'));
console.log(r('schtasks /query /tn "Botlar V1 Denetci" /fo LIST').split('\n').filter(l => /Task|Status|Durum|Görev|Next|Sonraki|Logon/i.test(l)).join('\n'));
console.log(r('powershell -NoProfile -Command "Test-Path ([Environment]::GetFolderPath(\'Startup\') + \'\\botlar-calistirici.cmd\')"'));
