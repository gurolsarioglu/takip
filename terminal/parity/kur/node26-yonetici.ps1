# Node 25 -> 26 yükseltmesi (yönetici). Kullanıcı 19.11.2026'da onayladı.
# Sıra: denetçi görevini durdur -> node süreçlerini kapat -> winget upgrade -> denetçiyi başlat.
# Yükseltme başarısız olsa da denetçi yeniden başlatılır (eski Node ile çalışmaya devam eder).
$ErrorActionPreference = 'Continue'
$log = Join-Path $PSScriptRoot '..\jobs\node26-kur.log'
function L($t) { "$(Get-Date -Format 'HH:mm:ss') $t" | Out-File -Append -Encoding utf8 $log }
L "yonetici adimi basladi; once: $(& 'C:\Program Files\nodejs\node.exe' -v)"
Stop-ScheduledTask -TaskName 'Botlar V1 Denetci' -ErrorAction SilentlyContinue
Start-Sleep 3
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object { L "kapatiliyor pid $($_.Id)"; Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
Start-Sleep 4
try {
  $o = winget upgrade --id OpenJS.NodeJS --exact --silent --accept-source-agreements --accept-package-agreements --disable-interactivity 2>&1 | Out-String
  L ("winget: " + ($o -replace '[\r\n]+', ' | ').Trim())
} catch { L "winget HATA $_" }
L "sonra: $(& 'C:\Program Files\nodejs\node.exe' -v)"
Start-ScheduledTask -TaskName 'Botlar V1 Denetci'
L "denetci gorevi baslatildi"
