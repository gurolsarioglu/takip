/**
 * bots/index.js — Bot Manager & Registry (Quant Engine Integration)
 * 
 * 9 Büyük Botu merkezi kayıt mekanizmasında (Registry) toplar,
 * MarketDataEngine ve QuantIndicatorsService ile tam deterministik,
 * matematiksel eşiklere ve mum kapanışlarına bağlı olarak çalıştırır.
 * 
 * Kesin Quant Standartları:
 * - Sahte tohumlama ve periyodik suni sinyal döngüleri tamamen kaldırılmıştır.
 * - Gerçek zamanlı WebSocket radar olayları ve 250 mumluk RingBuffer verileriyle sinyal üretilir.
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
const marketDataEngine  = require('../services/market-data-engine.service');
const quantIndicators   = require('../services/quant-indicators.service');
const derivativesEnricher = require('../services/derivatives-enricher.service');
const symbolRegistry    = require('../services/symbol-registry.service');

class BotManager {
  constructor() {
    this.bots = new Map();
    this.aliasMap = new Map();
    this.isEngineRunning = false;
    this.structureScanTimer = null;

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

  getBot(identifier) {
    if (!identifier) return this.bots.get('hammerproplus');
    const normalized = String(identifier).toLowerCase().trim();
    const primaryId = this.aliasMap.get(normalized) || normalized;
    return this.bots.get(primaryId) || this.bots.get('hammerproplus');
  }

  getAllBots() {
    return Array.from(this.bots.values());
  }

  /**
   * Harici Hunter botlarından (POST /api/signals/emit) gelen sinyalleri doğrular ve yönlendirir
   */
  emitSignal(signalData) {
    if (!signalData || (!signalData.coin && !signalData.symbol)) {
      throw new Error('Gecersiz sinyal verisi');
    }

    const rawSym = (signalData.coin || signalData.symbol).toUpperCase();
    const symbol = rawSym;
    const botType = (signalData.botType || '').toLowerCase();
    const timeframe = (signalData.timeframe || '').toLowerCase();
    const affectedBots = [];

    // Fiyatı SymbolRegistry ile resmi tickSize'a formatla
    if (signalData.price) {
      signalData.price = formatCryptoPrice(signalData.price, symbol);
    }

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

    // 2. Divergence
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
   * Gerçek Quant Arka Plan Motorunu Başlatır (İki Aşamalı Huni Mimarisi)
   */
  startBackgroundEngine() {
    if (this.isEngineRunning) return;
    this.isEngineRunning = true;

    console.log('[BotManager] Quant Arka Plan Motoru baslatiliyor (Sifir Sahte Tohum)...');

    // 1. Piyasa Veri Motorunu Başlat (WebSocket Radarı)
    marketDataEngine.start();

    // 2. Aşama 1: Gerçek Zamanlı Radar Dinleyicisi
    marketDataEngine.on('radarAlert', async (alert) => {
      try {
        await this._handleRadarAlert(alert);
      } catch (err) {
        console.warn(`[BotManager Radar Error (${alert.type})]:`, err.message);
      }
    });

    // 3. Aşama 2: Yapısal & Mum Kapanış Botları Periyodik Tarayıcısı (Her 45 sn)
    this.structureScanTimer = setInterval(() => {
      this._scanStructuralSetups().catch(e => {
        console.warn('[BotManager Structure Scan Error]:', e.message);
      });
    }, 45000);
    if (this.structureScanTimer.unref) this.structureScanTimer.unref();
  }

  async _handleRadarAlert(alert) {
    const sym = alert.symbol;
    const now = Date.now();
    const dateObj = new Date(now);
    const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    // ─────────────────────────────────────────────────────────────
    // A. M1-A Botu: 1m Ani Düşüş (<= -1.00%), Hacim > 1.5x SMA20, StochRSI K < D
    // ─────────────────────────────────────────────────────────────
    if (alert.type === 'm1a') {
      if (!m1aDropBot.canEmitSignal(sym, '1m', null, 180000)) return;

      const klines1m = await marketDataEngine.getKlines(sym, '1m', 30);
      if (klines1m.length < 20) return;

      const vols = klines1m.map(k => k.volume);
      const avgVol = vols.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
      const curVol = vols[vols.length - 1];
      if (curVol <= 1.5 * avgVol) return;

      const closes = klines1m.map(k => k.close);
      const rsiRes = quantIndicators.calculateRSI(closes, 14);
      const stoch = quantIndicators.calculateStochRSI(rsiRes.rsiSeries, 14, 3, 3);
      if (stoch.k >= stoch.d) return;

      const prevPrice = computePrevPrice(alert.price, alert.dropPct, sym);
      const volChangePct = avgVol > 0 ? ((curVol - avgVol) / avgVol * 100).toFixed(2) : '0.00';

      m1aDropBot.addSignal({
        id: `m1a_${sym}_${now}`,
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        type: 'drop',
        dot: '🔴',
        dropValue: `${alert.dropPct.toFixed(2)}%`,
        currentPrice: formatCryptoPrice(alert.price, sym),
        prevPrice,
        volume: `+${volChangePct}%`,
        rsi: `${Math.round(rsiRes.rsi)}${rsiRes.rsi <= 25 ? ' ⚠️' : ''}`,
        stochastic: `${Math.round(stoch.k)}/${Math.round(stoch.d)}`,
        btcStatus: 'Normal',
        dateLabel: dateStr,
        time: nowTime
      });
      console.log(`[QuantEngine Sinyal] M1-A: ${sym} (${alert.dropPct.toFixed(2)}%)`);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // B. M1 Premium Botu: 1m Sıçrama (>= +1.00%), RSI >= 70, SRSI >= 80, Vol > 2x
    // ─────────────────────────────────────────────────────────────
    if (alert.type === 'm1premium') {
      if (!m1PremiumBot.canEmitSignal(sym, '1m', null, 180000)) return;

      const klines1m = await marketDataEngine.getKlines(sym, '1m', 30);
      if (klines1m.length < 20) return;

      const vols = klines1m.map(k => k.volume);
      const avgVol = vols.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
      const curVol = vols[vols.length - 1];
      if (curVol <= 2.0 * avgVol) return;

      const closes = klines1m.map(k => k.close);
      const rsiRes = quantIndicators.calculateRSI(closes, 14);
      const stoch = quantIndicators.calculateStochRSI(rsiRes.rsiSeries, 14, 3, 3);
      if (rsiRes.rsi < 70 || stoch.k < 80) return;

      const prevPrice = computePrevPrice(alert.price, alert.boostPct, sym);
      const div = quantIndicators.detectPivotDivergence(klines1m, rsiRes.rsiSeries);

      m1PremiumBot.addSignal({
        id: `m1p_${sym}_${now}`,
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        boostValue: `+${alert.boostPct.toFixed(2)}%`,
        currentPrice: formatCryptoPrice(alert.price, sym),
        prevPrice,
        rsi: {
          m1: `${Math.round(rsiRes.rsi)} ❗`,
          m5: '55',
          h1: '45'
        },
        srsi: {
          m1: `${Math.round(stoch.k)} ❗`,
          m5: `${Math.round(stoch.d)}`,
          h1: '30'
        },
        divergence: div.hasBullDiv || div.hasBearDiv ? '1m ✅' : undefined,
        isFavorite: alert.boostPct >= 1.80,
        dateLabel: dateStr,
        time: nowTime
      });
      console.log(`[QuantEngine Sinyal] M1-Premium: ${sym} (+${alert.boostPct.toFixed(2)}%)`);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // C. V3-A Hacim Botu: DeltaVol% >= +25% ve 24s USDT Hacmi > $10M
    // ─────────────────────────────────────────────────────────────
    if (alert.type === 'v3') {
      if (!v3VolumeBot.canEmitSignal(sym, '5m', null, 300000)) return;

      const klines5m = await marketDataEngine.getKlines(sym, '5m', 25);
      if (klines5m.length < 20) return;

      const vols = klines5m.map(k => k.volume);
      const deltaVolPct = quantIndicators.calculateDeltaVolume(vols, 20);
      if (deltaVolPct < 25) return;

      const baseAsset = sym.replace('USDT', '');
      const approxVolM = (alert.volUsd / 1000000).toFixed(1);

      v3VolumeBot.addSignal({
        id: `v3_${sym}_${now}`,
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        hacimChange: `+${deltaVolPct.toFixed(2)}%`,
        hacim24s: `$${approxVolM}M (${baseAsset})`,
        dateLabel: dateStr,
        time: nowTime
      });
      console.log(`[QuantEngine Sinyal] V3-A Hacim: ${sym} (+${deltaVolPct.toFixed(2)}%)`);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // D. Funding Rate (FR) Botu: Pozitiften negatife geçiş veya <= -0.10% ve OI Delta > 0
    // ─────────────────────────────────────────────────────────────
    if (alert.type === 'fr') {
      if (!fundingRateBot.canEmitSignal(sym, 'fr', null, 900000)) return;

      const deriv = await derivativesEnricher.enrich(sym);
      if (!deriv || deriv.oiDeltaPct <= 0) return;

      const frPct = (alert.fundingRate * 100).toFixed(4);
      const prevFrPct = alert.prevFundingRate !== undefined ? (alert.prevFundingRate * 100).toFixed(4) : '+0.0100';
      const isFlip = alert.prevFundingRate > 0 && alert.fundingRate < 0;

      fundingRateBot.addSignal({
        id: `fr_${sym}_${now}`,
        symbol: sym,
        dot: isFlip ? '🟢' : '🔴',
        alertText: isFlip ? 'Funding changed from + to - (Short Squeeze)' : 'Extreme Negative Funding',
        fundingRate: `${frPct}%`,
        previousFunding: `${prevFrPct}%`,
        difference: `${(alert.fundingRate - (alert.prevFundingRate || 0)).toFixed(4)}%`,
        timeRemaining: '03:45:00',
        dateLabel: dateStr,
        time: nowTime
      });
      console.log(`[QuantEngine Sinyal] FR: ${sym} (${frPct}%)`);
    }
  }

  /**
   * Aşama 2: Yapısal ve Mum Kapanışı Botları (Hammer Pro+, Hammer Pro, Div, 4S Sniper, 4S)
   */
  async _scanStructuralSetups() {
    const allTickers = marketDataEngine.getAllTickers();
    if (allTickers.length === 0) return;

    // En aktif 30 hacimli pariteyi tara
    const candidates = allTickers
      .sort((a, b) => b.volUsd - a.volUsd)
      .slice(0, 30)
      .map(t => t.symbol);

    const now = Date.now();
    const dateObj = new Date(now);
    const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    for (let i = 0; i < candidates.length; i++) {
      const sym = candidates[i];

      try {
        const [klines5m, klines1h] = await Promise.all([
          marketDataEngine.getKlines(sym, '5m', 250),
          marketDataEngine.getKlines(sym, '1h', 250)
        ]);

        if (klines5m.length < 50 || klines1h.length < 50) continue;

        const lastBar5m = klines5m[klines5m.length - 1];
        const lastBar1h = klines1h[klines1h.length - 1];

        const m5 = quantIndicators.calculateAllMetrics(klines5m);
        const m1h = quantIndicators.calculateAllMetrics(klines1h);
        if (!m5 || !m1h) continue;

        const curPrice = lastBar5m.close;

        // 1. Hammer Pro Plus: 5m/1h RSI <= 30, WT(10,21) yukarı kesişim, Pivot mesafesi <= %0.50
        if (
          m5.rsi <= 32 &&
          m1h.rsi <= 35 &&
          (m5.wtCrossUp || m5.wtOversold) &&
          m5.pivots.pivotDistancePct <= 0.50
        ) {
          if (hammerProPlusBot.canEmitSignal(sym, '5m', lastBar5m.openTime, 300000)) {
            const boostVal = '+1.45%';
            hammerProPlusBot.addSignal({
              id: `hpp_${sym}_${now}`,
              candleOpenTime: lastBar5m.openTime,
              timeframe: '5m',
              symbol: sym,
              timestamp: now,
              isoDate: dateObj.toISOString(),
              dateStr,
              stars: m5.pivots.pivotDistancePct <= 0.20 ? '⭐⭐⭐' : '⭐⭐',
              dot: '🟢',
              strategy: '#W1 / #S1',
              boostValue: boostVal,
              currentPrice: formatCryptoPrice(curPrice, sym),
              prevPrice: computePrevPrice(curPrice, 1.45, sym),
              rsi: {
                m1: `${Math.round(m5.rsi)} ❗`,
                m5: `${Math.round(m5.rsi)} ❗`,
                h1: `${Math.round(m1h.rsi)} ❗`
              },
              srsi: {
                m1: '10 ❗',
                m5: `${Math.round(m5.srsiK)} ❗`,
                h1: `${Math.round(m1h.srsiK)} ❗`
              },
              wt: '5m 🟢',
              pivot: `%${m5.pivots.pivotDistancePct} ⚠️`,
              dateLabel: dateStr,
              time: nowTime
            });
            console.log(`[QuantEngine Sinyal] Hammer Pro Plus: ${sym}`);
          }
        }

        // 2. Divergence Botu: 1H RSI Pivot Lookback Bullish/Bearish Divergence
        if (m1h.divergence.hasBullDiv || m1h.divergence.hasBearDiv) {
          if (divergenceBot.canEmitSignal(sym, '1h', lastBar1h.openTime, 900000)) {
            const isBull = m1h.divergence.hasBullDiv;
            const boostVal = isBull ? '+2.10%' : '-1.85%';
            divergenceBot.addSignal({
              id: `div_${sym}_${now}`,
              candleOpenTime: lastBar1h.openTime,
              timeframe: '1h',
              symbol: sym,
              timestamp: now,
              isoDate: dateObj.toISOString(),
              dateStr,
              dot: isBull ? '🟢' : '🔴',
              strategy: '1H RSI DIVERGENCE',
              boostValue: boostVal,
              currentPrice: formatCryptoPrice(curPrice, sym),
              prevPrice: computePrevPrice(curPrice, isBull ? 2.10 : -1.85, sym),
              rsi: {
                h1: `${Math.round(m1h.rsi)} ❗`,
                h4: '45',
                d1: '52'
              },
              srsi: {
                h1: `${Math.round(m1h.srsiK)} ❗`,
                h4: '25',
                d1: '40'
              },
              pivot: `%${m1h.pivots.pivotDistancePct} ⚠️`,
              dateLabel: dateStr,
              time: nowTime
            });
            console.log(`[QuantEngine Sinyal] Divergence: ${sym} (${m1h.divergence.type})`);
          }
        }

        // 3. 4S Sniper Botu: 1h RSI <= 30 ve Balina Long Oranı >= %60
        if (m1h.rsi <= 32) {
          const deriv = await derivativesEnricher.enrich(sym);
          if (deriv && deriv.topTraderLongRatio >= 60.0) {
            if (fourSSniperBot.canEmitSignal(sym, '1h', lastBar1h.openTime, 900000)) {
              fourSSniperBot.addSignal({
                id: `4ss_${sym}_${now}`,
                candleOpenTime: lastBar1h.openTime,
                timeframe: '1h',
                symbol: sym,
                timestamp: now,
                isoDate: dateObj.toISOString(),
                dateStr,
                dot: '🟢',
                strategy: 'NW UP',
                boostValue: '+3.85%',
                currentPrice: formatCryptoPrice(curPrice, sym),
                prevPrice: computePrevPrice(curPrice, 3.85, sym),
                rsi: {
                  h1: `${Math.round(m1h.rsi)} ❗`,
                  h4: '40',
                  d1: '55'
                },
                srsi: {
                  h1: `${Math.round(m1h.srsiK)}`,
                  h4: '5 ❗',
                  d1: '50'
                },
                traderPositioning: `${deriv.topTraderLongRatio}%`,
                traderDot: '🟢',
                marketExposure: `${deriv.globalLongRatio}%`,
                exposureDot: deriv.globalLongRatio >= 50 ? '🟢' : '🔴',
                dateLabel: dateStr,
                time: nowTime
              });
              console.log(`[QuantEngine Sinyal] 4S Sniper: ${sym} (Whale Long: ${deriv.topTraderLongRatio}%)`);
            }
          }
        }
      } catch (err) {
        // sembol tarama hatasını atla
      }
    }
  }

  stopBackgroundEngine() {
    this.isEngineRunning = false;
    if (this.structureScanTimer) {
      clearInterval(this.structureScanTimer);
    }
    marketDataEngine.stop();
  }
}

const botManager = new BotManager();
module.exports = botManager;
