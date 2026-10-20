@echo off
chcp 65001 >nul
title 🤖 Alpha Bot [9/9] — Funding Rate
color 0C

echo =====================================================================
echo   🤖 ALPHA BOT [9/9]: FUNDING RATE (FR) RUNNER
echo   Aşırı Negatif Fonlama ve Funding Flip (+ -) Radarı
echo =====================================================================
echo.

node bots/runners/funding-rate.runner.js
pause
