#!/usr/bin/env bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BOTS=("div" "4ssniper" "v3" "hammerproplus" "m1a" "m1premium" "fr" "4s" "hammerpro")

echo "========================================================"
echo "  ALPHA TERMINAL - TUM 9 BOTU 2. EKRANDA BASLAT"
echo "  Adres cubuksuz tam masaustu app modunda baslatiliyor..."
echo "========================================================"

for bot in "${BOTS[@]}"; do
    echo "[Baslatiliyor] $bot"
    "$CHROME" --app="http://localhost:3000/bot-window.html?bot=$bot" --window-size=440,780 >/dev/null 2>&1 &
    sleep 0.5
done

echo "Tamamlandi. Tum pencereler baslatildi."
