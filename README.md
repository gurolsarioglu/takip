# ⚡ Alpha Terminal — Crypto Market & Bot Cockpit (React + TypeScript)

Alpha Terminal is a high-frequency cryptocurrency futures tracking station, quant bot monitor, and institutional treasury/risk management platform built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**.

---

## 🚀 Core Features

### 1. 🛡️ Stop-Loss'suz Kasa Yönetimi (Treasury & Risk Cockpit)
- **$10,000 Portfolio Modeling**: Disciplined capital allocation per trade (default 2% = $200) and max exposure per asset (default 5% = $500).
- **Liquidation Buffer Calculation**: Real-time margin security distance monitoring (`% Liq Buffer > 40%` green zone) ensuring resilience against market maker stop-hunting and wick volatility.
- **5 Core Treasury Cards**: Total Equity, In-Trade Margin, Free Collateral, Live Unrealized PnL, Portfolio Risk Score.
- **Position & DCA Simulator**: Dynamic position sizing, leverage adjustments (1x–20x), multi-level take-profit targets (TP1 / TP2), and real-time margin addition.

### 2. 🤖 9-Quant Bot Signal Station
Tracks live algorithmic signals across 9 specialized quant strategies:
- **M1-A Drop**: Sub-minute sudden volume drop & dip bounce detection.
- **M1 Premium**: Multi-timeframe (1m/5m/1h) RSI & Stochastic RSI momentum alignment.
- **Hammer Pro**: #W1 weekly/daily bottom reversal pattern with WaveTrend confirmation.
- **Hammer Pro+**: Advanced candlestick structural wick analysis and liquidity sweeps.
- **4S Multi-Angle**: 4-hour major trend and RSI SMA divergence scanner.
- **4S Sniper**: NW UP institutional whale reversal and positioning.
- **Divergence MTF**: Hidden and regular RSI divergences across 5m, 15m, 1h, and 4h.
- **Funding Rate (FR)**: Extreme negative funding squeeze alert tracker.
- **V3-A Volume**: Real-time taker aggressive volume spike monitor.

### 3. 📊 Binance Futures Market Scanner & Watchlist
- Real-time 24h prices, percentage changes, quote volume (USD), and funding rates.
- Multi-criteria filtering: All, ⭐ Favorites, Gainers, Losers, Extreme FR, and High Volume.
- Quick ticker search and instant global coin switching across the entire dashboard.

### 4. 📈 Interactive Candlestick Chart & Smart Money Depth
- Real-time candlestick bars with 1m, 5m, 15m, 1h, 4h, and 1d intervals.
- Indicator overlays: EMA 20 (Cyan), EMA 50 (Gold), EMA 200 (Purple), Volume histogram, and RSI (14) oscillator with 30/70 thresholds.
- Order book depth (Top 50 bids vs asks pressure), Top Trader Position Ratio (Whale Long/Short), Top Account Ratio, and Global Retail Ratio.

### 5. 🎯 Algorithmic Live Verdict & 2nd Screen Co-Pilot
- Real-time deterministic Turkish trading diagnosis synthesizing Whale L/S, Retail exposure, Funding polarity, and RSI momentum.
- Automated alert triggers for **Short Squeeze**, **Whale Distribution / Exit**, **Bottom Reversal**, and **Retail Overleveraged Risk**.
- Interactive desktop co-pilot consultation for immediate trade management guidance.

---

## 🛠️ Tech Stack
- **Framework**: React 19 + TypeScript
- **Bundler & Server**: Vite (running on port 3000, host `0.0.0.0`)
- **Styling**: Tailwind CSS v4 + Dark Glassmorphism terminal aesthetics
- **Icons**: Lucide React
- **Data Source**: Binance Futures Public API (`fapi.binance.com`) + 3,000+ signal historical repository archive
