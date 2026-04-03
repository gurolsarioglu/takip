const fs = require('fs');
const path = require('path');
const binanceService = require('./binance.service');
const bankrollService = require('./bankrollService');

class HamzaService {
    constructor() {
        this.configPath = path.join(__dirname, '../../data/hamza_config.json');
        this.isEnabled = false;
        this.isSimulation = true; // 🛡️ Simulation Mode (Paper Trading)
        this.activePositions = new Map(); // symbol -> positionData
        this.leverage = 5;
        this.riskPerTrade = 0.05; // 5% of balance per trade
        this.tp1Percent = 30;     // Initial take profit %
        this.tpMaxPercent = 120;  // Moon bag target %

        this.loadConfig();
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const rawData = fs.readFileSync(this.configPath, 'utf8');
                const data = JSON.parse(rawData);
                this.isEnabled = data.isEnabled ?? false;
                console.log(`🛡️ HAMZA [CONFIG LOADED]: isEnabled = ${this.isEnabled} (from ${this.configPath})`);
            } else {
                console.log(`🛡️ HAMZA [CONFIG NOT FOUND]: Using default isEnabled = ${this.isEnabled}`);
                this.saveConfig(); // Create initial file
            }
        } catch (e) {
            console.error('❌ HAMZA [CONFIG LOAD ERROR]:', e.message);
        }
    }

    saveConfig() {
        try {
            const configDir = path.dirname(this.configPath);
            if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
            
            fs.writeFileSync(this.configPath, JSON.stringify({ isEnabled: this.isEnabled }, null, 2));
            console.log(`🛡️ HAMZA [CONFIG SAVED]: isEnabled = ${this.isEnabled}`);
        } catch (e) {
            console.error('❌ HAMZA [CONFIG SAVE ERROR]:', e.message);
        }
    }

    setEnabled(status) {
        this.isEnabled = status;
        this.saveConfig();
        console.log(`🛡️ HAMZA Bot status updated: ${this.isEnabled ? 'SIMULATION ACTIVE ⚔️' : 'PAUSED 💤'}`);
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
        
        const score = signal.score || 0;
        if (signal.timeframe !== 'fr' || score < 3) return;

        const symbol = signal.coin;
        if (this.activePositions.has(symbol)) return;

        console.log(`💎 [HAMZA BRAIN] Analyzing ${symbol} | Initial Score: ${score}...`);
        
        // 🛡️ Conviction Check (High-Speed Analysis)
        const conviction = await this.validateConviction(symbol, signal);
        const finalScore = score + conviction.bonus;

        console.log(`🧠 [HAMZA THOUGHT] ${symbol}: Conviction +${conviction.bonus} | Total: ${finalScore} | Reasons: ${conviction.reasons.join(', ') || 'None'}`);

        // Selective Entry: A total score of 5 is required to "Pull the trigger"
        if (finalScore < 5) {
            console.log(`⏸️ [HAMZA] Skipping ${symbol}. Conviction too low (${finalScore}/5)`);
            return;
        }

        // Dynamic Leverage based on Final Conviction
        let leverage = 5;
        if (finalScore >= 6) leverage = 10; // High conviction moon shot

        try {
            // Fetch simulated capital
            const bankroll = bankrollService.getBankroll();
            const balance = bankroll.initialCapital; 

            // High-speed Price check from memory
            const streamData = streamService.getSymbolMetrics(symbol);
            const price = streamData ? streamData.price : await binanceService.getCurrentPrice(symbol);
            
            const margin = balance * this.riskPerTrade;
            const quantity = (margin * leverage) / price;

            console.log(`🚀 [SIMULATION] HAMZA: Position OPENED [${signal.position}] for ${symbol} at ${price} (${leverage}x) - Score: ${finalScore}`);
            
            this.activePositions.set(symbol, {
                symbol,
                side: signal.position === 'Long' ? 'BUY' : 'SELL',
                entryPrice: price,
                quantity,
                leverage,
                margin,
                openedAt: Date.now(),
                maxPnlReached: 0,
                status: 'MONITORING'
            });
            
        } catch (error) {
            console.error(`❌ HAMZA entry error for ${symbol}:`, error.message);
        }
    }

    /**
     * Hamza's High-Speed Analysis ("The Glasses")
     */
    async validateConviction(symbol, signal) {
        let bonus = 0;
        const reasons = [];

        try {
            // 1. Get Real-time Metrics from StreamService (Memory)
            const metrics = streamService.getSymbolMetrics(symbol);
            
            // 2. Fetch Fresh OI snapshot (Instant Probe)
            const oiData = await binanceService.getOpenInterest(symbol);
            
            // --- CONVICTION RULES ---

            // A. Squeeze Potential (The "Wood/Odun" Scenario)
            const fr = metrics ? parseFloat(metrics.fr) : 0;
            if (signal.position === 'Long' && fr < -0.05) {
                bonus += 1;
                reasons.push('SHORT SQUEEZE FUEL (Neg FR)');
            } else if (signal.position === 'Short' && fr > 0.05) {
                bonus += 1;
                reasons.push('LONG SQUEEZE FUEL (Pos FR)');
            }

            // B. Volume Acceleration
            if (metrics && metrics.volJumpPct > 5) {
                bonus += 1;
                reasons.push(`VOL JUMP (+${metrics.volJumpPct}%)`);
            }

            // C. OI Momentum (The new 'Time-Aware' vision)
            if (metrics && metrics.oiDeltaPct > 1.0) {
                bonus += 1;
                reasons.push(`OI MOMENTUM (+${metrics.oiDeltaPct}%)`);
            } else if (oiData) {
                // Fallback to simple engagement if history not ready
                bonus += 0.5; // Half point for basic presence
                reasons.push('OI ENGAGEMENT');
            }

        } catch (e) {
            console.warn(`⚠️ [HAMZA] Conviction probe failed for ${symbol}: ${e.message}`);
        }

        return { bonus, reasons };
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

            // Track Max PnL for Trailing Stop
            if (!pos.maxPnlReached || pnl > pos.maxPnlReached) {
                pos.maxPnlReached = pnl;
            }

            console.log(`📊 [SIMULATION] ${symbol}: ${pnl.toFixed(2)}% PnL | Peak: ${pos.maxPnlReached.toFixed(2)}% (${pos.leverage}x)`);

            // Logic: TP1 hit (Locking in profit)
            if (pnl >= this.tp1Percent && pos.status === 'MONITORING') {
                console.log(`🎯 [SIMULATION] TP1 HIT (+${pnl.toFixed(2)}%) for ${symbol}. Locking profit at +10% and starting Trailing Stop.`);
                pos.status = 'MOON_BAG';
                pos.profitLocked = 10; // Guaranteed minimum profit after TP1
            }

            // Logic: Dynamic Close Conditions
            
            // 🛑 Hard Stop Loss (Initial)
            if (pnl <= -15 && pos.status === 'MONITORING') { 
                this.closePosition(symbol, `🛑 [SIMULATION] Stop Loss Hit (-15%)`, pnl);
                continue;
            }

            // 📉 Trailing Stop Logic (MOON_BAG mode)
            if (pos.status === 'MOON_BAG') {
                // If it hits 30%, we trail the peak. 
                // Rule: If it drops 20% from the peak profit (relative to the peak), OR drops below locked profit.
                const pullBackDistance = pos.maxPnlReached * 0.2; // 20% pullback from peak
                const trailingStopTrigger = Math.max(pos.maxPnlReached - pullBackDistance, pos.profitLocked);

                if (pnl < trailingStopTrigger) {
                    this.closePosition(symbol, `📉 [SIMULATION] Trailing Stop Triggered at ${pnl.toFixed(2)}% (Peak was ${pos.maxPnlReached.toFixed(2)}%)`, pnl);
                }
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
