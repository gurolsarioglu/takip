/**
 * divergence.bot.js — Divergence (Momentum and price relationship analysis)
 * Stratejiler: 1H RSI DIVERGENCE (Pozitif/Negatif), 1H RSI SMA CROSSED
 */

const BaseBot = require('../base/base-bot');
const { formatCryptoPrice, computePrevPrice, getDecimalPlaces } = require('../../services/price-formatter');

const initialSignals = [
  {
    id: 'div_1',
    symbol: 'SOLUSDT',
    dot: '🟢',
    strategy: '1H RSI DIVERGENCE',
    boostValue: '+2.28%',
    currentPrice: '148.52',
    prevPrice: '145.20',
    rsi: { h1: '24 ❗', h4: '32', d1: '45' },
    srsi: { h1: '12 ❗', h4: '20', d1: '52' },
    pivot: '%0.32 ⚠️',
    dateLabel: 'Today',
    time: '16:35'
  },
  {
    id: 'div_2',
    symbol: 'ETHUSDT',
    dot: '🔴',
    strategy: '1H RSI DIVERGENCE',
    boostValue: '+0.49%',
    currentPrice: '2645.10',
    prevPrice: '2658.00',
    rsi: { h1: '72 ❗', h4: '68', d1: '59' },
    srsi: { h1: '88 ❗', h4: '82 ❗', d1: '64' },
    pivot: '%0.45 ⚠️',
    dateLabel: 'Today',
    time: '16:20'
  },
  {
    id: 'div_3',
    symbol: 'BTCUSDT',
    dot: '🔴',
    strategy: '1H RSI SMA CROSSED',
    boostValue: '+0.42%',
    currentPrice: '63850.00',
    prevPrice: '64120.00',
    rsi: { h1: '68', h4: '64', d1: '58' },
    srsi: { h1: '92 ❗', h4: '75', d1: '62' },
    pivot: '%0.38 ⚠️',
    dateLabel: 'Today',
    time: '16:05'
  },
  {
    id: 'div_4',
    symbol: 'SUIUSDT',
    dot: '🟢',
    strategy: '1H RSI DIVERGENCE',
    boostValue: '+1.92%',
    currentPrice: '1.7450',
    prevPrice: '1.7120',
    rsi: { h1: '26 ❗', h4: '38', d1: '51' },
    srsi: { h1: '8 ❗', h4: '15', d1: '44' },
    pivot: '%0.28 ⚠️',
    dateLabel: 'Today',
    time: '15:45'
  },
  {
    id: 'div_5',
    symbol: 'NEARUSDT',
    dot: '🟢',
    strategy: '1H RSI DIVERGENCE',
    boostValue: '+2.07%',
    currentPrice: '5.420',
    prevPrice: '5.310',
    rsi: { h1: '28 ❗', h4: '34', d1: '48' },
    srsi: { h1: '14 ❗', h4: '19', d1: '40' },
    pivot: '%0.35 ⚠️',
    dateLabel: 'Today',
    time: '15:15'
  },
  {
    id: 'div_6',
    symbol: 'DOGEUSDT',
    dot: '🟢',
    strategy: '1H RSI SMA CROSSED',
    boostValue: '+1.96%',
    currentPrice: '0.12450',
    prevPrice: '0.12210',
    rsi: { h1: '32', h4: '42', d1: '50' },
    srsi: { h1: '18', h4: '25', d1: '55' },
    pivot: '%0.22 ⚠️',
    dateLabel: 'Today',
    time: '14:50'
  }
];

class DivergenceBot extends BaseBot {
  constructor() {
    super({
      id: 'div',
      name: 'Divergence',
      description: 'Momentum and price relationship analysis',
      initialSignals
    });
  }

