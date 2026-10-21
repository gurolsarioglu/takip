/**
 * runner-helper.js — Bağımsız Bot Servisleri için Ortak İletişim & Veri Yardımcısı
 * 
 * Her bot servisi bu yardımcı üzerinden:
 * 1. Piyasa verilerini (Watchlist, Kline, Ticker, Sentiment) Terminal sunucusundan veya doğrudan Binance'ten çeker.
 * 2. Tespit ettiği sinyalleri HTTP POST ile Terminal Hub'a (/api/signals/emit) iletir.
 * 3. Terminal konsoluna renkli, profesyonel durum ve sinyal günlükleri basar.
 */

const http  = require('http');
const https = require('https');
const symbolRegistry  = require('../../services/symbol-registry.service');
const quantIndicators = require('../../services/quant-indicators.service');
const botData = require('../../services/bot-data.service');
const { createScanLoop } = require('../../services/scan-loop.service');
const strategyRules = require('../strategy-rules');
const { formatCryptoPrice, computePrevPrice, formatPrice } = require('../../services/price-formatter');

const TERMINAL_HOST = process.env.TERMINAL_HOST || 'localhost';
const TERMINAL_PORT = parseInt(process.env.TERMINAL_PORT || '3000', 10);
const HUB_URL = `http://${TERMINAL_HOST}:${TERMINAL_PORT}`;

// ANSI Renk Kodları
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgBlue: '\x1b[44m'
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'AlphaBotRunner/2.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 100)}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Zaman asimi (8s)'));
    });
  });
}

/**
 * Terminal Hub'a sinyal gönderir (POST /api/signals/emit)
 */
async function postSignal(signalData) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(signalData);
    const options = {
      hostname: TERMINAL_HOST,
      port: TERMINAL_PORT,
      path: '/api/signals/emit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let respData = '';
      res.on('data', chunk => respData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(respData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: respData });
        }
      });
    });

    req.on('error', (err) => {
      // Hub kapalıysa bot çökmesin
      resolve({ status: 0, error: err.message });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ status: 0, error: 'Hub zaman asimi' });
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Güncel Watchlist'i çeker (Önce Terminal Hub, sonra doğrudan Binance)
 */
async function getWatchlist() {
  try {
    return await fetchJson(`${HUB_URL}/api/watchlist`);
  } catch (err) {
    // Fallback: Doğrudan Binance'ten çek
    try {
      const [tickers, premium] = await Promise.all([
        fetchJson('https://fapi.binance.com/fapi/v1/ticker/24hr'),
        fetchJson('https://fapi.binance.com/fapi/v1/premiumIndex')
      ]);
      const premMap = new Map();
      if (Array.isArray(premium)) {
        premium.forEach(p => premMap.set(p.symbol, parseFloat(p.lastFundingRate || 0)));
      }
      const list = [];
      if (Array.isArray(tickers)) {
        tickers.forEach(t => {
          if (!t.symbol.endsWith('USDT')) return;
          const price = parseFloat(t.lastPrice || 0);
          list.push({
            symbol: t.symbol,
            price: t.lastPrice,
            priceNum: price,
            volBase: parseFloat(t.volume || 0),
            volUsd: parseFloat(t.quoteVolume || 0),
            chgPct: parseFloat(t.priceChangePercent || 0),
            fr: premMap.get(t.symbol) ?? null
          });
        });
      }
      return list.sort((a, b) => b.volUsd - a.volUsd);
    } catch (e2) {
      console.warn('[RunnerHelper] Watchlist alinamadi:', e2.message);
      return [];
    }
  }
}

/**
 * Belirli bir sembolün kline mumlarını çeker
 */
