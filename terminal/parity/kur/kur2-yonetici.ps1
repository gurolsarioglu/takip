# 20.11.2026 — kullanıcı onayladı: Tailscale kurulumu + Node 25 -> 26 yükseltmesi (yönetici).
$ErrorActionPreference = 'Continue'
$log = Join-Path $PSScriptRoot '..\jobs\kur2.log'
function L($t) { "$(Get-Date -Format 'HH:mm:ss') $t" | Out-File -Append -Encoding utf8 $log }
$NODE = 'C:\Program Files\nodejs\node.exe'
L "yonetici adimi basladi; node once: $(& $NODE -v)"
# 1) Tailscale (servislere dokunmaz)
try { $o = winget install --id Tailscale.Tailscale --exact --silent --accept-source-agreements --accept-package-agreements --disable-interactivity 2>&1 | Out-String; L ("tailscale winget: " + ($o -replace '[\r\n]+', ' | ').Trim()) } catch { L "tailscale HATA $_" }
L "tailscale.exe var mi: $(Test-Path 'C:\Program Files\Tailscale\tailscale.exe')"
# 2) Node 26: denetçiyi durdur, YALNIZ C:\Program Files\nodejs\node.exe süreçlerini kapat (Codex vb. diğer node'lara dokunma)
Stop-ScheduledTask -TaskName 'Botlar V1 Denetci' -ErrorAction SilentlyContinue
Start-Sleep 3
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.ExecutablePath -eq $NODE } | ForEach-Object { L "kapatiliyor pid $($_.ProcessId) $($_.CommandLine)"; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep 4
try { $o = winget upgrade --id OpenJS.NodeJS --exact --silent --accept-source-agreements --accept-package-agreements --disable-interactivity 2>&1 | Out-String; L ("node winget: " + ($o -replace '[\r\n]+', ' | ').Trim()) } catch { L "node HATA $_" }
L "node sonra: $(& $NODE -v)"
# 3) Servisleri geri aç (yükseltme başarısız olsa da eski Node ile açılır)
Start-ScheduledTask -TaskName 'Botlar V1 Denetci'
L "denetci gorevi baslatildi"
