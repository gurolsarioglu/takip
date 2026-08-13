const WS_URL = 'ws://localhost:3000';
const statusIndicator = document.getElementById('ws-status');

const feeds = {
    'hammer-new': document.getElementById('feed-hammer-new'),
    '1m':  document.getElementById('feed-1m'),
    '15m': document.getElementById('feed-15m'),
    '1h':  document.getElementById('feed-1h'),
    '4h':  document.getElementById('feed-4h'),
    'rsi-div': document.getElementById('feed-rsi-div'),
    'fr': document.getElementById('feed-fr'),
    'volume': document.getElementById('feed-volume'),
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
    if (input.value.toUpperCase() === coinName.toUpperCase()) {
        input.value = '';
    } else {
        input.value = coinName;
    }
    applyFilter(tf);
};

// ─── Signal Cache (localStorage persistence) ───
const SIGNAL_CACHE_KEY = 'b5-signals';
const MAX_SIGNALS_PER_TF = 20;

function loadSignalCache() {
    try {
        const raw = localStorage.getItem(SIGNAL_CACHE_KEY);
        return raw ? JSON.parse(raw) : { 'hammer-new': [], '1m': [], '15m': [], '1h': [], '4h': [], 'rsi-div': [], 'fr': [], 'volume': [] };
    } catch (_) {
        return { 'hammer-new': [], '1m': [], '15m': [], '1h': [], '4h': [], 'rsi-div': [], 'fr': [], 'volume': [] };
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
    const isDupe = cache[tf].some(s => s.coin === signal.coin && s.time === signal.time);
    if (!isDupe) {
        cache[tf].unshift(signal);
        cache[tf] = cache[tf].slice(0, MAX_SIGNALS_PER_TF);
    }
    saveSignalCache(cache);
}

// ─── Restore all cached signals on load ───
function restoreFromCache() {
    const cache = loadSignalCache();
    for (const tf in feeds) {
        const signals = cache[tf] || [];
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
        setTimeout(connect, 3000);
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'signal') {
                addToCache(data.data);
                renderSignal(data.data, true);
            } else if (data.type === 'TICK') {
                // High-speed update for Watchlist Focus Card
                if (window.handleWlTick) window.handleWlTick(data);
            } else if (data.type === 'DETAY_SCAN_PROGRESS') {
                updateDetayScanProgress(data.data.scanned, data.data.total);
            }
        } catch (e) {
            console.error('Invalid message', e);
        }
    };
    
    window.ws = ws; // Expose globally for subscriptions
}

