@echo off
title Alpha Terminal Stopper
echo ========================================================
echo   ALPHA TERMINAL - ARKA PLAN SERVISINI DURDUR
echo ========================================================

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [Durduruluyor] PID: %%a (Port 3000)
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo Alpha Terminal arka plan sureci basariyla durduruldu.
timeout /t 2 >nul
