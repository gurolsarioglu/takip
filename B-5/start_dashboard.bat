@echo off
title B-5 Dashboard Launcher
echo ==============================================
echo B-5 Web Dashboard ve Botlar Baslatiliyor...
echo ==============================================

:: Port 3000'deki mevcut sureci kapat (onceki calistirmadan kalmis olabilir)
echo Port 3000 kontrol ediliyor...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Eski server sureci kapatiliyor: PID %%a
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Start the Express WebSocket Backend in a new terminal window
start "B-5 Backend Server" cmd /k "cd /d %~dp0backend && node server.js"
timeout /t 3 /nobreak >nul

:: Start the Multi-Timeframe Bots in separate terminal windows
start "B-5 Hammer New"   cmd /k "cd /d %~dp0telegram-bot && node hammer-new.js"
start "B-5 Hunter (1m)"  cmd /k "cd /d %~dp0telegram-bot && node hunter-1m.js"
start "B-5 Hunter (15m)" cmd /k "cd /d %~dp0telegram-bot && node hunter-15m.js"
start "B-5 Hunter (1H)"  cmd /k "cd /d %~dp0telegram-bot && node hunter-1h.js"
start "B-5 Hunter (4H)"  cmd /k "cd /d %~dp0telegram-bot && node hunter-4h.js"
start "B-5 Hunter (FR)"  cmd /k "cd /d %~dp0telegram-bot && node hunter-fr.js"

:: Give the bots a moment to connect
timeout /t 3 /nobreak >nul

:: Open the Dashboard in the default web browser
echo Tarayici aciliyor: B-5 Web Dashboard...
start "" "%~dp0frontend\dashboard.html"

echo B-5 Sistemi basariyla baslatildi!
echo (Arka planda acilan siyah pencereleri kapatmayin)
timeout /t 5 >nul
