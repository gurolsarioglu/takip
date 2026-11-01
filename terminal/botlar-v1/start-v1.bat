@echo off
title Botlar V1
cd /d "%~dp0"
echo Botlar V1 baslatiliyor...
start "Botlar V1 - motor" cmd /k node --max-old-space-size=4096 engine\live.cjs
timeout /t 2 >nul
start "Botlar V1 - web" cmd /k node web\server.cjs
if exist telegram\ayarlar.json start "Botlar V1 - telegram" cmd /k node telegram\sender.cjs
timeout /t 3 >nul
start "" http://localhost:3200
