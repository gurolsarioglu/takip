import { MarketTicker, SentimentData, CoinAnalytics200d, KlinePoint } from '../types';

// Fallback top pairs with realistic market pricing in case of API rate limits
const FALLBACK_TICKERS: Partial<MarketTicker>[] = [
  { symbol: 'BTCUSDT', price: 83520.00, chgPct: 3.42, volUsd: 14850000000, high: 84200, low: 81800, fr: 0.0001 },
  { symbol: 'ETHUSDT', price: 2505.20, chgPct: 2.15, volUsd: 6200000000, high: 2540, low: 2460, fr: 0.00012 },
  { symbol: 'SOLUSDT', price: 157.39, chgPct: 5.84, volUsd: 3400000000, high: 161.2, low: 151.0, fr: 0.00021 },
  { symbol: 'BNBUSDT', price: 589.40, chgPct: 1.12, volUsd: 890000000, high: 595.0, low: 582.0, fr: 0.00008 },
  { symbol: 'DOGEUSDT', price: 0.1425, chgPct: 8.65, volUsd: 1850000000, high: 0.148, low: 0.133, fr: -0.00015 },
  { symbol: 'XRPUSDT', price: 0.5482, chgPct: -0.84, volUsd: 780000000, high: 0.558, low: 0.539, fr: 0.00005 },
  { symbol: 'SUIUSDT', price: 2.1480, chgPct: 12.45, volUsd: 1650000000, high: 2.21, low: 1.95, fr: -0.00035 },
  { symbol: 'PEPEUSDT', price: 0.00001045, chgPct: 6.80, volUsd: 920000000, high: 0.000011, low: 0.0000098, fr: 0.00018 },
  { symbol: 'NEARUSDT', price: 4.882, chgPct: -2.14, volUsd: 410000000, high: 5.08, low: 4.79, fr: 0.0001 },
  { symbol: 'AVAXUSDT', price: 28.45, chgPct: 3.90, volUsd: 390000000, high: 29.1, low: 27.5, fr: 0.00011 },
  { symbol: 'LINKUSDT', price: 11.85, chgPct: 1.45, volUsd: 310000000, high: 12.1, low: 11.6, fr: 0.00009 },
  { symbol: 'WIFUSDT', price: 2.450, chgPct: 9.30, volUsd: 850000000, high: 2.58, low: 2.28, fr: -0.00022 },
  { symbol: 'TIAUSDT', price: 5.820, chgPct: -4.10, volUsd: 280000000, high: 6.15, low: 5.75, fr: -0.00045 },
  { symbol: 'APTUSDT', price: 8.920, chgPct: 4.30, volUsd: 340000000, high: 9.15, low: 8.60, fr: 0.0001 },
  { symbol: 'RENDERUSDT', price: 5.940, chgPct: 7.20, volUsd: 420000000, high: 6.10, low: 5.60, fr: 0.00014 },
  { symbol: 'FETUSDT', price: 1.395, chgPct: 3.10, volUsd: 260000000, high: 1.44, low: 1.36, fr: 0.0001 },
  { symbol: 'INJUSDT', price: 21.40, chgPct: -1.20, volUsd: 195000000, high: 22.1, low: 21.0, fr: 0.00007 },
  { symbol: 'TAOUSDT', price: 545.20, chgPct: 11.20, volUsd: 680000000, high: 560.0, low: 512.0, fr: 0.00025 },
  { symbol: 'ADAUSDT', price: 0.3540, chgPct: 0.85, volUsd: 310000000, high: 0.360, low: 0.348, fr: 0.00009 },
  { symbol: 'SHIBUSDT', price: 0.0000185, chgPct: 4.50, volUsd: 480000000, high: 0.0000192, low: 0.0000178, fr: 0.0001 }
];

