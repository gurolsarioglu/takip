// Watchlist Logic
// Fetches the coins, handles REST polling, and updates UI

let wlCoins = [];
let wlData = {}; // Format: { BTCUSDT: { price, fr, frH, chg, vol, longShortRatio, openInterest } }
let selectedWlCoin = null;

// Sorting state
let currentSortCol = '';
let sortDesc = true; 

async function initWatchlist() {
    setupWatchlistModal();
    pollWatchlistData();
    setInterval(pollWatchlistData, 5000); // Poll every 5 seconds
}

function setupWatchlistModal() {
    const btnOpen = document.getElementById('btn-open-watchlist');
    const btnClose = document.getElementById('btn-close-watchlist');
    const modal = document.getElementById('watchlist-modal');
    
    if (btnOpen) btnOpen.onclick = () => modal.classList.add('active');
    if (btnClose) btnClose.onclick = () => modal.classList.remove('active');
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
}

async function pollWatchlistData() {
    try {
        const res = await fetch('http://localhost:3000/api/watchlist/data');
        const data = await res.json();
        
        if (data.success && data.data) {
            const isFirstLoad = wlCoins.length === 0;
            
            // Merge new data
            for (const [coin, metrics] of Object.entries(data.data)) {
                if (!wlData[coin]) {
                    wlData[coin] = { ...metrics, longShortRatio: '-', openInterest: '-' };
                } else {
                    wlData[coin] = { ...wlData[coin], ...metrics };
                }
            }

            const newCoins = Object.keys(data.data);
            
            if (isFirstLoad || wlCoins.length !== newCoins.length) {
                wlCoins = newCoins;
                sortAndRenderTable();
                
                // Fetch extra metrics (L/S, OI) slowly in the background for new coins
                fetchRestMetrics();
            } else {
                if (currentSortCol) {
                    sortAndRenderTable(); // Maintain sort order dynamically
                } else {
                    wlCoins.forEach(coin => updateWlRow(coin));
                }
            }
            
            if (selectedWlCoin) {
                renderFocusCard();
            }
        }
    } catch (e) {
        console.error("Watchlist poll error:", e);
    }
}

function sortWatchlist(col) {
    if (currentSortCol === col) {
        sortDesc = !sortDesc; // toggle direction
    } else {
        currentSortCol = col;
        sortDesc = true; // default descending on new col
    }
    updateSortIndicators();
    sortAndRenderTable();
}

function updateSortIndicators() {
    const cols = ['symbol', 'price', 'fr', 'frH', 'chg', 'vol'];
    cols.forEach(c => {
        const el = document.getElementById(`sort-ind-${c}`);
        if (el) {
            if (c === currentSortCol) {
                el.innerHTML = sortDesc ? ' <i class="fa-solid fa-sort-down"></i>' : ' <i class="fa-solid fa-sort-up"></i>';
            } else {
                el.innerHTML = '';
            }
        }
    });
}

function parseVol(v) {
    if (!v || v === '-') return 0;
    if (v.endsWith('M')) return parseFloat(v) * 1000000;
    if (v.endsWith('K')) return parseFloat(v) * 1000;
    return parseFloat(v);
}

function sortAndRenderTable() {
    if (currentSortCol) {
        wlCoins.sort((a, b) => {
            const dataA = wlData[a];
            const dataB = wlData[b];
            
            let valA, valB;
            switch(currentSortCol) {
                case 'symbol':
                    valA = a; valB = b;
                    break;
                case 'price':
                    valA = parseFloat(dataA.price) || 0;
                    valB = parseFloat(dataB.price) || 0;
                    break;
                case 'fr':
                    valA = parseFloat(dataA.fr) || 0;
                    valB = parseFloat(dataB.fr) || 0;
                    break;
                case 'frH':
                    valA = dataA.frH || '';
                    valB = dataB.frH || '';
                    break;
                case 'chg':
                    valA = parseFloat(dataA.chg) || 0;
                    valB = parseFloat(dataB.chg) || 0;
                    break;
                case 'vol':
                    valA = parseVol(dataA.vol);
                    valB = parseVol(dataB.vol);
                    break;
            }
            
            if (valA < valB) return sortDesc ? 1 : -1;
            if (valA > valB) return sortDesc ? -1 : 1;
            return 0;
        });
    }
    renderWatchlistTable();
}

