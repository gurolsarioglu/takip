/**
 * price-formatter.js — Alpha Terminal Kripto Fiyat Hassasiyet Koruma Motoru (Backend)
 * 
 * Kripto vadeli piyasalarında 0.17890, 0.004890 veya 0.00001850 gibi mikro rakamların
 * basamaklarını asla körlemesine kırpmaz, yuvarlamaz veya yutmaz.
 * Tick ve ondalık hassasiyetini eksiksiz korur.
 */

/**
 * Verilen fiyat değerinin gerçek ondalık basamak sayısını tespit eder.
 * String olarak geldiyse orijinal basamakları sayar.
 * Sayısal float geldiyse (JS float trailing zeros saklamadığından),
 * coinin mutlak değer büyüklüğüne göre kripto piyasası tick standardı alt sınırını garanti eder.
 */
function getDecimalPlaces(val) {
  if (val === null || val === undefined || val === '') return 2;

  const num = typeof val === 'number' ? val : Number(val);
  const abs = !isNaN(num) ? Math.abs(num) : 0;

  // Büyüklüğe göre kripto piyasası tick standardı alt sınırı:
  let minDecimals = 2;
  if (abs > 0) {
    if (abs < 0.0001) minDecimals = 8;       // PEPE, SHIB, BONK (0.00001850, 0.00000780)
    else if (abs < 0.01) minDecimals = 6;    // 0.004890 gibi 6 basamaklılar
    else if (abs < 1) minDecimals = 5;       // 0.17890 gibi 5 basamaklılar
    else if (abs < 100) minDecimals = 4;     // 1.4520, 7.7640
    else minDecimals = 2;                    // 148.50, 2559.50, 83030.60
  }

  // String olarak geldiyse orijinal basamak sayısını tespit et
  const str = String(val).trim();
  if (str.includes('.') && !str.includes('e') && !str.includes('E')) {
    const strDecimals = str.split('.')[1].length;
    // Eğer string daha hassas ise (örn "0.004890" -> 6), string'i koru;
    // Eğer float dönüşümünden geldiyse veya az basamaklıysa, minDecimals ile genişlet
    return Math.max(strDecimals, minDecimals);
  }

  return minDecimals;
}

/**
 * Fiyatı tick hassasiyetini koruyarak güvenle formatlar.
 * Eğer string olarak geldiyse (örn: "0.17890", "0.004890"), orijinal hassasiyeti birebir korunur.
 * Eğer sayısal float geldiyse (örn: 0.00489), büyüklüğüne göre eksik basamaklar tamamlanır (0.004890).
 */
function formatCryptoPrice(rawPrice, precision = null) {
  if (rawPrice === null || rawPrice === undefined || rawPrice === '') return '0.00';

  // 1. Eğer açıkça bir precision belirtilmişse doğrudan o hassasiyete formatla
  if (precision !== null && typeof precision === 'number') {
    const n = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
    if (isNaN(n)) return '0.00';
    return n.toFixed(precision);
  }

  // 2. String olarak geldiyse ve bilimsel gösterim içermiyorsa orijinal haliyle koru (ASLA KESME)
  if (typeof rawPrice === 'string') {
    const str = rawPrice.trim();
    if (/^-?\d+(\.\d+)?$/.test(str) && !str.includes('e') && !str.includes('E')) {
      const num = parseFloat(str);
      const abs = Math.abs(num);
      const parts = str.split('.');
      const currentDecimals = parts.length === 2 ? parts[1].length : 0;

      // Büyüklüğe göre minimum basamak kontrolü (örn. "0.00489" eksik string gelmişse "0.004890" yap)
      let minDec = 2;
      if (abs < 0.0001) minDec = 8;
      else if (abs < 0.01) minDec = 6;
      else if (abs < 1) minDec = Math.max(4, currentDecimals);
      else minDec = 2;

      if (currentDecimals >= minDec) {
        return str;
      }
      return num.toFixed(Math.max(currentDecimals, minDec));
    }
  }

  // 3. Sayısal float ise büyüklüğüne göre basamakları koru
  const num = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
  if (isNaN(num)) return '0.00';
  if (num === 0) return '0.00';

  const abs = Math.abs(num);
  let dec = 2;
  if (abs < 0.0001) dec = 8;
  else if (abs < 0.01) dec = 6;
  else if (abs < 1) dec = Math.max(5, getDecimalPlaces(rawPrice));
  else if (abs < 100) dec = Math.max(4, getDecimalPlaces(rawPrice));
  else dec = Math.max(2, getDecimalPlaces(rawPrice));

  return num.toFixed(dec);
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
