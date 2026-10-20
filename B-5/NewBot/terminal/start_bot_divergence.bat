@echo off
chcp 65001 >nul
title 🤖 Alpha Bot [8/9] — Divergence
color 0D

echo =====================================================================
echo   🤖 ALPHA BOT [8/9]: DIVERGENCE RUNNER
echo   1H ve 5m RSI Boğa / Ayı Pivot Uyumsuzluk Radarı
echo =====================================================================
echo.

node bots/runners/divergence.runner.js
pause
