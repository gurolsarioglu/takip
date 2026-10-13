/**
 * price-formatter.js — Tarayıcı Tarafı Hassas Fiyat Formatlayıcı
 * Kripto fiyatlarında 0.17890, 0.004890, 0.00001850 gibi hiçbir rakamı kesmez,
 * yapay yuvarlama yapmaz, ne geldiyse tam olarak o değeri korur.
 */
const PriceFormatter = (() => {
  function getDecimalPlaces(val) {
    if (val === null || val === undefined || val === '') return 2;
    const num = typeof val === 'number' ? val : Number(val);
    const abs = !isNaN(num) ? Math.abs(num) : 0;

    let minDecimals = 2;
    if (abs > 0) {
      if (abs < 0.0001) minDecimals = 8;       // PEPE, SHIB, BONK (0.00001850)
      else if (abs < 0.01) minDecimals = 6;    // 0.004890 gibi 6 basamaklılar
      else if (abs < 1) minDecimals = 5;       // 0.17890 gibi 5 basamaklılar
      else if (abs < 100) minDecimals = 4;     // 1.4520, 7.7640
      else minDecimals = 2;                    // 148.50, 2559.50, 83030.60
    }

    const str = String(val).trim();
    if (str.includes('.') && !str.includes('e') && !str.includes('E')) {
      const strDecimals = str.split('.')[1].length;
      return Math.max(strDecimals, minDecimals);
    }

    return minDecimals;
  }

  function format(val, precision = null) {
    if (val === null || val === undefined || val === '') return '—';

    // 1. Eğer açıkça bir precision belirtilmişse doğrudan o hassasiyete formatla
    if (precision !== null && typeof precision === 'number') {
      const n = typeof val === 'number' ? val : parseFloat(val);
      if (isNaN(n)) return '—';
      return n.toFixed(precision);
    }

    // 2. String olarak geldiyse (Binance orijinal API çıktısı), orijinal basamakları koru
    if (typeof val === 'string') {
      const str = val.trim();
      if (/^-?\d+(\.\d+)?$/.test(str) && !str.includes('e') && !str.includes('E')) {
        const num = parseFloat(str);
        const abs = Math.abs(num);
        const parts = str.split('.');
        const currentDecimals = parts.length === 2 ? parts[1].length : 0;

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

    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return '—';
    if (num === 0) return '0.00';

    // 3. Sayısal değer için dinamik hassasiyet
    const abs = Math.abs(num);
    let dec = 2;
    if (abs < 0.0001) dec = 8;
    else if (abs < 0.01) dec = 6;
    else if (abs < 1) dec = Math.max(5, getDecimalPlaces(val));
    else if (abs < 100) dec = Math.max(4, getDecimalPlaces(val));
    else dec = Math.max(2, getDecimalPlaces(val));

    return num.toFixed(dec);
  }

  return { format, getDecimalPlaces };
})();

if (typeof window !== 'undefined') {
  window.PriceFormatter = PriceFormatter;
}
