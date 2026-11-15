// node tools/ps.cjs <metin> → komut satırında <metin> geçen node süreçlerini listeler (kapatmaz)
const { execFileSync } = require('node:child_process');
const pat = String(process.argv[2] || '').replace(/[^a-z0-9._-]/gi, ''); if (!pat) process.exit(1);
const out = execFileSync('powershell', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*${pat}*' -and $_.CommandLine -notlike '*tools*ps.cjs*' } | ForEach-Object { "$($_.ProcessId) $($_.CommandLine)" }`], { encoding: 'utf8' });
for (const line of out.split(/\r?\n/).filter(Boolean)) { const pid = Number(line.split(' ')[0]); console.log(line); }
