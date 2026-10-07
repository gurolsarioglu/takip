/**
 * price-formatter.js — Tarayıcı Tarafı Hassas Fiyat Formatlayıcı
 * 0.004890, 0.00001850 gibi mikro rakamların son basamaklarını asla kesmez.
 */
const PriceFormatter = (() => {
  function format(val) {
    if (val === null || val === undefined || val === '') return '—';

    // String ise doğrudan koru
    if (typeof val === 'string') {
      const str = val.trim();
      if (/^-?\d+(\.\d+)?$/.test(str) && !str.includes('e') && !str.includes('E')) {
        return str;
      }
    }

    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return '—';
    if (num === 0) return '0.00';

    const abs = Math.abs(num);
    if (abs >= 1000) return num.toFixed(2);
    if (abs >= 1) return num.toFixed(4);
    if (abs >= 0.01) return num.toFixed(5);
    if (abs >= 0.0001) return num.toFixed(6);      // 0.004890
    if (abs >= 0.000001) return num.toFixed(7);    // 0.0000185
    return num.toFixed(8);                         // PEPE, SHIB vb.
  }

  return { format };
})();

if (typeof window !== 'undefined') {
  window.PriceFormatter = PriceFormatter;
}