// ─── FR Kart Renderer ─────────────────────────────────────────────────────────
function renderFRCard(signal, isNew) {
    const card = document.createElement('div');
    card.className = 'signal-card telegram-style fr-card' + (isNew ? ' signal-new' : '');

    const isFalling     = signal.direction === 'falling';
    const directionEmoji = isFalling ? '🔴' : '🟢';
    const dirLabel      = isFalling ? '↓↓ ŞORT BASKISI ARTIYOR' : '↑↑ LONG BASKISI ARTIYOR';
    const cleanCoin     = signal.coin ? signal.coin.replace('USDT', '') + 'USDT' : 'BİLİNMİYOR';
    const timeStr       = signal.time || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const binanceUrl    = `https://www.binance.com/en/futures/${cleanCoin}`;
    const tvUrl         = `https://www.tradingview.com/chart/?symbol=BINANCE:${cleanCoin}`;

    const fr     = signal.fundingRate    !== undefined ? parseFloat(signal.fundingRate).toFixed(4)    : '-';
    const prevFR = signal.prevFundingRate !== undefined ? parseFloat(signal.prevFundingRate).toFixed(4) : '-';
    const diff   = signal.frDiff         !== undefined ? parseFloat(signal.frDiff).toFixed(6)         : '-';
    const remain = signal.timeRemaining  || '--:--:--';
    const taker  = signal.takerRatio     || '1.00';

    // Miracle / Strategy logic
    const isMiracle = signal.isExtreme || signal.strategy?.includes('MUCIZE');
    const miracleBadge = isMiracle ? '<span style="background:#a78bfa; color:#fff; padding:1px 6px; border-radius:4px; font-weight:bold; font-size:0.75rem; margin-left:5px; box-shadow: 0 0 10px rgba(167, 139, 250, 0.4);">✨ MUCİZE</span>' : '';
    const strategyText = signal.strategy ? `<div style="color:#a78bfa; font-weight:bold; font-size:0.85rem; margin-top:5px;">🎯 ${signal.strategy}</div>` : '';

    // Difference color logic
    const diffVal = parseFloat(diff);
    let diffColor = 'inherit';
    let diffEmoji = '';
    if (!isNaN(diffVal)) {
        if (diffVal > 0) { diffColor = '#4ade80'; diffEmoji = '📈'; }
        else if (diffVal < 0) { diffColor = '#f87171'; diffEmoji = '📉'; }
    }

    card.dataset.coin = cleanCoin;
    if (isMiracle) card.classList.add('miracle-card');

    card.innerHTML = `
        <div class="telegram-text"><span class="signal-coin-link fr-label" style="background:#facc15; color:#000; padding:1px 6px; border-radius:4px; font-weight:bold; font-size:0.75rem; margin-right:5px;">FR</span><span class="signal-coin-link" onclick="filterByCoin('fr', '${cleanCoin}')" title="Bu coini filtrele">${directionEmoji} #${cleanCoin}</span>${miracleBadge}
<span style="font-size:0.8rem; opacity:0.8; font-weight:bold;">${dirLabel}</span>
${strategyText}
──────────────────
• <span style="opacity:0.8;">Funding Rate:</span> <b style="color:#fff;">${fr}%</b>
• <span style="opacity:0.8;">Önceki Funding:</span> ${prevFR}%
• <span style="opacity:0.8;">Fark (Değişim):</span> <b style="color:${diffColor};">${diff > 0 ? '+' : ''}${diff}% ${diffEmoji}</b>
• <span style="opacity:0.8;">Piyasa Agresyonu:</span> <b style="color:#fff;">${taker}</b>
• <span style="opacity:0.8;">Kalan Süre:</span> <span style="font-family:'JetBrains Mono'; color:#fbbf24;">${remain}</span>
──────────────────
🔗 <a href="${binanceUrl}" target="_blank" style="color:#9f9ffb;">Binance</a> | <a href="${tvUrl}" target="_blank" style="color:#9f9ffb;">Tradingview</a> <span style="float:right; opacity:0.6; font-size: 0.85em;">${timeStr}</span></div>
    `;

    return card;
}

function renderVolumeCard(signal, isNew) {
    const card = document.createElement('div');
    card.className = 'signal-card telegram-style volume-card' + (isNew ? ' signal-new' : '');

    const isLong = signal.position === 'Long';
    const emoji = isLong ? '🟢' : '🔴';
    const cleanCoin = signal.coin ? signal.coin.replace('USDT', '') + 'USDT' : 'BİLİNMİYOR';
    const timeStr = signal.time || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const binanceUrl = `https://www.binance.com/en/futures/${cleanCoin}`;

    card.dataset.coin = cleanCoin;

    card.innerHTML = `
        <div class="telegram-text">
            <span class="signal-coin-link" style="background:#facc15; color:#000; padding:1px 6px; border-radius:4px; font-weight:bold; font-size:0.75rem; margin-right:5px;">VOL</span>
            <span class="signal-coin-link" onclick="filterByCoin('volume', '${cleanCoin}')">#${cleanCoin}</span> ${emoji}
            <div style="color:#facc15; font-weight:bold; font-size:0.85rem; margin-top:5px;">🚀 ${signal.strategy}</div>
            ──────────────────
            • Durum: <b style="color:#fff;">${signal.pivotStatus}</b>
            • Hacim Gücü: <b style="color:#4ade80;">x${signal.relVol}</b>
            • Giriş Fiyatı: ${signal.price}
            <div style="background:rgba(16, 185, 129, 0.1); padding:8px; border-radius:6px; border:1px solid rgba(16, 185, 129, 0.2); margin-top:10px;">
                <b style="color:#4ade80; font-size:0.9rem;">🔥 HEDEF ÇIKIŞ (%${signal.tpPercent}):</b><br>
                <span style="font-family:'JetBrains Mono'; font-size:1.1rem; color:#fff;">$${signal.targetPrice}</span>
            </div>
            ──────────────────
            🔗 <a href="${binanceUrl}" target="_blank" style="color:#9f9ffb;">Binance</a> <span style="float:right; opacity:0.6; font-size: 0.85em;">${timeStr}</span>
        </div>
    `;

    return card;
}

