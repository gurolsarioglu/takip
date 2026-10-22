# Reverse-Engineered Autonomous Bot & Terminal Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 100% self-sufficient, high-performance Binance Futures scanning and signal generation engine for Alpha Terminal that accurately replicates the indicators, rules, and signals of `terminal.visivero.com` across all 9-10 bots, while keeping the middle chart area empty for the future Kasa Defteri module.

**Architecture:** A layered Node.js engine where `BinanceDataService` manages WebSocket/REST feeds and multi-timeframe kline buffers; `IndicatorService` computes Wilder RSI, Stoch RSI, WaveTrend, Pivots, and Volatility; `BinanceScannerEngine` evaluates the 10 strategy rules on candle updates; and `BotManager` dispatches structured signals to `bot-window.html` client windows.

**Tech Stack:** Node.js, Express, ws (WebSocket), native https/fetch, Vanilla JS for Frontend.

## Global Constraints
- Zero reliance on external third-party scraping or APIs (100% direct Binance Futures API & WebSocket).
- Reserved middle area: The chart container in `public/index.html` must remain empty (reserved for Kasa Defteri).
- All bot strategy files must adhere to the MVC BaseBot contract (`bots/base/base-bot.js`).
- Signals must match the exact emoji, labeling, and indicator precision as specified in `docs/superpowers/specs/2026-10-15-bot-reverse-engineering-design.md`.

---

### Task 1: Mathematical Indicator Engine (`services/indicator.service.js`)

**Files:**
- Create: `services/indicator.service.js`
- Test: `tests/indicator.service.test.js`

**Interfaces:**
- Produces:
  - `IndicatorService.calcRSI(closes, period = 14)` -> `number[]` (Wilder smoothing)
  - `IndicatorService.calcStochRSI(closes, rsiPeriod = 14, stochPeriod = 14, kPeriod = 3, dPeriod = 3)` -> `{ k: number, d: number }`
  - `IndicatorService.calcWaveTrend(highs, lows, closes, n1 = 10, n2 = 11, n3 = 21)` -> `{ wt1: number, wt2: number, crossUp: boolean, crossDown: boolean }`
  - `IndicatorService.calcClassicPivot(high, low, close)` -> `{ p: number, s1: number, r1: number }`
  - `IndicatorService.calcEMA(values, period)` -> `number[]`
  - `IndicatorService.calcVolumeDelta(volumes, period = 20)` -> `number` (percentage change vs SMA20)

- [x] **Step 1: Write the failing unit tests for IndicatorService**