async function getKlines(symbol, interval = '5m', limit = 100) {
  try {
    // Önce Hub Proxy'si
    const raw = await fetchJson(`${HUB_URL}/api/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    return parseKlines(raw);
  } catch (err) {
    try {
      const raw = await fetchJson(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
      return parseKlines(raw);
    } catch (e2) {
      return [];
    }
  }
}

function parseKlines(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(k => ({
    openTime: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    closeTime: k[6],
    quoteVolume: parseFloat(k[7] || 0)
  }));
}

/**
 * Sentiment / Balina verilerini çeker
 */
async function getSentiment(symbol) {
  try {
    return await fetchJson(`${HUB_URL}/api/sentiment?symbol=${symbol}`);
  } catch (err) {
    try {
      const acc = await fetchJson(`https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`);
      if (Array.isArray(acc) && acc.length > 0) {
        return {
          topAccount: {
            longPct: parseFloat(acc[0].longAccount) * 100,
            shortPct: parseFloat(acc[0].shortAccount) * 100,
            longShortRatio: acc[0].longShortRatio
          }
        };
      }
    } catch (e) {}
    return null;
  }
}

/**
 * Konsol Başlık ve Günlük Formatlayıcı
 */
const logger = {
  header(botId, title, desc) {
    console.clear();
    console.log(`${C.cyan}╔════════════════════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.cyan}║${C.bold}  🤖 ALPHA BOT RUNNER: ${title.padEnd(43)} ${C.cyan}║${C.reset}`);
    console.log(`${C.cyan}║${C.dim}     ${desc.padEnd(58)} ${C.cyan}║${C.reset}`);
    console.log(`${C.cyan}║${C.reset}  Hub Hedefi: ${C.yellow}${HUB_URL}/api/signals/emit${C.reset}${' '.repeat(Math.max(0, 39 - HUB_URL.length))}${C.cyan}║${C.reset}`);
    console.log(`${C.cyan}╚════════════════════════════════════════════════════════════════════╝${C.reset}\n`);
  },

  scan(botName, scannedCount, totalFound) {
    const time = new Date().toLocaleTimeString('tr-TR');
    process.stdout.write(`\r${C.dim}[${time}]${C.reset} ${C.bold}${botName}${C.reset} | Taranan: ${C.yellow}${scannedCount}${C.reset} sembol | Uretilen Sinyal: ${C.green}${totalFound}${C.reset}   `);
  },

  signal(botName, signal, hubResult) {
    const time = new Date().toLocaleTimeString('tr-TR');
    console.log(`\n\n${C.green}══════════════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`🚀 ${C.bold}${C.bgGreen} ${botName.toUpperCase()} YENİ SİNYAL TESPİT EDİLDİ ${C.reset} [${time}]`);
    console.log(`📌 Sembol:      ${C.bold}${C.yellow}#${signal.symbol}${C.reset}`);
    console.log(`💵 Fiyat:       ${C.bold}${signal.currentPrice || signal.price}${C.reset} (Önceki: ${signal.prevPrice || '—'})`);
    if (signal.boostValue) console.log(`📈 Boost:       ${C.green}${signal.boostValue}${C.reset}`);
    if (signal.dropValue)  console.log(`📉 Drop:        ${C.red}${signal.dropValue}${C.reset}`);
    if (signal.strategy)   console.log(`🎯 Strateji:    ${signal.strategy}`);
    if (signal.rsi)        console.log(`📊 RSI:         ${typeof signal.rsi === 'object' ? JSON.stringify(signal.rsi) : signal.rsi}`);
    if (signal.fundingRate)console.log(`💰 Fonlama:     ${signal.fundingRate}`);
    
    // Hub Gönderim Durumu
    if (hubResult && hubResult.status === 200) {
      console.log(`🌐 ${C.green}Web Terminal & Telegram Hub: BAŞARIYLA İLETİLDİ (HTTP 200)${C.reset}`);
    } else if (hubResult && hubResult.error) {
      console.log(`⚠️  ${C.yellow}Terminal Hub Bağlantısı: ${hubResult.error} (Hub bekleniyor)${C.reset}`);
    } else {
      console.log(`📡 Terminal Hub Durumu: HTTP ${hubResult ? hubResult.status : 'Bilinmiyor'}`);
    }
    console.log(`${C.green}══════════════════════════════════════════════════════════════════════${C.reset}\n`);
  },

  info(msg) {
    const time = new Date().toLocaleTimeString('tr-TR');
    console.log(`${C.dim}[${time}]${C.reset} ℹ️  ${msg}`);
  },

  warn(msg) {
    const time = new Date().toLocaleTimeString('tr-TR');
    console.log(`${C.yellow}[${time}] ⚠️  ${msg}${C.reset}`);
  },

  error(msg) {
    const time = new Date().toLocaleTimeString('tr-TR');
    console.log(`${C.red}[${time}] ❌ ${msg}${C.reset}`);
  }
};

module.exports = {
  HUB_URL,
  postSignal,
  getWatchlist,
  getKlines,
  getSentiment,
  symbolRegistry,
  quantIndicators,
  botData,
  createScanLoop,
  isSignalAccepted: botData.isSignalAccepted,
  strategyRules,
  formatCryptoPrice,
  computePrevPrice,
  formatPrice,
  logger,
  C
};
