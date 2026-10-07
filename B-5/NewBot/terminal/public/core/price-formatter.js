/**
 * price-formatter.js — Tarayıcı Tarafı Hassas Fiyat Formatlayıcı
 * Kripto fiyatlarında 0.17890, 0.004890, 0.00001850 gibi hiçbir rakamı kesmez,
 * yapay yuvarlama yapmaz, ne geldiyse tam olarak o değeri korur.
 */
const PriceFormatter = (() => {
  function format(val, precision = null) {
    if (val === null || val === undefined || val === '') return '—';

    // 1. String olarak geldiyse (Binance orijinal API çıktısı), ASLA değiştirme ve basamak kesme
    if (typeof val === 'string') {
      const str = val.trim();
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

    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return '—';
    if (num === 0) return '0.00';

    if (precision !== null && typeof precision === 'number') {
      return num.toFixed(precision);
    }

    // 2. Sayısal değer için string dönüşümüne bak ve mevcut basamakları koru
    const strVal = String(num);
    if (strVal.includes('.') && !strVal.includes('e') && !strVal.includes('E')) {
      const decimals = strVal.split('.')[1].length;
      const abs = Math.abs(num);
      if (abs < 0.0001) {
        return num.toFixed(Math.max(decimals, 8));
      }
      if (abs < 0.01) {
        return num.toFixed(Math.max(decimals, 6)); // 0.004890 mikro seviyesi
      }
      return strVal;
    }

    // Tam sayı ise varsayılan 2 basamak
    return num.toFixed(2);
  }

  return { format };
})();

if (typeof window !== 'undefined') {
  window.PriceFormatter = PriceFormatter;
}
