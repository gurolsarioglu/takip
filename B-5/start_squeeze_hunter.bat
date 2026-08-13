@echo off
chcp 65001 > nul
title SqueezeHunter Telegram Bot - Binance Futures Radar
color 0A

echo ================================================================
echo           🚀 SQUEEZEHUNTER TELEGRAM BOT V1.0 🚀
echo ================================================================
echo  * Hacim Patlamasi (Volume Surge)
echo  * Short Squeeze & Long/Short Oranlari (Futures Sentiment)
echo  * Gunun En Cok Yukselenleri (Top Gainers)
echo  * Haftalik/Gunluk Pozitif Uyumsuzluk (RSI Bullish Divergence)
echo ================================================================
echo.

cd /d "%~dp0\squeeze-hunter-bot"

if not exist "node_modules" (
    echo [BILGI] Ilk kurulum yapiliyor, gerekli paketler yukleniyor...
    npm install
    echo [BILGI] Paketler basariyla yuklendi.
    echo.
)

echo [BILGI] SqueezeHunter Bot baslatiliyor...
echo [BILGI] Botu durdurmak icin CTRL+C tuslarina basabilirsiniz.
echo.

:loop
node bot.js
echo.
echo [UYARI] Bot kapandi! 5 saniye icinde yeniden baslatilacak...
timeout /t 5 > nul
goto loop
