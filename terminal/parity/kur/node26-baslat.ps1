# Kullanıcı yetkisiyle çalışır: yönetici adımını (tek UAC onayı) bekler, sonra parity çalıştırıcısını yeniden açar.
$ErrorActionPreference = 'Continue'
$log = Join-Path $PSScriptRoot '..\jobs\node26-kur.log'
function L($t) { "$(Get-Date -Format 'HH:mm:ss') $t" | Out-File -Append -Encoding utf8 $log }
L "baslatici: yonetici onayi isteniyor"
try {
  Start-Process powershell -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'node26-yonetici.ps1')
} catch { L "yonetici adimi calismadi (onay verilmedi?): $_" }
Start-Sleep 5
Start-Process -FilePath (Join-Path $PSScriptRoot '..\start-parity-runner.bat') -WorkingDirectory (Join-Path $PSScriptRoot '..') -WindowStyle Minimized
L "parity calistiricisi yeniden acildi; bitti"
