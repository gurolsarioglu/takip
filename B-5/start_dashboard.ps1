# B-5 Dashboard & Bot Launcher (PowerShell Version)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (!$scriptDir) { $scriptDir = Get-Location }

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "B-5 Web Dashboard ve Botlar Baslatiliyor..." -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Port 3000 check and cleanup
Write-Host "Port 3000 kontrol ediliyor..." -ForegroundColor Yellow
$connection = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($connection) {
    $pidToKill = $connection.OwningProcess
    Write-Host "Eski server sureci kapatiliyor: PID $pidToKill" -ForegroundColor Red
    Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Start the Express WebSocket Backend in a new terminal window
Write-Host "B-5 Backend Server baslatiliyor..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList '/k "title B-5 Backend Server && node server.js"' -WorkingDirectory "$scriptDir\backend" -WindowStyle Normal
Start-Sleep -Seconds 3

# Start the Multi-Timeframe Bots in separate terminal windows
Write-Host "Botlar baslatiliyor..." -ForegroundColor Green
$bots = @(
    @("B-5 Hammer New", "hammer-new.js"),
    @("B-5 Hunter (1m)", "hunter-1m.js"),
    @("B-5 Hunter (5m)", "hunter-5m.js"),
    @("B-5 Hunter (15m)", "hunter-15m.js"),
    @("B-5 Hunter (1H)", "hunter-1h.js"),
    @("B-5 Hunter (4H)", "hunter-4h.js"),
    @("B-5 Hunter (FR)", "hunter-fr.js"),
    @("B-5 RSI Div", "hunter-rsi-div.js"),
    @("B-5 Detay 1D", "hunter-detay-1d.js")
)

foreach ($bot in $bots) {
    $title = $bot[0]
    $script = $bot[1]
    Write-Host "$title baslatiliyor..." -ForegroundColor Yellow
    Start-Process cmd.exe -ArgumentList "/k ""title $title && node $script""" -WorkingDirectory "$scriptDir\telegram-bot" -WindowStyle Normal
}

# Give the bots a moment to connect
Start-Sleep -Seconds 3

# Open the Dashboard in the default web browser
Write-Host "Tarayici aciliyor: B-5 Web Dashboard..." -ForegroundColor Green
Start-Process "$scriptDir\frontend\dashboard.html"

Write-Host "B-5 Sistemi basariyla baslatildi!" -ForegroundColor Green
Write-Host "(Arka planda acilan terminal pencerelerini kapatmayin)" -ForegroundColor Cyan
