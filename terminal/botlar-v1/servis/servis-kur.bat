@echo off
:: Botlar V1 servis kurulumu: yonetici izni ister (UAC), sonra servis-kur.ps1 calisir.
net session >nul 2>&1
if %errorlevel% neq 0 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servis-kur.ps1"
echo.
pause
