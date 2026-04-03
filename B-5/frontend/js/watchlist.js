// Watchlist Logic
// Fetches the coins, handles REST polling, and updates UI

let wlCoins = [];
let wlData = {}; // Format: { BTCUSDT: { price, fr, frH, chg, vol, longShortRatio, openInterest, indicators } }
let prevWlData = {}; // Buffer for comparison
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
            
            // Move current to prev for comparison
            prevWlData = JSON.parse(JSON.stringify(wlData));

            // Merge new data
            for (const [coin, metrics] of Object.entries(data.data)) {
                if (!wlData[coin]) {
                    wlData[coin] = { ...metrics, longShortRatio: '-', openInterest: '-', indicators: [] };
                } else {
                    // Update only primary metrics
                    wlData[coin] = { ...wlData[coin], ...metrics };
                }
                
                // Detection Logic
                detectRapidChanges(coin);
            }

            const newCoins = Object.keys(data.data);
            
            if (isFirstLoad || wlCoins.length !== newCoins.length) {
                wlCoins = newCoins;
                sortAndRenderTable();
                fetchRestMetrics();
            } else {
                if (currentSortCol) {
                    sortAndRenderTable();
                } else {
                    wlCoins.forEach(coin => updateWlRow(coin));
                }
            }
            
            // 🟢 Smart Refresh Hot List (No Blinking)
            renderHotList();
            
            const timeEl = document.getElementById('wl-update-time');
            if (timeEl) timeEl.innerText = `Son güncelleme: ${new Date().toLocaleTimeString()}`;

            // 🔵 Real-time Detail Panel Update
            if (selectedWlCoin) {
                renderFocusCard();
                updateSingleMetric(selectedWlCoin);
            }
        }
    } catch (e) {
        console.error("Watchlist poll error:", e);
    }
}

async function updateSingleMetric(coin) {
    try {
        const res = await fetch(`http://localhost:3000/api/watchlist/${coin}/metrics`);
        const data = await res.json();
        if (data.success && data.data) {
            if (wlData[coin]) {
                wlData[coin].longShortRatio = data.data.longShortRatio;
                wlData[coin].openInterest = data.data.openInterest;
                if (selectedWlCoin === coin) renderFocusCard();
            }
        }
    } catch (e) { }
}

