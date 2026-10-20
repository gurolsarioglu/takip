/**
 * price-formatter.js — Alpha Terminal Kripto Fiyat Hassasiyet Koruma Motoru (Backend)
 * 
 * Kripto vadeli piyasalarında 0.17890, 0.004890 veya 0.00001850 gibi mikro rakamların
 * basamaklarını asla körlemesine kırpmaz, yuvarlamaz veya yutmaz.
 * Sembol biliniyorsa doğrudan SymbolRegistry'den gelen resmi kontrat tickSize hassasiyetini uygular.
 */

const symbolRegistry = require('./symbol-registry.service');

// Expand the shortest round-trip representation without inventing a decimal scale.
function plainNumber(number) {
  const text = String(number);
  if (!/[eE]/.test(text)) return text;
  const [mantissa, exponent] = text.split(/[eE]/);
  const negative = mantissa.startsWith('-');
  const unsigned = negative ? mantissa.slice(1) : mantissa;
  const [integer, fraction = ''] = unsigned.split('.');
  const digits = integer + fraction;
  const point = integer.length + Number(exponent);
  const result = point <= 0 ? '0.' + '0'.repeat(-point) + digits : point >= digits.length
    ? digits + '0'.repeat(point - digits.length) : digits.slice(0, point) + '.' + digits.slice(point);
  return (negative ? '-' : '') + result;
}

/**
 * Verilen fiyat değerinin gerçek ondalık basamak sayısını tespit eder.
 */
function getDecimalPlaces(val, symbol = null) {
  if (symbol) {
    return symbolRegistry.getPrecision(symbol);
  }

  if (val === null || val === undefined || val === '') return 2;

  // String olarak geldiyse orijinal basamak sayısını tespit et
  if (typeof val === 'string') {
    const str = val.trim();
    if (str.includes('.') && !str.includes('e') && !str.includes('E')) {
      const fraction = str.split('.')[1];
      return fraction.length;
    }
  }

  const num = typeof val === 'number' ? val : Number(val);
  const abs = !isNaN(num) ? Math.abs(num) : 0;
  if (abs === 0) return 2;

  if (abs < 0.0001) return 8;
  if (abs < 0.01) return 6;
  if (abs < 1) return 5;
  if (abs < 100) return 4;
  return 2;
}

/**
 * Fiyatı tick hassasiyetini koruyarak güvenle formatlar.
 * @param {string|number} rawPrice 
 * @param {number|string|null} precisionOrSymbol - sayı ise doğrudan o basamak, string ise sembolün resmi basamağı
 */
function formatCryptoPrice(rawPrice, precisionOrSymbol = null) {
  if (rawPrice === null || rawPrice === undefined || rawPrice === '') return '0.00';

  // 1. Eğer parametre bir sembol string'i ise (örn: 'BTCUSDT', 'DOGEUSDT')
  if (typeof precisionOrSymbol === 'string' && isNaN(Number(precisionOrSymbol))) {
    const meta = symbolRegistry.getSymbol(precisionOrSymbol);
    if (meta && !meta.isFallback) {
      const precision = meta.decimals;
      const n = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
      if (isNaN(n)) return '0.00';
      return n.toFixed(precision);
    }
    // Sembol henüz registry'ye çekilmemiş veya fallback ise:
    if (typeof rawPrice === 'string') {
      const str = rawPrice.trim();
      if (/^-?\d+(\.\d+)?$/.test(str) && !str.includes('e') && !str.includes('E')) {
        return str;
      }
    }
    const n = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
    if (!Number.isFinite(n)) return '0.00';
    return plainNumber(n);
  }

  // 2. Eğer açıkça bir sayısal precision belirtilmişse
  if (typeof precisionOrSymbol === 'number') {
    const n = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
    if (isNaN(n)) return '0.00';
    return n.toFixed(precisionOrSymbol);
  }

  // 3. String olarak geldiyse orijinal halini koru
  if (typeof rawPrice === 'string') {
    const str = rawPrice.trim();
    if (/^-?\d+(\.\d+)?$/.test(str) && !str.includes('e') && !str.includes('E')) {
      return str;
    }
  }

  const num = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
  if (isNaN(num)) return '0.00';
  if (num === 0) return '0.00';

  return Number.isFinite(num) ? plainNumber(num) : '0.00';
}

/**
 * formatPrice takma adı
 */
function formatPrice(rawPrice, symbol) {
  return formatCryptoPrice(rawPrice, symbol);
}

/**
 * Boost/Drop oranına göre önceki fiyatı (prevPrice) orijinal hassasiyeti koruyarak hesaplar.
 */
function computePrevPrice(priceNum, changePct, originalPriceOrSymbol) {
  if (!Number.isFinite(priceNum) || priceNum <= 0 || !Number.isFinite(changePct) || changePct <= -100) return null;
  if (changePct === 0) return formatCryptoPrice(priceNum, originalPriceOrSymbol);
  const computed = priceNum / (1 + changePct / 100);
  if (typeof originalPriceOrSymbol === 'string' && isNaN(Number(originalPriceOrSymbol))) {
    return formatCryptoPrice(computed, originalPriceOrSymbol);
  }
  return computed.toFixed(getDecimalPlaces(originalPriceOrSymbol || priceNum));
}

module.exports = {
  formatCryptoPrice,
  formatPrice,
  computePrevPrice,
  getDecimalPlaces
};
