'use strict';
const { execFileSync } = require('node:child_process');
console.log(execFileSync('powershell', ['-NoProfile', '-Command', "Get-CimInstance Win32_Process -Filter \"Name='powershell.exe' or Name='consent.exe'\" | ForEach-Object { '{0} {1} {2}' -f $_.ProcessId, $_.Name, $_.CommandLine }"], { encoding: 'utf8' }));
