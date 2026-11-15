@echo off
title Botlar V1
cd /d "%~dp0"
rem Zaten calisiyor mu? (Servis SYSTEM hesabinda oldugu icin "schtasks /query" normal kullanicida "Erisim engellendi" verir;
rem eski surum bunu "servis yok" sanip IKINCI bir motor baslatiyordu -> ayni sinyal dosyasina cift kayit. Artik siteye sorulur.)
curl -s -m 3 http://127.0.0.1:3200/api/version >nul 2>&1
if %errorlevel%==0 (
  echo Botlar V1 zaten calisiyor. Site aciliyor...
  start "" http://localhost:3200
  timeout /t 3 >nul
  exit /b
)
if exist "data\denetci.json" (
  echo Botlar V1 servisi kurulu ama site yanit vermiyor.
  echo Bilgisayari yeniden baslatin ya da servis\servis-kur.bat dosyasini calistirin.
  echo Elle ikinci bir motor BASLATILMADI ^(cift kayit olmasin diye^).
  pause
  exit /b
)
echo Botlar V1 baslatiliyor ^(servis kurulu degil - servis\servis-kur.bat ile kurabilirsiniz^)...
start "Botlar V1 - motor" cmd /k node --max-old-space-size=4096 engine\live.cjs
timeout /t 2 >nul
start "Botlar V1 - web" cmd /k node web\server.cjs
timeout /t 3 >nul
start "" http://localhost:3200
