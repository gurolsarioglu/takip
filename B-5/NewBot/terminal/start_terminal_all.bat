@echo off
chcp 65001 >nul
title ⚡ Alpha Terminal - Master Controller

echo =====================================================================
echo   ⚡ ALPHA TERMINAL — TÜM SERVİSLER VE 9 BOT BAŞLATILIYOR ⚡
echo =====================================================================
echo.
echo [1/10] Terminal Web Sunucusu ve Sinyal Hub başlatılıyor (Port: 3000)...
start "⚡ Alpha Terminal - Web & Sinyal Hub" cmd /k "call start_terminal.bat"
timeout /t 3 /nobreak >nul

echo [2/10] Bot 1: M1-A Drop başlatılıyor...
start "🤖 Alpha Bot [1/9] - M1-A Drop" cmd /k "call start_bot_m1a.bat"
timeout /t 1 /nobreak >nul

echo [3/10] Bot 2: M1 Premium başlatılıyor...
start "🤖 Alpha Bot [2/9] - M1 Premium" cmd /k "call start_bot_m1premium.bat"
timeout /t 1 /nobreak >nul

echo [4/10] Bot 3: Hammer Pro başlatılıyor...
start "🤖 Alpha Bot [3/9] - Hammer Pro" cmd /k "call start_bot_hammerpro.bat"
timeout /t 1 /nobreak >nul

echo [5/10] Bot 4: Hammer Pro Plus başlatılıyor...
start "🤖 Alpha Bot [4/9] - Hammer Pro Plus" cmd /k "call start_bot_hammerproplus.bat"
timeout /t 1 /nobreak >nul

echo [6/10] Bot 5: 4S başlatılıyor...
start "🤖 Alpha Bot [5/9] - 4S" cmd /k "call start_bot_4s.bat"
timeout /t 1 /nobreak >nul

echo [7/10] Bot 6: 4S Sniper başlatılıyor...
start "🤖 Alpha Bot [6/9] - 4S Sniper" cmd /k "call start_bot_4ssniper.bat"
timeout /t 1 /nobreak >nul

echo [8/10] Bot 7: V3-A Hacim başlatılıyor...
start "🤖 Alpha Bot [7/9] - V3-A Hacim" cmd /k "call start_bot_v3.bat"
timeout /t 1 /nobreak >nul

echo [9/10] Bot 8: Divergence başlatılıyor...
start "🤖 Alpha Bot [8/9] - Divergence" cmd /k "call start_bot_divergence.bat"
timeout /t 1 /nobreak >nul

echo [10/10] Bot 9: Funding Rate başlatılıyor...
start "🤖 Alpha Bot [9/9] - Funding Rate" cmd /k "call start_bot_fundingrate.bat"

echo.
echo =====================================================================
echo   ✅ TÜM SERVİSLER VE 9 AYRI BOT PENCERESİ BAŞARIYLA AÇILDI!
echo   🌐 Web Terminal Kokpiti: http://localhost:3000
echo =====================================================================
pause
