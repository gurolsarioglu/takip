require('dotenv').config();
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const binanceService = require('./services/binance.service');
const technicalService = require('./services/technical.service');
const analysisService = require('./services/analysis.service');
const cache = require('./utils/cache');
const alertService = require('./services/alert.service'); // Import AlertService
const bankrollService = require('./services/bankrollService');
const firebaseService = require('./services/firebase.service');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ==================== REST API ENDPOINTS ====================

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

/**
 * GET /api/coins
 * Get all USDT pairs with basic market data
 */
app.get('/api/coins', async (req, res) => {
    try {
        // Check cache first
        const cacheKey = 'all_coins';
        let coins = cache.get(cacheKey);

        if (!coins) {
            console.log('Cache miss - fetching from Binance API');
            coins = await binanceService.get24hrTickers();
            cache.set(cacheKey, coins, 30); // Cache for 30 seconds
        }

        res.json({
            success: true,
            count: coins.length,
            data: coins,
            cached: !!cache.get(cacheKey)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/coins/:symbol
 * Get detailed data for a specific coin including technical indicators
 */
app.get('/api/coins/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const cacheKey = `coin_${symbol}`;

        let coinData = cache.get(cacheKey);

        if (!coinData) {
            // Get ticker data
            const allTickers = await binanceService.get24hrTickers();
            const ticker = allTickers.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());

            if (!ticker) {
                return res.status(404).json({
                    success: false,
                    error: 'Symbol not found'
                });
            }

            // Get klines for technical analysis
            const klines = await binanceService.getKlines(symbol, '1h', 100);
            const closePrices = klines.map(k => k.close);

            // Calculate technical indicators
            const indicators = await technicalService.calculateAllIndicators(closePrices);

            coinData = {
                ...ticker,
                technicalIndicators: indicators,
                klineData: {
                    interval: '1h',
                    count: klines.length
                }
            };

            cache.set(cacheKey, coinData, 60); // Cache for 60 seconds
        }

        res.json({
            success: true,
            data: coinData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/coins-with-indicators
 * Get all USDT pairs with technical indicators (heavy operation)
 * This endpoint processes data in batches
 */
app.get('/api/coins-with-indicators', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const cacheKey = `coins_indicators_${limit}`;

        let data = cache.get(cacheKey);

        if (!data) {
            // Get all tickers
            const tickers = await binanceService.get24hrTickers();

            // Sort by volume and take top coins
            const topCoins = tickers
                .sort((a, b) => b.quoteVolume - a.quoteVolume)
                .slice(0, limit);

            // Calculate indicators for each coin in parallel (with limit)
            const batchSize = 5;
            const results = [];

            for (let i = 0; i < topCoins.length; i += batchSize) {
                const batch = topCoins.slice(i, i + batchSize);
                const batchResults = await Promise.all(
                    batch.map(async (coin) => {
                        try {
                            const klines = await binanceService.getKlines(coin.symbol, '1h', 100);
                            const closePrices = klines.map(k => k.close);
                            const indicators = await technicalService.calculateAllIndicators(closePrices);

                            return {
                                ...coin,
                                technicalIndicators: indicators
                            };
                        } catch (error) {
                            console.error(`Error processing ${coin.symbol}:`, error.message);
                            return {
                                ...coin,
                                technicalIndicators: {
                                    rsi: null,
                                    stochRSI: null,
                                    error: error.message
                                }
                            };
                        }
                    })
                );

                results.push(...batchResults);
            }

            data = results;
            cache.set(cacheKey, data, 120); // Cache for 2 minutes
        }

        res.json({
            success: true,
            count: data.length,
            data,
            cached: !!cache.get(cacheKey)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/btc-status
 * Get Bitcoin market analysis and trend
 */
app.get('/api/btc-status', async (req, res) => {
    try {
        const cacheKey = 'btc_status';
        let btcStatus = cache.get(cacheKey);

        if (!btcStatus) {
            btcStatus = await analysisService.analyzeBTCStatus();
            cache.set(cacheKey, btcStatus, 60); // Cache for 60 seconds
        }

        res.json({
            success: true,
            data: btcStatus,
            cached: !!cache.get(cacheKey)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/top-drops
 * Get coins with biggest price drops
 */
app.get('/api/top-drops', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const drops = await binanceService.getBiggestDrops(limit);

        res.json({
            success: true,
            count: drops.length,
            data: drops
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/top-volume
 * Get coins with highest trading volume
 */
app.get('/api/top-volume', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const topCoins = await binanceService.getTopCoinsByVolume(limit);

        res.json({
            success: true,
            count: topCoins.length,
            data: topCoins
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/cache/stats
 * Get cache statistics
 */
app.get('/api/cache/stats', (req, res) => {
    res.json({
        success: true,
        data: cache.getStats(),
        keys: cache.keys()
    });
});

/**
 * DELETE /api/cache
 * Clear all cache
 */
app.delete('/api/cache', (req, res) => {
    cache.flush();
    res.json({
        success: true,
        message: 'Cache cleared'
    });
});

/**
 * GET /api/bankroll
 * Get all bankroll entries
 */
app.get('/api/bankroll', (req, res) => {
    try {
        res.json({ success: true, data: bankrollService.getBankroll() });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/bankroll
 * Update bankroll entries
 */
app.post('/api/bankroll', (req, res) => {
    try {
        bankrollService.saveBankroll(req.body);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * GET /api/watchlist
 * Read watchlist.txt and return the coins
 */
app.get('/api/watchlist', (req, res) => {
    try {
        const filePath = path.join(__dirname, '..', 'watchlist.txt');
        if (!fs.existsSync(filePath)) {
            // Create default
            fs.writeFileSync(filePath, 'BTCUSDT\nETHUSDT\nSOLUSDT\nBNBUSDT\nAVAXUSDT\nLINKUSDT', 'utf8');
        }
        const text = fs.readFileSync(filePath, 'utf8');
        const coins = text.split('\n')
            .map(c => c.trim().toUpperCase())
            .filter(c => c && c.endsWith('USDT'));
            
        res.json({ success: true, count: coins.length, data: coins });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * GET /api/watchlist/data
 * Return the combined ticker + funding rate for watchlist symbols via REST Polling
 */
app.get('/api/watchlist/data', async (req, res) => {
    try {
        const filePath = path.join(__dirname, '..', 'watchlist.txt');
        if (!fs.existsSync(filePath)) return res.json({ success: true, data: {} });
        
        const text = fs.readFileSync(filePath, 'utf8');
        const watchSet = new Set(text.split('\n').map(c => c.trim().toUpperCase()).filter(c => c && c.endsWith('USDT')));

        if (watchSet.size === 0) return res.json({ success: true, data: {} });

        const cacheKey = 'wl_data_poll';
        let wlDataMap = cache.get(cacheKey);

        if (!wlDataMap) {
            wlDataMap = {};
            // Fetch both sequentially to avoid rate limiting
            const tickers = await binanceService.get24hrTickers();
            const indicesMap = await binanceService.getAllPremiumIndices().catch(() => ({}));

            // Process tickers
            tickers.forEach(t => {
                if (watchSet.has(t.symbol)) {
                    wlDataMap[t.symbol] = {
                        price: t.currentPrice.toFixed(4),
                        chg: t.priceChangePercent.toFixed(2),
                        volRaw: t.quoteVolume,
                        fr: '-',
                        frH: '-'
                    };
                }
            });

            // Formats and Funding rates
            watchSet.forEach(sym => {
                if (wlDataMap[sym]) {
                    // Vol format
                    let volVal = wlDataMap[sym].volRaw;
                    if (volVal !== undefined) {
                        if (volVal > 1_000_000) wlDataMap[sym].vol = (volVal / 1_000_000).toFixed(2) + 'M';
                        else if (volVal > 1_000) wlDataMap[sym].vol = (volVal / 1_000).toFixed(2) + 'K';
                        else wlDataMap[sym].vol = volVal.toFixed(2);
                    } else {
                        wlDataMap[sym].vol = '-';
                    }

                    // Funding format
                    if (indicesMap[sym]) {
                        const idx = indicesMap[sym];
                        wlDataMap[sym].fr = (parseFloat(idx.lastFundingRate) * 100).toFixed(4);
                        
                        if (idx.nextFundingTime) {
                            const nextFunding = new Date(parseInt(idx.nextFundingTime));
                            const diff = nextFunding - new Date();
                            if (diff > 0) {
                                const h = Math.floor(diff / 3600000);
                                const m = Math.floor((diff % 3600000) / 60000);
                                const s = Math.floor((diff % 60000) / 1000);
                                wlDataMap[sym].frH = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                            } else {
                                wlDataMap[sym].frH = "00:00:00";
                            }
                        }
                    }
                }
            });

            cache.set(cacheKey, wlDataMap, 5); // 5 sec cache
        }

        res.json({ success: true, data: wlDataMap });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * GET /api/watchlist/:symbol/metrics
 * Get Long/Short ratio and Open Interest for a specific symbol
 */
app.get('/api/watchlist/:symbol/metrics', async (req, res) => {
    try {
        const { symbol } = req.params;
        const cacheKey = `wl_metrics_${symbol}`;
        let metrics = cache.get(cacheKey);

        if (!metrics) {
            const [lsData, openInterest] = await Promise.all([
                binanceService.getTopLongShortRatio(symbol, '5m'),
                binanceService.getOpenInterest(symbol)
            ]);
            
            metrics = {
                longShortRatio: lsData ? lsData.longShortRatio : null,
                longAccount: lsData ? lsData.longAccount : null,
                shortAccount: lsData ? lsData.shortAccount : null,
                openInterest: openInterest
            };
            
            // Cache for 1 minute
            cache.set(cacheKey, metrics, 60);
        }

        res.json({ success: true, data: metrics });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/signals/emit
 * Broadcast a signal to all connected WebSocket clients
 */
app.post('/api/signals/emit', async (req, res) => {
    // Save to Firebase asynchronously
    firebaseService.logSignal(req.body).catch(e => {
        console.error('Error in Firebase logging:', e.message);
    });

    if (global.wss) {
        global.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'signal', data: req.body }));
            }
        });
    }
    res.json({ success: true });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
    });
});

// Start server
const server = app.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Binance Crypto Monitor API Server                   ║
║                                                           ║
║   Server running on: http://localhost:${port}              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                          ║
║                                                           ║
║   Available endpoints:                                    ║
║   - GET  /api/health                                      ║
║   - GET  /api/coins                                       ║
║   - GET  /api/coins/:symbol                               ║
║   - POST /api/subscribe                                   ║
║   - GET  /api/coins-with-indicators?limit=20              ║
║   - GET  /api/btc-status                                  ║
║   - GET  /api/top-drops?limit=10                          ║
║   - GET  /api/top-volume?limit=10                         ║
║   - GET  /api/cache/stats                                 ║
║   - DEL  /api/cache                                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

const wss = new WebSocket.Server({ server });
global.wss = wss;
wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    ws.on('close', () => console.log('Client disconnected'));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
