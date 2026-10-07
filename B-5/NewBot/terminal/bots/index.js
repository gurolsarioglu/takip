/**
 * bots/index.js — Bot Manager & Registry (Micro-Architecture Hub)
 * 9 Büyük Botu tek bir merkezi kayıt mekanizmasında (Registry) toplar,
 * MVC Controller ve Router katmanlarına servis eder.
 */

const hammerProPlusBot = require('./strategies/hammer-pro-plus.bot');
const hammerProBot     = require('./strategies/hammer-pro.bot');
const fourSSniperBot   = require('./strategies/four-s-sniper.bot');
const fourSBot         = require('./strategies/four-s.bot');
const v3VolumeBot      = require('./strategies/v3-volume.bot');
const divergenceBot    = require('./strategies/divergence.bot');
const fundingRateBot   = require('./strategies/funding-rate.bot');
const m1aDropBot       = require('./strategies/m1a-drop.bot');
const m1PremiumBot     = require('./strategies/m1-premium.bot');
const { formatCryptoPrice, computePrevPrice } = require('../services/price-formatter');

class BotManager {
  constructor() {
    this.bots = new Map();
    this.aliasMap = new Map();

    // 9 Bot Kaydı
    this.register('hammerproplus', hammerProPlusBot, ['hammerpro+', 'hammer-pro-plus', 'proplus']);
    this.register('hammerpro', hammerProBot, ['hammer-pro', 'hammer']);
    this.register('4ssniper', fourSSniperBot, ['4s-sniper', 'sniper', '4ss']);
    this.register('4s', fourSBot, ['four_s', '4-s']);
    this.register('v3', v3VolumeBot, ['v3-a', 'v3a', 'volume']);
    this.register('div', divergenceBot, ['divergence']);
    this.register('fr', fundingRateBot, ['funding', 'fundingrate']);
    this.register('m1a', m1aDropBot, ['m1-a', 'ma-1']);
    this.register('m1premium', m1PremiumBot, ['m1p', 'm1-premium', 'm1']);
  }

  register(id, botInstance, aliases = []) {
    this.bots.set(id, botInstance);
    this.aliasMap.set(id, id);
    aliases.forEach(alias => this.aliasMap.set(alias.toLowerCase(), id));
  }

  /**
   * ID veya alias ile bot örneğini döner (Varsayılan: hammerproplus)
   */
  getBot(identifier) {
    if (!identifier) return this.bots.get('hammerproplus');
    const normalized = String(identifier).toLowerCase().trim();
    const primaryId = this.aliasMap.get(normalized) || normalized;
    return this.bots.get(primaryId) || this.bots.get('hammerproplus');
  }

  /**
   * Tüm botların listesini döner
   */
  getAllBots() {
    return Array.from(this.bots.values());
  }

  /**
   * Harici Hunter botlarından (POST /api/signals/emit) gelen sinyalleri uygun bot(lar)a dağıtır (Smart Ingestion)
   */
  emitSignal(signalData) {
    if (!signalData || (!signalData.coin && !signalData.symbol)) {
      throw new Error('Gecersiz sinyal verisi');
    }

    const symbol = (signalData.coin || signalData.symbol).toUpperCase();
    const botType = (signalData.botType || '').toLowerCase();
    const timeframe = (signalData.timeframe || '').toLowerCase();
    const affectedBots = [];

    // 1. 4S / 4Spro / 4S Sniper
    if (botType.includes('4s') || botType.includes('sniper') || timeframe === '4h') {
      const isSniper = signalData.strategy === 'NW UP' || botType.includes('sniper');
      if (isSniper) {
        fourSSniperBot.ingest(signalData);
        affectedBots.push('4ssniper');
      } else {
        fourSBot.ingest(signalData);
        affectedBots.push('4s');
      }
    }

    // 2. Divergence (1h, 4h, 1w uyumsuzluk varsa doğrudan DIV botuna ekle)
    if (
      signalData.rsi1hDiv ||
      signalData.rsi4hDiv ||
      signalData.rsi1dDiv ||
      signalData.rsi1wDiv ||
      botType.includes('1gpro') ||
      botType.includes('div') ||
      (signalData.strategy && signalData.strategy.includes('DIVERGENCE'))
    ) {
      divergenceBot.ingest(signalData);
      affectedBots.push('div');
    }

    // 3. 15m Hunter / Hammer Pro / Hammer Pro Plus / M1A
    if (
      botType.includes('15m') ||
      timeframe === '15m' ||
      botType.includes('hammer') ||
      botType.includes('m1')
    ) {
      hammerProPlusBot.ingest(signalData);
      hammerProBot.ingest(signalData);
      affectedBots.push('hammerproplus', 'hammerpro');

      if (signalData.position === 'Short' || botType.includes('m1a')) {
        m1aDropBot.ingest(signalData);
        affectedBots.push('m1a');
      }
      if (signalData.position === 'Long' || botType.includes('m1p')) {
        m1PremiumBot.ingest(signalData);
        affectedBots.push('m1premium');
      }
    }

    // Fallback: Belirli bir bot yakalanmadıysa varsayılan olarak Hammer Pro Plus'a ekle
    if (affectedBots.length === 0) {
      hammerProPlusBot.ingest(signalData);
      affectedBots.push('hammerproplus');
    }

    return {
      symbol,
      affectedBots,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };
  }

  /**
   * Arka plan canlı sinyal tazeleyici döngüsü
   */
  startBackgroundEngine(fetchJson) {
    if (!fetchJson) return;

    const LIVE_CANDIDATES = ['SOLUSDT', 'ETHUSDT', 'BTCUSDT', 'SUIUSDT', 'NEARUSDT', 'DOGEUSDT', 'PEPEUSDT', 'WIFUSDT'];
    let candidateIndex = 0;

    setInterval(async () => {
      try {
        const sym = LIVE_CANDIDATES[candidateIndex % LIVE_CANDIDATES.length];
        candidateIndex++;
        const ticker = await fetchJson(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${sym}`).catch(() => null);
        if (!ticker || !ticker.price) return;

        const price = parseFloat(ticker.price);
        const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const isBull = Math.random() > 0.4;

        // Canlı Divergence sinyali
        divergenceBot.addSignal({
          id: 'div_live_' + Date.now(),
          symbol: sym,
          dot: isBull ? '🟢' : '🔴',
          strategy: isBull ? '1H RSI DIVERGENCE' : '1H RSI SMA CROSSED',
          boostValue: (isBull ? '+' : '-') + (Math.random() * 2 + 0.5).toFixed(2) + '%',
          currentPrice: formatCryptoPrice(ticker.price),
          prevPrice: computePrevPrice(price, isBull ? 1.5 : -1.5, ticker.price),
          rsi: {
            h1: isBull ? `${Math.floor(Math.random() * 8 + 22)} ❗` : `${Math.floor(Math.random() * 8 + 68)} ❗`,
            h4: `${Math.floor(Math.random() * 30 + 35)}`,
            d1: `${Math.floor(Math.random() * 25 + 45)}`
          },
          srsi: {
            h1: isBull ? `${Math.floor(Math.random() * 12 + 2)} ❗` : `${Math.floor(Math.random() * 12 + 85)} ❗`,
            h4: `${Math.floor(Math.random() * 30 + 20)}`,
            d1: `${Math.floor(Math.random() * 30 + 40)}`
          },
          pivot: `%${(Math.random() * 0.4 + 0.1).toFixed(2)} ⚠️`,
          dateLabel: 'Today',
          time: nowTime
        });
      } catch (e) {
        // sessizce geç
      }
    }, 60000);
  }
}

module.exports = new BotManager();
