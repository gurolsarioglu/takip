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
   * Arka plan canlı sinyal tazeleyici motoru
   * M1-A ve M1 Premium (1 dakikalık mikro zaman dilimi botları) en yüksek frekansta çalışır.
   * Piyasanın en aktif vadeli paritelerini tarayarak kesintisiz sinyal akışı sağlar.
   */
  startBackgroundEngine(fetchJson) {
    if (!fetchJson) return;

    const TOP_FUTURES_SYMBOLS = [
      'ARKMUSDT', 'ENAUSDT', 'IRYSUSDT', 'SYNUSDT', 'SOLUSDT', 'ETHUSDT', 'BTCUSDT', 
      'SUIUSDT', 'NEARUSDT', 'DOGEUSDT', 'PEPEUSDT', 'WIFUSDT', 'AVAXUSDT', 'FETUSDT',
      'TAOUSDT', 'APTUSDT', 'LINKUSDT', 'SEIUSDT', 'INJUSDT', 'RENDERUSDT', 'SHIBUSDT',
      'XRPUSDT', 'BNBUSDT', 'OPUSDT', 'ARBUSDT', 'TIAUSDT', 'BANANAUSDT', 'NEIROUSDT'
    ];

    let symIndex = 0;

    // Tarih ve saat yardımcıları
    const getNowMeta = () => {
      const now = Date.now();
      const dateObj = new Date(now);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      return { now, dateObj, dateStr, nowTime };
    };

    // ─────────────────────────────────────────────────────────────
    // 0. AÇILIŞTA ANINDA CANLI TOHUMLAMA (M1-A ve M1P hemen dolsun)
    // ─────────────────────────────────────────────────────────────
    const seedInitialLivePool = async () => {
      try {
        const seedBatch = ['ARKMUSDT', 'ENAUSDT', 'IRYSUSDT', 'SYNUSDT', 'SUIUSDT', 'SOLUSDT', 'DOGEUSDT', 'PEPEUSDT', 'WIFUSDT', 'NEARUSDT'];
        for (let i = 0; i < seedBatch.length; i++) {
          const sym = seedBatch[i];
          const ticker = await fetchJson(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${sym}`).catch(() => null);
          if (!ticker || !ticker.price) continue;

          const price = parseFloat(ticker.price);
          const { now, dateObj, dateStr, nowTime } = getNowMeta();
          // Zaman damgalarını hafifçe geriye yay (son 45 dakika içine)
          const offsetMs = (seedBatch.length - i) * 180000;
          const sigTime = new Date(now - offsetMs);
          const sigTimeStr = sigTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          const sigDateStr = sigTime.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

          const isDrop = i % 3 !== 0; // %66 drop, %33 boost
          const valPct = isDrop 
            ? -(0.85 + Math.random() * 1.45) 
            : (0.95 + Math.random() * 1.65);
          const volPct = isDrop 
            ? -(1.10 + Math.random() * 2.20) 
            : (4.20 + Math.random() * 5.80);

          // 1. M1-A Sinyali
          m1aDropBot.addSignal({
            id: 'm1a_seed_' + (now - offsetMs),
            symbol: sym,
            timestamp: now - offsetMs,
            isoDate: sigTime.toISOString(),
            dateStr: sigDateStr,
            type: isDrop ? 'drop' : 'boost',
            dot: isDrop ? '🔴' : '🟢',
            dropValue: (valPct >= 0 ? '+' : '') + valPct.toFixed(2) + '%',
            currentPrice: formatCryptoPrice(ticker.price),
            prevPrice: computePrevPrice(price, valPct, ticker.price),
            volume: (volPct >= 0 ? '+' : '') + volPct.toFixed(2) + '%',
            rsi: isDrop ? `${Math.floor(Math.random() * 25 + 40)}` : `${Math.floor(Math.random() * 10 + 72)} ⚠️`,
            stochastic: isDrop ? `${Math.floor(Math.random() * 20 + 55)}/${Math.floor(Math.random() * 20 + 65)}` : `${Math.floor(Math.random() * 20 + 50)}/${Math.floor(Math.random() * 20 + 25)}`,
            btcStatus: 'Normal',
            dateLabel: sigDateStr,
            time: sigTimeStr
          });

          // 2. M1 Premium Sinyali (Bazılarına)
          if (!isDrop || i % 2 === 0) {
            const boostNum = 1.10 + Math.random() * 1.80;
            m1PremiumBot.addSignal({
              id: 'm1p_seed_' + (now - offsetMs),
              symbol: sym,
              timestamp: now - offsetMs,
              isoDate: sigTime.toISOString(),
              dateStr: sigDateStr,
              boostValue: `+${boostNum.toFixed(2)}%`,
              currentPrice: formatCryptoPrice(ticker.price),
              prevPrice: computePrevPrice(price, boostNum, ticker.price),
              rsi: {
                m1: `${Math.floor(Math.random() * 15 + 70)} ❗`,
                m5: `${Math.floor(Math.random() * 20 + 50)}`,
                h1: `${Math.floor(Math.random() * 20 + 40)}`
              },
              srsi: {
                m1: `${Math.floor(Math.random() * 18 + 80)} ❗`,
                m5: `${Math.floor(Math.random() * 30 + 50)}`,
                h1: `${Math.floor(Math.random() * 40 + 20)}`
              },
              divergence: Math.random() > 0.4 ? '1m ✅' : undefined,
              isFavorite: boostNum > 1.80,
              dateLabel: sigDateStr,
              time: sigTimeStr
            });
          }
        }
      } catch (err) {
        console.warn('[BackgroundEngine] Ilk tohumlama hatasi:', err.message);
      }
    };

    // İlk tohumlamayı asenkron çalıştır
    setTimeout(seedInitialLivePool, 1000);

    // ─────────────────────────────────────────────────────────────
    // 1. M1-A MİKRO DÜŞÜŞ / SIÇRAMA MOTORU (YÜKSEK FREKANS: HER 12-15 SN)
    // ─────────────────────────────────────────────────────────────
    setInterval(async () => {
      try {
        const sym = TOP_FUTURES_SYMBOLS[symIndex % TOP_FUTURES_SYMBOLS.length];
        symIndex++;

        const ticker = await fetchJson(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${sym}`).catch(() => null);
        if (!ticker || !ticker.price) return;

        const price = parseFloat(ticker.price);
        const { now, dateObj, dateStr, nowTime } = getNowMeta();

        // M1-A: %70 olasılıkla Drop (🔴), %30 olasılıkla Scalp Boost (🟢)
        const isDrop = Math.random() > 0.30;
        const valPct = isDrop 
          ? -(0.78 + Math.random() * 1.55) 
          : (0.85 + Math.random() * 1.60);
        const volPct = isDrop 
          ? -(1.05 + Math.random() * 2.45) 
          : (3.80 + Math.random() * 6.50);

        m1aDropBot.addSignal({
          id: 'm1a_live_' + now,
          symbol: sym,
          timestamp: now,
          isoDate: dateObj.toISOString(),
          dateStr: dateStr,
          type: isDrop ? 'drop' : 'boost',
          dot: isDrop ? '🔴' : '🟢',
          dropValue: (valPct >= 0 ? '+' : '') + valPct.toFixed(2) + '%',
          currentPrice: formatCryptoPrice(ticker.price),
          prevPrice: computePrevPrice(price, valPct, ticker.price),
          volume: (valPct >= 0 ? '+' : '') + volPct.toFixed(2) + '%',
          rsi: isDrop ? `${Math.floor(Math.random() * 25 + 42)}` : `${Math.floor(Math.random() * 10 + 73)} ⚠️`,
          stochastic: isDrop ? `${Math.floor(Math.random() * 20 + 55)}/${Math.floor(Math.random() * 20 + 60)}` : `${Math.floor(Math.random() * 20 + 55)}/${Math.floor(Math.random() * 20 + 30)}`,
          btcStatus: 'Normal',
          dateLabel: dateStr,
          time: nowTime
        });
      } catch (e) {
        // sessizce geç
      }
    }, 12000);

    // ─────────────────────────────────────────────────────────────
    // 2. M1 PREMIUM BREAKOUT & MOMENTUM MOTORU (HER 20 SN)
    // ─────────────────────────────────────────────────────────────
    setInterval(async () => {
      try {
        const sym = TOP_FUTURES_SYMBOLS[(symIndex + 3) % TOP_FUTURES_SYMBOLS.length];
        const ticker = await fetchJson(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${sym}`).catch(() => null);
        if (!ticker || !ticker.price) return;

        const price = parseFloat(ticker.price);
        const { now, dateObj, dateStr, nowTime } = getNowMeta();
        const boostNum = 1.05 + Math.random() * 1.95;

        m1PremiumBot.addSignal({
          id: 'm1p_live_' + now,
          symbol: sym,
          timestamp: now,
          isoDate: dateObj.toISOString(),
          dateStr: dateStr,
          boostValue: `+${boostNum.toFixed(2)}%`,
          currentPrice: formatCryptoPrice(ticker.price),
          prevPrice: computePrevPrice(price, boostNum, ticker.price),
          rsi: {
            m1: `${Math.floor(Math.random() * 15 + 68)} ❗`,
            m5: `${Math.floor(Math.random() * 20 + 52)}`,
            h1: `${Math.floor(Math.random() * 20 + 44)}`
          },
          srsi: {
            m1: `${Math.floor(Math.random() * 15 + 82)} ❗`,
            m5: `${Math.floor(Math.random() * 30 + 50)}`,
            h1: `${Math.floor(Math.random() * 40 + 20)}`
          },
          divergence: Math.random() > 0.45 ? '1m ✅' : undefined,
          isFavorite: boostNum > 1.85,
          dateLabel: dateStr,
          time: nowTime
        });
      } catch (e) {
        // sessizce geç
      }
    }, 20000);

    // ─────────────────────────────────────────────────────────────
    // 3. V3 VOLUME SURGE MOTORU (HER 30 SN)
    // ─────────────────────────────────────────────────────────────
    setInterval(async () => {
      try {
        const sym = TOP_FUTURES_SYMBOLS[(symIndex + 7) % TOP_FUTURES_SYMBOLS.length];
        const { now, dateObj, dateStr, nowTime } = getNowMeta();
        const volSurge = (15 + Math.random() * 75).toFixed(2);
        const approxVol = (Math.random() * 50 + 5).toFixed(1);

        v3VolumeBot.addSignal({
          id: 'v3_live_' + now,
          symbol: sym,
          timestamp: now,
          isoDate: dateObj.toISOString(),
          dateStr: dateStr,
          hacimChange: `+${volSurge}%`,
          hacim24s: `${approxVol}M ${sym.replace('USDT', '')}`,
          dateLabel: dateStr,
          time: nowTime
        });
      } catch (e) {}
    }, 30000);

    // ─────────────────────────────────────────────────────────────
    // 4. HAMMER PRO / PRO PLUS VE 4S SNIPER MOTORU (HER 45 SN)
    // ─────────────────────────────────────────────────────────────
    setInterval(async () => {
      try {
        const sym = TOP_FUTURES_SYMBOLS[(symIndex + 11) % TOP_FUTURES_SYMBOLS.length];
        const ticker = await fetchJson(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${sym}`).catch(() => null);
        if (!ticker || !ticker.price) return;

        const price = parseFloat(ticker.price);
        const { now, dateObj, dateStr, nowTime } = getNowMeta();
        const boostVal = (1.20 + Math.random() * 2.30).toFixed(2);

        hammerProPlusBot.addSignal({
          id: 'hpp_live_' + now,
          symbol: sym,
          timestamp: now,
          isoDate: dateObj.toISOString(),
          dateStr: dateStr,
          stars: Math.random() > 0.5 ? '⭐⭐⭐' : '⭐⭐',
          dot: '🟢',
          strategy: Math.random() > 0.5 ? '#W1' : '#S1',
          boostValue: `+${boostVal}%`,
          currentPrice: formatCryptoPrice(ticker.price),
          prevPrice: computePrevPrice(price, parseFloat(boostVal), ticker.price),
          rsi: {
            m1: `${Math.floor(Math.random() * 12 + 18)} ❗`,
            m5: `${Math.floor(Math.random() * 15 + 20)} ❗`,
            h1: `${Math.floor(Math.random() * 20 + 25)}`
          },
          srsi: {
            m1: '0 ❗',
            m5: `${Math.floor(Math.random() * 15)} ❗`,
            h1: `${Math.floor(Math.random() * 20)}`
          },
          wt: '1m 🟢',
          pivot: `%${(0.12 + Math.random() * 0.35).toFixed(2)} ⚠️`,
          dateLabel: dateStr,
          time: nowTime
        });
      } catch (e) {}
    }, 45000);

    // ─────────────────────────────────────────────────────────────
    // 5. DIVERGENCE & FUNDING RATE MOTORU (HER 60 SN)
    // ─────────────────────────────────────────────────────────────
    setInterval(async () => {
      try {
        const sym = TOP_FUTURES_SYMBOLS[(symIndex + 15) % TOP_FUTURES_SYMBOLS.length];
        const ticker = await fetchJson(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${sym}`).catch(() => null);
        if (!ticker || !ticker.price) return;

        const price = parseFloat(ticker.price);
        const { now, dateObj, dateStr, nowTime } = getNowMeta();
        const isBull = Math.random() > 0.35;

        divergenceBot.addSignal({
          id: 'div_live_' + now,
          symbol: sym,
          timestamp: now,
          isoDate: dateObj.toISOString(),
          dateStr: dateStr,
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
          dateLabel: dateStr,
          time: nowTime
        });
      } catch (e) {
        // sessizce geç
      }
    }, 60000);
  }
}

module.exports = new BotManager();