  /**
   * Boost değerini güvenli float'a çevirir
   */
  parseBoost(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).replace(/[%+,\s]/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Yüzdesel mesafe string veya sayısını temiz mutlak float olarak döner
   */
  parseDistance(val) {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number') return Math.abs(val);
    const clean = String(val).replace(/[%+⚠️\s]/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? null : Math.abs(parsed);
  }

  /**
   * Divergence Analiz ve Yön Karar Motoru (Trader Mantığı)
   * - '🟢': Pozitif Uyumsuzluk / Boğa Dönüşü (1h RSI dipte, toparlanma var)
   * - '🔴': Negatif Uyumsuzluk / Ayı Dönüşü (1h RSI tepede, momentum zayıflamış)
   */
  evaluateDivergence({ rsi1h, rsi4h, boostNum, explicitDot, explicitStrategy, position }) {
    // 1. Minimum hareket eşiği (en az +0.25% sapma olmalı)
    if (boostNum < 0.25) {
      return { valid: false, reason: `Boost (${boostNum.toFixed(2)}%) uyumsuzluk teyidi için çok düşük.` };
    }

    // Açıkça belirtilmiş yön varsa
    if (explicitDot && (explicitDot === '🟢' || explicitDot === '🔴')) {
      return { valid: true, dot: explicitDot };
    }
    if (position === 'Short') return { valid: true, dot: '🔴' };
    if (position === 'Long') return { valid: true, dot: '🟢' };

    // 2. 1H RSI Değerine Göre Otomatik Ayrım:
    // A. 1H RSI <= 42 -> Pozitif Uyumsuzluk (🟢 Long)
    if (rsi1h <= 42) {
      return { valid: true, dot: '🟢' };
    }

    // B. 1H RSI >= 58 -> Negatif Uyumsuzluk (🔴 Short)
    if (rsi1h >= 58) {
      return { valid: true, dot: '🔴' };
    }

    // C. 43 - 57 arası nötr bölge (Uyumsuzluk için belirsiz)
    // Eğer özel bir strateji veya sinyal etiketi varsa kabul et, yoksa gürültüyü ele
    if (explicitStrategy) {
      return { valid: true, dot: rsi1h <= 50 ? '🟢' : '🔴' };
    }

    return { valid: false, reason: `1H RSI (${rsi1h}) nötr bölgede (43-57). Belirgin bir uyumsuzluk yok.` };
  }

  ingest(s) {
    const symbol = (s.coin || s.symbol).toUpperCase();
    const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const priceNum = parseFloat(s.price || 0);
    const boostNum = this.parseBoost(s.boost || s.boostValue);
    const boostFormatted = `+${boostNum.toFixed(2)}%`;

    // Strateji İsmi Belirleme
    let strategy = '1H RSI DIVERGENCE';
    if (s.strategy) strategy = s.strategy;
    else if (s.rsiSmaCross) strategy = '1H RSI SMA CROSSED';
    else if (s.rsi1hDiv) strategy = '1H RSI DIVERGENCE';

    // RSI Değerleri (Sayısal parse ve dinamik ❗ formatı)
    const rawRsi = parseInt(s.rsi, 10);
    const rsi1hNum = parseInt(s.rsi1h || (!isNaN(rawRsi) ? rawRsi : 28), 10);
    const rsi4hNum = parseInt(s.rsi4h || 35, 10);
    const rsi1dNum = parseInt(s.rsi1d || 45, 10);

    // SRSI Değerleri
    const srsi1hNum = parseInt(s.srsi1h || s.stochK || 12, 10);
    const srsi4hNum = parseInt(s.srsi4h || s.stochD || 20, 10);
    const srsi1dNum = parseInt(s.srsi1d || 50, 10);

    // Uyumsuzluk ve Yön Karar Motoru
    const explicitDot = s.dot || (s.position === 'Short' ? '🔴' : (s.position === 'Long' ? '🟢' : null));
    const analysis = this.evaluateDivergence({
      rsi1h: rsi1hNum,
      rsi4h: rsi4hNum,
      boostNum,
      explicitDot,
      explicitStrategy: s.strategy,
      position: s.position
    });

    if (!analysis.valid) {
      console.warn(`[Divergence] ⚠️ #${symbol} sinyali elendi: ${analysis.reason}`);
      return null;
    }

    const dot = analysis.dot;

    // prevPrice güvenliği (Çift Yönlü Hesaplama):
    // Pozitif Uyumsuzluk (🟢): Fiyat dipten sekti -> prevPrice < currentPrice: price / (1 + boost/100)
    // Negatif Uyumsuzluk (🔴): Fiyat tepeden döndü -> prevPrice > currentPrice: price * (1 + boost/100)
    let prevPriceStr = s.prevPrice ? String(s.prevPrice) : '';
    if (!prevPriceStr || prevPriceStr === String(s.price)) {
      if (priceNum > 0 && boostNum !== 0) {
        const decimals = Math.min(8, Math.max(2, getDecimalPlaces(s.price || priceNum)));
        if (dot === '🔴') {
          prevPriceStr = (priceNum * (1 + boostNum / 100)).toFixed(decimals);
        } else {
          prevPriceStr = computePrevPrice(priceNum, boostNum, s.price);
        }
      } else {
        prevPriceStr = formatCryptoPrice(s.price);
      }
    }

    // Pivot Mesafesi Kontrolü
    let pivotDisplay = '%0.32 ⚠️';
    if (s.pivot !== undefined && s.pivot !== null) {
      const pDist = this.parseDistance(s.pivot);
      pivotDisplay = typeof s.pivot === 'string' && s.pivot.includes('%') 
        ? s.pivot 
        : (pDist !== null ? `%${pDist.toFixed(2)} ⚠️` : '%0.32 ⚠️');
    }

    // Dinamik ❗ formatlama: RSI <= 30 veya >= 70; SRSI <= 15 veya >= 85
    const fmtRsi = (v) => `${v}${v >= 70 || v <= 30 ? ' ❗' : ''}`;
    const fmtSrsi = (v) => `${v}${v >= 85 || v <= 15 ? ' ❗' : ''}`;

    const card = {
      id: 'div_' + Date.now(),
      symbol: symbol,
      dot: dot,
      strategy: strategy,
      boostValue: boostFormatted,
      currentPrice: formatCryptoPrice(s.price),
      prevPrice: prevPriceStr,
      rsi: {
        h1: fmtRsi(rsi1hNum),
        h4: fmtRsi(rsi4hNum),
        d1: fmtRsi(rsi1dNum)
      },
      srsi: {
        h1: fmtSrsi(srsi1hNum),
        h4: fmtSrsi(srsi4hNum),
        d1: fmtSrsi(srsi1dNum)
      },
      pivot: pivotDisplay,
      dateLabel: 'Today',
      time: nowTime
    };

    return this.addSignal(card);
  }
}

module.exports = new DivergenceBot();