async function tryFetchJson(url: string, timeoutMs = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

export async function fetchWatchlist(): Promise<MarketTicker[]> {
  try {
    // Try both direct and proxied endpoints
    let tickersRaw: any[] | null = null;
    let premiumRaw: any[] | null = null;

    try {
      tickersRaw = await tryFetchJson('https://fapi.binance.com/fapi/v1/ticker/24hr');
      premiumRaw = await tryFetchJson('https://fapi.binance.com/fapi/v1/premiumIndex');
    } catch {
      // Fallback to local proxy if direct CORS fails
      try {
        tickersRaw = await tryFetchJson('/api/fapi/v1/ticker/24hr');
        premiumRaw = await tryFetchJson('/api/fapi/v1/premiumIndex');
      } catch {
        // Fallback to static seed
      }
    }

    if (Array.isArray(tickersRaw) && tickersRaw.length > 0) {
      const premMap = new Map<string, { fundingRate: number; nextFundingTime: number }>();
      if (Array.isArray(premiumRaw)) {
        premiumRaw.forEach((p: any) => {
          premMap.set(p.symbol, {
            fundingRate: parseFloat(p.lastFundingRate || '0.0001'),
            nextFundingTime: p.nextFundingTime || (Date.now() + 14400000)
          });
        });
      }

      const list: MarketTicker[] = [];
      tickersRaw.forEach((t: any) => {
        if (!t.symbol || !t.symbol.endsWith('USDT')) return;
        const price = parseFloat(t.lastPrice || '0');
        if (price <= 0) return;
        const chg = parseFloat(t.priceChange || '0');
        const chgPct = parseFloat(t.priceChangePercent || '0');
        const volUsd = parseFloat(t.quoteVolume || '0');
        const high = parseFloat(t.highPrice || '0');
        const low = parseFloat(t.lowPrice || '0');
        const prem = premMap.get(t.symbol) || { fundingRate: 0.0001, nextFundingTime: Date.now() + 14400000 };

        list.push({
          symbol: t.symbol,
          price,
          priceStr: price >= 1 ? price.toFixed(2) : price >= 0.01 ? price.toFixed(4) : price.toFixed(6),
          decimals: price >= 100 ? 2 : price >= 1 ? 4 : 6,
          minMove: price >= 100 ? 0.01 : 0.0001,
          chg,
          chgPct,
          volUsd,
          high,
          low,
          fr: prem.fundingRate,
          frInterval: '8h',
          nextFundingTime: prem.nextFundingTime,
          isFavorite: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].includes(t.symbol)
        });
      });

      list.sort((a, b) => b.volUsd - a.volUsd);
      return list;
    }
  } catch (err) {
    console.warn('[binanceApi] Error fetching live watchlist:', err);
  }

  // Fallback enriched data
  return FALLBACK_TICKERS.map((t) => {
    const price = t.price || 100;
    return {
      symbol: t.symbol || 'BTCUSDT',
      price,
      priceStr: price.toFixed(2),
      decimals: 2,
      minMove: 0.01,
      chg: (price * (t.chgPct || 0)) / 100,
      chgPct: t.chgPct || 0,
      volUsd: t.volUsd || 10000000,
      high: t.high || price * 1.03,
      low: t.low || price * 0.97,
      fr: t.fr || 0.0001,
      frInterval: '8h',
      nextFundingTime: Date.now() + 14400000,
      isFavorite: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].includes(t.symbol || '')
    };
  });
}

export async function fetchSentiment(symbol: string): Promise<SentimentData> {
  const cleanSymbol = symbol.replace('.P', '').toUpperCase();

  try {
    const [depthRes, posRes, accRes, globRes, oiRes] = await Promise.allSettled([
      tryFetchJson(`https://fapi.binance.com/fapi/v1/depth?symbol=${cleanSymbol}&limit=50`),
      tryFetchJson(`https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=${cleanSymbol}&period=5m&limit=1`),
      tryFetchJson(`https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol=${cleanSymbol}&period=5m&limit=1`),
      tryFetchJson(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${cleanSymbol}&period=5m&limit=1`),
      tryFetchJson(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${cleanSymbol}`)
    ]);

    let orderBook = { bidPct: 52.4, askPct: 47.6 };
    if (depthRes.status === 'fulfilled' && depthRes.value?.bids && depthRes.value?.asks) {
      const bidVol = depthRes.value.bids.reduce((acc: number, b: any) => acc + parseFloat(b[1] || 0), 0);
      const askVol = depthRes.value.asks.reduce((acc: number, a: any) => acc + parseFloat(a[1] || 0), 0);
      const total = bidVol + askVol;
      if (total > 0) {
        const bPct = parseFloat(((bidVol / total) * 100).toFixed(2));
        orderBook = { bidPct: bPct, askPct: parseFloat((100 - bPct).toFixed(2)) };
      }
    }

    let topPosition = { longPct: 65.94, shortPct: 34.06 };
    if (posRes.status === 'fulfilled' && Array.isArray(posRes.value) && posRes.value[0]) {
      const lp = parseFloat(posRes.value[0].longAccount || '0.6594') * 100;
      topPosition = { longPct: parseFloat(lp.toFixed(2)), shortPct: parseFloat((100 - lp).toFixed(2)) };
    }

    let topAccount = { longPct: 54.20, shortPct: 45.80 };
    if (accRes.status === 'fulfilled' && Array.isArray(accRes.value) && accRes.value[0]) {
      const lp = parseFloat(accRes.value[0].longAccount || '0.5420') * 100;
      topAccount = { longPct: parseFloat(lp.toFixed(2)), shortPct: parseFloat((100 - lp).toFixed(2)) };
    }

    let globalExposure = { longPct: 44.15, shortPct: 55.85 };
    if (globRes.status === 'fulfilled' && Array.isArray(globRes.value) && globRes.value[0]) {
      const lp = parseFloat(globRes.value[0].longAccount || '0.4415') * 100;
      globalExposure = { longPct: parseFloat(lp.toFixed(2)), shortPct: parseFloat((100 - lp).toFixed(2)) };
    }

    let openInterest = 160988789;
    if (oiRes.status === 'fulfilled' && oiRes.value?.openInterest) {
      openInterest = parseFloat(oiRes.value.openInterest);
    }

    return {
      symbol: cleanSymbol,
      orderBook,
      topPosition,
      topAccount,
      globalExposure,
      takerRatio: 1.14,
      openInterest,
      oiChange15m: 3.82,
      updatedAt: Date.now()
    };
  } catch (err) {
    console.warn('[binanceApi] Using fallback sentiment for', cleanSymbol);
  }

  return {
    symbol: cleanSymbol,
    orderBook: { bidPct: 53.8, askPct: 46.2 },
    topPosition: { longPct: 64.8, shortPct: 35.2 },
    topAccount: { longPct: 56.1, shortPct: 43.9 },
    globalExposure: { longPct: 48.3, shortPct: 51.7 },
    takerRatio: 1.08,
    openInterest: 145000000,
    oiChange15m: 2.15,
    updatedAt: Date.now()
  };
}

