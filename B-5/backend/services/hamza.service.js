const binanceService = require('./binance.service');
const bankrollService = require('./bankrollService');

class HamzaService {
    constructor() {
        this.isEnabled = false;
        this.isSimulation = true; // 🛡️ Simulation Mode (Paper Trading)
        this.activePositions = new Map(); // symbol -> positionData
        this.leverage = 5;
        this.riskPerTrade = 0.05; // 5% of balance per trade
        this.tp1Percent = 30;     // Initial take profit %
        this.tpMaxPercent = 120;  // Moon bag target %
    }

    setEnabled(status) {
        this.isEnabled = status;
        console.log(`🛡️ HAMZA Bot status: ${this.isEnabled ? 'SIMULATION ACTIVE ⚔️' : 'PAUSED 💤'}`);
    }

    getStatus() {
        return {
            isEnabled: this.isEnabled,
            isSimulation: this.isSimulation,
            activeCount: this.activePositions.size,
            risk: this.riskPerTrade * 100
        };
    }

    /**
     * Entry logic for receiving signals (SIMULATED)
     */
    async handleSignal(signal) {
        if (!this.isEnabled) return;
        
        // Only trade high score FR signals (e.g. Skor >= 3)
        const score = signal.score || 0;
        if (signal.timeframe !== 'fr' || score < 3) return;

        const symbol = signal.coin;
        if (this.activePositions.has(symbol)) return;

        // Dynamic Leverage based on Conviction (Score)
        let leverage = 3; 
        if (score === 4) leverage = 5;
        if (score >= 5) leverage = 10;

        console.log(`💎 [SIMULATION] HAMZA analyzing ${symbol} | Score: ${score} | Target: ${leverage}x`);

        try {
            // Fetch simulated capital
            const bankroll = bankrollService.getBankroll();
            const balance = bankroll.initialCapital; 

            // Calculate simulated quantity
            const price = await binanceService.getCurrentPrice(symbol);
            const margin = balance * this.riskPerTrade;
            const quantity = (margin * leverage) / price;

            console.log(`🚀 [SIMULATION] HAMZA: Position OPENED [${signal.position}] for ${symbol} at ${price} (${leverage}x)`);
            
            this.activePositions.set(symbol, {
                symbol,
                side: signal.position === 'Long' ? 'BUY' : 'SELL',
                entryPrice: price,
                quantity,
                leverage,
                margin,
                openedAt: Date.now(),
                targetTP: this.tp1Percent,
                status: 'MONITORING'
            });
            
        } catch (error) {
            console.error(`❌ HAMZA simulation entry error for ${symbol}:`, error.message);
        }
    }

    /**
     * Background task to monitor positions (SIMULATED)
     */
    async monitorPositions() {
        if (this.activePositions.size === 0) return;

        const allTickers = await binanceService.get24hrTickers();
        
        for (const [symbol, pos] of this.activePositions.entries()) {
            const ticker = allTickers.find(t => t.symbol === symbol);
            if (!ticker) continue;

            const currentPrice = ticker.currentPrice;
            const pnl = pos.side === 'BUY' 
                ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100 * pos.leverage
                : ((pos.entryPrice - currentPrice) / pos.entryPrice) * 100 * pos.leverage;

            console.log(`📊 [SIMULATION] ${symbol}: ${pnl.toFixed(2)}% PnL (Conviction: ${pos.leverage}x)`);

            // Logic: TP1 hit
            if (pnl >= this.tp1Percent && pos.status === 'MONITORING') {
                console.log(`🎯 [SIMULATION] TP1 HIT (+${pnl.toFixed(2)}%) for ${symbol}. Moving stop to break-even.`);
                pos.status = 'MOON_BAG';
                pos.targetTP = this.tpMaxPercent;
            }

            // Logic: Close conditions
            if (pnl >= this.tpMaxPercent) {
                this.closePosition(symbol, `🌕 [SIMULATION] Moon Target Hit! (+${pnl.toFixed(2)}%)`, pnl);
            } else if (pnl <= -15) { 
                this.closePosition(symbol, `🛑 [SIMULATION] Stop Loss Hit (-15%)`, pnl);
            } else if (pos.status === 'MOON_BAG' && pnl < 10) {
                this.closePosition(symbol, `📉 [SIMULATION] Trailing Stop Hit after TP1 (+${pnl.toFixed(2)}%)`, pnl);
            }
        }
    }

    async closePosition(symbol, reason, finalPnl) {
        const pos = this.activePositions.get(symbol);
        if (!pos) return;

        try {
            console.log(`✅ [SIMULATION] HAMZA CLOSED ${symbol}. Reason: ${reason}`);
            
            // Record to Bankroll
            const bankroll = bankrollService.getBankroll();
            const profitVal = (finalPnl / 100) * pos.margin; // $ profit calculation
            
            const newTrade = {
                id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                coin: symbol,
                date: new Date().toISOString().split('T')[0],
                timeIn: new Date(pos.openedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                timeOut: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                position: pos.side === 'BUY' ? 'Long' : 'Short',
                profit: profitVal.toFixed(2),
                isHamza: true // Flag to identify bot trades
            };

            bankroll.trades.unshift(newTrade);
            bankrollService.saveBankroll(bankroll);

            this.activePositions.delete(symbol);
        } catch (error) {
            console.error(`❌ HAMZA simulation close error for ${symbol}:`, error.message);
        }
    }
}

module.exports = new HamzaService();
