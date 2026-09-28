/**
 * bot-hub.plugin.js — Çoklu Bot & Sinyal İstasyonu (Multi-Bot Station)
 * Hammer Pro, M1 Premium, M1-A, FR, Divergence ve V3-A (Hacim) motorları.
 * Dikey metalik bot şeridi ve interaktif sinyal kartları.
 */
const BotHubPlugin = (() => {
  let activeBot = 'hammerproplus'; // Hammer Pro Plus Botu aktif
  let hammerProPlusSignals = [];
  let hammerSignals = [];
  let m1Signals = [];
  let m1aSignals = [];
  let frSignals = [];
  let divSignals = [];
  let v3Signals = [];
  let fourSSignals = [];
  let fourSSniperSignals = [];
  let pollInterval = null;

  const BOT_CONFIGS = {
    'hammerproplus': {
      id: 'hammerproplus',
      title: 'Hammer Pro Plus',
      subtitle: 'Advanced structural pattern framework',
      iconClass: 'proplus',
      iconHtml: '<span style="font-size:11px;">🔨</span><span style="font-size:6px;font-weight:900;color:#fdba74;line-height:1;">PRO+</span>',
      iconText: '🔨+',
      summaryStats: 'Advanced structural pattern framework  |  Today',
    },
    '4ssniper': {
      id: '4ssniper',
      title: '4S Sniper',
      subtitle: 'Multi-angle view of the 4H structure',
      iconClass: 'bronze',
      iconText: '4S',
      summaryStats: 'Multi-angle view of the 4H structure  |  Today',
    },
    '4s': {
      id: '4s',
      title: '4S',
      subtitle: 'Multi-angle view of the 4H structure',
      iconClass: 'red',
      iconText: '4S',
      summaryStats: 'Multi-angle view of the 4H structure  |  Today',
    },
    v3: {
      id: 'v3',
      title: 'V3-A',
      subtitle: 'Real-time volume monitoring',
      iconClass: 'green',
      iconText: 'V3',
      summaryStats: 'Real-time Volume Inflow  |  24h Base Volume  |  Instant Spikes',
    },
    div: {
      id: 'div',
      title: 'Divergence',
      subtitle: 'Momentum and price relationship analysis',
      iconClass: 'hammer',
      iconText: 'DIV',
      summaryStats: '1H RSI Divergence  |  RSI-SMA Crosses  |  1h/4h/1d HTF',
    },
    fr: {
      id: 'fr',
      title: 'FR',
      subtitle: 'Funding rate perspective, simulation & arbitrage alerts',
      iconClass: 'cyan',
      iconText: 'FR',
      summaryStats: 'Funding Flip: + to - ⚠️  |  Negative Rate Squeeze Watch',
    },
    m1a: {
      id: 'm1a',
      title: 'M1-A',
      subtitle: 'Focused insight on the smallest timeframe',
      iconClass: 'gold',
      iconText: 'M1',
      summaryStats: 'BTC Status: Normal  |  Stochastic (K/D) Tracking  |  Micro Drops',
    },
    m1premium: {
      id: 'm1premium',
      title: 'M1 Premium',
      subtitle: 'Enhanced minute-level analytics & divergence',
      iconClass: 'gold',
      iconText: 'M1P',
      summaryStats: 'Avg Boost: +1.56%  |  RSI 1m: >70 ❗  |  Div: 1m ✅',
    },
    hammerpro: {
      id: 'hammerpro',
      title: 'Hammer Pro',
      subtitle: 'Automated pattern analysis & reversal scanner',
      iconClass: 'hammer',
      iconText: '🔨',
      summaryStats: 'SRS: 1m.29 | 5m.0 ❗ | 1h.7 ❗  |  WT: 1m 🟢',
    }
  };

  async function fetchSignals() {
    try {
      const [hRes, hpRes, mRes, aRes, fRes, dRes, vRes, sRes, snRes] = await Promise.all([
        fetch('/api/signals?bot=hammerpro'),
        fetch('/api/signals?bot=hammerproplus'),
        fetch('/api/signals?bot=m1premium'),
        fetch('/api/signals?bot=m1a'),
        fetch('/api/signals?bot=fr'),
        fetch('/api/signals?bot=div'),
        fetch('/api/signals?bot=v3'),
        fetch('/api/signals?bot=4s'),
        fetch('/api/signals?bot=4ssniper')
      ]);

      if (hRes.ok) {
        const d = await hRes.json();
        hammerSignals = d.signals || [];
      }
      if (hpRes.ok) {
        const d = await hpRes.json();
        hammerProPlusSignals = d.signals || [];
      }
      if (mRes.ok) {
        const d = await mRes.json();
        m1Signals = d.signals || [];
      }
      if (aRes.ok) {
        const d = await aRes.json();
        m1aSignals = d.signals || [];
      }
      if (fRes.ok) {
        const d = await fRes.json();
        frSignals = d.signals || [];
      }
      if (dRes.ok) {
        const d = await dRes.json();
        divSignals = d.signals || [];
      }
      if (vRes.ok) {
        const d = await vRes.json();
        v3Signals = d.signals || [];
      }
      if (sRes.ok) {
        const d = await sRes.json();
        fourSSignals = d.signals || [];
      }
      if (snRes.ok) {
        const d = await snRes.json();
        fourSSniperSignals = d.signals || [];
      }

      renderFeed();
    } catch (e) {
      console.warn('[BotHub] fetch signals error:', e);
    }
  }

  function renderFeed() {
    const listEl = document.getElementById('bot-signals-scroll');
    if (!listEl) return;

    let signals = [];
    if (activeBot === 'hammerproplus') signals = hammerProPlusSignals;
    else if (activeBot === '4ssniper') signals = fourSSniperSignals;
    else if (activeBot === '4s') signals = fourSSignals;
    else if (activeBot === 'v3') signals = v3Signals;
    else if (activeBot === 'div') signals = divSignals;
    else if (activeBot === 'fr') signals = frSignals;
    else if (activeBot === 'm1a') signals = m1aSignals;
    else if (activeBot === 'm1premium') signals = m1Signals;
    else signals = hammerSignals;

    if (!signals.length) {
      listEl.innerHTML = `<div style="text-align:center;color:#64748b;padding:20px;">Sinyal taranıyor...</div>`;
      return;
    }

    // ─── 0. Hammer Pro Plus (Advanced structural pattern framework) Kartları ─────────────
    if (activeBot === 'hammerproplus') {
      let html = '';
      let hasToday = false;

      signals.forEach(s => {
        if (!hasToday && s.dateLabel === 'Today') {
          hasToday = true;
          html += `
            <div class="signal-date-divider">
              <span>Today</span>
            </div>
          `;
        }

        const dot = s.dot || '🟢';
        const titleColor = '#38bdf8';

        html += `
          <div class="signal-card" data-symbol="${s.symbol}">
            <div class="card-top-row">
              <span class="card-symbol" style="color: ${titleColor}; font-weight:700;">
                ${dot} #${s.symbol} ${s.stars ? `<span class="card-star" style="color:#fbbf24;margin-left:4px;">${s.stars}</span>` : ''}
              </span>
            </div>

            ${s.strategy ? `
            <div class="card-field-row" style="margin-top: 4px;">
              <span>Strategy:</span>
              <span class="card-field-val" style="color: #fff; font-weight: 700;">${s.strategy}</span>
            </div>` : ''}

            <div class="card-field-row">
              <span>Boost Value:</span>
              <span class="card-field-val" style="color: #0ecb81; font-weight: 700;">${s.boostValue}</span>
            </div>

            <div class="card-field-row">
              <span>Current Price:</span>
              <span class="card-field-val">${s.currentPrice}</span>
            </div>

            <div class="card-field-row">
              <span>Previous Price:</span>
              <span class="card-field-val">${s.prevPrice}</span>
            </div>

            <div class="card-field-row">
              <span>RSI:</span>
              <span class="card-field-val" style="font-size: 11px;">
                <strong>1m.${s.rsi.m1}</strong> | <strong>5m.${s.rsi.m5}</strong> | <strong>1h.${s.rsi.h1}</strong>
              </span>
            </div>

            <div class="card-field-row">
              <span>SRSI:</span>
              <span class="card-field-val" style="font-size: 11px;">
                <strong>1m.${s.srsi.m1}</strong> | <strong>5m.${s.srsi.m5}</strong> | <strong>1h.${s.srsi.h1}</strong>
              </span>
            </div>

            ${s.wt ? `
            <div class="card-field-row">
              <span>WT:</span>
              <span class="card-field-val" style="font-weight: 600;">${s.wt}</span>
            </div>` : ''}

            ${s.pivot ? `
            <div class="card-field-row">
              <span>Pivot:</span>
              <span class="card-field-val" style="color: #f59e0b; font-weight: 600;">${s.pivot}</span>
            </div>` : ''}

            <div class="card-footer">
              <span class="card-link-icon" title="Grafikte Aç">↗</span>
              <span class="card-time">${s.time}</span>
            </div>
          </div>
        `;
      });

      listEl.innerHTML = html;
      return;
    }

    // ─── 0. 4S Sniper (NW UP Structure Reversal) Kartları ─────────────
    if (activeBot === '4ssniper') {
      let html = '';
      let hasToday = false;

      signals.forEach(s => {
        if (!hasToday && s.dateLabel === 'Today') {
          hasToday = true;
          html += `
            <div class="signal-date-divider">
              <span>Today</span>
            </div>
          `;
        }

        const dot = s.dot || '🟢';
        const titleColor = '#38bdf8';

        html += `
          <div class="signal-card" data-symbol="${s.symbol}">
            <div class="card-top-row">
              <span class="card-symbol" style="color: ${titleColor}; font-weight:700;">
                ${dot} #${s.displaySymbol || s.symbol}
              </span>
            </div>

            <div class="card-field-row" style="margin-top: 4px;">
              <span>Strategy:</span>
              <span class="card-field-val" style="color: #fff; font-weight: 700;">${s.strategy || 'NW UP'}</span>
            </div>

            <div class="card-field-row">
              <span>Boost Value:</span>
              <span class="card-field-val" style="color: #0ecb81; font-weight: 700;">${s.boostValue}</span>
            </div>

            <div class="card-field-row">
              <span>Current Price:</span>
              <span class="card-field-val">${s.currentPrice}</span>
            </div>

            <div class="card-field-row">
              <span>Previous Price:</span>
              <span class="card-field-val">${s.prevPrice}</span>
            </div>

            <div class="card-field-row">
              <span>RSI:</span>
              <span class="card-field-val" style="font-size: 11px;">
                <strong>1h.${s.rsi.h1}</strong> | <strong>4h.${s.rsi.h4}</strong> | <strong>1d.${s.rsi.d1}</strong>
              </span>
            </div>

            <div class="card-field-row">
              <span>SRSI:</span>
              <span class="card-field-val" style="font-size: 11px;">
                <strong>1h.${s.srsi.h1}</strong> | <strong>4h.${s.srsi.h4}</strong> | <strong>1d.${s.srsi.d1}</strong>
              </span>
            </div>

            <div class="card-field-row">
              <span>Trader Positioning:</span>
              <span class="card-field-val" style="font-weight: 600;">
                ${s.traderPositioning} <span style="font-size: 10px;">${s.traderDot || '🟢'}</span>
              </span>
            </div>

            <div class="card-field-row">
              <span>Market Exposure:</span>
              <span class="card-field-val" style="font-weight: 600;">
                ${s.marketExposure} <span style="font-size: 10px;">${s.exposureDot || '🟢'}</span>
              </span>
            </div>

            <div class="card-footer">
              <span class="card-link-icon">↗</span>
              <span>${s.time}</span>
            </div>
          </div>
        `;
      });

      listEl.innerHTML = html;
    }

    // ─── 1. 4S (Multi-angle view of the 4H structure) Kartları ───────
    else if (activeBot === '4s') {
      let html = '';
      let hasToday = false;

      signals.forEach(s => {
        if (!hasToday && s.dateLabel === 'Today') {
          hasToday = true;
          html += `
            <div class="signal-date-divider">
              <span>Today</span>
            </div>
          `;
        }

        const dot = s.dot || '🔴';
        const titleColor = '#38bdf8';

        html += `
          <div class="signal-card" data-symbol="${s.symbol}">
            <div class="card-top-row">
              <span class="card-symbol" style="color: ${titleColor}; font-weight:700;">
                ${dot} #${s.symbol}
              </span>
            </div>

            <div class="card-field-row" style="margin-top: 4px;">
              <span>Market:</span>
              <span class="card-field-val" style="color: #94a3b8; font-weight: 600;">${s.market || 'FUTURES'}</span>
            </div>

            <div class="card-field-row">
              <span>Boost Value:</span>
              <span class="card-field-val" style="color: #0ecb81; font-weight: 700;">${s.boostValue}</span>
            </div>

            <div class="card-field-row">
              <span>Current Price:</span>
              <span class="card-field-val">${s.currentPrice}</span>
            </div>

            <div class="card-field-row">
              <span>Previous Price:</span>
              <span class="card-field-val">${s.prevPrice}</span>
            </div>

            <div class="card-field-row">
              <span>RSI:</span>
              <span class="card-field-val" style="font-size: 11px;">
                <strong>1h.${s.rsi.h1}</strong> | <strong>4h.${s.rsi.h4}</strong> | <strong>1d.${s.rsi.d1}</strong>
              </span>
            </div>

            <div class="card-field-row">
              <span>SRSI:</span>
              <span class="card-field-val" style="font-size: 11px;">
                <strong>1h.${s.srsi.h1}</strong> | <strong>4h.${s.srsi.h4}</strong> | <strong>1d.${s.srsi.d1}</strong>
              </span>
            </div>

            <div class="card-field-row">
              <span>Trader Positioning:</span>
              <span class="card-field-val" style="font-weight: 600;">
                ${s.traderPositioning} <span style="font-size: 10px;">🟢</span>
              </span>
            </div>

            <div class="card-field-row">
              <span>Market Exposure:</span>
              <span class="card-field-val" style="font-weight: 600;">
                ${s.marketExposure} <span style="font-size: 10px;">🟢</span>
              </span>
            </div>

            <div class="card-footer">
              <span class="card-link-icon">↗</span>
              <span>${s.time}</span>
            </div>
          </div>
        `;
      });

      listEl.innerHTML = html;
    }

    // ─── 2. V3-A (Hacim Botu) Kartları ──────────────────────────────
    else if (activeBot === 'v3') {
      listEl.innerHTML = signals.map(s => `
        <div class="signal-card" data-symbol="${s.symbol}">
          <div class="card-top-row">
            <span class="card-symbol" style="color: #38bdf8;">
              #${s.symbol}
            </span>
          </div>

          <div class="card-field-row" style="margin-top: 4px;">
            <span>Hacim:</span>
            <span style="color: var(--green); font-weight: 700;">${s.hacimChange}</span>
          </div>
          <div class="card-field-row">
            <span>24s Hacim:</span>
            <span class="card-field-val">${s.hacim24s}</span>
          </div>

          <div class="card-footer">
            <span class="card-link-icon">↗ Binance</span>
            <span>${s.time}</span>
          </div>
        </div>
      `).join('');
    }

    // ─── 2. Divergence (DIV) Kartları ───────────────────────────────
    else if (activeBot === 'div') {
      let html = '';
      let lastDate = null;

      signals.forEach(s => {
        if (s.dateLabel && s.dateLabel !== lastDate) {
          lastDate = s.dateLabel;
          html += `
            <div style="display:flex; justify-content:center; margin: 6px 0;">
              <span class="today-pill" style="font-size: 10px; background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 10px;">${lastDate}</span>
            </div>
          `;
        }

        const dot = s.dot ? `${s.dot} ` : '';
        const titleColor = s.dot === '🔴' ? '#f87171' : '#38bdf8';

        html += `
          <div class="signal-card" data-symbol="${s.symbol}">
            <div class="card-top-row">
              <span class="card-symbol" style="color: ${titleColor};">
                ${dot}#${s.symbol}
              </span>
            </div>

            <div class="card-field-row">
              <span>Strategy:</span>
              <span style="color: #38bdf8; font-weight: 700;">${s.strategy}</span>
            </div>
            <div class="card-field-row">
              <span>Boost Value:</span>
              <span class="card-boost-val">${s.boostValue}</span>
            </div>
            <div class="card-field-row">
              <span>Current Price:</span>
              <span class="card-field-val">${s.currentPrice}</span>
            </div>
            <div class="card-field-row">
              <span>Previous Price:</span>
              <span class="card-field-val">${s.prevPrice}</span>
            </div>

            <div class="card-multi-indicator">
              RSI: <strong>1h.${s.rsi.h1}</strong> | <strong>4h.${s.rsi.h4}</strong> | <strong>1d.${s.rsi.d1}</strong>
            </div>
            <div class="card-multi-indicator">
              SRSI: <strong>1h.${s.srsi.h1}</strong> | <strong>4h.${s.srsi.h4}</strong> | <strong>1d.${s.srsi.d1}</strong>
            </div>

            ${s.pivot ? `
              <div class="card-alert-line">
                <span>Pivot: ${s.pivot}</span>
              </div>
            ` : ''}

            <div class="card-footer">
              <span class="card-link-icon">↗ Binance</span>
              <span>${s.time}</span>
            </div>
          </div>
        `;
      });

      listEl.innerHTML = html;
    }

    // ─── 3. FR (Funding Rate) Kartları ──────────────────────────────
    else if (activeBot === 'fr') {
      listEl.innerHTML = signals.map(s => {
        const dot = s.dot ? `${s.dot} ` : '';
        const titleColor = s.dot === '🔴' ? '#f87171' : '#38bdf8';

        return `
          <div class="signal-card" data-symbol="${s.symbol}">
            <div class="card-top-row">
              <span class="card-symbol" style="color: ${titleColor};">
                ${dot}#${s.symbol}
              </span>
            </div>

            ${s.alertText ? `
              <div class="card-alert-line" style="color: #fbbf24; margin-bottom: 5px; font-size: 11px;">
                <span>⚠️ ${s.alertText}</span>
              </div>
            ` : ''}

            <div class="card-field-row">
              <span>Funding Rate:</span>
              <span class="card-field-val" style="color: ${s.fundingRate.startsWith('-') ? 'var(--red)' : 'var(--green)'}; font-weight:700;">
                ${s.fundingRate}
              </span>
            </div>

            ${s.previousFunding !== undefined ? `
              <div class="card-field-row">
                <span>Previous Funding:</span>
                <span class="card-field-val">${s.previousFunding}</span>
              </div>
            ` : ''}

            ${s.difference !== undefined ? `
              <div class="card-field-row">
                <span>Difference:</span>
                <span class="card-field-val" style="color: ${s.difference.startsWith('-') ? 'var(--red)' : 'var(--text-main)'}; font-weight:600;">
                  ${s.difference}
                </span>
              </div>
            ` : ''}

            <div class="card-field-row" style="margin-top: 2px;">
              <span>Time Remaining:</span>
              <span style="color: #94a3b8; font-weight: 600;">${s.timeRemaining}</span>
            </div>

            <div class="card-footer">
              <span class="card-link-icon">↗ Binance</span>
              <span>${s.time}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // ─── 4. M1-A Kartları ──────────────────────────────────────────
    else if (activeBot === 'm1a') {
      listEl.innerHTML = signals.map(s => {
        const isDrop = (s.type === 'drop') || (s.dropValue && s.dropValue.startsWith('-'));
        const dot = isDrop ? '🔴' : '🟢';
        const valColor = isDrop ? 'var(--red)' : 'var(--green)';
        const label = isDrop ? 'Drop Value:' : 'Boost Value:';

        return `
          <div class="signal-card" data-symbol="${s.symbol}">
            <div class="card-top-row">
              <span class="card-symbol" style="color: ${isDrop ? '#f87171' : '#38bdf8'};">
                ${dot} #${s.symbol}
              </span>
            </div>

            <div class="card-field-row">
              <span>${label}</span>
              <span style="color: ${valColor}; font-weight: 700;">${s.dropValue}</span>
            </div>
            <div class="card-field-row">
              <span>Current Price:</span>
              <span class="card-field-val">${s.currentPrice}</span>
            </div>
            <div class="card-field-row">
              <span>Previous Price:</span>
              <span class="card-field-val">${s.prevPrice}</span>
            </div>
            <div class="card-field-row">
              <span>Volume:</span>
              <span style="color: ${s.volume && s.volume.startsWith('-') ? 'var(--red)' : 'var(--green)'}; font-weight: 600;">
                ${s.volume}
              </span>
            </div>
            <div class="card-field-row">
              <span>RSI:</span>
              <span style="font-weight: 700; color: ${s.rsi && s.rsi.includes('77') ? 'var(--gold)' : 'var(--text-main)'};">
                ${s.rsi}
              </span>
            </div>
            <div class="card-field-row">
              <span>Stochastic (K/D):</span>
              <span style="font-weight: 700; color: #fff;">${s.stochastic}</span>
            </div>
            <div class="card-field-row">
              <span>BTC Status:</span>
              <span style="color: #94a3b8; font-weight: 600;">${s.btcStatus || 'Normal'}</span>
            </div>

            <div class="card-footer">
              <span class="card-link-icon">↗ Binance</span>
              <span>${s.time}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // ─── 5. M1 Premium Kartları ─────────────────────────────────
    else if (activeBot === 'm1premium') {
      listEl.innerHTML = signals.map(s => `
        <div class="signal-card" data-symbol="${s.symbol}">
          <div class="card-top-row">
            <span class="card-symbol">
              🟢 #${s.symbol} ${s.isFavorite ? '<span class="card-star">⭐</span>' : ''}
            </span>
          </div>

          <div class="card-field-row">
            <span>Boost Value:</span>
            <span class="card-boost-val">${s.boostValue}</span>
          </div>
          <div class="card-field-row">
            <span>Current Price:</span>
            <span class="card-field-val">${s.currentPrice}</span>
          </div>
          <div class="card-field-row">
            <span>Previous Price:</span>
            <span class="card-field-val">${s.prevPrice}</span>
          </div>

          <div class="card-multi-indicator">
            RSI: <strong>1m.${s.rsi.m1}</strong> | <strong>5m.${s.rsi.m5}</strong> | <strong>1h.${s.rsi.h1}</strong>
          </div>
          <div class="card-multi-indicator">
            SRSI: <strong>1m.${s.srsi.m1}</strong> | <strong>5m.${s.srsi.m5}</strong> | <strong>1h.${s.srsi.h1}</strong>
          </div>

          ${s.divergence ? `
            <div class="card-alert-line" style="color:var(--green);">
              <span>Divergence: ${s.divergence}</span>
            </div>
          ` : ''}

          <div class="card-footer">
            <span class="card-link-icon">↗ Binance</span>
            <span>${s.time}</span>
          </div>
        </div>
      `).join('');
    }

    // ─── 6. Hammer Pro Kartları ─────────────────────────────────
    else {
      listEl.innerHTML = signals.map(s => `
        <div class="signal-card" data-symbol="${s.symbol}">
          <div class="card-top-row">
            <span class="card-symbol">🟢 #${s.symbol}</span>
          </div>

          <div class="card-field-row">
            <span>Strategy:</span>
            <span style="color:#38bdf8;font-weight:700;">${s.strategy}</span>
          </div>
          <div class="card-field-row">
            <span>Boost Value:</span>
            <span class="card-boost-val">${s.boostValue}</span>
          </div>
          <div class="card-field-row">
            <span>Current Price:</span>
            <span class="card-field-val">${s.currentPrice}</span>
          </div>
          <div class="card-field-row">
            <span>Previous Price:</span>
            <span class="card-field-val">${s.prevPrice}</span>
          </div>

          <div class="card-multi-indicator">
            RSI: <strong>1m.${s.rsi.m1}</strong> | <strong>5m.${s.rsi.m5}</strong> | <strong>1h.${s.rsi.h1}</strong>
          </div>
          <div class="card-multi-indicator">
            SRSI: <strong>1m.${s.srsi.m1}</strong> | <strong>5m.${s.srsi.m5}</strong> | <strong>1h.${s.srsi.h1}</strong>
          </div>

          <div class="card-field-row" style="margin-top:3px;">
            <span>WT:</span>
            <span style="font-weight:700;">${s.wt}</span>
          </div>

          ${s.pivot ? `
            <div class="card-alert-line">
              <span>Pivot: ${s.pivot}</span>
            </div>
          ` : ''}

          ${s.ema200 ? `
            <div class="card-alert-line">
              <span>4H.E200: ${s.ema200}</span>
            </div>
          ` : ''}

          <div class="card-footer">
            <span class="card-link-icon">↗ Binance</span>
            <span>${s.time}</span>
          </div>
        </div>
      `).join('');
    }
  }

  function switchBot(botId) {
    activeBot = botId;
    const cfg = BOT_CONFIGS[botId] || BOT_CONFIGS.v3;

    // Başlık ve İkon Güncelle
    const titleEl = document.getElementById('bot-header-title');
    const subEl = document.getElementById('bot-header-subtitle');
    const iconEl = document.getElementById('bot-header-icon');
    const statsEl = document.getElementById('bot-summary-stats');

    if (titleEl) titleEl.textContent = cfg.title;
    if (subEl) subEl.textContent = cfg.subtitle;
    if (iconEl) {
      if (cfg.iconHtml) {
        iconEl.innerHTML = cfg.iconHtml;
      } else {
        iconEl.textContent = cfg.iconText;
      }
      iconEl.className = 'bot-header-icon ' + (cfg.iconClass || '');
    }
    if (statsEl) statsEl.textContent = cfg.summaryStats;

    // Şerit butonlarının aktifliğini güncelle
    document.querySelectorAll('.bot-badge-btn').forEach(btn => {
      if (btn.dataset.bot === botId) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    renderFeed();
  }

  function init() {
    // Sinyal listesinde herhangi bir karta tıklandığında sol grafikleri o coine geçir!
    const scrollEl = document.getElementById('bot-signals-scroll');
    if (scrollEl) {
      scrollEl.addEventListener('click', (e) => {
        const card = e.target.closest('.signal-card');
        if (!card) return;
        const sym = card.dataset.symbol;
        if (sym && typeof WatchlistPlugin !== 'undefined') {
          WatchlistPlugin.setActiveSymbol(sym);
        }
      });
    }

    // Şeritteki butonlara tıklama
    document.querySelectorAll('.bot-badge-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const botId = btn.dataset.bot;
        if (botId && BOT_CONFIGS[botId]) {
          switchBot(botId);
        }
      });
    });

    switchBot(activeBot);
    fetchSignals();
    pollInterval = setInterval(fetchSignals, 4000);
  }

  return {
    init,
    switchBot,
  };
})();
