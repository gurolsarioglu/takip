@echo off
chcp 65001 >nul
title ⚡ Alpha Terminal - Web & Sinyal Hub
color 0A

echo =====================================================================
echo   ⚡ ALPHA TERMINAL — WEB KOKPITI VE SINYAL HUB
echo   Port: 3000  ^|  http://localhost:3000
echo   Mod: Standalone Hub (Botlar harici batch servislerinden bekleniyor)
echo =====================================================================
echo.

set STANDALONE_BOTS=true
node terminal-server.js
pause
