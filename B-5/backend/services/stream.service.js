const WebSocket = require('ws');
const axios = require('axios');
const binanceService = require('./binance.service');

class StreamService {
    constructor() {
        this.markPriceWsUrl = 'wss://fstream.binance.com/ws/!markPrice@arr';
        this.tickerWsUrl = 'wss://fstream.binance.com/ws/!miniTicker@arr';
        this.wsMark = null;
        this.wsTicker = null;
        this.subscribedSymbol = null; // Currently selected coin in UI across all clients (simplification)
        this.symbolData = new Map(); // symbol -> { price, fr, vol, oi, ls }
        this.symbolHistory = new Map(); // symbol -> Array of snapshots [{time, price, vol}]
        this.convictionTimeLeft = 300;
        this.focusedVolume = { buy: 0, sell: 0 }; // Real-time Focus Aggregator
        
        setInterval(() => this.updateConvictionTimer(), 1000);
        
        // Take a snapshot every 60 seconds for all symbols (General health)
        setInterval(() => this.takeSnapshot(), 60 * 1000);
    }

    takeSnapshot() {
        const now = Date.now();
        for (const [symbol, data] of this.symbolData.entries()) {
            let history = this.symbolHistory.get(symbol) || [];
            history.push({ time: now, price: data.price, vol: data.vol, oi: data.oi }); // Added oi
            
            // Keep last 5 snapshots (5 mins)
            if (history.length > 5) history.shift();
            this.symbolHistory.set(symbol, history);
        }
    }

    /**
     * Get deltas for a symbol (e.g. % volume jump in last 5 mins)
     */
    getSymbolMetrics(symbol) {
        const current = this.symbolData.get(symbol);
        const history = this.symbolHistory.get(symbol);
        
        if (!current || !history || history.length < 5) return null; // Wait for full 5-min history
        
        const oldest = history[0];
        const volJump = oldest.vol ? ((current.vol - oldest.vol) / oldest.vol) * 100 : 0;
        const priceMove = oldest.price ? ((current.price - oldest.price) / oldest.price) * 100 : 0;
        const oiDelta = oldest.oi ? ((current.oi - oldest.oi) / oldest.oi) * 100 : 0;
        
        return {
            price: current.price,
            fr: current.fr,
            vol: current.vol,
            oi: current.oi,
            ls: current.ls,
            taker: current.taker,
            volJumpPct: parseFloat(volJump.toFixed(2)),
            priceMovePct: parseFloat(priceMove.toFixed(2)),
            oiDeltaPct: parseFloat(oiDelta.toFixed(2))
        };
    }

    /**
     * Precision Clock Sync: Matches Binance 5-min candles (e.g. 05, 10, 15...)
     */
    updateConvictionTimer() {
        const now = new Date();
        const mins = now.getMinutes();
        const secs = now.getSeconds();
        
        // Find next 5-minute mark (00, 05, 10, 15...)
        const nextMark = Math.ceil((mins + 1) / 5) * 5;
        const diffMins = nextMark - mins - 1;
        const diffSecs = 60 - secs;
        
        this.convictionTimeLeft = (diffMins * 60) + diffSecs;

        // If timer hit exactly 00:00 (new 5-min block)
        if (this.convictionTimeLeft === 300) {
            this.takeSnapshot();
            this.focusedVolume = { buy: 0, sell: 0 }; // Reset aggression with the candle
        }
    }

    connect() {
        this.connectMarkPrice();
        this.connectTicker();
    }

    connectMarkPrice() {
        if (this.wsMark) this.wsMark.close();
        this.wsMark = new WebSocket(this.markPriceWsUrl);
        this.wsMark.on('message', (data) => {
            try {
                const streamData = JSON.parse(data);
                if (!Array.isArray(streamData)) return;
                streamData.forEach(item => {
                    const s = item.s;
                    const d = this.symbolData.get(s) || {};
                    d.price = parseFloat(item.p);
                    d.fr = (parseFloat(item.r) * 100).toFixed(4);
                    this.symbolData.set(s, d);
                    this.broadcastIfSubscribed(s);
                });
            } catch (e) {}
        });
        this.wsMark.on('close', () => setTimeout(() => this.connectMarkPrice(), 5000));
    }

