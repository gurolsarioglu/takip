'use strict';
// Çalıştırıcı ve bekleyen powershell'ler hangi oturumda/kullanıcıda? (salt okunur)
const { execFileSync } = require('node:child_process');
console.log(execFileSync('powershell', ['-NoProfile', '-Command', "Get-CimInstance Win32_Process | Where-Object { $_.Name -in 'powershell.exe','node.exe','explorer.exe','consent.exe' } | ForEach-Object { $o = Invoke-CimMethod -InputObject $_ -MethodName GetOwner; '{0} {1} oturum={2} sahip={3} {4}' -f $_.ProcessId, $_.Name, $_.SessionId, $o.User, ($_.CommandLine -replace '\\s+',' ').Substring(0, [Math]::Min(120, ($_.CommandLine+'').Length)) }"], { encoding: 'utf8' }));
