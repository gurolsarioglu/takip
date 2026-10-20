/**
 * derivatives-enricher.service.js — Alpha Terminal Türev Veri Zenginleştirici
 * 
 * Teknik kriteri geçen aday coinler için Binance Futures türev verilerini çeker:
 * - Balina Pozisyon L/S Oranı (Top Trader Long/Short Ratio)
 * - Perakende Hesap L/S Oranı (Global Long/Short Account Ratio)
 * - Açık Pozisyon (Open Interest - OI) Değişimi
 * - Fonlama Oranı (Funding Rate) ve Geri Sayım
 * 
 * 60 saniye TTL önbellek (Cache) ve Token Bucket Hız Sınırlayıcı ile korunur.
 */

const https = require('https');

class DerivativesEnricherService {
  constructor() {
    this.cache = new Map();
    this.ttlMs = 60 * 1000; // 60 saniye TTL
    this.activeRequests = new Map(); // In-flight request deduplication
  }

  _fetchJson(url) {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'AlphaTerminal/DerivativesEngine-2.0',
          'Accept': 'application/json'
        },
        timeout: 5000
      };

      https.get(url, options, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
    });
  }

  async enrich(symbol, fundingMeta = null) {
    if (!symbol) return null;
    const cleanSym = String(symbol).toUpperCase().trim();
    const now = Date.now();
    const number = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
    const percentage = value => {
      const n = number(value);
      return n !== null && n >= 0 && n <= 1 ? n * 100 : null;
    };
    const withFunding = data => ({ ...data, fundingRate: number(fundingMeta?.fundingRate),
      nextFundingTime: number(fundingMeta?.nextFundingTime) });
    const cached = this.cache.get(cleanSym);
    if (cached && now - cached.ts < this.ttlMs) return withFunding(cached.data);
    if (this.activeRequests.has(cleanSym)) return withFunding(await this.activeRequests.get(cleanSym));

    const request = Promise.allSettled([
      this._fetchJson(`https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=${cleanSym}&period=5m&limit=2`),
      this._fetchJson(`https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol=${cleanSym}&period=5m&limit=2`),
      this._fetchJson(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${cleanSym}&period=5m&limit=2`),
      this._fetchJson(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${cleanSym}&period=5m&limit=2`)
    ]).then(([posResponse, accountResponse, globalResponse, oiResponse]) => {
      const rows = response => response.status === 'fulfilled' && Array.isArray(response.value) ? response.value : [];
      const position = rows(posResponse), account = rows(accountResponse), global = rows(globalResponse), oi = rows(oiResponse);
      const latest = position.at(-1), previous = position.at(-2);
      const topTraderLongRatio = percentage(latest?.longAccount);
      const topTraderAccountLongRatio = percentage(account.at(-1)?.longAccount);
      const globalLongRatio = percentage(global.at(-1)?.longAccount);
      const previousLong = percentage(previous?.longAccount);
      const currentOi = number(oi.at(-1)?.sumOpenInterest), previousOi = number(oi.at(-2)?.sumOpenInterest);
      const data = { symbol: cleanSym, topTraderLongRatio, topTraderAccountLongRatio,
        topTraderShortRatio: topTraderLongRatio === null ? null : 100 - topTraderLongRatio,
        topTraderLsRatio: number(latest?.longShortRatio),
        topTraderChange: topTraderLongRatio === null || previousLong === null ? null : topTraderLongRatio - previousLong,
        globalLongRatio, globalShortRatio: globalLongRatio === null ? null : 100 - globalLongRatio,
        globalLsRatio: number(global.at(-1)?.longShortRatio),
        currentOi, oiDeltaPct: currentOi === null || previousOi === null || previousOi <= 0
          ? null : (currentOi - previousOi) / previousOi * 100,
        isWhaleAccumulating: topTraderLongRatio === null ? null : topTraderLongRatio >= 60,
        isRetailShorting: globalLongRatio === null ? null : globalLongRatio <= 45,
        cachedAt: Date.now() };
      if (topTraderLongRatio !== null || topTraderAccountLongRatio !== null || globalLongRatio !== null || currentOi !== null) {
        this.cache.set(cleanSym, { data, ts: Date.now() });
      }
      return data;
    }).finally(() => this.activeRequests.delete(cleanSym));
    this.activeRequests.set(cleanSym, request);
    return withFunding(await request);
  }
}

const derivativesEnricherService = new DerivativesEnricherService();
module.exports = derivativesEnricherService;