    connectTicker() {
        if (this.wsTicker) this.wsTicker.close();
        this.wsTicker = new WebSocket(this.tickerWsUrl);
        this.wsTicker.on('message', (data) => {
            try {
                const streamData = JSON.parse(data);
                if (!Array.isArray(streamData)) return;
                streamData.forEach(item => {
                    const s = item.s;
                    const d = this.symbolData.get(s) || {};
                    d.vol = parseFloat(item.q); // 24h Quote Volume
                    this.symbolData.set(s, d);
                    this.broadcastIfSubscribed(s); // Tick for volume too
                });
            } catch (e) {}
        });
        this.wsTicker.on('close', () => setTimeout(() => this.connectTicker(), 5000));
    }

    broadcastIfSubscribed(symbol) {
        if (this.subscribedSymbol === symbol && global.wss) {
            const data = this.symbolData.get(symbol);
            const metrics = this.getSymbolMetrics(symbol); // Fetch history-aware metrics

            // Calculate Taker Buy/Sell Values based on manual aggregation
            const buyVolM = (this.focusedVolume.buy / 1e6).toFixed(2);
            const sellVolM = (this.focusedVolume.sell / 1e6).toFixed(2);
            
            const msg = JSON.stringify({
                type: 'TICK',
                symbol,
                price: data.price,
                fr: data.fr,
                vol: data.vol ? (data.vol / 1000000).toFixed(2) + 'M' : '-',
                oi: data.oi ? data.oi.toLocaleString() : '-',
                ls: data.ls || '-',
                taker: { 
                    buy: buyVolM + 'M', 
                    sell: sellVolM + 'M'
                },
                oiDelta: metrics ? metrics.oiDeltaPct : null // null = Calculating
            });
            global.wss.clients.forEach(c => {
                if (c.readyState === WebSocket.OPEN && c.subscribedSymbol === symbol) {
                    c.send(msg);
                }
            });
        }
    }

    /**
     * Start high-frequency polling for ONE specific symbol (OI + LS + Taker Vol)
     */
    startFocusedPoll(symbol) {
        if (this.focusedPoller) clearInterval(this.focusedPoller);
        if (this.focusedAggTradeWs) this.focusedAggTradeWs.terminate();
        
        this.subscribedSymbol = symbol;
        console.log(`📡 [FOCUS] Monitoring ${symbol} (Clock-Sync Mode)`);
        
        // Reset Real-Time Volume Aggregator
        this.focusedVolume = { buy: 0, sell: 0 };
        
        // Connect Live High-Speed Trade Stream for Focus
        this.focusedAggTradeWs = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@aggTrade`);
        this.focusedAggTradeWs.on('message', (raw) => {
            const t = JSON.parse(raw);
            const val = parseFloat(t.q) * parseFloat(t.p);
            if (t.m) this.focusedVolume.sell += val; // m=true -> Taker Sell
            else this.focusedVolume.buy += val;      // m=false -> Taker Buy
        });

        const poll = async () => {
            if (this.subscribedSymbol !== symbol) return clearInterval(this.focusedPoller);
            try {
                // Fetch OI, LS, and Taker Vol Ratio (REST)
                const [oi, ls, taker] = await Promise.all([
                    binanceService.getOpenInterest(symbol),
                    binanceService.getLongShortRatio(symbol),
                    binanceService.getTakerVolumeRatio(symbol)
                ]);
                
                const d = this.symbolData.get(symbol) || {};
                d.oi = oi;
                d.ls = ls;
                d.taker = taker; 
                this.symbolData.set(symbol, d);
                this.broadcastIfSubscribed(symbol);
            } catch (e) {
                // Silent fail
            }
        };

        poll(); // Initial
        this.focusedPoller = setInterval(poll, 3000); // 🥈 Intense Polling (3s)
    }

    subscribeClient(client, symbol) {
        client.subscribedSymbol = symbol;
        console.log(`📡 [STREAM] Client locked on ${symbol}. Switching to Focused Polling.`);
        this.startFocusedPoll(symbol);
    }
}

module.exports = new StreamService();
