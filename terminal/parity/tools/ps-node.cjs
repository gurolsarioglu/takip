// node süreçlerini listeler (salt okunur)
const { execFileSync } = require('node:child_process');
console.log(execFileSync('powershell', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ForEach-Object { "$($_.ProcessId) $([int]($_.WorkingSetSize/1MB))MB $($_.CreationDate.ToString('MM-dd HH:mm')) $($_.CommandLine)" }`], { encoding: 'utf8' }));