// ─── Genel Signal Renderer ────────────────────────────────────────────────────
function renderSignal(signal, isNew = true) {
    const timeframe  = signal.timeframe || '15m';
    const targetFeed = feeds[timeframe];

    if (!targetFeed) return;

    // FR sinyalleri özel kart ile render
    if (timeframe === 'fr') {
        const card = renderFRCard(signal, isNew);
        targetFeed.prepend(card);
        applyFilter('fr');
        return;
    }

    // Volume Hunter sinyalleri
    if (timeframe === 'volume') {
        const card = renderVolumeCard(signal, isNew);
        targetFeed.prepend(card);
        applyFilter('volume');
        return;
    }

    // RSI Div (SüperSwing) Renderer
    if (timeframe === 'rsi-div') {
        const existingCard = targetFeed.querySelector(`.signal-card[data-coin="${signal.coin}"]`);
        const isLong = signal.position === 'Long';
        const emoji = isLong ? '🟢' : '🔴';
        const cleanCoin = signal.coin.replace('USDT', '') + 'USDT';
        const binanceUrl = `https://www.binance.com/en/futures/${signal.coin}`;
        
        const getWarn = (val) => {
            if (val === '-' || val === undefined || val === null) return '';
            const n = parseInt(val);
            return (n <= 30 || n >= 70) ? '❗' : '';
        };

        const divTypeTr = signal.divergence ? (signal.divergence.type === 'bullish' ? 'BOĞA (BULLISH)' : 'AYI (BEARISH)') : '';

        const divInfo = signal.divergence ? `
            <div style="background: rgba(59, 130, 246, 0.1); padding: 12px; border-left: 3px solid #3b82f6; margin: 10px 0; border-radius: 4px; text-align: left;">
                <b style="color:#60a5fa; font-size: 0.8rem; display: block; margin-bottom: 8px;">${divTypeTr} UYUMSUZLUK TESPİT EDİLDİ! (GÜNLÜK)</b>
                <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; opacity: 0.9;">
                    <span>• Başlangıç: ${signal.divergence.startDate}</span>
                    <span>• Fiyat: ${signal.divergence.priceDiff}</span>
                    <span>• RSI: ${signal.divergence.rsiDiff}</span>
                </div>
            </div>
        ` : '';

        const innerHTML = `
            <div class="telegram-text">
<span class="signal-coin-link" style="color:#a78bfa;">[SüperSwing]</span> 
<span class="signal-coin-link" onclick="filterByCoin('rsi-div', '${cleanCoin}')">#${cleanCoin}</span> ${emoji}
──────────────────
• Fiyat: ${signal.price}
• 4H RSI: ${signal.rsi} ${signal.rsiWarning || ''}
• Güncel Günlük RSI: ${signal.rsi1d} ${getWarn(signal.rsi1d)}
• 3G: ${signal.rsi3d}${getWarn(signal.rsi3d)} | 5G: ${signal.rsi5d}${getWarn(signal.rsi5d)} | 1H: ${signal.rsi7d}${getWarn(signal.rsi7d)}
${divInfo}
──────────────────
🔗 <a href="${binanceUrl}" target="_blank">Binance Futures</a> | ⏰ ${signal.time}</div>
        `;

        if (existingCard) {
            existingCard.innerHTML = innerHTML;
            if (isNew) existingCard.classList.add('signal-new');
        } else {
            const card = document.createElement('div');
            card.className = 'signal-card telegram-style rsi-div-card' + (isNew ? ' signal-new' : '');
            card.dataset.coin = cleanCoin;
            card.innerHTML = innerHTML;
            targetFeed.prepend(card);
            applyFilter('rsi-div');
        }
        return;
    }

    if (timeframe === 'hammer-new') {
        const existingCard = targetFeed.querySelector(`.signal-card[data-coin="${signal.coin}"]`);
        
        const isLong = signal.position === 'Long';
        const emoji = isLong ? '🟢' : '🔴';
        const cleanCoin = signal.coin ? signal.coin.replace('USDT', '') + 'USDT' : 'BİLİNMİYOR';
        
        const boostVal = parseFloat(signal.boost);
        const boostStr = boostVal > 0 ? `Artış Değeri: +${signal.boost}%` : `Düşüş Değeri: ${signal.boost}%`;
        
        const binanceUrl = `https://www.binance.com/en/futures/${cleanCoin}`;
        const tvUrl = `https://www.tradingview.com/chart/?symbol=BINANCE:${cleanCoin}`;

        const signalJsonStr = JSON.stringify(signal).replace(/'/g, "&#39;");

        let timeframesStr = ``;
        if (signal.d1m) timeframesStr += `RSI: ${signal.d1m.rsi}${signal.d1m.rsiAlert}<br>Stokastik (K/D): ${signal.d1m.k}/${signal.d1m.d} ${signal.d1m.stochAlert}<br>`;
        if (signal.d5m) timeframesStr += `5dk -> RSI: ${signal.d5m.rsi}${signal.d5m.rsiAlert} | Stokastik: ${signal.d5m.k}/${signal.d5m.d} ${signal.d5m.stochAlert}<br>`;
        if (signal.d1h) timeframesStr += `1 Saat -> RSI: ${signal.d1h.rsi}${signal.d1h.rsiAlert} | Stokastik: ${signal.d1h.k}/${signal.d1h.d} ${signal.d1h.stochAlert}<br>`;

        const innerHTML = `
            <div class="telegram-text" style="line-height: 1.4;">
<span class="signal-coin-link" onclick="filterByCoin('hammer-new', '${cleanCoin}')" style="font-weight: 500;">${emoji} #${cleanCoin} ${signal.starsStr || ''}</span>
${boostStr}
Anlık Fiyat: ${signal.price}
Önceki Fiyat: ${signal.prevPrice}
Hacim: ${signal.volBoost}%
Dolaşım: ${signal.supplyStr || '-'}
${timeframesStr}
                <div style="margin-top:2px;">
<a href="${binanceUrl}" target="_blank" style="color:#9f9ffb;">Binance</a> | <a href="${tvUrl}" target="_blank" style="color:#9f9ffb;">Tradingview</a> <span style="float:right; opacity:0.6; font-size: 0.85em; margin-top:2px;">${signal.time}</span>
                </div>
            </div>
        `;

        if (existingCard) {
            existingCard.innerHTML = innerHTML;
            if (isNew) existingCard.classList.add('signal-new');
        } else {
            const card = document.createElement('div');
            card.className = 'signal-card telegram-style hammer-card' + (isNew ? ' signal-new' : '');
            card.dataset.coin = cleanCoin;
            card.innerHTML = innerHTML;
            targetFeed.prepend(card);
            applyFilter('hammer-new');
        }
        return;
    }

    // 1 Dakikalık özel Telegram Formatı Renderer
    if (timeframe === '1m') {
        const existingCard = targetFeed.querySelector(`.signal-card[data-coin="${signal.coin}"]`);
        
        const isLong = signal.position === 'Long';
        const emoji = isLong ? '🟢' : '🔴';
        const cleanCoin = signal.coin ? signal.coin.replace('USDT', '') + 'USDT' : 'BİLİNMİYOR';
        
        const boostVal = parseFloat(signal.boost);
        const boostStr = boostVal > 0 ? `Artış Değeri: +${signal.boost}%` : `Düşüş Değeri: ${signal.boost}%`;
        
        const rsiVal = parseFloat(signal.rsi);
        const kVal = signal.stochK;
        const rsiAlert = (rsiVal >= 70 || rsiVal <= 30) ? '⚠️' : '';
        const stochAlert = (kVal >= 80 || kVal <= 20) ? ' ⚠️' : '';
        
        const binanceUrl = `https://www.binance.com/en/futures/${cleanCoin}`;
        const tvUrl = `https://www.tradingview.com/chart/?symbol=BINANCE:${cleanCoin}`;

        const signalJsonStr = JSON.stringify(signal).replace(/'/g, "&#39;");

        const innerHTML = `
            <div class="telegram-text" style="line-height: 1.4;">
<span class="signal-coin-link" onclick="filterByCoin('1m', '${cleanCoin}')" style="font-weight: 500;">${emoji} #${cleanCoin}</span>
${boostStr}
Anlık Fiyat: ${signal.price}
Önceki Fiyat: ${signal.prevPrice}
Hacim: ${signal.volBoost}%
Dolaşım: ${signal.supplyStr || '-'}
RSI: ${signal.rsi}${rsiAlert}
Stokastik (K/D): ${signal.stochK}/${signal.stochD}${stochAlert}
                <div style="margin-top:2px;">
<a href="${binanceUrl}" target="_blank" style="color:#9f9ffb;">Binance</a> | <a href="${tvUrl}" target="_blank" style="color:#9f9ffb;">Tradingview</a> <span style="float:right; opacity:0.6; font-size: 0.85em; margin-top:2px;">${signal.time}</span>
                </div>
            </div>
        `;

        if (existingCard) {
            existingCard.innerHTML = innerHTML;
            if (isNew) existingCard.classList.add('signal-new');
        } else {
            const card = document.createElement('div');
            card.className = 'signal-card telegram-style m1-card' + (isNew ? ' signal-new' : '');
            card.dataset.coin = cleanCoin;
            card.innerHTML = innerHTML;
            targetFeed.prepend(card);
            applyFilter('1m');
        }
        return;
    }

    // ─── RSI tabanlı sinyaller (15m / 1h / 4h) ───
    const existingCard = targetFeed.querySelector(`.signal-card[data-coin="${signal.coin}"]`);

    const emoji     = signal.position === 'Long' ? '🟢' : '🔴';
    const trendText = signal.position === 'Long' ? 'BUY' : 'SELL';
    
    let tfText = timeframe.toUpperCase();
    if (timeframe === '1m') tfText = '1DK';
    else if (timeframe === '15m') tfText = '15DK';
    else if (timeframe === '1h') tfText = '1 SAAT';
    else if (timeframe === '4h') tfText = '4 SAAT';
    const cleanCoin = signal.coin ? signal.coin.replace('USDT', '') + 'USDT' : 'BİLİNMİYOR';
    const priceStr  = signal.price ? parseFloat(signal.price).toFixed(4) : '-';

    const kusursuzBadge = signal.isKusursuz ? ' <span style="background:#ffc107;color:#000;padding:2px 6px;border-radius:4px;font-size:0.75rem;font-weight:bold;margin-left:5px;box-shadow:0 0 5px rgba(255,193,7,0.5);">💎 KUSURSUZ</span>' : '';

    const rsiCurrent = signal.rsi !== undefined ? signal.rsi : '-';
    const rsiWarning = signal.rsiWarning || '';
    const stochK     = signal.stochK !== undefined ? signal.stochK : '-';
    const stochD     = signal.stochD !== undefined ? signal.stochD : '-';
    const vol        = signal.volume || 'Normal';
    const timeStr    = signal.time || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const binanceUrl = `https://www.binance.com/en/futures/${cleanCoin}`;

    const rsi15mStr = timeframe === '15m' ? `• 15dk RSI: ${rsiCurrent} ${rsiWarning} (Sinyal)\n` : `• 15dk RSI: ${signal.rsi15m || '-'}\n`;
    const rsi1hStr  = timeframe === '1h'  ? `• 1 Saatlik RSI: ${rsiCurrent} ${rsiWarning} (Sinyal)\n` : `• 1 Saatlik RSI: ${signal.rsi1h || '-'}\n`;
    const rsi4hStr  = timeframe === '4h'  ? `• 4 Saatlik RSI: ${rsiCurrent} ${rsiWarning} (Sinyal)\n` : `• 4 Saatlik RSI: ${signal.rsi4h || '-'}\n`;

    const rsi1dVal   = signal.rsi1d !== undefined && signal.rsi1d !== null ? signal.rsi1d : '-';
    const rsi1dAlert = (rsi1dVal !== '-' && parseInt(rsi1dVal) >= 70) ? ' ❗'
                     : (rsi1dVal !== '-' && parseInt(rsi1dVal) <= 30) ? ' ❗' : '';
    const rsi1dStr   = `• Günlük RSI: ${rsi1dVal}${rsi1dAlert}\n`;

    const extraAlert1 = signal.demaAlert ? '• 🧘 Yana Mum / DEMA Tespiti\n' : '';
    const extraAlert2 = signal.isWTDip   ? '• 🌊 WaveTrend Dip + Alt Bant Teması\n' : '';
    const extraAlert  = extraAlert1 + extraAlert2;

    // YENİ: Sinyalin tarihini (bugün değilse) göstermek için
    const todayStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
    const dateStr = (signal.date && signal.date !== todayStr) ? `${signal.date} | ` : '';

    // Swing Yorum Bloğu
    const commentHtml = signal.swingComment
        ? `<div class="swing-comment">${signal.swingComment.replace(/\n/g, '<br>')}</div>`
        : '';

    const signalJsonStr = JSON.stringify(signal).replace(/'/g, "&#39;");

    const innerHTML = `
        <div class="telegram-text"><span class="signal-coin-link" onclick="filterByCoin('${timeframe}', '${cleanCoin}')" title="Bu coini filtrele">[${tfText}] #${cleanCoin}</span>${kusursuzBadge} ${trendText} ${emoji}
──────────────────
• Fiyat: ${priceStr}
${rsi15mStr}${rsi1hStr}${rsi4hStr}${rsi1dStr}• Stoch: ${stochK}(K)/${stochD}(D)
• Hacim: ${vol}
• Dolaşım: ${signal.supplyStr || '-'}
${extraAlert}──────────────────
🔗 <a href="${binanceUrl}" target="_blank">Binance Futures</a> | ⏰ ${dateStr}${timeStr}</div>
        ${commentHtml}
    `;

    if (existingCard) {
        existingCard.innerHTML = innerHTML;
        if (isNew) existingCard.classList.add('signal-new');
    } else {
        const card = document.createElement('div');
        card.className = 'signal-card telegram-style' + (isNew ? ' signal-new' : '');
        card.dataset.coin = cleanCoin;
        card.innerHTML = innerHTML;
        targetFeed.prepend(card);
        applyFilter(timeframe);
    }
}

function initBtcTicker() {
    const wsBtc = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
    const btcPriceEl = document.getElementById('btc-price');
    const btcPctEl = document.getElementById('btc-pct');

    wsBtc.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            const price = parseFloat(data.c).toFixed(2);
            const pct = parseFloat(data.P);
            
            if (btcPriceEl) btcPriceEl.innerText = `$${price}`;
            
            if (btcPctEl) {
                const isPos = pct >= 0;
                let trendText = 'Yatay ⚪';
                if (pct > 2) trendText = 'Yükselişte 🟢';
                else if (pct < -2) trendText = 'Düşüşte 🔴';
                
                btcPctEl.innerHTML = `<span style="color: ${isPos ? '#4ade80' : '#f87171'}">${isPos ? '+' : ''}${pct.toFixed(2)}%</span> <span style="opacity:0.8; font-size: 0.9em; margin-left: 4px;">(${trendText})</span>`;
            }
        } catch (e) {
            console.error('BTC ws error', e);
        }
    };
    wsBtc.onerror = () => console.log("BTC ws error");
    wsBtc.onclose = () => setTimeout(initBtcTicker, 5000);
}

// ─── Bot Selector Logic (Modal) ───
const BOT_VISIBILITY_KEY = 'b5-bot-visibility';
const btnBotManager = document.getElementById('btn-bot-manager');
const btnCloseBotManager = document.getElementById('btn-close-bot-manager');
const btnSaveBots = document.getElementById('btn-save-bots');
const botManagerModal = document.getElementById('bot-manager-modal');
const botSelectorList = document.getElementById('bot-selector-list');

async function updateHamzaStatusUI() {
    const toggle = document.getElementById('hamza-toggle');
    const badge = document.getElementById('hamza-badge');
    if (!toggle || !badge) return;

    try {
        const response = await fetch('http://localhost:3000/api/bots/hamza/status');
        const { data } = await response.json();
        
        toggle.checked = data.isEnabled;
        badge.innerText = data.isEnabled ? 'ACTIVE' : 'OFF';
        badge.className = `hamza-status-badge ${data.isEnabled ? 'hamza-status-active' : 'hamza-status-paused'}`;
    } catch (e) {
        console.error('Hamza status fetch error:', e);
    }
}

// Attach listener once elements are ready
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('hamza-toggle');
    if (toggle) {
        toggle.addEventListener('change', async () => {
            const status = toggle.checked;
            try {
                await fetch('http://localhost:3000/api/bots/hamza/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
                updateHamzaStatusUI();
            } catch (e) {
                console.error('Hamza toggle error:', e);
            }
        });
    }
});

