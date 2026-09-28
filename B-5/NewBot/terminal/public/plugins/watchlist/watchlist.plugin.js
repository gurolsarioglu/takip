/**
 * watchlist.plugin.js — Binance Vadeli 700+ Coin Canlı İzleme Listesi
 * Fiyat, %Değişim, Hacim (USD), Funding Rate (FR) ve FR Süresi.
 * Gerçek zamanlı WebSocket (!miniTicker@arr) ile anlık fiyat akışı & yeşil/kırmızı tick yanıp sönme (flash).
 */
const WatchlistPlugin = (() => {
  let allTickers = [];
  let currentFilter = 'all'; // 'all', 'gainers', 'volume'
  let searchQuery = '';
  let activeSymbol = 'BTWUSDT';
  let pollInterval = null;
  let tickerWs = null;
  let rowElementMap = new Map(); // symbol -> { row, priceCell, chgPill, lastPrice }
  let reconnectTimer = null;

  const COLOR_PALETTE = [
    '#3b82f6', '#06b6d4', '#10b981', '#8b5cf6', '#f59e0b',
    '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'
  ];

  function getCoinColor(symbol) {
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
  }

  function formatPrice(val) {
    if (isNaN(val)) return '—';
    if (val < 0.0001) return val.toFixed(7);
    if (val < 0.01) return val.toFixed(6);
    if (val < 1) return val.toFixed(4);
    if (val < 100) return val.toFixed(3);
    return val.toFixed(2);
  }

  function formatVolume(val) {
    if (isNaN(val) || val === 0) return '—';
    if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B';
    if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M';
    if (val >= 1e3) return (val / 1e3).toFixed(1) + 'K';
    return val.toFixed(0);
  }

  function formatFunding(val) {
    if (isNaN(val)) return '—';
    const pct = val * 100;
    return (pct >= 0 ? '+' : '') + pct.toFixed(4) + '%';
  }

  async function fetchWatchlist() {
    try {
      const res = await fetch('/api/watchlist');
      if (!res.ok) return;
      const data = await res.json();
      allTickers = data;
      renderTable();
      updateHeaderCount();
    } catch (e) {
      console.warn('[Watchlist] fetch error:', e);
    }
  }

  function updateHeaderCount() {
    const countEl = document.getElementById('wl-coin-count');
    if (countEl) countEl.textContent = allTickers.length || 732;
  }

  function renderTable() {
    const tbody = document.getElementById('wl-tbody');
    if (!tbody) return;

    let filtered = allTickers.slice();

    if (searchQuery) {
      const q = searchQuery.toUpperCase();
      filtered = filtered.filter(t => t.symbol.includes(q));
    }

    if (currentFilter === 'gainers') {
      filtered.sort((a, b) => b.chgPct - a.chgPct);
    } else if (currentFilter === 'volume') {
      filtered.sort((a, b) => b.volUsd - a.volUsd);
    }

    // İlk 80 tanesini render et (performans ve akıcılık için)
    const displayList = filtered.slice(0, 80);

    tbody.innerHTML = displayList.map(t => {
      const isUp = t.chgPct >= 0;
      const isActive = t.symbol === activeSymbol;
      const coinColor = getCoinColor(t.symbol);
      const shortName = t.symbol.replace('USDT', '');
      const initial = shortName.slice(0, 2);

      return `
        <tr class="wl-row ${isActive ? 'active' : ''}" data-symbol="${t.symbol}">
          <td>
            <div class="wl-symbol-cell">
              <div class="coin-icon-circle" style="background:${coinColor}">${initial}</div>
              <span class="wl-sym-text">${shortName}</span>
            </div>
          </td>
          <td class="wl-price-cell">${formatPrice(t.price)}</td>
          <td>
            <span class="wl-chg-pill ${isUp ? 'up' : 'down'}">
              ${isUp ? '+' : ''}${t.chgPct.toFixed(2)}%
            </span>
          </td>
          <td style="color:#94a3b8;">${formatVolume(t.volUsd)}</td>
          <td class="wl-fr-cell ${t.fr >= 0 ? 'up' : 'down'}">
            ${(t.fr * 100).toFixed(4)}% ${t.fr >= 0 ? '↗' : '↘'}
          </td>
          <td>
            <span class="wl-fr-badge">${t.frInterval || '8h'}</span>
          </td>
        </tr>
      `;
    }).join('');

    // Canlı WebSocket güncellemesi için görünen satırların DOM haritasını oluştur
    rowElementMap.clear();
    displayList.forEach(t => {
      const row = tbody.querySelector(`tr[data-symbol="${t.symbol}"]`);
      if (row) {
        rowElementMap.set(t.symbol, {
          row,
          priceCell: row.querySelector('.wl-price-cell'),
          chgPill: row.querySelector('.wl-chg-pill'),
          lastPrice: t.price
        });
      }
    });
  }

  // ─── Canlı Binance WebSocket Akışı (!miniTicker@arr) ───────────
  function connectTickerStream() {
    clearTimeout(reconnectTimer);
    if (tickerWs) {
      try {
        tickerWs.onclose = null;
        tickerWs.onerror = null;
        tickerWs.onmessage = null;
        tickerWs.close();
      } catch (e) {}
    }

    try {
      tickerWs = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
    } catch (e) {
      console.warn('[Watchlist WS] Bağlantı hatası:', e);
      reconnectTimer = setTimeout(connectTickerStream, 4000);
      return;
    }

    tickerWs.onopen = () => {
      console.log('[Watchlist WS] 🟢 Canlı !miniTicker@arr bağlandı. Gerçek zamanlı fiyat akışı devrede.');
    };

    tickerWs.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        if (!Array.isArray(raw)) return;

        raw.forEach(m => {
          if (!m.s || !m.s.endsWith('USDT')) return;

          const newPrice = parseFloat(m.c);
          const openPrice = parseFloat(m.o);
          if (isNaN(newPrice)) return;

          const chgPct = openPrice > 0 ? ((newPrice - openPrice) / openPrice) * 100 : 0;

          // 1. Tabloda görünür olan satırı anlık güncelle ve yeşil/kırmızı flash yak
          const entry = rowElementMap.get(m.s);
          if (entry && entry.priceCell) {
            const oldPrice = entry.lastPrice;
            if (newPrice !== oldPrice) {
              entry.priceCell.textContent = formatPrice(newPrice);
              const isUp = newPrice >= oldPrice;
              entry.priceCell.classList.remove('flash-up', 'flash-down');
              void entry.priceCell.offsetWidth; // DOM reflow tetikle
              entry.priceCell.classList.add(isUp ? 'flash-up' : 'flash-down');
              entry.lastPrice = newPrice;
            }

            if (entry.chgPill) {
              const isPositive = chgPct >= 0;
              entry.chgPill.textContent = `${isPositive ? '+' : ''}${chgPct.toFixed(2)}%`;
              entry.chgPill.className = `wl-chg-pill ${isPositive ? 'up' : 'down'}`;
            }
          }

          // 2. Eğer güncellenen coin şu an seçili olan coin ise Ticker Snapshot'ı da canlı besle
          if (m.s === activeSymbol) {
            const priceEl = document.getElementById('snap-price');
            const chgEl = document.getElementById('snap-chg');
            if (priceEl) {
              const oldSnapPrice = parseFloat(priceEl.dataset.price || 0);
              priceEl.textContent = formatPrice(newPrice);
              priceEl.dataset.price = newPrice;
              if (oldSnapPrice && newPrice !== oldSnapPrice) {
                priceEl.classList.remove('flash-up', 'flash-down');
                void priceEl.offsetWidth;
                priceEl.classList.add(newPrice >= oldSnapPrice ? 'flash-up' : 'flash-down');
              }
            }
            if (chgEl) {
              const isPositive = chgPct >= 0;
              chgEl.textContent = `${isPositive ? '+' : ''}${chgPct.toFixed(2)}%`;
              chgEl.className = `snapshot-chg-pill ${isPositive ? 'up' : 'down'}`;
            }
          }

          // 3. Bellekteki coin verisini güncelle
          const mem = allTickers.find(x => x.symbol === m.s);
          if (mem) {
            mem.price = newPrice;
            mem.chgPct = chgPct;
          }
        });
      } catch (err) {}
    };

    tickerWs.onerror = (e) => {
      console.warn('[Watchlist WS] Hata:', e.message);
    };

    tickerWs.onclose = () => {
      reconnectTimer = setTimeout(connectTickerStream, 3000);
    };
  }

  function setActiveSymbol(symbol) {
    activeSymbol = symbol.toUpperCase();
    renderTable();
    if (typeof MultiChartPlugin !== 'undefined') {
      MultiChartPlugin.loadSymbol(activeSymbol);
    }
    if (typeof TickerSnapshot !== 'undefined') {
      TickerSnapshot.updateSymbol(activeSymbol);
    }
    if (typeof WebSocketManager !== 'undefined') {
      WebSocketManager.switchTo(activeSymbol, '1m');
    }
  }

  function init() {
    const tableWrap = document.getElementById('watchlist-table-wrap');
    if (tableWrap) {
      tableWrap.addEventListener('click', (e) => {
        const row = e.target.closest('.wl-row');
        if (!row) return;
        const sym = row.dataset.symbol;
        if (sym) setActiveSymbol(sym);
      });
    }

    // Filtre sekmeleri
    document.querySelectorAll('.wl-filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.wl-filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter || 'all';
        renderTable();
      });
    });

    fetchWatchlist();
    connectTickerStream();
    pollInterval = setInterval(fetchWatchlist, 6000);
  }

  return {
    init,
    setActiveSymbol,
    getActiveSymbol: () => activeSymbol,
    search: (q) => { searchQuery = q; renderTable(); }
  };
})();