Create `tests/indicator.service.test.js`:
```javascript
const assert = require('assert');
const IndicatorService = require('../services/indicator.service');

function runTests() {
  console.log('[Test] Running IndicatorService tests...');

  // Test 1: Wilder RSI calculation
  const closes = [44, 44.5, 43.5, 44.5, 44, 43, 42.5, 43, 43.5, 44, 44.5, 44, 43.5, 44, 45, 45.5, 46];
  const rsiValues = IndicatorService.calcRSI(closes, 14);
  assert(rsiValues.length > 0, 'RSI should produce values');
  const lastRSI = rsiValues[rsiValues.length - 1];
  assert(lastRSI >= 0 && lastRSI <= 100, `RSI must be between 0 and 100, got ${lastRSI}`);

  // Test 2: Classic Pivot calculation
  const pivot = IndicatorService.calcClassicPivot(100, 90, 95);
  assert.strictEqual(pivot.p, 95, 'Pivot P should be (100+90+95)/3 = 95');
  assert.strictEqual(pivot.s1, 90, 'Pivot S1 should be 2*95 - 100 = 90');
  assert.strictEqual(pivot.r1, 100, 'Pivot R1 should be 2*95 - 90 = 100');

  // Test 3: WaveTrend calculation
  const highs = closes.map(c => c + 1);
  const lows = closes.map(c => c - 1);
  const wt = IndicatorService.calcWaveTrend(highs, lows, closes, 10, 11, 21);
  assert(wt && typeof wt.wt1 === 'number', 'WaveTrend should return wt1 number');
  assert(typeof wt.crossUp === 'boolean', 'WaveTrend should return crossUp boolean');

  // Test 4: Volume Delta calculation
  const vols = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20];
  const vDelta = IndicatorService.calcVolumeDelta(vols, 20);
  assert.strictEqual(Math.round(vDelta), 100, 'Volume delta should be +100%');

  console.log('✅ IndicatorService tests passed successfully!');
}

runTests();
```

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/indicator.service.test.js`  
Expected: `Error: Cannot find module '../services/indicator.service'`

- [x] **Step 3: Implement IndicatorService**

Create `services/indicator.service.js` with exact Wilder RSI, Stoch RSI, WaveTrend, Pivots, EMA, and Volume Delta algorithms.

- [x] **Step 4: Run test to verify it passes**

Run: `node tests/indicator.service.test.js`  
Expected: `✅ IndicatorService tests passed successfully!`

---

### Task 2: Binance Live Data & Continuous Kline Service (`services/binance-data.service.js`)

**Files:**
- Create: `services/binance-data.service.js`
- Test: `tests/binance-data.test.js`

**Interfaces:**
- Consumes: Binance public REST (`https://fapi.binance.com`) and WSS (`wss://fstream.binance.com`)
- Produces:
  - `BinanceDataService.init()` -> `Promise<void>`
  - `BinanceDataService.getTopSymbols(limit = 100)` -> `string[]`
  - `BinanceDataService.getKlines(symbol, interval, limit)` -> `Promise<Array<{ time: number, open: number, high: number, low: number, close: number, volume: number }>>`
  - `BinanceDataService.getLatestPrice(symbol)` -> `number`

- [x] **Step 1: Write test for BinanceDataService**

Create `tests/binance-data.test.js` checking symbol listing and candle format fetching.

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/binance-data.test.js`  
Expected: Cannot find module.

- [x] **Step 3: Implement BinanceDataService**

Create `services/binance-data.service.js` with in-memory kline caching, WebSocket miniTicker subscriber, and REST kline fallback with rate limiting.

- [x] **Step 4: Run test to verify it passes**

Run: `node tests/binance-data.test.js`  
Expected: PASS.

---

### Task 3: Watchlist, Coin Info Panel & 4'lü Sentiment Integration

**Files:**
- Modify: `terminal-server.js` (lines 48-172)
- Modify: `public/plugins/sentiment-modal/sentiment-modal.plugin.js`
- Modify: `public/plugins/watchlist/watchlist.plugin.js` (or index.html container)
- Modify: `public/index.html` (Ensure center chart area is cleared for Kasa Defteri)

**Interfaces:**
- Consumes: `/api/watchlist`, `/api/sentiment?symbol=...`
- Produces:
  - Watchlist table displaying 700+ coins with Price, 24h Chg%, Volume, Funding Rate.
  - Sub-panel under watchlist showing 24s High/Low/QuoteVol/OpenInterest/Countdown for active symbol.
  - 4-bar Modal showing Order Book (Bid/Ask), Balina Pozisyon (Top Position L/S), Balina Hesap (Trader Pos L/S), Piyasa Pozisyon (Market Exposure L/S).

- [x] **Step 1: Test existing `/api/sentiment` and `/api/watchlist` endpoints**

Run verification command using node: test response schema and timing.

- [x] **Step 2: Ensure middle chart container is cleared and prepared for Kasa Defteri**

Update `public/index.html`: replace 4-grid chart placeholder with a clean reserved container `#kasa-defteri-placeholder` styled with `#090c10` background.

- [x] **Step 3: Verify Watchlist and 4-Bar Sentiment modal work smoothly together**

Open `http://localhost:3000` in browser and test clicking different coins; verify sub-info and 4-bar sentiment update in real-time.

---

### Task 4: Reverse-Engineered Bot Strategies Implementation (`bots/strategies/`)

