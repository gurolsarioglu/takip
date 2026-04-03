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
        this.focusedPoller = null;
        
        // Take a snapshot every 60 seconds for all symbols
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

            // Calculate Taker Buy/Sell Absolute Values relative to Total 24h Volume
            let buyVolVal = '-', sellVolVal = '-';
            if (data.taker && data.vol) {
                const totalRadio = data.taker.buyVol + data.taker.sellVol;
                if (totalRadio > 0) {
                    const buyPctRaw = data.taker.buyVol / totalRadio;
                    const sellPctRaw = 1 - buyPctRaw;
                    
                    buyVolVal = ((data.vol * buyPctRaw) / 1000000).toFixed(2) + 'M';
                    sellVolVal = ((data.vol * sellPctRaw) / 1000000).toFixed(2) + 'M';
                }
            }

            const msg = JSON.stringify({
                type: 'TICK',
                symbol,
                price: data.price,
                fr: data.fr,
                vol: data.vol ? (data.vol / 1000000).toFixed(2) + 'M' : '-',
                oi: data.oi ? data.oi.toLocaleString() : '-',
                ls: data.ls || '-',
                taker: { 
                    buy: buyVolVal, 
                    sell: sellVolVal
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
        this.subscribedSymbol = symbol;

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
                d.taker = taker; // { buyVol, sellVol, ratio }
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