function renderHotList() {
    const container = document.getElementById('hot-list-container');
    if (!container) return;

    const hotCoins = wlCoins
        .filter(c => wlData[c].indicators && wlData[c].indicators.length > 0)
        .slice(0, 8); // Top 8 hot coins

    if (hotCoins.length === 0) {
        container.innerHTML = `<div style="text-align:center; opacity:0.3; font-size: 0.8rem; padding: 20px;">Sinyal bekleniyor... ❗</div>`;
        return;
    }

    // ──────────────── Smart DOM Diffing (Anti-Blink) ─────────────────
    // 1. Identify which coins SHOULD be there
    const incomingCoins = new Set(hotCoins);

    // 2. Remove items that are no longer in the top 8
    Array.from(container.children).forEach(el => {
        if (el.classList.contains('hot-item')) {
            const coin = el.dataset.coin;
            if (!incomingCoins.has(coin)) {
                el.classList.add('hot-item-remove');
                setTimeout(() => el.remove(), 400);
            }
        } else {
            el.remove(); // Remove placeholder
        }
    });

    // 3. Update or Add new items
    hotCoins.forEach((coin, index) => {
        const pd = wlData[coin];
        let existing = container.querySelector(`.hot-item[data-coin="${coin}"]`);
        
        const html = `
            <div>
                <span class="coin-name">${coin.replace('USDT', '')}</span>
                <span class="reason">${pd.indicators[0]}</span>
            </div>
            <div class="price-val" style="font-family: 'JetBrains Mono'; font-size: 0.8rem;">
                ${pd.price}
            </div>
        `;

        if (existing) {
            // Update existing values check if changed to avoid reflow
            if (existing.innerHTML !== html) {
                existing.innerHTML = html;
            }
            // Ensure order (optional, but keep it simple for now)
        } else {
            // Create new
            const newItem = document.createElement('div');
            newItem.className = 'hot-item hot-item-new';
            newItem.dataset.coin = coin;
            newItem.onclick = () => selectWlCoin(coin);
            newItem.innerHTML = html;
            
            // Insert at the right position or just append
            if (container.children[index]) {
                container.insertBefore(newItem, container.children[index]);
            } else {
                container.appendChild(newItem);
            }
        }
    });
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
        
        const indicators = (pd.indicators && pd.indicators.length > 0) 
            ? `<span class="indicator-flash" title="${pd.indicators.join(', ')}">❗</span>` 
            : '';

        html += `<tr class="wl-row ${bgClass} ${selectedWlCoin === coin ? 'selected' : ''}" onclick="selectWlCoin('${coin}')" data-coin="${coin}">
            <td style="font-weight: 500;">
                <img src="https://raw.githubusercontent.com/Pymmdrza/Cryptocurrency_Logos/main/PNG/${symbolFormat.toLowerCase()}.png" 
                     onerror="this.style.display='none'" style="width:16px; height:16px; vertical-align:middle; border-radius:50%; margin-right:5px;">
                ${symbolFormat} ${indicators}
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

// REAL-TIME FEED SETTINGS
window.USE_REALTIME_WS = true;

let convictionTimeLeft = 300; // 5 minutes in seconds
setInterval(() => {
    if (convictionTimeLeft > 0) convictionTimeLeft--;
    else convictionTimeLeft = 300;
    
    const cdEl = document.getElementById('focus-conviction-cd');
    if (cdEl) {
        const mins = Math.floor(convictionTimeLeft / 60);
        const secs = convictionTimeLeft % 60;
        cdEl.innerText = `Trend Gelişimi: ${mins}:${secs.toString().padStart(2, '0')}`;
    }
}, 1000);

window.handleWlTick = function(data) {
    if (!window.USE_REALTIME_WS || !selectedWlCoin || data.symbol !== selectedWlCoin) return;

    // 🏆 High-Speed UI Update (Partial DOM)
    
    // 1. Update Price
    const priceEl = document.getElementById('focus-price-val');
    if (priceEl && data.price) {
        const oldPrice = parseFloat(priceEl.dataset.val);
        const newPrice = data.price;
        const color = parseFloat(wlData[selectedWlCoin].chg) >= 0 ? '#10b981' : '#ef4444';
        
        if (newPrice !== oldPrice) {
            const flashClass = newPrice > oldPrice ? 'price-up' : 'price-down';
            priceEl.innerText = newPrice;
            priceEl.dataset.val = newPrice;
            priceEl.style.color = color;
            
            priceEl.classList.remove('price-up', 'price-down');
            void priceEl.offsetWidth; 
            priceEl.classList.add(flashClass);
            wlData[selectedWlCoin].price = newPrice;
        }
    }

    // 2. Update Funding Rate
    const frEl = document.getElementById('focus-fr-val');
    if (frEl && data.fr && data.fr !== '-') {
        const val = data.fr + '%';
        if (frEl.innerText !== val) {
            frEl.innerText = val;
            frEl.style.color = parseFloat(data.fr) > 0 ? '#10b981' : '#ef4444';
            wlData[selectedWlCoin].fr = data.fr;
        }
    }

    // 3. Update Volume
    const volEl = document.getElementById('focus-vol-val');
    const volLongEl = document.getElementById('focus-vol-long');
    const volShortEl = document.getElementById('focus-vol-short');

    if (volEl && data.vol && data.vol !== '-') {
        if (volEl.innerText !== `Vol: ${data.vol}`) {
            volEl.innerText = `Vol: ${data.vol}`;
            wlData[selectedWlCoin].vol = data.vol;
        }
    }
    if (volLongEl && volShortEl && data.taker) {
        volLongEl.innerText = `B: ${data.taker.buy}`;
        volShortEl.innerText = `S: ${data.taker.sell}`;
        wlData[selectedWlCoin].taker = data.taker;
    }

    // 4. Update Open Interest (OI) + OI Delta
    const oiEl = document.getElementById('focus-oi-val');
    const oiDeltaEl = document.getElementById('focus-oi-delta');

    if (oiEl && data.oi && data.oi !== '-') {
        const val = `OI: ${data.oi} ↗`;
        if (oiEl.innerText !== val) {
            oiEl.innerText = val;
            wlData[selectedWlCoin].openInterest = data.oi;
        }
    }
    if (oiDeltaEl && data.oiDelta !== undefined) {
        if (data.oiDelta === null) {
            oiDeltaEl.innerText = 'Hesaplanıyor... (5dk)';
            oiDeltaEl.style.color = 'var(--text-muted)';
        } else {
            const val = (data.oiDelta >= 0 ? '+' : '') + data.oiDelta + '%';
            oiDeltaEl.innerText = val;
            oiDeltaEl.style.color = data.oiDelta >= 0 ? '#10b981' : '#ef4444';
            wlData[selectedWlCoin].oiDelta = data.oiDelta;
        }
    }

    // 5. Update L/S Ratio Bar
    if (data.ls && data.ls !== '-') {
        const lsCalc = parseFloat(data.ls);
        const lPct = (lsCalc / (1 + lsCalc)) * 100;
        const sPct = 100 - lPct;
        
        const longBar = document.getElementById('focus-ls-long');
        const shortBar = document.getElementById('focus-ls-short');
        const longText = document.getElementById('focus-ls-text-long');
        const shortText = document.getElementById('focus-ls-text-short');

        if (longBar) longBar.style.width = `${lPct}%`;
        if (shortBar) shortBar.style.width = `${sPct}%`;
        if (longText) longText.innerText = `L ${lPct.toFixed(2)}%`;
        if (shortText) shortText.innerText = `${sPct.toFixed(2)}% S`;
        
        wlData[selectedWlCoin].longShortRatio = data.ls;
    }
};

function selectWlCoin(coin) {
    selectedWlCoin = coin;
    
    // Update active row visual
    document.querySelectorAll('.wl-row').forEach(row => {
        if (row.dataset.coin === coin) row.classList.add('selected');
        else row.classList.remove('selected');
    });
    
    // 📡 Subscribe to Live Stream (if ready)
    if (window.USE_REALTIME_WS && window.ws && window.ws.readyState === WebSocket.OPEN) {
        window.ws.send(JSON.stringify({ type: 'SUBSCRIBE', symbol: coin }));
    }
    
    renderFocusCard();
}

function renderFocusCard() {
    const focusDiv = document.getElementById('watchlist-focus');
    if (!focusDiv || !selectedWlCoin) return;
    
    const pd = wlData[selectedWlCoin];
    const isPosChg = parseFloat(pd.chg) >= 0;
    const isPosFr = parseFloat(pd.fr) > 0;
    
    // 🟢 Price Change Detection for Flash Effect
    const prevPriceEl = document.getElementById('focus-price-val');
    let flashTask = '';
    if (prevPriceEl) {
        const oldPrice = parseFloat(prevPriceEl.dataset.val);
        const newPrice = parseFloat(pd.price);
        if (newPrice > oldPrice) flashTask = 'price-up';
        else if (newPrice < oldPrice) flashTask = 'price-down';
    }

    // L/S Logic
    let lPct = 50, sPct = 50;
    let lsHtml = `<div style="text-align:center; opacity:0.5; font-size: 0.9em; margin: 15px 0;">Binance Verisi Bekleniyor...</div>`;
    
    if (pd.longShortRatio && pd.longShortRatio !== '-') {
        const lsCalc = parseFloat(pd.longShortRatio);
        lPct = (lsCalc / (1 + lsCalc)) * 100;
        sPct = 100 - lPct;
        
        lsHtml = `
        <div style="display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; font-weight: bold; margin-top: 15px;">
            <span id="focus-ls-text-long" style="color: #10b981; transition: color 0.3s;">L ${lPct.toFixed(2)}%</span>
            <span id="focus-ls-text-short" style="color: #ef4444; transition: color 0.3s;">${sPct.toFixed(2)}% S</span>
        </div>
        <div class="ls-bar-container">
            <div id="focus-ls-long" class="ls-bar-long" style="width: ${lPct}%"></div>
            <div id="focus-ls-short" class="ls-bar-short" style="width: ${sPct}%"></div>
        </div>
        `;
    }

    const oiText = pd.openInterest && pd.openInterest !== '-' ? parseFloat(pd.openInterest).toLocaleString(undefined, { maximumFractionDigits: 1 }) : 'Bekleniyor...';
    let oiDeltaVal = 'Hesaplanıyor... (5m)';
    let oiDeltaColor = 'var(--text-muted)';
    if (pd.oiDelta !== undefined && pd.oiDelta !== null) {
        oiDeltaVal = (pd.oiDelta >= 0 ? '+' : '') + pd.oiDelta + '%';
        oiDeltaColor = pd.oiDelta >= 0 ? '#10b981' : '#ef4444';
    }

    const takerBuy = pd.taker ? pd.taker.buy : '--';
    const takerSell = pd.taker ? pd.taker.sell : '--';

    focusDiv.style.display = 'block';
    focusDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; margin-bottom: 10px;">
            <div id="focus-conviction-cd" style="font-size: 0.75rem; opacity: 0.6; font-family: 'JetBrains Mono', monospace;">
                Trend Gelişimi: 05:00
            </div>
            <div style="font-size: 0.75rem; opacity: 0.4;">
                Hamza Live Intelligence 🛡️
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                <a href="https://www.binance.com/en/futures/${selectedWlCoin}" target="_blank" style="text-decoration:none; color:var(--text-secondary); font-size: 0.8rem; display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${selectedWlCoin}</a>
                <div id="focus-price-val" data-val="${pd.price}" class="${flashTask}" style="font-size: 2.5rem; font-weight: bold; color: ${isPosChg ? '#10b981' : '#ef4444'}; font-family: 'JetBrains Mono', monospace; margin: 10px 0; border-radius: 6px; transition: background 0.5s;">
                    ${pd.price}
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 0.9rem; opacity: 0.7; margin-bottom: 5px;">Funding (${pd.frH})</div>
                <div id="focus-fr-val" style="font-size: 1.5rem; font-weight: bold; color: ${isPosFr ? '#10b981' : '#ef4444'}; font-family: 'JetBrains Mono', monospace;">
                    ${pd.fr !== '-' ? pd.fr + '%' : '...'}
                </div>
            </div>
        </div>
        
        ${lsHtml}
        
        <div style="display: flex; align-items: center; margin-top: 15px; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">
            <div style="flex: 1.2; display: flex; flex-direction: column; gap: 2px;">
                <div id="focus-oi-val" style="color: #60a5fa;">OI: ${oiText} ↗</div>
                <div id="focus-oi-delta" style="font-size: 0.75rem; color: ${oiDeltaColor}; font-weight: bold;">${oiDeltaVal} (5m)</div>
            </div>
            <div style="flex: 2; text-align: right;">
                <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; font-weight: bold;">
                    <span id="focus-vol-val" style="opacity: 0.9;">Vol: ${pd.vol}</span>
                    <span style="opacity: 0.3;">|</span>
                    <span id="focus-vol-long" style="color: #10b981;">B: ${takerBuy}</span>
                    <span id="focus-vol-short" style="color: #ef4444;">S: ${takerSell}</span>
                </div>
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

function renderHotList() {
    const container = document.getElementById('hot-list-container');
    if (!container) return;

    const hotCoins = wlCoins
        .filter(c => wlData[c].indicators && wlData[c].indicators.length > 0)
        .slice(0, 8); // Top 8 hot coins

    if (hotCoins.length === 0) {
        container.innerHTML = `<div style="text-align:center; opacity:0.3; font-size: 0.8rem; padding: 20px;">Sinyal bekleniyor... ❗</div>`;
        return;
    }

    let html = '';
    hotCoins.forEach(coin => {
        const pd = wlData[coin];
        html += `
            <div class="hot-item" onclick="selectWlCoin('${coin}')">
                <div>
                    <span class="coin-name">${coin.replace('USDT', '')}</span>
                    <span class="reason">${pd.indicators[0]}</span>
                </div>
                <div style="font-family: 'JetBrains Mono'; font-size: 0.8rem;">
                    ${pd.price}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function detectRapidChanges(coin) {
    const fresh = wlData[coin];
    const prev = prevWlData[coin];
    const indicators = [];

    // 1. Funding Warn (Extreme level)
    if (fresh.fr !== '-') {
        const frVal = parseFloat(fresh.fr);
        if (Math.abs(frVal) >= 0.1) {
            indicators.push(`Yüksek FR: ${frVal}%`);
        }
    }

    // 2. Volume Jump Detection
    if (prev && prev.volRaw && fresh.volRaw) {
        const volJump = ((fresh.volRaw - prev.volRaw) / prev.volRaw) * 100;
        if (volJump >= 5) { // 5% jump in 5 seconds is massive
            indicators.push(`Hacim Patlaması: +%${volJump.toFixed(1)}`);
        }
    }

    // 3. Price Move
    if (prev && prev.price && fresh.price) {
        const priceMove = Math.abs(((parseFloat(fresh.price) - parseFloat(prev.price)) / parseFloat(prev.price)) * 100);
        if (priceMove >= 0.5) { // 0.5% move in 5 seconds
            indicators.push(`Sert Hareket: %${priceMove.toFixed(2)}`);
        }
    }

    wlData[coin].indicators = indicators;
}

// Keep it auto-started
document.addEventListener('DOMContentLoaded', initWatchlist);