function renderWatchlistTable() {
    const tbody = document.getElementById('watchlist-body');
    if (!tbody) return;
    
    let html = '';
    wlCoins.forEach(coin => {
        const pd = wlData[coin];
        const isPos = parseFloat(pd.chg) >= 0;
        const colorClass = isPos ? 'text-green' : 'text-red';
        const bgClass = pd.chg !== '-' ? (isPos ? 'bg-green' : 'bg-red') : '';
        const symbolFormat = coin.replace('USDT', '');
        
        html += `<tr class="wl-row ${bgClass} ${selectedWlCoin === coin ? 'selected' : ''}" onclick="selectWlCoin('${coin}')" data-coin="${coin}">
            <td style="font-weight: 500;">
                <img src="https://raw.githubusercontent.com/Pymmdrza/Cryptocurrency_Logos/main/PNG/${symbolFormat.toLowerCase()}.png" 
                     onerror="this.style.display='none'" style="width:16px; height:16px; vertical-align:middle; border-radius:50%; margin-right:5px;">
                ${symbolFormat}
            </td>
            <td style="font-family: 'JetBrains Mono';" id="wl-p-${coin}">${pd.price}</td>
            <td class="${parseFloat(pd.fr) > 0 ? 'text-green' : 'text-red'}" id="wl-fr-${coin}">${pd.fr}</td>
            <td id="wl-frh-${coin}">${pd.frH}</td>
            <td class="${colorClass}" id="wl-chg-${coin}" style="text-align: right;">${isPos ? '+' : ''}${pd.chg}%</td>
            <td id="wl-vol-${coin}" style="text-align: right;">${pd.vol}</td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
}

function updateWlRow(symbol) {
    const pd = wlData[symbol];
    if (!pd) return;
    
    const pEl = document.getElementById(`wl-p-${symbol}`);
    const cEl = document.getElementById(`wl-chg-${symbol}`);
    const vEl = document.getElementById(`wl-vol-${symbol}`);
    const frEl = document.getElementById(`wl-fr-${symbol}`);
    const frhEl = document.getElementById(`wl-frh-${symbol}`);
    
    if(pEl) pEl.innerText = pd.price;
    if(cEl) {
        const isPos = parseFloat(pd.chg) >= 0;
        cEl.innerText = `${isPos ? '+' : ''}${pd.chg}%`;
        cEl.className = isPos ? 'text-green' : 'text-red';
        
        const row = pEl.closest('tr');
        if (row) {
            row.classList.remove('bg-green', 'bg-red');
            row.classList.add(isPos ? 'bg-green' : 'bg-red');
        }
    }
    if(vEl) vEl.innerText = pd.vol;
    if(frEl) {
        frEl.innerText = pd.fr;
        frEl.className = parseFloat(pd.fr) > 0 ? 'text-green' : 'text-red';
    }
    if(frhEl) frhEl.innerText = pd.frH;
}

function selectWlCoin(coin) {
    selectedWlCoin = coin;
    
    // Update active row visual
    document.querySelectorAll('.wl-row').forEach(row => {
        if (row.dataset.coin === coin) row.classList.add('selected');
        else row.classList.remove('selected');
    });
    
    renderFocusCard();
}

function renderFocusCard() {
    const focusDiv = document.getElementById('watchlist-focus');
    if (!focusDiv || !selectedWlCoin) return;
    
    const pd = wlData[selectedWlCoin];
    const isPosChg = parseFloat(pd.chg) >= 0;
    const isPosFr = parseFloat(pd.fr) > 0;
    
    // L/S Logic
    let lPct = 50, sPct = 50;
    let lsHtml = `<div style="text-align:center; opacity:0.5; font-size: 0.9em; margin: 15px 0;">Binance Verisi Bekleniyor...</div>`;
    
    if (pd.longShortRatio && pd.longShortRatio !== '-') {
        const lsCalc = parseFloat(pd.longShortRatio);
        lPct = (lsCalc / (1 + lsCalc)) * 100;
        sPct = 100 - lPct;
        
        lsHtml = `
        <div style="display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; font-weight: bold; margin-top: 15px;">
            <span style="color: #10b981;">L ${lPct.toFixed(2)}%</span>
            <span style="color: #ef4444;">${sPct.toFixed(2)}% S</span>
        </div>
        <div class="ls-bar-container">
            <div class="ls-bar-long" style="width: ${lPct}%"></div>
            <div class="ls-bar-short" style="width: ${sPct}%"></div>
        </div>
        `;
    }

    const oiText = pd.openInterest && pd.openInterest !== '-' ? parseFloat(pd.openInterest).toLocaleString(undefined, { maximumFractionDigits: 1 }) : 'Bekleniyor...';
    
    focusDiv.style.display = 'block';
    focusDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                <a href="https://www.binance.com/en/futures/${selectedWlCoin}" target="_blank" style="text-decoration:none; color:var(--text-secondary); font-size: 0.8rem; display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${selectedWlCoin}</a>
                <div style="font-size: 2.5rem; font-weight: bold; color: ${isPosChg ? '#10b981' : '#ef4444'}; font-family: 'JetBrains Mono', monospace; margin: 10px 0;">
                    ${pd.price}
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 0.9rem; opacity: 0.7; margin-bottom: 5px;">Funding (${pd.frH})</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: ${isPosFr ? '#10b981' : '#ef4444'}; font-family: 'JetBrains Mono', monospace;">
                    ${pd.fr !== '-' ? pd.fr + '%' : '...'}
                </div>
            </div>
        </div>
        
        ${lsHtml}
        
        <div style="display: flex; align-items: center; margin-top: 15px; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">
            <div style="color: #60a5fa; flex: 1;">
                OI: ${oiText} ↗
            </div>
            <div style="opacity: 0.6; text-align: right; flex: 1;">
                Vol: ${pd.vol}
            </div>
        </div>
    `;
}

async function fetchRestMetrics() {
    for (const coin of wlCoins) {
        try {
            const res = await fetch(`http://localhost:3000/api/watchlist/${coin}/metrics`);
            const data = await res.json();
            if (data.success && data.data) {
                if (wlData[coin]) {
                    wlData[coin].longShortRatio = data.data.longShortRatio;
                    wlData[coin].openInterest = data.data.openInterest;
                }
                
                if (selectedWlCoin === coin) renderFocusCard();
            }
        } catch (e) {
            console.error(e);
        }
        // Small delay to prevent API spamming
        await new Promise(r => setTimeout(r, 200));
    }
}

// Keep it auto-started
document.addEventListener('DOMContentLoaded', initWatchlist);
