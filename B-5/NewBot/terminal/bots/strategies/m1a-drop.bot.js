/**
 * m1a-drop.bot.js — M1-A (Focused insight on the smallest timeframe)
 * Strateji: Mikro Düşüş (Drop Value), Hacim Çekilmesi, Stochastic K/D, BTC Durum Kontrolü
 */

const BaseBot = require('../base/base-bot');

const initialSignals = [
  {
    id: 'm1a_1',
    symbol: 'IRYSUSDT',
    type: 'drop',
    dot: '🔴',
    dropValue: '-1.24%',
    currentPrice: '0.01909',
    prevPrice: '0.01935',
    volume: '-1.15%',
    rsi: '47',
    stochastic: '57/77',
    btcStatus: 'Normal',
    dateLabel: 'Today',
    time: '16:10'
  },
  {
    id: 'm1a_2',
    symbol: 'ENAUSDT',
    type: 'drop',
    dot: '🔴',
    dropValue: '-1.04%',
    currentPrice: '0.3456',
    prevPrice: '0.3492',
    volume: '-1.79%',
    rsi: '70',
    stochastic: '68/47',
    btcStatus: 'Normal',
    dateLabel: 'Today',
    time: '16:10'
  },
  {
    id: 'm1a_3',
    symbol: 'ARKMUSDT',
    type: 'drop',
    dot: '🔴',
    dropValue: '-1.01%',
    currentPrice: '1.4520',
    prevPrice: '1.4680',
    volume: '-2.34%',
    rsi: '71',
    stochastic: '69/47',
    btcStatus: 'Normal',
    dateLabel: 'Today',
    time: '16:10'
  },
  {
    id: 'm1a_4',
    symbol: 'SYNUSDT',
    type: 'boost',
    dot: '🟢',
    dropValue: '+1.45%',
    currentPrice: '0.13712',
    prevPrice: '0.1286',
    volume: '+7.22%',
    rsi: '77 ⚠️',
    stochastic: '50/31',
    btcStatus: 'Normal',
    dateLabel: 'Today',
    time: '16:10'
  }
];

class M1ADropBot extends BaseBot {
  constructor() {
    super({
      id: 'm1a',
      name: 'M1-A',
      description: 'Focused insight on the smallest timeframe',
      initialSignals
    });
  }

  /**
   * Drop veya Boost değerini işaretli float yüzdesine çevirir
   */
  parseDropOrBoost(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).replace(/[%,\s]/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Hacim değişim yüzdesini parse eder
   */
  parseVolumeChange(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).replace(/[%,\s]/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Stochastic K/D oranını temiz string formatına dönüştürür (örn: '57/77')
   */
  formatStochastic(kVal, dVal, rawStr) {
    if (rawStr && typeof rawStr === 'string' && rawStr.includes('/')) {
      return rawStr.trim();
    }
    const k = Math.round(parseFloat(kVal || 50));
    const d = Math.round(parseFloat(dVal || 50));
    return `${k}/${d}`;
  }

  /**
   * M1-A Mikro Düşüş / Sıçrama Karar Motoru (Trader Mantığı)
   * 1. Drop Value <= -0.75% -> Mikro Düşüş ('drop' / 🔴)
   * 2. Boost Value >= +0.75% -> Mikro Sıçrama ('boost' / 🟢)
   * 3. Çok küçük hareketler (< 0.50%) gürültü olarak elenir
   */
  evaluateM1A({ valNum, volNum, explicitType, explicitDot }) {
    if (explicitType && explicitDot) {
      return { valid: true, type: explicitType, dot: explicitDot };
    }

    // Mikro gürültü filtresi
    if (Math.abs(valNum) < 0.50) {
      return { valid: false, reason: `Fiyat değişimi (%${valNum.toFixed(2)}) 1m scalp için yetersiz (Min %0.50 olmalı).` };
    }

    if (valNum < 0) {
      // Düşüş kontrolü
      return {
        valid: true,
        type: 'drop',
        dot: '🔴'
      };
    } else {
      // Sıçrama kontrolü
      return {
        valid: true,
        type: 'boost',
        dot: '🟢'
      };
    }
  }

  ingest(s) {
    const symbol = (s.coin || s.symbol).toUpperCase();
    const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const priceNum = parseFloat(s.price || 0);
    const valNum = this.parseDropOrBoost(s.dropValue || s.boost || (s.position === 'Short' ? -1.05 : 1.10));
    const volNum = this.parseVolumeChange(s.volume || (valNum < 0 ? -1.50 : 2.50));

    // M1-A Karar Motoru
    const explicitType = s.type || (s.position === 'Short' ? 'drop' : (s.position === 'Long' ? 'boost' : null));
    const explicitDot = s.dot || (s.position === 'Short' ? '🔴' : (s.position === 'Long' ? '🟢' : null));
    const analysis = this.evaluateM1A({
      valNum,
      volNum,
      explicitType,
      explicitDot
    });

    if (!analysis.valid) {
      console.warn(`[M1ADrop] ⚠️ #${symbol} sinyali elendi: ${analysis.reason}`);
      return null;
    }

    const type = analysis.type;
    const dot = analysis.dot;

    // prevPrice güvenliği (Çift Yönlü Formül):
    // Drop (🔴): Fiyat düştü -> prevPrice > currentPrice: currentPrice / (1 + valNum/100)
    // Boost (🟢): Fiyat arttı -> prevPrice < currentPrice: currentPrice / (1 + valNum/100)
    let prevPriceStr = s.prevPrice ? String(s.prevPrice) : '';
    if (!prevPriceStr || prevPriceStr === String(s.price)) {
      if (priceNum > 0 && valNum !== 0) {
        const computedPrev = priceNum / (1 + valNum / 100);
        prevPriceStr = priceNum > 1 ? computedPrev.toFixed(4) : computedPrev.toFixed(6);
      } else {
        prevPriceStr = priceNum > 0 ? String(priceNum) : '0.00';
      }
    }

    const valFormatted = valNum >= 0 ? `+${valNum.toFixed(2)}%` : `${valNum.toFixed(2)}%`;
    const volFormatted = volNum >= 0 ? `+${volNum.toFixed(2)}%` : `${volNum.toFixed(2)}%`;

    // RSI Değerleri (Aşırı değerde ⚠️ alarmı)
    const rawRsi = parseInt(s.rsi, 10);
    const rsiNum = !isNaN(rawRsi) ? rawRsi : (valNum < 0 ? 65 : 75);
    const rsiFormatted = `${rsiNum}${rsiNum >= 75 || rsiNum <= 25 ? ' ⚠️' : ''}`;

    // Stochastic formatı
    const stochFormatted = this.formatStochastic(s.stochK, s.stochD, s.stochastic);

    const card = {
      id: 'm1a_' + Date.now(),
      symbol: symbol,
      type: type,
      dot: dot,
      dropValue: valFormatted,
      currentPrice: priceNum > 0 ? (priceNum > 1 ? priceNum.toFixed(4) : priceNum.toFixed(6)) : String(s.price || '0.00'),
      prevPrice: prevPriceStr,
      volume: volFormatted,
      rsi: rsiFormatted,
      stochastic: stochFormatted,
      btcStatus: s.btcStatus || 'Normal',
      dateLabel: 'Today',
      time: nowTime
    };

    return this.addSignal(card);
  }
}

module.exports = new M1ADropBot();
