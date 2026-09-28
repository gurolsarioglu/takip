/**
 * watchlist.plugin.js — Binance Vadeli 700+ Coin Canlı İzleme Listesi
 * Fiyat, %Değişim, Hacim (USD), Funding Rate (FR) ve FR Süresi.
 */
const WatchlistPlugin = (() => {
  let allTickers = [];
  let currentFilter = 'all'; // 'all', 'gainers', 'volume'
  let searchQuery = '';
  let activeSymbol = 'BTWUSDT';
  let pollInterval = null;

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
      allTickers = await res.json();
      renderTable();
      updateHeaderCount();
    } catch (e) {
      console.warn('[Watchlist] fetch error:', e);
    }
  }

  function updateHeaderCount() {
    const countEl = document.getElementById('wl-coin-count');
    if (countEl) countEl.textContent = allTickers.length || 731;
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
    pollInterval = setInterval(fetchWatchlist, 4000);
  }

  return {
    init,
    setActiveSymbol,
    getActiveSymbol: () => activeSymbol,
    search: (q) => { searchQuery = q; renderTable(); }
  };
})();
