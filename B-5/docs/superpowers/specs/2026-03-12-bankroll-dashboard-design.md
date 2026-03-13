# B-5 Web Dashboard & Bankroll Management Spec

## 1. Overview
This project extends the existing B-5 crypto signal bot to include a real-time web dashboard and a manual bankroll management table. It eliminates the strict dependency on Telegram for monitoring signals and provides a built-in "trading journal" based on user-provided Excel spreadsheet logic.

## 2. Architecture & Data Flow
- **Signal Source (WebSocket):** The existing B-5 bot scripts (e.g., `hunter-5m.js`) will be modified to emit signals to a local WebSocket server in addition to (or instead of) Telegram.
- **Web Server:** A lightweight backend (Node.js/Express) will host the WebSocket server.
- **Persistence (Local File):** The web server will read/write a local JSON file (e.g., `data/bankroll.json`) to persist table entries. This decouples the storage logic, creating a clear abstraction that can be swapped out for Firebase later.

## 3. Data Models
### 3.1 Signal Event
Emitted via WebSocket from the bot to the client:
- `timestamp`: Number
- `coin`: String (e.g., "BTC/USDT")
- `position`: "Long" | "Short"
- `price`: Number
- `rsi` (optional): Number

### 3.2 Bankroll Entry
Stored in JSON and manipulated in the table:
- `id`: UUID or timestamp
- `coin`: String
- `date`: String (e.g., "1 Ocak 2020 Çarşamba")
- `time`: String (e.g., "12:23")
- `position`: "L/S"
- `profit`: Number (can be positive, negative, or `null`/0 initially)
- `cumulativeBankroll`: Number (calculated dynamically)
- `percentageChange`: Number (calculated dynamically)

## 4. User Interface & Layout
The UI will adhere to the existing B-5 aesthetics: glassmorphism, dark mode, vibrant status colors (green/red), and smooth animations.

### 4.1 Layout Structure
- **Global Variables Container:** Displays `SERMAYE` (Initial Capital) and `NET KAZANÇ` (Total Net Profit & %). Default starting capital is $100.
- **Left/Top Panel (Live Signals):** A feed of incoming signals displayed as minimal, stylish cards. Each card will have an "Add to Table" button.
- **Right/Bottom Panel (Bankroll Table):** An Excel-like data grid containing the history of joined trades.

### 4.2 Workflows
- **Auto-Adding from Signal:** Clicking "Add to Table" on a signal card generates a new row in the Bankroll Table with pre-filled `Coin`, `Date`, `Time`, and `Position`. The `Profit` cell is left empty or 0.
- **Manual Row Addition:** A distinct "Add Entry Manually" button allows the user to insert a completely blank row into the table without relying on a bot signal.
- **Closing a Trade:** The user clicks/focuses the `Profit` cell of a row and enters the final PnL (e.g., `15` or `-5`).
- **Dynamic Calculation:** Whenever a profit is updated, the app recalculates the `cumulativeBankroll` and `percentageChange` for all subsequent rows chronologically, and updates the global `NET KAZANÇ` indicators.

## 5. Security & Expansion
- Data validation will be minimal as this is a personal, single-user dashboard running locally.
- The storage abstraction will be explicitly designed so the `save()` and `load()` methods can easily be backed by Firebase Realtime Database or Firestore in the future without touching the UI components.
