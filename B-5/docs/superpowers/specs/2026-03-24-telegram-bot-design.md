# Telegram Bot Design Specification (B-5 Project)
Date: 2026-03-24
Status: Pending User Review

## Objective
To create a Telegram Bot that provides real-time Binance cryptocurrency tracking and technical analysis (RSI, StochRSI, Trend), duplicating the core functionalities of the B-5 web dashboard for mobile convenience.

## Architecture
- **Library:** `node-telegram-bot-api`
- **Connection Mode:** Polling (due to local/development environment context; can be migrated to Webhooks in production).
- **Service Reuse:** The bot will directly consume the existing `backend/services/` (such as `analysis.service.js` and `binance.service.js`). No logic duplication.

## Components and Commands
1. `/start` & `/help`
   - Welcomes the user and lists available commands.
2. `/btc`
   - Invokes `AnalysisService.analyzeBTCStatus()`.
   - Returns the BTC trend, RSI, StochRSI, and the text commentary.
3. `/drops`
   - Fetches the top losing coins (highest negative drop value) via `binanceService` and ranks them.
4. `/analyze <SYMBOL>` (e.g. `/analyze ETHUSDT`)
   - Fetches current price, 24h change, volume.
   - Calculates RSI and StochRSI instantly.
   - Returns a formatted message indicating if it's overbought/oversold.

## Data Flow
User -> Telegram -> `bot.onText()` -> Parse Command -> Invoke `backend/services/*` -> Format String -> `bot.sendMessage()` -> Telegram -> User.

## Error Handling
- Rate Limit Protection: Commands will be rate-limited per user to avoid hitting Binance API limits if abused.
- Try-Catch blocks: All command handlers will have safety nets to prevent the bot from crashing. Errors will return a generic "Sorry, please try again" to the user and log internally.

## Testing Strategy (Superpowers TDD compliance)
Before writing the bot application logic (`bot.js`), we will:
1. Create unit tests for each command handler function (e.g., `handleBtcCommand()`).
2. We will pass a mocked `bot` object to these handlers to ensure they attempt to `sendMessage` correctly with the expected data from `AnalysisService`.
3. Only after the mocks succeed will we piece together the production `bot.js`.

---
*Please review this design. Are these components sufficient for the first version of the bot? If approved, we will lock this spec and begin TDD implementation.*
