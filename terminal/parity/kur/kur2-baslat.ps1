# Kullanıcı yetkisiyle: yönetici adımını bekler (tek UAC), sonra çalıştırıcıyı (yoksa) açar ve Tailscale giriş penceresini açar.
$ErrorActionPreference = 'Continue'
$log = Join-Path $PSScriptRoot '..\jobs\kur2.log'
function L($t) { "$(Get-Date -Format 'HH:mm:ss') $t" | Out-File -Append -Encoding utf8 $log }
L "baslatici: yonetici onayi isteniyor"
try { Start-Process powershell -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'kur2-yonetici.ps1') }
catch { L "yonetici adimi calismadi (onay verilmedi?): $_" }
Start-Sleep 5
$runner = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'runner\.cjs' }
if ($runner) { L "calistirici zaten acik (pid $($runner.ProcessId)), ikinci kopya acilmadi" }
else { Start-Process -FilePath (Join-Path $PSScriptRoot '..\start-parity-runner.bat') -WorkingDirectory (Join-Path $PSScriptRoot '..') -WindowStyle Minimized; L "calistirici yeniden acildi" }
$ipn = 'C:\Program Files\Tailscale\tailscale-ipn.exe'
if (Test-Path $ipn) { Start-Process $ipn; Start-Sleep 3; Start-Process 'C:\Program Files\Tailscale\tailscale.exe' -ArgumentList 'login' -WindowStyle Normal; L "tailscale giris penceresi acildi" } else { L "tailscale kurulu degil" }
L "bitti"
