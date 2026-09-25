/**
 * ChartPlugin — TradingView Lightweight Charts (Binance Native Feel)
 *
 * 60 FPS Canvas/WebGL, anlık WebSocket tek-tick akışı, ultra akıcı mousewheel zoom & drag pan,
 * Binance renk paleti ve canlı taktik seviye çizgileri (TETİK, HEDEF, STOP).
 */
const ChartPlugin = (() => {
  let chart        = null;
  let candleSeries = null;
  let volumeSeries = null;
  let ema20Series  = null;
  let ema50Series  = null;

  let currentSymbol   = '';
  let currentInterval = '15m';
  let klineData       = []; // { time, open, high, low, close, volume }

  const priceLines = {
    trigger: null,
    target:  null,
    stop:    null,
  };

  const indicators = {
    EMA20: true,
    EMA50: true,
  };

  // ─── Lightweight Charts Başlat ────────────────────────────────
  function init(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Önceki içerikleri temizle
    container.innerHTML = '';

    chart = LightweightCharts.createChart(container, {
      width:  container.clientWidth  || 800,
      height: container.clientHeight || 450,
      layout: {
        background: { type: 'solid', color: '#0b0e11' },
        textColor: '#848e9c',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', 'Inter', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.25)',
          width: 1,
          style: LightweightCharts.LineStyle.Dashed,
          labelBackgroundColor: '#1e2329',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.25)',
          width: 1,
          style: LightweightCharts.LineStyle.Dashed,
          labelBackgroundColor: '#1e2329',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        scaleMargins: {
          top: 0.06,
          bottom: 0.18, // Alttaki hacim histogramı için ferah alan
        },
        autoScale: true,
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 9,
        minBarSpacing: 3,
        rightOffset: 12,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    // 1. Candlestick Serisi (Binance Canlı Renkleri)
    candleSeries = chart.addCandlestickSeries({
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderUpColor: '#0ecb81',
      borderDownColor: '#f6465d',
      wickUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    });

    // 2. Volume Histogram Serisi (En altta yarı şeffaf Binance stili)
    volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Ayrı görünmez overlay ekseni
      scaleMargins: {
        top: 0.82,
        bottom: 0,
      },
    });

    // 3. EMA20 Serisi (Altın Sarısı)
    ema20Series = chart.addLineSeries({
      color: '#f0b90b',
      lineWidth: 1.5,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      visible: indicators.EMA20,
    });

    // 4. EMA50 Serisi (Mavi)
    ema50Series = chart.addLineSeries({
      color: '#1890ff',
      lineWidth: 1.5,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      visible: indicators.EMA50,
    });

    // Otomatik Yeniden Boyutlandırma (ResizeObserver)
    const ro = new ResizeObserver(entries => {
      if (!entries || !entries.length) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chart.applyOptions({ width, height });
      }
    });
    ro.observe(container);

    _setupCrosshairLegend();
    _bindIndicatorToggles();
    _listenEvents();
  }

  // ─── Crosshair Legend (O: H: L: C: Takipçisi) ─────────────────
  function _setupCrosshairLegend() {
    chart.subscribeCrosshairMove(param => {
      if (!param || !param.time || !param.seriesData || !param.seriesData.get(candleSeries)) {
        _updateLegendLast();
        return;
      }
      const data = param.seriesData.get(candleSeries);
      if (data) {
        _renderLegend(data);
      }
    });
  }

  function _updateLegendLast() {
    if (!klineData.length) return;
    const last = klineData[klineData.length - 1];
    _renderLegend(last);
  }

  function _renderLegend(c) {
    const legendEl = document.getElementById('chart-ohlc-legend');
    if (!legendEl || !c) return;
    const isUp = c.close >= c.open;
    const colorClass = isUp ? 'up' : 'down';
    const fmt = v => v < 1 ? v.toFixed(4) : v < 100 ? v.toFixed(3) : v.toFixed(2);

    legendEl.innerHTML = `
      <span>O: <span class="val ${colorClass}">${fmt(c.open)}</span></span>
      <span>H: <span class="val ${colorClass}">${fmt(c.high)}</span></span>
      <span>L: <span class="val ${colorClass}">${fmt(c.low)}</span></span>
      <span>C: <span class="val ${colorClass}">${fmt(c.close)}</span></span>
    `;
  }

  // ─── İndikatör Toggle Butonları ──────────────────────────────
  function _bindIndicatorToggles() {
    document.querySelectorAll('.ind-toggle').forEach(el => {
      const name = el.dataset.ind;
      const chk  = el.querySelector('input');
      if (!chk) return;

      el.addEventListener('click', (e) => {
        if (e.target !== chk) chk.checked = !chk.checked;
        const active = chk.checked;
        el.classList.toggle('active', active);
        indicators[name] = active;

        if (name === 'EMA20' && ema20Series) ema20Series.applyOptions({ visible: active });
        if (name === 'EMA50' && ema50Series) ema50Series.applyOptions({ visible: active });
      });
    });
  }

  let chartGen = 0;

  // ─── EventBus Bağlantıları ───────────────────────────────────
  function _listenEvents() {
    EventBus.on('coin:change', ({ symbol, interval }) => {
      currentSymbol   = symbol;
      currentInterval = interval || currentInterval;
      _clearTacticalLines();
      loadKlines();
    });

    EventBus.on('interval:change', (interval) => {
      currentInterval = interval;
      if (currentSymbol) loadKlines();
    });

    EventBus.on('tactical:levels', (levels) => {
      _setTacticalLevels(levels || {});
    });

    // WebSocket'ten gelen canlı kline (0ms gecikme ile doğrudan series.update)
    EventBus.on('ws:kline', ({ symbol, kline }) => {
      if (symbol.toUpperCase() !== currentSymbol) return;
      if (!candleSeries || !volumeSeries) return;

      const timeSec = Math.floor(kline.openTime / 1000);
      const bar = {
        time:  timeSec,
        open:  kline.open,
        high:  kline.high,
        low:   kline.low,
        close: kline.close,
      };

      // Canlı mum güncellemesi (Binance hissi)
      candleSeries.update(bar);

      // Canlı hacim çubuğu güncellemesi
      volumeSeries.update({
        time:  timeSec,
        value: kline.volume,
        color: kline.close >= kline.open ? 'rgba(14,203,129,0.35)' : 'rgba(246,70,93,0.35)',
      });

      // Bellek güncellemesi
      const last = klineData[klineData.length - 1];
      if (last && last.time === timeSec) {
        last.high   = Math.max(last.high, kline.high);
        last.low    = Math.min(last.low, kline.low);
        last.close  = kline.close;
        last.volume = kline.volume;
      } else if (!last || timeSec > last.time) {
        klineData.push({ ...bar, volume: kline.volume });
      }

      // Canlı EMA güncellemesi (Mum her güncellendiğinde EMA noktaları da anlık ilerler)
      if (ema20Series) {
        const pt20 = _calcLastEMAPoint(klineData, 20);
        if (pt20) ema20Series.update(pt20);
      }
      if (ema50Series) {
        const pt50 = _calcLastEMAPoint(klineData, 50);
        if (pt50) ema50Series.update(pt50);
      }

      _renderLegend(bar);
    });
  }

  // ─── Kline Yükleme ───────────────────────────────────────────
  async function loadKlines() {
    if (!currentSymbol || !candleSeries) return;
    const myGen = ++chartGen;
    const targetSymbol = currentSymbol;
    const targetInterval = currentInterval;

    try {
      const raw = await BinanceAPI.getKlines(targetSymbol, targetInterval, 500);
      if (myGen !== chartGen || currentSymbol !== targetSymbol || currentInterval !== targetInterval) return;

      const map = new Map();

      raw.forEach(k => {
        const time = Math.floor(k[0] / 1000);
        map.set(time, {
          time,
          open:   parseFloat(k[1]),
          high:   parseFloat(k[2]),
          low:    parseFloat(k[3]),
          close:  parseFloat(k[4]),
          volume: parseFloat(k[5]),
        });
      });

      klineData = Array.from(map.values()).sort((a, b) => a.time - b.time);

      // Fiyat hassasiyetini belirle
      if (klineData.length > 0) {
        const samplePrice = klineData[klineData.length - 1].close;
        const precision = samplePrice < 0.001 ? 6 : samplePrice < 1 ? 4 : samplePrice < 100 ? 3 : 2;
        const minMove   = samplePrice < 0.001 ? 0.000001 : samplePrice < 1 ? 0.0001 : samplePrice < 100 ? 0.001 : 0.01;
        candleSeries.applyOptions({
          priceFormat: { type: 'price', precision, minMove }
        });
      }

      // 1. Candlestick verisi
      candleSeries.setData(klineData);

      // 2. Volume verisi
      const volumes = klineData.map(k => ({
        time:  k.time,
        value: k.volume,
        color: k.close >= k.open ? 'rgba(14,203,129,0.35)' : 'rgba(246,70,93,0.35)',
      }));
      volumeSeries.setData(volumes);

      // 3. EMA20 & EMA50 verisi
      ema20Series.setData(_calcEMAData(klineData, 20));
      ema50Series.setData(_calcEMAData(klineData, 50));

      // Grafiği sığdır
      chart.timeScale().fitContent();
      _updateLegendLast();

      // Verdict motoruna kline verisini ilet (otomatik seviye tespiti için)
      EventBus.emit('chart:klines', {
        symbol: currentSymbol,
        klines: klineData.map(k => ({
          openTime: k.time * 1000,
          open:     k.open,
          high:     k.high,
          low:      k.low,
          close:    k.close,
          volume:   k.volume,
        })),
      });

      // Taktik seviyeleri (Giriş, Tetik, Hedef, Stop) anında çiz
      _setTacticalLevels(savedLevels);

    } catch (err) {
      if (myGen !== chartGen || currentSymbol !== targetSymbol) return;
      console.error('[ChartPlugin] Kline yükleme hatası:', err);
      if (candleSeries) candleSeries.setData([]);
      if (volumeSeries) volumeSeries.setData([]);
      if (ema20Series)  ema20Series.setData([]);
      if (ema50Series)  ema50Series.setData([]);
    }
  }

  // ─── EMA Hesaplama ───────────────────────────────────────────
  function _calcEMAData(candles, period) {
    if (candles.length < period) return [];
    const k = 2 / (period + 1);
    let ema = null;
    const result = [];

    for (let i = 0; i < candles.length; i++) {
      const price = candles[i].close;
      if (ema === null) {
        if (i + 1 >= period) {
          ema = candles.slice(0, i + 1).reduce((sum, item) => sum + item.close, 0) / period;
          result.push({ time: candles[i].time, value: ema });
        }
      } else {
        ema = price * k + ema * (1 - k);
        result.push({ time: candles[i].time, value: ema });
      }
    }
    return result;
  }

  function _calcLastEMAPoint(candles, period) {
    if (!candles || candles.length < period) return null;
    const k = 2 / (period + 1);
    let ema = null;
    for (let i = 0; i < candles.length; i++) {
      const price = candles[i].close;
      if (ema === null) {
        if (i + 1 >= period) {
          ema = candles.slice(0, i + 1).reduce((sum, item) => sum + item.close, 0) / period;
        }
      } else {
        ema = price * k + ema * (1 - k);
      }
    }
    return ema !== null ? { time: candles[candles.length - 1].time, value: ema } : null;
  }

  // ─── Taktik Seviye Çizgileri (Price Lines) ───────────────────
  let savedLevels = {};

  function _clearTacticalLines() {
    if (!candleSeries) return;
    if (priceLines.trigger) { try { candleSeries.removePriceLine(priceLines.trigger); } catch(e){} priceLines.trigger = null; }
    if (priceLines.target)  { try { candleSeries.removePriceLine(priceLines.target);  } catch(e){} priceLines.target  = null; }
    if (priceLines.stop)    { try { candleSeries.removePriceLine(priceLines.stop);    } catch(e){} priceLines.stop    = null; }
    if (priceLines.entry)   { try { candleSeries.removePriceLine(priceLines.entry);   } catch(e){} priceLines.entry   = null; }
    savedLevels = (currentSymbol === 'SYNUSDT') ? { entry: 0.21948, trigger: 0.2250, target: 0.26100, stop: 0.2120 } : {};
  }

  function _setTacticalLevels(levels) {
    if (!candleSeries) return;
    savedLevels = { ...savedLevels, ...(levels || {}) };

    if (!savedLevels.entry) {
      const eVal = parseFloat(document.getElementById('btb-entry-input')?.value);
      if (!isNaN(eVal) && eVal > 0) savedLevels.entry = eVal;
    }

    _clearTacticalLines();

    if (savedLevels.entry) {
      priceLines.entry = candleSeries.createPriceLine({
        price: savedLevels.entry,
        color: '#1890ff',
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: '🔵 GİRİŞİM',
      });
    }

    if (savedLevels.trigger) {
      priceLines.trigger = candleSeries.createPriceLine({
        price: savedLevels.trigger,
        color: '#0ecb81',
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: '🎯 TETİK',
      });
    }

    if (savedLevels.target) {
      priceLines.target = candleSeries.createPriceLine({
        price: savedLevels.target,
        color: '#f0b90b',
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: '🏆 HEDEF',
      });
    }

    if (savedLevels.stop) {
      priceLines.stop = candleSeries.createPriceLine({
        price: savedLevels.stop,
        color: '#f6465d',
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: '🛑 STOP',
      });
    }
  }

  return { init, loadKlines, setTacticalLevels: _setTacticalLevels };
})();