btnBotManager.addEventListener('click', () => {
    updateHamzaStatusUI();
    botManagerModal.classList.add('active');
});

btnCloseBotManager.addEventListener('click', () => {
    botManagerModal.classList.remove('active');
});

btnSaveBots.addEventListener('click', () => {
    updateColumnVisibility();
    botManagerModal.classList.remove('active');
});

// Close on outside click
botManagerModal.addEventListener('click', (e) => {
    if (e.target === botManagerModal) botManagerModal.classList.remove('active');
});

function updateColumnVisibility() {
    const checkboxes = botSelectorList.querySelectorAll('input[type="checkbox"]');
    const visibility = {};
    let visibleCount = 0;

    checkboxes.forEach(cb => {
        const colId = cb.dataset.col;
        const column = document.getElementById(`col-${colId}`);
        if (!column) return;
        
        const resizer = column.nextElementSibling?.classList.contains('resizer') ? column.nextElementSibling : null;

        if (cb.checked) {
            if (visibleCount < 5) {
                column.style.display = 'flex';
                if (resizer) resizer.style.display = 'flex';
                visibility[colId] = true;
                visibleCount++;
            } else {
                cb.checked = false; // Limit reached
                visibility[colId] = false;
            }
        } else {
            column.style.display = 'none';
            if (resizer) resizer.style.display = 'none';
            visibility[colId] = false;
        }
    });

    localStorage.setItem(BOT_VISIBILITY_KEY, JSON.stringify(visibility));
    
    // Refresh widths to handle the layout change
    if (window.applyWidths && window.loadWidths) {
        window.applyWidths(window.loadWidths());
    }
}

