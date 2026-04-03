# Project Status: HAMZA 2.0 - Market-Synced Terminal

**Current Timestamp**: 2026-04-03T16:40:00 (Istanbul Time UTC+3)
**Objective**: Maintain and scale the "Hamza Eye" (High-Frequency Market Intelligence).

## 🚀 Accomplishments & Architecture
-   **Universal Volume Split**: Implemented a local `aggTrade` stream aggregator in `stream.service.js`. Every focused coin now shows real-time Buy/Sell millions correctly.
-   **Market Clock Sync**: The "Trend Development" timer is now linked to the 5-minute candle marks on the system clock. It resets on the :00, :05, :10 minute marks.
-   **OI Momentum**: 5-minute rolling history calculates real-time Open Interest % changes.
-   **High-Speed UI**: WebSocket for price updates, focused poller for deep-metrics (3s frequency).

## 🛠️ Tech Stack & Key Files
-   **Backend**: `y:\takip\B-5\backend\services\stream.service.js` (The heart of the market data flow).
-   **Backend**: `y:\takip\B-5\backend\services\binance.service.js` (Case-sensitive taker volume endpoint).
-   **Frontend**: `y:\takip\B-5\frontend\js\watchlist.js` (High-speed UI rendering and ticker handling).

## 🧠 Memory Note for the AI (Next Session)
We successfully resolved the `-` dash issues and the timer flicker bug. The system is in perfect alignment with Binance +3 Istanbul time. The next logical steps for gurolsarioglu@gmail.com might be analyzing Sim-Trading results or porting some analytics to the Flutter mobile app screens.

> [!TIP]
> To Resume: Sync the repo (`git pull`), check `watchlist.js` and `stream.service.js` to refresh the code context.
