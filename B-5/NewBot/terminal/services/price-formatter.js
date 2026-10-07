/**
 * price-formatter.js — Alpha Terminal Kripto Fiyat Hassasiyet Koruma Motoru (Backend)
 * 
 * Kripto vadeli piyasalarında 0.17890, 0.004890 veya 0.00001850 gibi mikro rakamların
 * basamaklarını asla körlemesine kırpmaz, yuvarlamaz veya yutmaz.
 * Tick ve ondalık hassasiyetini eksiksiz korur.
 */

/**
 * Verilen fiyat değerinin ondalık basamak sayısını tespit eder.
 */
function getDecimalPlaces(val) {
  if (val === null || val === undefined) return 2;
  const str = String(val).trim();
  if (str.includes('.') && !str.includes('e') && !str.includes('E')) {
    return str.split('.')[1].length;
  }
  const num = Number(val);
  if (isNaN(num) || num === 0) return 2;
  const abs = Math.abs(num);
  if (abs >= 1000) return 2;
  if (abs >= 1) return 4;
  if (abs >= 0.01) return 5;
  if (abs >= 0.0001) return 6;
  if (abs >= 0.000001) return 7;
  return 8;
}

/**
 * Fiyatı tick hassasiyetini koruyarak güvenle formatlar.
 * Eğer string olarak geldiyse (örn: "0.17890", "0.004890"), orijinal hassasiyeti birebir korunur.
 * Eğer sayısal float geldiyse (örn: 0.1789), basamakları kesilmeden korunur.
 */
function formatCryptoPrice(rawPrice, precision = null) {
  if (rawPrice === null || rawPrice === undefined || rawPrice === '') return '0.00';

  // 1. Eğer string olarak geldiyse ve bilimsel gösterim içermiyorsa orijinal haliyle koru (ASLA KESME)
  if (typeof rawPrice === 'string') {
    const str = rawPrice.trim();
    if (/^-?\d+(\.\d+)?$/.test(str) && !str.includes('e') && !str.includes('E')) {
      if (precision !== null && typeof precision === 'number') {
        const parts = str.split('.');
        if (parts.length === 2 && parts[1].length < precision) {
          return str + '0'.repeat(precision - parts[1].length);
        }
      }
      return str;
    }
  }

  const num = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
  if (isNaN(num)) return '0.00';
  if (num === 0) return '0.00';

  if (precision !== null && typeof precision === 'number') {
    return num.toFixed(precision);
  }

  // 2. Sayısal float ise string basamaklarını koru
  const strVal = String(num);
  if (strVal.includes('.') && !strVal.includes('e') && !strVal.includes('E')) {
    const decimals = strVal.split('.')[1].length;
    const abs = Math.abs(num);
    if (abs < 0.0001) return num.toFixed(Math.max(decimals, 8));
    if (abs < 0.01) return num.toFixed(Math.max(decimals, 6)); // 0.004890
    return strVal;
  }

  return num.toFixed(2);
}

/**
 * Boost/Drop oranına göre önceki fiyatı (prevPrice) orijinal hassasiyeti koruyarak hesaplar.
 */
function computePrevPrice(priceNum, changePct, originalPriceStr) {
  if (!priceNum || isNaN(priceNum) || !changePct || isNaN(changePct)) {
    return originalPriceStr ? String(originalPriceStr) : '0.00';
  }

  const computed = priceNum / (1 + changePct / 100);
  const decimals = getDecimalPlaces(originalPriceStr || priceNum);
  const safeDecimals = Math.min(8, Math.max(2, decimals));

  return computed.toFixed(safeDecimals);
}

module.exports = {
  formatCryptoPrice,
  computePrevPrice,
  getDecimalPlaces
};
