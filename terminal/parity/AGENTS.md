# Parity lab — working protocol (read fully before doing anything)

Goal: reproduce Visivero (terminal.visivero.com) bot signals 1:1 from Binance USDⓈ-M futures public data.

## Environments
- Code is authored in the container at `/home/claude/parity` (no internet).
- It runs on the user's Windows PC at `C:\projeler\newbot\terminal\parity` (has internet), through a job runner.
- `device_bash` (Linux VM on the user's PC) sees the same folder at `$HOME/mnt/terminal/parity` — use it to READ results
  and to drop job files. It has NO internet itself.

## Shipping a file to the PC
`device_commit_files` caches by staged path. ALWAYS copy into a NEW unique staging dir each time, e.g.
`mkdir -p /mnt/user-data/outputs/<agent>-<n> && cp file /mnt/user-data/outputs/<agent>-<n>/` then commit from that path
to `C:\projeler\newbot\terminal\parity\<relpath>`. Verify with `md5sum` in device_bash if in doubt.

## Running a job
Write `$HOME/mnt/terminal/parity/jobs/<agent>-<NNN>-<name>.job.json` containing
`{"script":"research/<agent>/x.cjs","args":["--foo","1"]}` (script path relative to parity/, must end in .cjs).
Runner renames it to `.running.json`, writes stdout+stderr to `.log`, writes `.done` (exit code) when finished.
Poll with `for i in $(seq 1 34); do [ -f X.done ] && break; sleep 5; done` (device_bash max 180 s per call).
Use your agent prefix in every job name. Do not kill/touch other agents' jobs.

## Shared code (read-only for sub-agents — do NOT edit)
- `lib/ind.cjs`  indicators (sma, ema(seed 'sma'|'first'), rma, rsi (Wilder/Pine), stochRsi → {rsi,k,d,raw}, stoch,
  waveTrend(bars,10,21,4,seed) → {wt1,wt2}, crossAt, nwRepaint(values,h,mult,win), traditionalPivots, nearestPivotDistPct,
  pivotLows/Highs).
- `lib/ref.cjs`  `parse(row)` for Visivero messages → {botId,symbol,t,direction,stars,strategy,boostPct,price,prevPrice,
  rsi{tf},srsi{tf},wt,divergence,pivotPct,ema200Pct,fr,btcStatus,tp,me,fundingRate,previousFunding,difference,
  timeRemaining,frFlip,hacimPct,hacim24s,rsiList,srsiList,...}
- `lib/net.cjs`  Binance + Visivero access with disk cache and pacing: klinesAt(sym,tf,t,limit) (bars with openTime ≤ t,
  i.e. includes the bar live at t — filter `closeTime < t` for closed bars), klinesRange, priceAt(sym,t) (last aggTrade ≤ t),
  exchangeInfo, fundingHistory, botMessages. Respect Binance weight: keep total concurrent heavy jobs small.
If you need extra helpers, put them in your own folder.

## Data on the PC (`parity/data`)
- `ref/<botId>.jsonl` reference messages. Bot ids: m1, m1-premium, fr, v3, hammer, hammer-pro, hammer-pro-plus,
  1d-hammer-pro, 4s, 4sniper, 1dws, div. A live poller (`collect.cjs --follow`) keeps appending (rows with `seenAt`).
- IMPORTANT: the Visivero API keeps only the latest 100 messages PER SYMBOL per bot. A symbol's history is complete only
  after its oldest retained message. Never count "missed" signals before that point.
- `fingerprint/<bot>.json` per-message reproduction of printed RSI/SRSI/Boost/Previous Price (see below).

## Established facts (measured, don't re-derive)
- Messages are evaluated on the LIVE bar: indicator value = series of closed bars + live bar whose close = message
  "Current Price". RSI(14, Wilder/Pine) matches the printed integer (Math.round) 95–100% on 1h/4h/1d, 94% on 1m (m1-premium).
- SRSI printed value = Pine Stoch RSI K = SMA3(stoch(rsi,14)) with RSI14, live bar included. Matches 75–94%, misses are
  usually 1–3 points (cause unknown).
- M1 family: Boost = (price / liveBarOpen(1m) − 1)·100, Previous Price = last closed 1m close. M1-A "Stochastic (K/D)" is
  StochRSI K/D, not price stochastic. Trigger |boost| ≥ 1.00 %, repeated while condition holds.
- Hammer family (hammer, hammer-pro, hammer-pro-plus): Boost = max over last 5 1m bars (4 closed + live) of
  (open−low)/low (up) or (high−open)/open (down) — 98–99%. Previous Price = last closed 1m close (97–98%).
  Their 1m RSI only matches ~55% with message price → evaluation price/moment differs (open question).
- 4S and 4S Sniper: Previous Price = last closed 1h close (100%). Boost = 5-bar impulse on 4h (90–96%).
- 1d-hammer-pro: Previous Price = last closed 1d close (97%), Boost = 5-bar impulse on 1d (92%).
- Older research (unverified claims, treat as hypotheses): `../review/visivero-8-bot-master-formulas-2026-10-20.md`
  (copy in container: /home/claude/takip/B-5/NewBot/terminal/review/). Raw Visivero chart templates (Python/Pine) in
  /home/claude/takip/B-5/NewBot/terminal/review/three-bot-evidence/templates and review/extracted_indicators.

## Rule module interface (your main deliverable)
File `rules/<family>.cjs`:
```js
module.exports = {
  family: 'four-s',                     // your family name
  bots: ['4s', '4sniper', '1dws'],      // Visivero bot ids produced
  needs: { '1h': 500, '4h': 600, '1d': 400 },   // closed bars needed per timeframe
  extras: ['ratios'],                   // optional: 'funding' | 'ticker24h' | 'ratios' | 'btc'
  cadenceMs: 5000,                      // how often the engine should call evaluate per symbol (min)
  evaluate(ctx) { return [ /* signals */ ]; }
};
```
`ctx = { symbol, t, price, bars: { '1m': [...closedBars, liveBar], ... }, funding: {rate, nextFundingTime},
ticker24h: {volume, quoteVolume}, ratios: {topLongAccount, globalLongAccount} (fractions 0..1), btc: {bars}, state }`.
Bars: `{openTime, open, high, low, close, volume, closeTime, isLive}`; the LAST element is the live bar (isLive true,
close = price, high/low already include price). `state` is a per-symbol object owned by your module (cooldowns, last
signal, previous values) — persist whatever you need there.
Signal: `{ botId, symbol, direction: 'up'|'down'|null, strategy: string|null, boostPct, price, prevPrice,
rsi: {tf: number}, srsi: {tf: number}, fields: {...anything printed}, text: '<message formatted like Visivero>' }`.
The module must be pure CommonJS, no network, deterministic, and should only depend on `../lib/ind.cjs`.

## Validation you must report (be honest, numbers only from runs)
1. Positive reproduction: on reference messages (time t, price = message price), does your evaluate() fire the same
   bot/direction/strategy? → hit rate per bot/strategy.
2. Negative check (false positives): sample (symbol, time) points where the reference did NOT fire (respecting the
   100-per-symbol retention window) and count how often your rule fires. Report precision estimate.
3. Hold-out: fit on older messages, test on newer ones (or vice versa); report both.
Write `research/<agent>/REPORT.md` (Turkish) with the rules, evidence numbers, open problems.

## Etiquette
Don't edit files outside `research/<agent>/` and `rules/<family>.cjs`. Don't restart the runner. Keep Binance
request volume reasonable (net.cjs paces requests; avoid >2 heavy jobs at once).
