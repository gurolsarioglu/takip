const WS_URL = 'ws://localhost:3000';
const statusIndicator = document.getElementById('ws-status');

const feeds = {
    '15m': document.getElementById('feed-15m'),
    '1h': document.getElementById('feed-1h'),
    '4h': document.getElementById('feed-4h'),
    '1d': document.getElementById('feed-1d'),
};

// ─── Filter Logic ───
window.applyFilter = function (tf) {
    const input = document.getElementById(`filter-${tf}`);
    const clearBtn = document.querySelector(`#filter-box-${tf} .filter-clear`);
    const query = input.value.trim().toUpperCase();

    clearBtn.classList.toggle('visible', query.length > 0);

    const feed = feeds[tf];
    if (!feed) return;
    Array.from(feed.children).forEach(card => {
        const coin = (card.dataset.coin || '').toUpperCase();
        card.classList.toggle('filtered-out', query.length > 0 && !coin.includes(query));
    });
};

window.clearFilter = function (tf) {
    const input = document.getElementById(`filter-${tf}`);
    if (input) {
        input.value = '';
        applyFilter(tf);
    }
};

// Click a coin name in a card → auto-fill filter
window.filterByCoin = function (tf, coinName) {
    const input = document.getElementById(`filter-${tf}`);
    if (!input) return;
    // Toggle: if already filtered by this coin, clear it
    if (input.value.toUpperCase() === coinName.toUpperCase()) {
        input.value = '';
    } else {
        input.value = coinName;
    }
    applyFilter(tf);
};

// ─── Signal Cache (localStorage persistence) ───
const SIGNAL_CACHE_KEY = 'b5-signals';
const MAX_SIGNALS_PER_TF = 20; // keep last 20 per timeframe

function loadSignalCache() {
    try {
        const raw = localStorage.getItem(SIGNAL_CACHE_KEY);
        return raw ? JSON.parse(raw) : { '15m': [], '1h': [], '4h': [], '1d': [] };
    } catch (_) {
        return { '15m': [], '1h': [], '4h': [], '1d': [] };
    }
}

function saveSignalCache(cache) {
    try {
        localStorage.setItem(SIGNAL_CACHE_KEY, JSON.stringify(cache));
    } catch (_) { }
}

function addToCache(signal) {
    const cache = loadSignalCache();
    const tf = signal.timeframe || '15m';
    if (!cache[tf]) cache[tf] = [];
    // Avoid exact duplicates (same coin + time)
    const isDupe = cache[tf].some(s => s.coin === signal.coin && s.time === signal.time);
    if (!isDupe) {
        cache[tf].unshift(signal); // newest first
        cache[tf] = cache[tf].slice(0, MAX_SIGNALS_PER_TF);
    }
    saveSignalCache(cache);
}

// ─── Restore all cached signals on load ───
function restoreFromCache() {
    const cache = loadSignalCache();
    for (const tf of ['15m', '1h', '4h', '1d']) {
        const signals = cache[tf] || [];
        // Render oldest-first so newest ends up at top (renderSignal uses prepend)
        [...signals].reverse().forEach(signal => renderSignal(signal, false));
    }
}

let ws;

function connect() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        statusIndicator.className = 'status-indicator active';
        statusIndicator.innerText = 'Bağlı';
    };

    ws.onclose = () => {
        statusIndicator.className = 'status-indicator disconnected';
        statusIndicator.innerText = 'Bağlantı Koptu';
        setTimeout(connect, 3000); // Reconnect
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'signal') {
                addToCache(data.data);
                renderSignal(data.data, true);
            }
        } catch (e) {
            console.error('Invalid message', e);
        }
    };
}

// saveToCache: true for new signals (adds flash), false for restore
function renderSignal(signal, isNew = true) {
    const timeframe = signal.timeframe || '15m'; // default fallback
    const targetFeed = feeds[timeframe];

    if (!targetFeed) return; // Unknown timeframe

    const card = document.createElement('div');
    card.className = 'signal-card telegram-style' + (isNew ? ' signal-new' : '');

    const emoji = signal.position === 'Long' ? '🟢' : '🔴';
    const trendText = signal.position === 'Long' ? 'BUY' : 'SELL';
    const tfText = timeframe === '15m' ? '15DK' : timeframe === '1h' ? '1 SAAT' : timeframe === '4h' ? '4 SAAT' : '1 GÜN';
    const cleanCoin = signal.coin ? signal.coin.replace('USDT', '') + 'USDT' : 'BILINMIYOR';
    const priceStr = signal.price ? parseFloat(signal.price).toFixed(4) : '-';

    card.dataset.coin = cleanCoin; // for filtering (must be after cleanCoin is declared)

    // Fallbacks
    const rsiCurrent = signal.rsi !== undefined ? signal.rsi : '-';
    const rsiWarning = signal.rsiWarning || '';
    const stochK = signal.stochK !== undefined ? signal.stochK : '-';
    const stochD = signal.stochD !== undefined ? signal.stochD : '-';
    const vol = signal.volume || 'Normal';
    const timeStr = signal.time || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const binanceUrl = `https://www.binance.com/en/futures/${cleanCoin}`;

    const rsi15mStr = timeframe === '15m' ? `• 15dk RSI: ${rsiCurrent} ${rsiWarning} (Sinyal)\n` : `• 15dk RSI: ${signal.rsi15m || '-'}\n`;
    const rsi1hStr = timeframe === '1h' ? `• 1 Saatlik RSI: ${rsiCurrent} ${rsiWarning} (Sinyal)\n` : `• 1 Saatlik RSI: ${signal.rsi1h || '-'}\n`;
    const rsi4hStr = timeframe === '4h' ? `• 4 Saatlik RSI: ${rsiCurrent} ${rsiWarning} (Sinyal)\n` : `• 4 Saatlik RSI: ${signal.rsi4h || '-'}\n`;
    const rsi1dStr = timeframe === '1d' ? `• Günlük RSI: ${rsiCurrent} ${rsiWarning} (Sinyal)\n` : `• Günlük RSI: ${signal.rsi1d || '-'}\n`;

    const extraAlert1 = signal.demaAlert ? '• 🧘 Yana Mum / DEMA Tespiti\n' : '';
    const extraAlert2 = signal.isWTDip ? '• 🌊 WaveTrend Dip + Alt Bant Teması\n' : '';
    const extraAlert = extraAlert1 + extraAlert2;

    const signalJsonStr = JSON.stringify(signal).replace(/'/g, "&#39;");

    // Strictly match user requested format
    card.innerHTML = `
        <div class="telegram-text"><span class="signal-coin-link" onclick="filterByCoin('${timeframe}', '${cleanCoin}')" title="Bu coini filtrele">[${tfText}] #${cleanCoin}</span> ${trendText} ${emoji}
──────────────────
• Fiyat: ${priceStr}
${rsi15mStr}${rsi1hStr}${rsi4hStr}${rsi1dStr}• Stoch: ${stochK}(K)/${stochD}(D)
• Hacim: ${vol}
${extraAlert}──────────────────
🔗 <a href="${binanceUrl}" target="_blank">Binance Futures</a> | ⏰ ${timeStr}</div>
        <button class="btn btn-add" onclick='addToTable(${signalJsonStr})'>
            <i class="fa-solid fa-plus"></i> Ekle
        </button>
    `;

    targetFeed.prepend(card);

    // Re-apply filter in case this column has an active filter
    applyFilter(timeframe);
}

// ─── Start ───
restoreFromCache();
connect();
