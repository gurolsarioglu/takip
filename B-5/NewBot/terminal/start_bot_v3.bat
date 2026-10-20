@echo off
chcp 65001 >nul
title 🤖 Alpha Bot [7/9] — V3-A Hacim
color 0A

echo =====================================================================
echo   🤖 ALPHA BOT [7/9]: V3-A HACIM RUNNER
echo   Anlık Hacim Sıçraması (DeltaVol ^>= 15%%) ve Para Girişi Radarı
echo =====================================================================
echo.

node bots/runners/v3-volume.runner.js
pause