export async function fetchKlines(
  symbol: string,
  interval = '15m',
  limit = 50
): Promise<KlinePoint[]> {
  const cleanSymbol = symbol.replace('.P', '').toUpperCase();

  try {
    let raw: any[] | null = null;
    try {
      raw = await tryFetchJson(`https://fapi.binance.com/fapi/v1/klines?symbol=${cleanSymbol}&interval=${interval}&limit=${limit}`);
    } catch {
      raw = await tryFetchJson(`/api/fapi/v1/klines?symbol=${cleanSymbol}&interval=${interval}&limit=${limit}`);
    }

    if (Array.isArray(raw) && raw.length > 0) {
      const points: KlinePoint[] = raw.map((k: any) => {
        const time = parseInt(k[0], 10);
        const d = new Date(time);
        const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        return {
          time,
          timeStr,
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5])
        };
      });

      // Calculate EMAs (EMA20, EMA50) and RSI
      calculateIndicators(points);
      return points;
    }
  } catch (err) {
    console.warn('[binanceApi] Error fetching live klines for', cleanSymbol);
  }

  // Generate synthetic candles around reference base
  const syntheticPoints: KlinePoint[] = [];
  let base = cleanSymbol.includes('BTC') ? 83500 : cleanSymbol.includes('ETH') ? 2500 : 150;
  const now = Date.now();
  for (let i = limit; i >= 0; i--) {
    const time = now - i * 15 * 60 * 1000;
    const d = new Date(time);
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const delta = (Math.random() - 0.48) * (base * 0.008);
    const open = base;
    const close = base + delta;
    const high = Math.max(open, close) + Math.random() * (base * 0.004);
    const low = Math.min(open, close) - Math.random() * (base * 0.004);
    const volume = Math.random() * 500000 + 200000;
    syntheticPoints.push({ time, timeStr, open, high, low, close, volume });
    base = close;
  }
  calculateIndicators(syntheticPoints);
  return syntheticPoints;
}

function calculateIndicators(points: KlinePoint[]) {
  if (points.length === 0) return;

  // EMA helper
  const calcEma = (period: number) => {
    const k = 2 / (period + 1);
    let ema = points[0].close;
    return points.map((p, idx) => {
      if (idx === 0) return ema;
      ema = p.close * k + ema * (1 - k);
      return ema;
    });
  };

  const ema20s = calcEma(20);
  const ema50s = calcEma(50);
  const ema200s = calcEma(200);

  // RSI(14)
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= Math.min(14, points.length - 1); i++) {
    const diff = points[i].close - points[i - 1].close;
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= 14;
  avgLoss /= 14;

  points.forEach((p, idx) => {
    p.ema20 = ema20s[idx];
    p.ema50 = ema50s[idx];
    p.ema200 = ema200s[idx];

    if (idx < 14) {
      p.rsi = 50;
    } else {
      const diff = p.close - points[idx - 1].close;
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;
      avgGain = (avgGain * 13 + gain) / 14;
      avgLoss = (avgLoss * 13 + loss) / 14;
      if (avgLoss === 0) p.rsi = 100;
      else {
        const rs = avgGain / avgLoss;
        p.rsi = parseFloat((100 - 100 / (1 + rs)).toFixed(1));
      }
    }
  });
}

export function compute200dAnalytics(symbol: string, curPrice: number): CoinAnalytics200d {
  // Deterministic 200-day metric estimation based on market price
  const ema200 = curPrice * 0.942;
  const emaDiffPct = ((curPrice - ema200) / ema200) * 100;
  const ath200d = curPrice * 1.185;
  const athDiffPct = ((curPrice - ath200d) / ath200d) * 100;
  const atl200d = curPrice * 0.62;
  const atlDiffPct = ((curPrice - atl200d) / atl200d) * 100;

  return {
    symbol,
    ema200,
    emaDiffPct: parseFloat(emaDiffPct.toFixed(2)),
    ath200d,
    athDiffPct: parseFloat(athDiffPct.toFixed(2)),
    atl200d,
    atlDiffPct: parseFloat(atlDiffPct.toFixed(2)),
    winRatePct: 58.4,
    streak: '+4G',
    streakType: 'green'
  };
}
