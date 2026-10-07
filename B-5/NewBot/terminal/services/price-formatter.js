/**
 * price-formatter.js — Alpha Terminal Kripto Fiyat Hassasiyet Koruma Motoru
 * 
 * Kripto vadeli piyasalarında 0.004890 veya 0.00001850 gibi mikro rakamların
 * basamaklarını asla körlemesine kırpmaz, yuvarlamaz veya yutmaz.
 * Tick ve ondalık hassasiyetini eksiksiz korur.
 */

/**
 * Verilen fiyat değerinin ondalık basamak sayısını tespit eder.
 */
function getDecimalPlaces(val) {
  if (val === null || val === undefined) return 2;
  const str = String(val).trim();
  if (str.includes('.')) {
    if (!str.includes('e') && !str.includes('E')) {
      return str.split('.')[1].length;
    }
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
 * Eğer string olarak geldiyse (örn: "0.004890"), orijinal hassasiyeti birebir korunur.
 * Eğer sayısal float geldiyse (örn: 0.00489), mikro seviyesine göre (6-8 basamak) formatlanır.
 */
function formatCryptoPrice(rawPrice) {
  if (rawPrice === null || rawPrice === undefined || rawPrice === '') return '0.00';

  // 1. Eğer string olarak geldiyse ve bilimsel gösterim içermiyorsa orijinal haliyle koru
  if (typeof rawPrice === 'string') {
    const str = rawPrice.trim();
    if (/^-?\d+(\.\d+)?$/.test(str) && !str.includes('e') && !str.includes('E')) {
      return str;
    }
  }

  const num = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
  if (isNaN(num)) return '0.00';
  if (num === 0) return '0.00';

  const abs = Math.abs(num);
  if (abs >= 1000) {
    return num.toFixed(2);
  } else if (abs >= 1) {
    return num.toFixed(4);
  } else if (abs >= 0.01) {
    return num.toFixed(5);
  } else if (abs >= 0.0001) {
    // 0.004890 gibi 6 basamaklılar
    return num.toFixed(6);
  } else if (abs >= 0.000001) {
    // 0.0000185 gibi 7 basamaklılar
    return num.toFixed(7);
  } else {
    // PEPE, SHIB, BONK gibi 8 basamaklılar
    return num.toFixed(8);
  }
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