function initBotSelector() {
    let saved;
    try {
        saved = JSON.parse(localStorage.getItem(BOT_VISIBILITY_KEY));
    } catch (_) { }

    const checkboxes = botSelectorList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        const colId = cb.dataset.col;
        if (saved && saved[colId] !== undefined) {
            cb.checked = saved[colId];
        }
    });

    updateColumnVisibility();
}

// ─── Detay Scan UI Logic ───
function updateDetayScanProgress(scanned, total) {
    const pct = Math.round((scanned / total) * 100);
    const progressText = document.getElementById('scan-progress-text');
    if (progressText) {
        progressText.innerText = `Taranıyor: ${scanned} / ${total} (%${pct})`;
    }
}

async function startDetayScan() {
    const progressContainer = document.getElementById('scan-progress-container');
    const progressText = document.getElementById('scan-progress-text');
    const btnRun = document.getElementById('btn-run-detay-scan');
    const tableBody = document.getElementById('detay-scan-body');

    if (progressContainer) progressContainer.style.display = 'flex';
    if (progressText) progressText.innerText = 'Hazırlanıyor...';
    if (btnRun) btnRun.disabled = true;

    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 60px;">
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px;">
                        <i class="fa-solid fa-arrows-spin fa-spin" style="font-size: 2.5rem; color: #60a5fa;"></i>
                        <span style="font-weight: 500; font-size: 1rem; color: var(--text-primary);">Binance Futures 1 Günlük verileri taranıyor...</span>
                        <span style="opacity: 0.6; font-size: 0.85rem;">Bu işlem yaklaşık 5-10 saniye sürebilir.</span>
                    </div>
                </td>
            </tr>
        `;
    }

    try {
        const response = await api.runDetayScan();
        if (btnRun) btnRun.disabled = false;
        if (progressContainer) progressContainer.style.display = 'none';

        if (response.success && response.data && response.data.length > 0) {
            tableBody.innerHTML = response.data.map(match => renderDetayScanRow(match)).join('');
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 60px; opacity: 0.5;">
                        <i class="fa-solid fa-circle-info" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                        Uyumsuzluk veya RSI-SMA dipten/tepeden kesişim kriterlerine uygun coin bulunamadı.
                    </td>
                </tr>
            `;
        }
    } catch (err) {
        if (btnRun) btnRun.disabled = false;
        if (progressContainer) progressContainer.style.display = 'none';
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 60px; color: var(--red);">
                        <i class="fa-solid fa-circle-exclamation" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                        Tarama sırasında hata oluştu: ${err.message}
                    </td>
                </tr>
            `;
        }
    }
}

function renderDetayScanRow(match) {
    const isLong = match.signalType === 'Long';
    const directionBadge = isLong 
        ? `<span style="background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 4px 10px; border-radius: 6px; font-weight: bold; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 0.8rem;"><i class="fa-solid fa-circle-up"></i> LONG</span>`
        : `<span style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 4px 10px; border-radius: 6px; font-weight: bold; border: 1px solid rgba(239, 68, 68, 0.3); font-size: 0.8rem;"><i class="fa-solid fa-circle-down"></i> SHORT</span>`;

    const changeColor = parseFloat(match.dailyChange) >= 0 ? '#10b981' : '#ef4444';
    const changeSign = parseFloat(match.dailyChange) > 0 ? '+' : '';
    const changeBadge = `<span style="color: ${changeColor}; font-weight: bold; font-family: 'JetBrains Mono', monospace;">${changeSign}${match.dailyChange}%</span>`;

    const rsiColor = isLong ? '#60a5fa' : '#f472b6';
    const rsiBadge = `<span style="font-family: 'JetBrains Mono', monospace; font-weight: bold;"><b style="color: ${rsiColor}">${match.rsi}</b> <span style="opacity:0.3;">/</span> <span style="color: #94a3b8">${match.rsiSma}</span></span>`;

    let divergenceHtml = '<span style="opacity:0.3; font-size:0.85rem;">- Uyumsuzluk Yok -</span>';
    if (match.divergence) {
        const divColor = match.divergence.type === 'bullish' ? '#10b981' : '#ef4444';
        const divTypeTr = match.divergence.type === 'bullish' ? 'Pozitif (Bullish)' : 'Negatif (Bearish)';
        divergenceHtml = `
            <div style="text-align: left; font-size: 0.8rem; background: rgba(255,255,255,0.02); padding: 8px; border-radius: 6px; border-left: 3px solid ${divColor}; max-width: 320px; line-height: 1.4;">
                <b style="color: ${divColor}; font-size:0.85rem; display: block; margin-bottom: 2px;">${divTypeTr} Uyumsuzluk</b>
                <span style="opacity: 0.8; display: block;">• Fiyat: ${match.divergence.priceDiff}</span>
                <span style="opacity: 0.8; display: block;">• RSI: ${match.divergence.rsiDiff}</span>
                <span style="font-size:0.75rem; opacity:0.5; display:block; margin-top:2px;">• Dönem: ${match.divergence.dateRange}</span>
            </div>
        `;
    }

    const stars = match.score === 3 ? '⭐⭐⭐' : '⭐';
    const starsHtml = `<span style="color: #fbbf24; font-size: 1.1rem; font-weight: bold; letter-spacing: 2px;">${stars}</span>`;

    const cleanSymbol = match.symbol.replace('USDT', '') + 'USDT';
    const binanceUrl = `https://www.binance.com/en/futures/${match.symbol}`;

    return `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
            <td style="padding: 15px; font-weight: bold;">
                <a href="${binanceUrl}" target="_blank" style="color: #60a5fa; text-decoration: none; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.8rem; opacity: 0.7;"></i>
                    ${cleanSymbol}
                </a>
            </td>
            <td style="padding: 15px;">${directionBadge}</td>
            <td style="padding: 15px; font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #fff;">$${match.price}</td>
            <td style="padding: 15px;">${changeBadge}</td>
            <td style="padding: 15px;">${rsiBadge}</td>
            <td style="padding: 15px;">${divergenceHtml}</td>
            <td style="padding: 15px; text-align: center;">${starsHtml}</td>
        </tr>
    `;
}

// ─── Start ───
document.addEventListener('DOMContentLoaded', () => {
    restoreFromCache();
    connect();
    initBtcTicker();
    initBotSelector();
    updateHamzaStatusUI(); // 🛡️ Sync Hamza status on page load

    // ─── Detay Scan Listeners ───
    const btnDetayScan = document.getElementById('btn-detay-scan');
    const detayScanModal = document.getElementById('detay-scan-modal');
    const btnCloseDetayScan = document.getElementById('btn-close-detay-scan');
    const btnRunDetayScan = document.getElementById('btn-run-detay-scan');

    if (btnDetayScan && detayScanModal) {
        btnDetayScan.addEventListener('click', () => {
            detayScanModal.classList.add('active');
            startDetayScan();
        });
    }
    if (btnCloseDetayScan && detayScanModal) {
        btnCloseDetayScan.addEventListener('click', () => {
            detayScanModal.classList.remove('active');
        });
    }
    if (btnRunDetayScan) {
        btnRunDetayScan.addEventListener('click', () => {
            startDetayScan();
        });
    }
    if (detayScanModal) {
        detayScanModal.addEventListener('click', (e) => {
            if (e.target === detayScanModal) detayScanModal.classList.remove('active');
        });
    }
});
