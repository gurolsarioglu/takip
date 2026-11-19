'use strict';
// Gösterge kaydı ve grafik başına hesaplama oturumu.
// Tarayıcıda terminal.html yükler. Node testleri aynı dosyayı require ile çalıştırır.
(function () {
  function copyPanel(panel) {
    if (!panel) return null;
    const { label, colors, levels = [], range = 'auto' } = panel;
    const fixed = Array.isArray(range) && range.length === 2 && range.every(Number.isFinite) && range[0] < range[1];
    if (typeof label !== 'string' || !label || !Array.isArray(colors) || !colors.length || colors.length > 2 ||
        ![...colors].every(pair => Array.isArray(pair) && pair.length === 2 && [...pair].every(value => typeof value === 'string')) ||
        !Array.isArray(levels) || ![...levels].every(Number.isFinite) || (!fixed && range !== 'auto' && range !== 'symmetric')) {
      throw new TypeError('Geçersiz gösterge paneli');
    }
    return Object.freeze({
      label,
      title: panel.title || label,
      description: panel.description || '',
      enabled: panel.enabled === true,
      band: panel.band === true && levels.length >= 2,
      colors: Object.freeze(colors.map(pair => Object.freeze(pair.slice()))),
      levels: Object.freeze(levels.slice()),
      range: fixed ? Object.freeze(range.slice()) : range
    });
  }

  function isSeries(value, length) {
    return (Array.isArray(value) || ArrayBuffer.isView(value)) && value.length === length;
  }

  class IndicatorSession {
    #definitions;
    #candles = Object.freeze([]);
    #context = Object.freeze({ interval: null });
    #results = new Map();

    constructor(definitions) {
      this.#definitions = definitions;
    }

    setCandles(rows, interval) {
      // Her hesap aynı salt okunur mum verisini görür ve kendi sonucunu üretir.
      this.#candles = Object.freeze(rows.map(row => Object.freeze(row.slice())));
      this.#context = Object.freeze({ interval });
      this.#results.clear();
    }

    get(id) {
      if (this.#results.has(id)) return this.#results.get(id);
      const definition = this.#definitions.get(id);
      if (!definition) return null;
      let result;
      try {
        result = definition.calculate(this.#candles, this.#context);
        if (definition.panel) {
          const length = this.#candles.length;
          if (!Array.isArray(result?.series) || result.series.length !== definition.panel.colors.length ||
              ![...result.series].every(values => isSeries(values, length)) ||
              (result.marks != null && (!isSeries(result.marks, length) || result.series.length !== 2))) {
            result = null;
          } else {
            // Bir hesaplayıcı aynı tamponu kullansa bile sonuç yalnız bu grafiğe ait kalır.
            result = Object.freeze({
              series: Object.freeze(result.series.map(values => Object.freeze(Array.from(values)))),
              marks: result.marks == null ? null : Object.freeze(Array.from(result.marks))
            });
          }
        }
      } catch {
        result = null;
      }
      result ??= null;
      this.#results.set(id, result);
      return result;
    }
  }

  class IndicatorRegistry {
    #definitions = new Map();
    #reserved;

    constructor(reservedIds = []) {
      this.#reserved = new Set(reservedIds);
    }

    register({ id, calculate, panel }) {
      if (typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(id) || typeof calculate !== 'function') {
        throw new TypeError('Geçersiz gösterge tanımı');
      }
      if (this.#reserved.has(id) || this.#definitions.has(id)) throw new Error('Gösterge kimliği kullanımda: ' + id);
      this.#definitions.set(id, Object.freeze({ id, calculate, panel: copyPanel(panel) }));
    }

    panels() {
      return [...this.#definitions.values()].filter(definition => definition.panel);
    }

    createSession() {
      return new IndicatorSession(this.#definitions);
    }
  }

  const api = { IndicatorRegistry };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else globalThis.TerminalIndicatorEngine = api;
})();