**Files:**
- Modify: `bots/strategies/hammer-pro-plus.bot.js`
- Modify: `bots/strategies/hammer-pro.bot.js`
- Modify: `bots/strategies/four-s.bot.js`
- Modify: `bots/strategies/four-s-sniper.bot.js`
- Modify: `bots/strategies/v3-volume.bot.js`
- Modify: `bots/strategies/divergence.bot.js`
- Modify: `bots/strategies/funding-rate.bot.js`
- Modify: `bots/strategies/m1a-drop.bot.js`
- Modify: `bots/strategies/m1-premium.bot.js`
- Test: `tests/strategies.test.js`

**Interfaces:**
- Consumes: `IndicatorService`, market candle context
- Produces: `evaluate({ symbol, klines, currentPrice, sentiment, funding })` -> `Signal | null`

- [x] **Step 1: Write unit tests for strategy rule evaluation**

Create `tests/strategies.test.js` with mock candle data triggering each of the 9 bots.

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/strategies.test.js`

- [x] **Step 3: Implement exact rule evaluators in each bot file**

Implement the criteria defined in Section 3 of `docs/superpowers/specs/2026-10-15-bot-reverse-engineering-design.md`:
- `hammer-pro-plus`: Multi-RSI/SRSI oversold + Pivot proximity + Star rating
- `hammer-pro`: #W1 WaveTrend cross + 4H EMA200
- `four-s`: 4H structure + Boost >= 3% + Top Trader / Global Exposure
- `four-s-sniper`: NW UP / NW DOWN + 4H SRSI extreme + Whale confirm
- `v3-volume`: Volume Surge vs SMA20
- `divergence`: 1H RSI higher-low / lower-high vs price
- `funding-rate`: Flip from + to - or deepening negative
- `m1a-drop`: 1m sudden drop/jump + Stoch K/D + volume
- `m1-premium`: 1m momentum breakout + Multi-RSI

- [x] **Step 4: Run test to verify all 9 bot strategies pass**

Run: `node tests/strategies.test.js`  
Expected: All strategy evaluations return valid structured signals matching contract.

---

### Task 5: Live Background Scanner Engine (`services/scanner.service.js`)

**Files:**
- Create: `services/scanner.service.js`
- Modify: `terminal-server.js` (start scanner on boot)
- Test: `tests/scanner.test.js`

**Interfaces:**
- Consumes: `BinanceDataService`, `IndicatorService`, `botManager`
- Produces: Continuously running scanner loop that pushes signals to `botManager.emitSignal(signal)` with deduplication.

- [x] **Step 1: Write integration test for Scanner Engine**

Create `tests/scanner.test.js` simulating a 10-second scanner tick.

- [x] **Step 2: Implement ScannerService**

Create `services/scanner.service.js`:
- Polls/streams candle updates for top volume coins.
- Runs indicators and strategy evaluators.
- Debounces repeated signals for the same coin on the same candle.
- Calls `botManager.emitSignal(...)` to distribute to active bot queues.

- [x] **Step 3: Mount ScannerService into `terminal-server.js`**

Start `ScannerService.start()` when `terminal-server.js` listens on PORT 3000.

---

### Task 6: End-to-End System Verification

**Files:**
- Verify: `http://localhost:3000` (Main terminal)
- Verify: `http://localhost:3000/bot-window.html?bot=<botId>` (Bot windows)
- Shell: `start_all_bots.sh`

- [x] **Step 1: Restart terminal server and verify startup**

Run: `node terminal-server.js` (or check background task)  
Verify: No crashes, `/api/watchlist` responding, `/api/sentiment` responding, scanner initialized.

- [x] **Step 2: Verify all 9 bot windows receive signals**

Test endpoints: `GET /api/signals?bot=hammerproplus`, `GET /api/signals?bot=4s`, etc.  
Verify: Signals contain live symbols, correct emoji, and parsed indicators.

- [ ] **Step 3: User visual comparison check against `terminal.visivero.com`**

Instruct user to inspect both screens side by side.
