# Botlar V1 — Windows açılışında otomatik başlatma kurulumu (yönetici olarak çalışır)
$ErrorActionPreference = 'Continue'
$V1   = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$PGB  = (Resolve-Path (Join-Path $V1 '..\..\araclar\pgsql\bin')).Path
$PGD  = Join-Path $V1 'data\pg'
$NODE = (Get-Command node).Source
$PAR  = (Resolve-Path (Join-Path $V1 '..\parity')).Path
function Adim($t) { Write-Host "`n== $t" -ForegroundColor Cyan }

Adim "1/5 Çalışan denetçi ve eski Botlar V1 süreçleri kapatılıyor (denetçi, motor, web, yazıcı, mum, karne, PostgreSQL)"
# ÖNEMLİ (11.11.2026 düzeltmesi): çalışan denetçi durdurulmadan görev yeniden kaydedilince eski denetçi bellekte kalıyor ve
# yeni parça listesini (mumlar, karne) hiç almıyordu. Önce görev durdurulur, kalan denetçi süreci de kapatılır.
Stop-ScheduledTask -TaskName 'Botlar V1 Denetci' -ErrorAction SilentlyContinue
Start-Sleep 2
& "$PGB\pg_ctl.exe" stop -D $PGD -m fast 2>$null
Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'servis[\\/]denetci\.cjs|v1-run\.cjs|pg-run\.cjs|engine[\\/]live\.cjs|web[\\/]server\.cjs|db[\\/]yazici\.cjs|db[\\/]mumlar\.cjs|db[\\/]karne\.cjs|v1-db\.cjs (mumlar|karne)( |$)|telegram[\\/]sender\.cjs' } |
  ForEach-Object { Write-Host "  kapatılıyor: $($_.ProcessId) $($_.CommandLine)"; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep 3
Remove-Item (Join-Path $PGD 'postmaster.pid') -ErrorAction SilentlyContinue

Adim "2/5 PostgreSQL servisi (BotlarPostgres, otomatik başlar)"
icacls $PGD /grant "*S-1-5-20:(OI)(CI)F" /T /Q | Out-Null     # NETWORK SERVICE
if (Get-Service BotlarPostgres -ErrorAction SilentlyContinue) { Write-Host "  servis zaten var" } else {
  & "$PGB\pg_ctl.exe" register -N BotlarPostgres -U "NT AUTHORITY\NetworkService" -D $PGD -S auto -w
}
Start-Service BotlarPostgres
Get-Service BotlarPostgres | Format-Table -AutoSize Name, Status, StartType

Adim "3/5 Botlar V1 denetçisi (motor + web + yazıcı + mum toplayıcı + karne) — açılışta SYSTEM olarak başlar"
$act = New-ScheduledTaskAction -Execute $NODE -Argument "`"$V1\servis\denetci.cjs`"" -WorkingDirectory $V1
$trg = New-ScheduledTaskTrigger -AtStartup
$set = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
$pri = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName 'Botlar V1 Denetci' -Action $act -Trigger $trg -Settings $set -Principal $pri -Force | Out-Null
Start-ScheduledTask -TaskName 'Botlar V1 Denetci'
Get-ScheduledTask -TaskName 'Botlar V1 Denetci' | Format-Table -AutoSize TaskName, State

Adim "4/5 Uzaktan kontrol çalıştırıcısı — oturum açılınca kullanıcı olarak başlar"
$su = [Environment]::GetFolderPath('Startup')
$cmd = "@echo off`r`ncd /d `"$PAR`"`r`nstart `"Parity runner`" /min `"$NODE`" runner.cjs`r`n"
Set-Content -Path (Join-Path $su 'botlar-calistirici.cmd') -Value $cmd -Encoding ASCII
Write-Host "  Başlangıç klasörüne eklendi: $su\botlar-calistirici.cmd"

Adim "5/5 Kontrol"
Start-Sleep 8
Get-Content (Join-Path $V1 'data\log\denetci.log') -Tail 8 -ErrorAction SilentlyContinue
Write-Host "`nYukarıda 'başladı mumlar' ve 'başladı karne' satırları görünmeli." -ForegroundColor Yellow
Write-Host "`nTAMAM. Motor ~8 dk içinde hazır olur. Site: http://localhost:3200" -ForegroundColor Green
