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
    this.fundingHistory = new Map();
    this.radarInFlight = new Set();

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
    const botId = (signalData.botId || signalData.botType || '').toLowerCase();
    const timeframe = (signalData.timeframe || '').toLowerCase();
    const affectedBots = [];
    let matchedRoute = false;
    const accept = (bot, id, method = 'addSignal') => {
      matchedRoute = true;
      if (bot[method](signalData)) affectedBots.push(id);
    };

    // Fiyatı SymbolRegistry ile resmi tickSize'a formatla
    if (signalData.price || signalData.currentPrice) {
      const p = signalData.price || signalData.currentPrice;
      signalData.price = formatCryptoPrice(p, symbol);
      signalData.currentPrice = signalData.price;
    }

    // ─── Doğrudan botId Eşlemesi (Bağımsız Runner Servisleri için) ───
    if (botId === 'm1a') {
      accept(m1aDropBot, 'm1a');
    } else if (botId === 'm1premium' || botId === 'm1p') {
      accept(m1PremiumBot, 'm1premium');
    } else if (botId === 'hammerproplus') {
      accept(hammerProPlusBot, 'hammerproplus');
    } else if (botId === 'hammerpro') {
      accept(hammerProBot, 'hammerpro');
    } else if (botId === '4ssniper') {
      accept(fourSSniperBot, '4ssniper');
    } else if (botId === '4s') {
      accept(fourSBot, '4s');
    } else if (botId === 'div' || botId === 'divergence') {
      accept(divergenceBot, 'div');
    } else if (botId === 'v3' || botId === 'volume') {
      accept(v3VolumeBot, 'v3');
    } else if (botId === 'fr' || botId === 'funding') {
      accept(fundingRateBot, 'fr');
    } else {
      // ─── Genel / Karma Hunter Botları için Geriye Dönük Uyumluluk ───
      if (botId.includes('4s') || botId.includes('sniper') || timeframe === '4h') {
        const isSniper = signalData.strategy === 'NW UP' || botId.includes('sniper');
        if (isSniper) {
          accept(fourSSniperBot, '4ssniper', 'ingest');
        } else {
          accept(fourSBot, '4s', 'ingest');
        }
      }

      if (
        signalData.rsi1hDiv ||
        signalData.rsi4hDiv ||
        signalData.rsi1dDiv ||
        signalData.rsi1wDiv ||
        botId.includes('1gpro') ||
        botId.includes('div') ||
        (signalData.strategy && signalData.strategy.includes('DIVERGENCE'))
      ) {
        accept(divergenceBot, 'div', 'ingest');
      }

      if (
        botId.includes('15m') ||
        timeframe === '15m' ||
        botId.includes('hammer') ||
        botId.includes('m1')
      ) {
        accept(hammerProPlusBot, 'hammerproplus', 'ingest');
        accept(hammerProBot, 'hammerpro', 'ingest');

        if (signalData.position === 'Short' || botId.includes('m1a')) {
          accept(m1aDropBot, 'm1a', 'ingest');
        }
        if (signalData.position === 'Long' || botId.includes('m1p')) {
          accept(m1PremiumBot, 'm1premium', 'ingest');
        }
      }

      if (!matchedRoute) {
        accept(hammerProPlusBot, 'hammerproplus', 'ingest');
      }
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
  startBackgroundEngine(force = false) {
    if (this.isEngineRunning) return;
    
    // STANDALONE_BOTS=true modunda merkezi sunucu sadece HUB olarak çalışır,
    // botlar ise kendi ayrı batch pencerelerinde çalışıp sinyalleri buraya POST eder.
    if (!force && process.env.STANDALONE_BOTS === 'true') {
      console.log('  [BotManager] 📡 Sinyal Hub Modu Aktif (STANDALONE_BOTS=true)');
      console.log('  [BotManager] Botlar bağımsız batch servislerinden (/api/signals/emit) bekleniyor...');
      return;
    }

    this.isEngineRunning = true;
    console.log('[BotManager] Quant Arka Plan Motoru baslatiliyor (Sifir Sahte Tohum)...');

    // 1. Piyasa Veri Motorunu Başlat (WebSocket Radarı)
    marketDataEngine.start();

    // Distinct bot clocks and in-flight keys; one bot cannot consume another bot's state.
    this.radarListener = async alert => {
      if (!this.isEngineRunning) return;
      const key = `${alert.type}:${alert.symbol}`;
      if (this.radarInFlight.has(key)) return;
      this.radarInFlight.add(key);
      try { await this._handleRadarAlert(alert); }
      catch (error) { console.warn(`[Radar ${key}]`, error.message); }
      finally { this.radarInFlight.delete(key); }
    };
    marketDataEngine.on('radarAlert', this.radarListener);
    const { createScanLoop } = require('../services/scan-loop.service');
    const periods = { hammerpro: 15000, hammerproplus: 15000, div: 20000, '4s': 25000, '4ssniper': 25000 };
    this.structureLoops = Object.entries(periods).map(([id, period]) => createScanLoop(
      () => this._scanStructuralSetups(new Set([id])), period,
      { onError: error => console.warn(`[Scan ${id}]`, error.message) }));
    this.structureLoops.push(createScanLoop(() => this._scanFundingRates(), 20000,
      { onError: error => console.warn('[Scan fr]', error.message) }));
    this.initialScanTimer = setTimeout(() => {
      if (this.isEngineRunning) for (const loop of this.structureLoops) loop.run();
    }, 3000);
  }

  async _handleRadarAlert(alert) {
    const botData = require('../services/bot-data.service');
    const strategyRules = require('./strategy-rules');
    const sym = alert.symbol;
    const now = Date.now();
    const dateObj = new Date(now);
    const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    // ─────────────────────────────────────────────────────────────
    // A. M1-A Botu: 1m Ani Düşüş/Yükseliş, Bar-over-bar Hacim Değişimi, RSI/StochRSI
    // ─────────────────────────────────────────────────────────────
    if (alert.type === 'm1a') {
      if (!m1aDropBot.canEmitSignal(sym, '1m', null, 180000)) return;

      const klines1m = await marketDataEngine.getKlines(sym, '1m', 250);
      if (klines1m.length < 5) return;

      const curBar = klines1m[klines1m.length - 1];
      const prevBar = klines1m[klines1m.length - 2];
      const observed = botData.priceChange(klines1m);
      if (!observed || !strategyRules.shouldEmit('m1a', { changePct: observed.changePct })) return;

      // Visivero Standardı: Önceki 1m barına göre hacim değişim oranı: ((curBar.volume - prevBar.volume) / prevBar.volume) * 100
      let volChangePct = 0;
      if (prevBar && prevBar.volume > 0) {
        volChangePct = ((curBar.volume - prevBar.volume) / prevBar.volume) * 100;
      }
      const volumeFormatted = `${volChangePct.toFixed(2)}%`;

      const closes = klines1m.map(k => k.close);
      const rsiRes = quantIndicators.calculateRSI(closes, 14);
      const rsiVal = Math.round(rsiRes.rsi);
      const rsiFormatted = (rsiVal >= 70 || rsiVal <= 30) ? `${rsiVal} ⚠️` : `${rsiVal}`;

      const stoch = quantIndicators.calculateStochRSI(rsiRes.rsiSeries, 14, 3, 3);
      let kVal = Math.round(stoch.k);
      let dVal = Math.round(stoch.d);
      if (isNaN(kVal)) kVal = 0;
      if (isNaN(dVal)) dVal = 0;
      const stochWarning = (kVal <= 25 && dVal <= 25) || (kVal >= 80 && dVal >= 80);
      const stochasticFormatted = `${kVal}/${dVal}${stochWarning ? ' ⚠️' : ''}`;

      const isDrop = observed.changePct < 0;
      const dot = isDrop ? '🔴' : '🟢';
      const prevPrice = formatCryptoPrice(observed.previous, sym);

      m1aDropBot.addSignal({
            source: 'binance-central',
            strategyVersion: strategyRules.VERSION,
            observedAt: Date.now(),
        id: `m1a_${sym}_${now}`,
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        type: isDrop ? 'drop' : 'boost',
        dot,
        dropValue: isDrop ? `${observed.changePct.toFixed(2)}%` : undefined,
        boostValue: !isDrop ? `+${observed.changePct.toFixed(2)}%` : undefined,
        currentPrice: formatCryptoPrice(observed.current, sym),
        prevPrice,
        volume: volumeFormatted,
        rsi: rsiFormatted,
        stochastic: stochasticFormatted,
        btcStatus: null,
        dateLabel: dateStr,
        time: nowTime
      });
      console.log(`[QuantEngine Sinyal] M1-A: ${sym} (${observed.changePct.toFixed(2)}% | Vol: ${volumeFormatted})`);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // B. M1 Premium Botu: 1m Sıçrama (>= +0.70%), RSI >= 60 veya SRSI >= 65
    // ─────────────────────────────────────────────────────────────
    if (alert.type === 'm1premium') {
      if (!m1PremiumBot.canEmitSignal(sym, '1m', null, 180000)) return;

      const klines1m = await marketDataEngine.getKlines(sym, '1m', 250);
      if (klines1m.length < 20) return;

      const vols = klines1m.map(k => k.volume);
      const avgVol = vols.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
      const curVol = vols[vols.length - 1];
      if (curVol < avgVol * 1.05) return;

      const closes = klines1m.map(k => k.close);
      const rsiRes = quantIndicators.calculateRSI(closes, 14);
      const stoch = quantIndicators.calculateStochRSI(rsiRes.rsiSeries, 14, 3, 3);
      const observed = botData.priceChange(klines1m);
      if (!observed || !strategyRules.shouldEmit('m1premium', { changePct: observed.changePct,
        volumeRatio: avgVol > 0 ? curVol / avgVol : null, rsi: rsiRes.rsi, stochK: stoch.k })) return;

      const prevPrice = formatCryptoPrice(observed.previous, sym);
      const div = quantIndicators.detectPivotDivergence(klines1m, rsiRes.rsiSeries);

      m1PremiumBot.addSignal({
            source: 'binance-central',
            strategyVersion: strategyRules.VERSION,
            observedAt: Date.now(),
        id: `m1p_${sym}_${now}`,
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        boostValue: `+${observed.changePct.toFixed(2)}%`,
        currentPrice: formatCryptoPrice(observed.current, sym),
        prevPrice,
        rsi: {
          m1: `${Math.round(rsiRes.rsi)} ❗`,
          m5: '—',
          h1: '—'
        },
        srsi: {
          m1: `${Math.round(stoch.k)} ❗`,
          m5: '—',
          h1: '—'
        },
        divergence: div.hasBullDiv || div.hasBearDiv ? '1m ✅' : undefined,
        isFavorite: observed.changePct >= 1.50,
        dateLabel: dateStr,
        time: nowTime
      });
      console.log(`[QuantEngine Sinyal] M1-Premium: ${sym} (+${observed.changePct.toFixed(2)}%)`);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // C. V3-A Hacim Botu (VisiVero Standardı: 1m kapanış >= +8.00% 24s Base Asset hacim artışı)
    // ─────────────────────────────────────────────────────────────
    if (alert.type === 'v3') {
      if (!v3VolumeBot.canEmitSignal(sym, '1m', null, 300000)) return;

      const ticker = typeof marketDataEngine.getTicker === 'function' ? marketDataEngine.getTicker(sym) : null;
      const volBase24h = alert.volBase24h ?? ticker?.volBase ?? null;
      const volUsd = alert.volUsd ?? ticker?.volUsd ?? null;
      const klines1m = typeof marketDataEngine.getKlines === 'function'
        ? await marketDataEngine.getKlines(sym, '1m', 10)
        : [];

      let evalV3 = strategyRules.evaluateV3({
        symbol: sym,
        klines1m: Array.isArray(klines1m) && klines1m.length > 0 ? klines1m : null,
        volBase24h,
        prevVolBase24h: alert.prevVolBase24h ?? null,
        volUsd,
        vol1mUsd: alert.vol1mChange ?? null,
        volumeSurgePct: alert.volumeSurgePct ?? null
      });

      if (!evalV3 && typeof quantIndicators.calculateDeltaVolume === 'function') {
        const klines5m = await marketDataEngine.getKlines(sym, '5m', 250);
        if (klines5m.length >= 20) {
          const vols = klines5m.map(k => k.volume);
          const deltaVolPct = quantIndicators.calculateDeltaVolume(vols, 20);
          evalV3 = strategyRules.evaluateV3({
            symbol: sym,
            volBase24h,
            volUsd: alert.volUsd,
            deltaVolPct
          });
        }
      }

      if (!evalV3) return;
      if (evalV3.candleOpenTime !== null && !v3VolumeBot.canEmitSignal(sym, evalV3.timeframe || '1m', evalV3.candleOpenTime, 300000)) {
        return;
      }

      v3VolumeBot.addSignal({
        source: 'binance-central',
        strategyVersion: evalV3.strategyVersion || strategyRules.V3_VERSION,
        observedAt: Date.now(),
        id: `v3_${sym}_${now}`,
        symbol: sym,
        timeframe: evalV3.timeframe || '1m',
        candleOpenTime: evalV3.candleOpenTime ?? null,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        dot: evalV3.dot ?? '',
        hacimChange: evalV3.hacimChange,
        hacim24s: evalV3.hacim24s,
        strategy: 'V3-A Volume Surge',
        dateLabel: dateStr,
        time: nowTime
      });
      console.log(`[QuantEngine Sinyal] V3-A Hacim: ${sym} (${evalV3.hacimChange} | 24s: ${evalV3.hacim24s || '—'})`);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // D. Funding Rate (FR) Botu: VisiVero 3-Modlu Fonlama Motoru (Mod A 🟢 Flip, Mod B 🔴 Derin, Mod C '' Tarama)
    // ─────────────────────────────────────────────────────────────
    if (alert.type === 'fr') {
      const evalFr = strategyRules.evaluateFunding({
        rate: alert.fundingRate,
        prevRate: alert.prevFundingRate,
        nextFundingTime: alert.nextFundingTime,
        now
      });
      if (!evalFr) return;
      if (!fundingRateBot.canEmitSignal(sym, 'fr', null, 600000)) return;

      fundingRateBot.addSignal({
        source: 'binance-central',
        strategyVersion: evalFr.strategyVersion || strategyRules.FR_VERSION,
        observedAt: Date.now(),
        id: `fr_${sym}_${now}`,
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        mode: evalFr.mode,
        dot: evalFr.dot,
        alertText: evalFr.alertText,
        strategy: evalFr.strategy,
        fundingRate: evalFr.fundingRate,
        previousFunding: evalFr.previousFunding,
        difference: evalFr.difference,
        timeRemaining: evalFr.timeRemaining,
        nextFundingTime: evalFr.nextFundingTime,
        dateLabel: dateStr,
        time: nowTime
      });
      this.fundingHistory.set(sym, alert.fundingRate);
      console.log(`[QuantEngine Sinyal] FR (${evalFr.mode}): ${sym} (${evalFr.fundingRate})`);
    }
  }

  /**
   * Fonlama Oranı (Funding Rate) Taraması: En negatif fonlama oranına sahip pariteler
   */
  async _scanFundingRates() {
    const strategyRules = require('./strategy-rules');
    const topNeg = marketDataEngine.getTopNegativeFunding(15);
    if (!topNeg || topNeg.length === 0) return;

    const now = Date.now();
    const dateObj = new Date(now);
    const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    for (const item of topNeg) {
      const sym = item.symbol;
      const prevFr = this.fundingHistory.get(sym);
      const evalFr = strategyRules.evaluateFunding({
        rate: item.fundingRate,
        prevRate: prevFr,
        nextFundingTime: item.nextFundingTime,
        now
      });
      if (!evalFr) continue;
      if (!fundingRateBot.canEmitSignal(sym, 'fr', null, 600000)) continue;

      fundingRateBot.addSignal({
        source: 'binance-central',
        strategyVersion: evalFr.strategyVersion || strategyRules.FR_VERSION,
        observedAt: Date.now(),
        id: `fr_${sym}_${now}`,
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        mode: evalFr.mode,
        dot: evalFr.dot,
        alertText: evalFr.alertText,
        strategy: evalFr.strategy,
        fundingRate: evalFr.fundingRate,
        previousFunding: evalFr.previousFunding,
        difference: evalFr.difference,
        timeRemaining: evalFr.timeRemaining,
        nextFundingTime: evalFr.nextFundingTime,
        dateLabel: dateStr,
        time: nowTime
      });
      this.fundingHistory.set(sym, item.fundingRate);
      console.log(`[QuantEngine Sinyal] FR (${evalFr.mode}): ${sym} (${evalFr.fundingRate})`);
    }
  }

  /**
   * Aşama 2: Yapısal ve Mum Kapanışı Botları (Hammer Pro+, Hammer Pro, Div, 4S Sniper, 4S)
   */
  async _scanStructuralSetups(allowedBots = null) {
    const enabled = id => !allowedBots || allowedBots.has(id);
    const botData = require('../services/bot-data.service');
    const strategyRules = require('./strategy-rules');
    const allTickers = marketDataEngine.getAllTickers();
    if (allTickers.length === 0) return;

    // En aktif 60 hacimli pariteyi tara
    const candidates = allTickers
      .sort((a, b) => b.volUsd - a.volUsd)
      .slice(0, 60)
      .map(t => t.symbol);

    const now = Date.now();
    const dateObj = new Date(now);
    const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    for (let i = 0; i < candidates.length; i++) {
      const sym = candidates[i];

      try {
        const [klines5m, klines1h] = await Promise.all([
          (!allowedBots || ['hammerpro','hammerproplus','div'].some(enabled))
            ? marketDataEngine.getKlines(sym, '5m', 250) : Promise.resolve([]),
          marketDataEngine.getKlines(sym, '1h', 250)
        ]);

        if (klines5m.length < 50 && klines1h.length < 50) continue;

        const lastBar5m = klines5m[klines5m.length - 1];
        const lastBar1h = klines1h[klines1h.length - 1];

        const m5 = klines5m.length >= 50 ? quantIndicators.calculateAllMetrics(klines5m) : null;
        const m1h = klines1h.length >= 50 ? quantIndicators.calculateAllMetrics(klines1h) : null;
        if (!m5 && !m1h) continue;

        const curPrice = lastBar5m?.close ?? lastBar1h?.close;
        const observed5 = botData.priceChange(klines5m), observed1h = botData.priceChange(klines1h);
        const hasFullOhlc = (klines5m.length > 0 && Number.isFinite(klines5m[0]?.open)) ||
          (klines1h.length > 0 && Number.isFinite(klines1h[0]?.open));

        let klines1m = [];
        let m1 = null;
        if (hasFullOhlc && (!allowedBots || ['hammerpro', 'hammerproplus'].some(enabled))) {
          klines1m = await marketDataEngine.getKlines(sym, '1m', 250);
          if (klines1m.length >= 50) {
            m1 = quantIndicators.calculateAllMetrics(klines1m);
          }
        }

        const markInfo = typeof marketDataEngine.getMarkPrice === 'function' ? marketDataEngine.getMarkPrice(sym) : null;
        const fundingRate = markInfo?.fundingRate ?? null;

        // 1. Hammer Pro Plus (#W1 / #S1 / #R1 — 1m/5m/1h VisiVero Engine)
        if (
          enabled('hammerproplus') && strategyRules.shouldEmit('hammerproplus', { m1, m5, m1h, klines1m, fundingRate })
        ) {
          const triggerBar = (m1 && klines1m.length > 0) ? klines1m[klines1m.length - 1] : lastBar5m;
          const triggerTf = (m1 && klines1m.length > 0) ? '1m' : '5m';
          if (triggerBar && hammerProPlusBot.canEmitSignal(sym, triggerTf, triggerBar.openTime, 180000)) {
            let m4h = null, m1d = null;
            if (m1) {
              const [klines4h, klines1d] = await Promise.all([
                marketDataEngine.getKlines(sym, '4h', 250),
                marketDataEngine.getKlines(sym, '1d', 30)
              ]);
              if (klines4h.length >= 50) m4h = quantIndicators.calculateAllMetrics(klines4h);
              if (klines1d.length >= 2) m1d = { pivots: quantIndicators.calculatePivots(klines1d[klines1d.length - 2], triggerBar.close) };
            }
            const evalHpp = strategyRules.evaluateHammer('hammerproplus', { m1, m5, m1h, m4h, m1d, klines1m, fundingRate });
            const obs = (m1 && klines1m.length >= 2) ? botData.priceChange(klines1m) : observed5;

            if (evalHpp && obs) {
              hammerProPlusBot.addSignal({
                source: 'binance-central',
                strategyVersion: evalHpp.strategyVersion || strategyRules.VERSION,
                observedAt: Date.now(),
                id: `hpp_${sym}_${now}`,
                candleOpenTime: triggerBar.openTime,
                timeframe: triggerTf,
                symbol: sym,
                timestamp: now,
                isoDate: dateObj.toISOString(),
                dateStr,
                stars: evalHpp.stars,
                dot: evalHpp.dot,
                strategy: evalHpp.strategy,
                boostValue: evalHpp.boostValue,
                measuredChangePct: obs.changePct,
                currentPrice: formatCryptoPrice(obs.current, sym),
                prevPrice: formatCryptoPrice(obs.previous, sym),
                rsi: evalHpp.rsi,
                srsi: evalHpp.srsi,
                wt: evalHpp.wt,
                divergence: evalHpp.divergence,
                pivot: evalHpp.pivot,
                ema200: evalHpp.ema200,
                fr: evalHpp.fr,
                btcStatus: evalHpp.btcStatus,
                dateLabel: dateStr,
                time: nowTime
              });
              console.log(`[QuantEngine Sinyal] Hammer Pro Plus: ${sym} (${evalHpp.dot} ${evalHpp.strategy} | Boost: ${evalHpp.boostValue || '—'})`);
            }
          }
        }

        // 2. Hammer Pro (#W1 / #S1 — 1m/5m/1h VisiVero Engine)
        if (
          enabled('hammerpro') && strategyRules.shouldEmit('hammerpro', { m1, m5, m1h, klines1m, fundingRate })
        ) {
          const triggerBar = (m1 && klines1m.length > 0) ? klines1m[klines1m.length - 1] : lastBar5m;
          const triggerTf = (m1 && klines1m.length > 0) ? '1m' : '5m';
          if (triggerBar && hammerProBot.canEmitSignal(sym, triggerTf, triggerBar.openTime, 180000)) {
            let m4h = null, m1d = null;
            if (m1) {
              const [klines4h, klines1d] = await Promise.all([
                marketDataEngine.getKlines(sym, '4h', 250),
                marketDataEngine.getKlines(sym, '1d', 30)
              ]);
              if (klines4h.length >= 50) m4h = quantIndicators.calculateAllMetrics(klines4h);
              if (klines1d.length >= 2) m1d = { pivots: quantIndicators.calculatePivots(klines1d[klines1d.length - 2], triggerBar.close) };
            }
            const evalHp = strategyRules.evaluateHammer('hammerpro', { m1, m5, m1h, m4h, m1d, klines1m, fundingRate });
            const obs = (m1 && klines1m.length >= 2) ? botData.priceChange(klines1m) : observed5;

            if (evalHp && obs) {
              hammerProBot.addSignal({
                source: 'binance-central',
                strategyVersion: evalHp.strategyVersion || strategyRules.VERSION,
                observedAt: Date.now(),
                id: `hp_${sym}_${now}`,
                candleOpenTime: triggerBar.openTime,
                timeframe: triggerTf,
                symbol: sym,
                timestamp: now,
                isoDate: dateObj.toISOString(),
                dateStr,
                stars: evalHp.stars,
                dot: evalHp.dot,
                strategy: evalHp.strategy,
                boostValue: evalHp.boostValue,
                measuredChangePct: obs.changePct,
                currentPrice: formatCryptoPrice(obs.current, sym),
                prevPrice: formatCryptoPrice(obs.previous, sym),
                rsi: evalHp.rsi,
                srsi: evalHp.srsi,
                wt: evalHp.wt,
                divergence: evalHp.divergence,
                pivot: evalHp.pivot,
                ema200: evalHp.ema200,
                fr: evalHp.fr,
                btcStatus: evalHp.btcStatus,
                dateLabel: dateStr,
                time: nowTime
              });
              console.log(`[QuantEngine Sinyal] Hammer Pro: ${sym} (${evalHp.dot} ${evalHp.strategy} | Boost: ${evalHp.boostValue || '—'})`);
            }
          }
        }

        // 3. Divergence Botu: 1H veya 5m RSI Pivot Lookback Uyuşmazlığı
        const has1hDiv = strategyRules.hasDivergence(m1h);
        const has5mDiv = strategyRules.hasDivergence(m5);
        if (enabled('div') && strategyRules.shouldEmit('div', { m5, m1h })) {
          const is1h = has1hDiv;
          const divInfo = is1h ? m1h.divergence : m5.divergence;
          const tf = is1h ? '1h' : '5m';
          const candleTime = is1h ? lastBar1h.openTime : lastBar5m.openTime;

          if (divergenceBot.canEmitSignal(sym, tf, candleTime, 900000)) {
            const isBull = divInfo.hasBullDiv;

            divergenceBot.addSignal({
            source: 'binance-central',
            strategyVersion: strategyRules.VERSION,
            observedAt: Date.now(),
              id: `div_${sym}_${now}`,
              candleOpenTime: candleTime,
              timeframe: tf,
              symbol: sym,
              timestamp: now,
              isoDate: dateObj.toISOString(),
              dateStr,
              dot: isBull ? '🟢' : '🔴',
              strategy: `${tf.toUpperCase()} RSI DIVERGENCE`,
              boostValue: null,
              measuredChangePct: (is1h ? observed1h : observed5).changePct,
              currentPrice: formatCryptoPrice((is1h ? observed1h : observed5).current, sym),
              prevPrice: formatCryptoPrice((is1h ? observed1h : observed5).previous, sym),
              rsi: {
                h1: `${botData.indicatorText(m1h?.rsi)} ❗`,
                h4: '—',
                d1: '—'
              },
              srsi: {
                h1: `${botData.indicatorText(m1h?.srsiK)} ❗`,
                h4: '—',
                d1: '—'
              },
              pivot: `%${(is1h ? m1h : m5).pivots.pivotDistancePct} ⚠️`,
              dateLabel: dateStr,
              time: nowTime
            });
            console.log(`[QuantEngine Sinyal] Divergence: ${sym} (${divInfo.type})`);
          }
        }

        // 4. 4S Sniper Botu: VisiVero 4H (NW UP / NW DOWN / 4H RSI SMA CROSSED / 4H RSI DIVERGENCE)
        if (enabled('4ssniper')) {
          if (hasFullOhlc) {
            const klines4h = await marketDataEngine.getKlines(sym, '4h', 250);
            if (klines4h.length >= 30) {
              const m4h = quantIndicators.calculateAllMetrics(klines4h);
              const lastBar4h = klines4h[klines4h.length - 1];
              if (
                m4h &&
                strategyRules.shouldEmit('4ssniper', { m1h, m4h, klines4h }) &&
                fourSSniperBot.canEmitSignal(sym, '4h', lastBar4h.openTime, 600000)
              ) {
                const [klines1d, deriv] = await Promise.all([
                  marketDataEngine.getKlines(sym, '1d', 250).catch(() => []),
                  derivativesEnricher.enrich(sym).catch(() => null)
                ]);
                const m1d = Array.isArray(klines1d) && klines1d.length >= 15
                  ? quantIndicators.calculateAllMetrics(klines1d)
                  : null;
                const whaleLong = botData.ratio(deriv?.topTraderAccountLongRatio);
                const globalLong = botData.ratio(deriv?.globalLongRatio);
                const evalSniper = strategyRules.evaluateFourSSniper({
                  m1h,
                  m4h,
                  m1d,
                  klines4h,
                  whaleLong,
                  globalLong
                });
                const observed4h = botData.priceChange(klines4h);
                if (evalSniper && observed4h) {
                  fourSSniperBot.addSignal({
                    source: 'binance-central',
                    strategyVersion: evalSniper.strategyVersion || strategyRules.SNIPER_VERSION,
                    observedAt: Date.now(),
                    id: `4ss_${sym}_${now}`,
                    candleOpenTime: lastBar4h.openTime,
                    timeframe: '4h',
                    symbol: sym,
                    timestamp: now,
                    isoDate: dateObj.toISOString(),
                    dateStr,
                    direction: evalSniper.direction,
                    dot: evalSniper.dot,
                    strategy: evalSniper.strategy,
                    boostValue: evalSniper.boostValue,
                    measuredChangePct: observed4h.changePct,
                    currentPrice: formatCryptoPrice(observed4h.current, sym),
                    prevPrice: formatCryptoPrice(observed4h.previous, sym),
                    rsi: evalSniper.rsi,
                    srsi: evalSniper.srsi,
                    traderPositioning: evalSniper.traderPositioning,
                    traderDot: evalSniper.traderDot,
                    marketExposure: evalSniper.marketExposure,
                    exposureDot: evalSniper.exposureDot,
                    dateLabel: dateStr,
                    time: nowTime
                  });
                  console.log(`[QuantEngine Sinyal] 4S Sniper: ${sym} (${evalSniper.dot} ${evalSniper.strategy} | Boost: ${evalSniper.boostValue || '—'})`);
                }
              }
            }
          } else if (strategyRules.isSniperSetup(m1h) && fourSSniperBot.canEmitSignal(sym, '1h', lastBar1h.openTime, 600000)) {
            let deriv = null;
            try { deriv = await derivativesEnricher.enrich(sym); } catch (e) {}
            const whaleLong = botData.ratio(deriv?.topTraderAccountLongRatio);
            const globalLong = botData.ratio(deriv?.globalLongRatio);
            const evalSniper = strategyRules.evaluateFourSSniper({ m1h, whaleLong, globalLong });
            if (evalSniper && observed1h) {
              fourSSniperBot.addSignal({
                source: 'binance-central',
                strategyVersion: evalSniper.strategyVersion || strategyRules.VERSION,
                observedAt: Date.now(),
                id: `4ss_${sym}_${now}`,
                candleOpenTime: lastBar1h.openTime,
                timeframe: '1h',
                symbol: sym,
                timestamp: now,
                isoDate: dateObj.toISOString(),
                dateStr,
                direction: evalSniper.direction,
                dot: evalSniper.dot,
                strategy: evalSniper.strategy,
                boostValue: evalSniper.boostValue,
                measuredChangePct: observed1h.changePct,
                currentPrice: formatCryptoPrice(observed1h.current, sym),
                prevPrice: formatCryptoPrice(observed1h.previous, sym),
                rsi: evalSniper.rsi,
                srsi: evalSniper.srsi,
                traderPositioning: evalSniper.traderPositioning,
                traderDot: evalSniper.traderDot,
                marketExposure: evalSniper.marketExposure,
                exposureDot: evalSniper.exposureDot,
                dateLabel: dateStr,
                time: nowTime
              });
              console.log(`[QuantEngine Sinyal] 4S Sniper: ${sym} (Whale Long: ${whaleLong}%)`);
            }
          }
        }

        // 5. 4S Bot: 4H/1H Yapı Momentum ve Trend Sıçraması
        if (enabled('4s') && strategyRules.shouldEmit('4s', { m1h }) && fourSBot.canEmitSignal(sym, '1h', lastBar1h.openTime, 600000)) {
          let deriv = null;
          try { deriv = await derivativesEnricher.enrich(sym); } catch (e) {}
          const whaleLong = botData.ratio(deriv?.topTraderAccountLongRatio);
          const globalLong = botData.ratio(deriv?.globalLongRatio);

          fourSBot.addSignal({
            source: 'binance-central',
            strategyVersion: strategyRules.VERSION,
            observedAt: Date.now(),
            id: `4s_${sym}_${now}`,
            candleOpenTime: lastBar1h.openTime,
            timeframe: '1h',
            symbol: sym,
            timestamp: now,
            isoDate: dateObj.toISOString(),
            dateStr,
            dot: '🟢',
            strategy: '4H Yapi Momentum',
            boostValue: null,
              measuredChangePct: observed1h.changePct,
            currentPrice: formatCryptoPrice(observed1h.current, sym),
            prevPrice: formatCryptoPrice(observed1h.previous, sym),
            rsi: {
              h1: `${botData.indicatorText(m1h?.rsi)}`,
              h4: '—',
              d1: '—'
            },
            srsi: {
              h1: `${botData.indicatorText(m1h?.srsiK)}`,
              h4: '—',
              d1: '—'
            },
            traderPositioning: botData.percent(whaleLong),
            traderDot: whaleLong === null ? null : whaleLong >= 60 ? '🟢' : '🔴',
            marketExposure: botData.percent(globalLong),
            exposureDot: globalLong === null ? null : globalLong >= 50 ? '🟢' : '🔴',
            dateLabel: dateStr,
            time: nowTime
          });
          console.log(`[QuantEngine Sinyal] 4S: ${sym}`);
        }
      } catch (err) {
        console.warn(`[Structural ${sym}]`, err.message);
      }
    }
  }

  stopBackgroundEngine() {
    this.isEngineRunning = false;
    clearTimeout(this.initialScanTimer);
    for (const loop of this.structureLoops || []) loop.stop();
    if (this.radarListener) marketDataEngine.off('radarAlert', this.radarListener);
    if (this.structureScanTimer) {
      clearInterval(this.structureScanTimer);
    }
    marketDataEngine.stop();
  }
}

const botManager = new BotManager();
module.exports = botManager;
