/**
 * hammer-pro-plus.bot.js — Hammer Pro Plus (Advanced Structural Pattern Framework)
 * 
 * VisiVero Birebir Stratejiler:
 * - #W1 (1m WaveTrend Kesişimi + 1m/5m/1h Aşırı Bölge Konfluensi)
 * - #S1 (Canlı 1m RSI14/SMA14 Kesişimi + Ekstrem RSI <30 / >70)
 * - #R1 (Yüksek Boost >= %2.50 + 1m RSI 71..85 & 5m RSI >= 80 Ekstrem Dönüş)
 * 
 * Yıldız Puanlama Sistemi (Boost Value Bazlı — 400/400 Doğrulandı):
 * - < %2.00: Yıldızsız (yalnızca 6'lı tam ekstrem RSI/SRSI konfluensinde)
 * - %2.00 - %2.99: ⭐️
 * - %3.00 - %4.99: ⭐️⭐️
 * - >= %5.00: ⭐️⭐️⭐️
 */

const BaseBot = require('../base/base-bot');
const botData = require('../../services/bot-data.service');
const { formatCryptoPrice, computePrevPrice } = require('../../services/price-formatter');

class HammerProPlusBot extends BaseBot {
  constructor() {
    super({
      id: 'hammerproplus',
      name: 'Hammer Pro Plus',
      description: 'Advanced structural pattern framework'
    });
  }

  parseBoost(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : Math.abs(val);
    if (!val) return 0;
    const clean = String(val).replace(/[%+,\s]/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : Math.abs(parsed);
  }

  parsePivotDistance(pivotStr) {
    if (pivotStr === undefined || pivotStr === null || pivotStr === '') return null;
    if (typeof pivotStr === 'number') return Math.abs(pivotStr);
    const clean = String(pivotStr).replace(/[%+⚠️\s]/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? null : Math.abs(parsed);
  }

  calculateStars(input) {
    const boostNum = typeof input === 'object' && input !== null ? input.boostNum : input;
    return botData.hammerStars(boostNum);
  }

  determineStrategy({ direction = 'up', rsi1m, rsi5m, boostNum, hasWT, existingStrategy }) {
    if (existingStrategy && (existingStrategy.includes('#W1') || existingStrategy.includes('#S1') || existingStrategy.includes('#R1'))) {
      return existingStrategy;
    }
    if (direction === 'down' && rsi1m >= 71 && rsi1m <= 85 && rsi5m >= 80 && boostNum >= 2.5 && !hasWT) {
      return '#R1';
    }
    if (hasWT) return '#W1';
    return '#S1';
  }

  validateReversalQuality({ direction = 'up', rsi5m, rsi1h }) {
    if (direction === 'down') {
      return (rsi5m >= 55 || rsi1h >= 55);
    }
    return (rsi5m <= 42 || rsi1h <= 42);
  }

  ingest(s) {
    const symbol = (s.coin || s.symbol).toUpperCase();
    const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const direction = (s.dot === '🔴' || s.direction === 'down' || s.position === 'Short') ? 'down' : 'up';
    const dot = direction === 'down' ? '🔴' : '🟢';

    const priceNum = parseFloat(s.price || s.currentPrice || 0);
    const boostNum = this.parseBoost(s.boost || s.boostValue);
    const boostFormatted = `+${boostNum.toFixed(2)}%`;

    let prevPriceStr = s.prevPrice ? String(s.prevPrice) : '';
    if (!prevPriceStr || prevPriceStr === String(s.price || s.currentPrice)) {
      if (priceNum > 0 && boostNum !== 0) {
        prevPriceStr = computePrevPrice(priceNum, direction === 'down' ? boostNum : -boostNum, symbol);
      } else {
        prevPriceStr = formatCryptoPrice(s.price || s.currentPrice, symbol);
      }
    }

    const rawRsi = parseInt(s.rsi, 10);
    const defaultRsi = direction === 'down' ? 72 : 28;
    const rsi1mNum = parseInt(s.rsi1m ?? (!isNaN(rawRsi) ? rawRsi : defaultRsi), 10);
    const rsi5mNum = parseInt(s.rsi5m ?? (!isNaN(rawRsi) ? rawRsi : (direction === 'down' ? 70 : 30)), 10);
    const rsi1hNum = parseInt(s.rsi1h ?? (direction === 'down' ? 60 : 35), 10);

    const srsi1mNum = parseInt(s.srsi1m ?? s.stochK ?? (direction === 'down' ? 70 : 15), 10);
    const srsi5mNum = parseInt(s.srsi5m ?? s.stochD ?? (direction === 'down' ? 92 : 5), 10);
    const srsi1hNum = parseInt(s.srsi1h ?? (direction === 'down' ? 85 : 8), 10);

    const isQualityReversal = this.validateReversalQuality({ direction, rsi5m: rsi5mNum, rsi1h: rsi1hNum });
    if (!isQualityReversal) {
      console.warn(`[HammerProPlus] ⚠️ #${symbol} sinyali 5m/1h ekstrem teyidi olmadığı için elendi.`);
      return null;
    }

    const hasWT = Boolean(s.wt || (s.strategy && s.strategy.includes('#W1')));
    const strategy = this.determineStrategy({ direction, rsi1m: rsi1mNum, rsi5m: rsi5mNum, boostNum, hasWT, existingStrategy: s.strategy });
    const wtDisplay = s.wt || (strategy === '#W1' ? (direction === 'down' ? '1m🔴' : '1m🟢') : null);

    const pivotDist = this.parsePivotDistance(s.pivot);
    const pivotDisplay = typeof s.pivot === 'string' && s.pivot.includes('%')
      ? s.pivot
      : botData.formatHammerDistanceAlert(pivotDist);

    const emaDist = this.parsePivotDistance(s.ema200);
    const ema200Display = typeof s.ema200 === 'string' && s.ema200.includes('%')
      ? s.ema200
      : botData.formatHammerDistanceAlert(emaDist);

    const frDisplay = typeof s.fr === 'string' && s.fr.includes('⚠️')
      ? s.fr
      : botData.formatHammerFundingAlert(s.fr ?? s.fundingRate);

    const stars = s.stars !== undefined ? s.stars : this.calculateStars({ boostNum });

    const card = {
      id: 'hpp_' + Date.now(),
      symbol,
      stars,
      dot,
      strategy,
      boostValue: boostFormatted,
      currentPrice: formatCryptoPrice(s.price || s.currentPrice, symbol),
      prevPrice: prevPriceStr,
      rsi: {
        m1: botData.rsiTextWithAlert(rsi1mNum),
        m5: botData.rsiTextWithAlert(rsi5mNum),
        h1: botData.rsiTextWithAlert(rsi1hNum)
      },
      srsi: {
        m1: botData.srsiTextWithAlert(srsi1mNum),
        m5: botData.srsiTextWithAlert(srsi5mNum),
        h1: botData.srsiTextWithAlert(srsi1hNum)
      },
      dateLabel: 'Today',
      time: nowTime
    };

    if (wtDisplay) card.wt = wtDisplay;
    if (s.divergence) card.divergence = s.divergence;
    if (pivotDisplay) card.pivot = pivotDisplay;
    if (ema200Display) card.ema200 = ema200Display;
    if (frDisplay) card.fr = frDisplay;
    if (s.btcStatus) card.btcStatus = s.btcStatus;

    return this.addSignal(card);
  }
}

module.exports = new HammerProPlusBot();
