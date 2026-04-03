const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/binance.config');

class BinanceService {
    constructor() {
        this.baseURL = config.BINANCE_API_URL;
        this.apiKey = config.BINANCE_API_KEY;
        this.apiSecret = config.BINANCE_API_SECRET;
        this.supplyCache = null;
        this.supplyCacheTime = 0;
    }

    /**
     * Signed request helper for private endpoints
     */
    async signedRequest(path, params = {}, method = 'GET') {
        const timestamp = Date.now();
        const queryString = Object.keys(params)
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&') + `&timestamp=${timestamp}`;

        const signature = crypto
            .createHmac('sha256', this.apiSecret)
            .update(queryString)
            .digest('hex');

        const url = `https://fapi.binance.com${path}?${queryString}&signature=${signature}`;

        const options = {
            method,
            url,
            headers: {
                'X-MBX-APIKEY': this.apiKey
            }
        };

        try {
            const response = await axios(options);
            return response.data;
        } catch (error) {
            console.error(`Binance signed ${method} error to ${path}:`, error.response ? error.response.data : error.message);
            throw error;
        }
    }

    /**
     * Place a Market Order on Futures
     */
    async placeMarketOrder(symbol, side, quantity) {
        try {
            return await this.signedRequest('/fapi/v1/order', {
                symbol,
                side: side.toUpperCase(),
                type: 'MARKET',
                quantity
            }, 'POST');
        } catch (error) {
            return null;
        }
    }

    /**
     * Set leverage for a symbol
     */
    async setLeverage(symbol, leverage) {
        try {
            return await this.signedRequest('/fapi/v1/leverage', {
                symbol,
                leverage
            }, 'POST');
        } catch (error) {
            return null;
        }
    }

    /**
     * Get Futures USDT Balance
     */
    async getFuturesBalance() {
        try {
            const data = await this.signedRequest('/fapi/v2/account');
            const usdtAsset = data.assets.find(a => a.asset === 'USDT');
            return usdtAsset ? parseFloat(usdtAsset.availableBalance) : 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get all USDT trading pairs with 24h statistics
     */
    async get24hrTickers() {
        try {
            const response = await axios.get(`${this.baseURL}/api/v3/ticker/24hr`);

            // Filter only USDT pairs and exclude leveraged tokens
            const usdtPairs = response.data.filter(ticker =>
                ticker.symbol.endsWith(config.QUOTE_ASSET) &&
                !ticker.symbol.includes('UP') &&
                !ticker.symbol.includes('DOWN') &&
                !ticker.symbol.includes('BULL') &&
                !ticker.symbol.includes('BEAR')
            );

            return usdtPairs.map(ticker => ({
                symbol: ticker.symbol,
                coinName: ticker.symbol.replace(config.QUOTE_ASSET, ''),
                currentPrice: parseFloat(ticker.lastPrice),
                previousPrice: parseFloat(ticker.openPrice),
                priceChange: parseFloat(ticker.priceChange),
                priceChangePercent: parseFloat(ticker.priceChangePercent),
                volume: parseFloat(ticker.volume),
                quoteVolume: parseFloat(ticker.quoteVolume),
                volumeChangePercent: this.calculateVolumeChange(ticker),
                high24h: parseFloat(ticker.highPrice),
                low24h: parseFloat(ticker.lowPrice),
                trades: ticker.count
            }));
        } catch (error) {
            console.error('Error fetching 24hr tickers:', error.message);
            throw new Error('Failed to fetch market data from Binance');
        }
    }

    /**
     * Get all Futures USDT trading pairs with 24h statistics
     */
    async getFutures24hrTickers() {
        try {
            const response = await axios.get(`https://fapi.binance.com/fapi/v1/ticker/24hr`);
            
            return response.data.map(ticker => ({
                symbol: ticker.symbol,
                coinName: ticker.symbol.replace('USDT', ''),
                currentPrice: parseFloat(ticker.lastPrice),
                previousPrice: parseFloat(ticker.openPrice),
                priceChange: parseFloat(ticker.priceChange),
                priceChangePercent: parseFloat(ticker.priceChangePercent),
                volume: parseFloat(ticker.volume),
                quoteVolume: parseFloat(ticker.quoteVolume),
                volumeChangePercent: 0, // Not available directly in fapi
                high24h: parseFloat(ticker.highPrice),
                low24h: parseFloat(ticker.lowPrice),
                trades: ticker.count
            }));
        } catch (error) {
            console.error('Error fetching Futures 24hr tickers:', error.message);
            throw new Error('Failed to fetch futures market data');
        }
    }

    /**
     * Get kline/candlestick data for technical analysis (SPOT)
     */
    async getKlines(symbol, interval = config.KLINE_INTERVAL, limit = config.KLINE_LIMIT) {
        try {
            const response = await axios.get(`${this.baseURL}/api/v3/klines`, {
                params: { symbol, interval, limit }
            });

            return response.data.map(kline => ({
                openTime: kline[0],
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
                volume: parseFloat(kline[5]),
                closeTime: kline[6],
                quoteVolume: parseFloat(kline[7]),
                trades: kline[8]
            }));
        } catch (error) {
            console.error(`Error fetching SPOT klines for ${symbol}:`, error.message);
            throw new Error(`Failed to fetch kline data for ${symbol}`);
        }
    }

    /**
     * Get kline/candlestick data for technical analysis (FUTURES)
     */
    async getFuturesKlines(symbol, interval = config.KLINE_INTERVAL, limit = config.KLINE_LIMIT) {
        try {
            const response = await axios.get(`https://fapi.binance.com/fapi/v1/klines`, {
                params: { symbol, interval, limit }
            });

            return response.data.map(kline => ({
                openTime: kline[0],
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
                volume: parseFloat(kline[5]),
                closeTime: kline[6],
                quoteVolume: parseFloat(kline[7]),
                trades: kline[8]
            }));
        } catch (error) {
            console.error(`Error fetching FUTURES klines for ${symbol}:`, error.message);
            throw new Error(`Failed to fetch futures kline data for ${symbol}`);
        }
    }

    /**
     * Get current price for a specific symbol (Try Spot then Futures)
     */
    async getCurrentPrice(symbol) {
        try {
            const response = await axios.get(`${this.baseURL}/api/v3/ticker/price`, {
                params: { symbol }
            });
            return parseFloat(response.data.price);
        } catch (error) {
            try {
                // Fallback to Futures if Spot fails
                const response = await axios.get(`https://fapi.binance.com/fapi/v1/ticker/price`, {
                    params: { symbol }
                });
                return parseFloat(response.data.price);
            } catch (fErr) {
                console.error(`Error fetching price for ${symbol} on both Spot and Futures:`, fErr.message);
                throw new Error(`Failed to fetch price for ${symbol}`);
            }
        }
    }

    /**
     * Get exchange info to validate symbols
     */
    async getExchangeInfo() {
        try {
            const response = await axios.get(`${this.baseURL}/api/v3/exchangeInfo`);
            return response.data;
        } catch (error) {
            console.error('Error fetching exchange info:', error.message);
            throw new Error('Failed to fetch exchange info');
        }
    }

    /**
     * Calculate volume change percentage
     * Binance doesn't provide this directly, so we estimate it
     */
    calculateVolumeChange(ticker) {
        // This is an approximation since Binance doesn't provide previous volume
        // We can improve this by storing historical data
        const avgVolume = parseFloat(ticker.quoteVolume) / 24; // Rough hourly average
        const currentVolume = parseFloat(ticker.quoteVolume);
        return ((currentVolume - avgVolume) / avgVolume * 100).toFixed(2);
    }

    /**
     * Get top coins by volume
     */
    async getTopCoinsByVolume(limit = 10) {
        try {
            const tickers = await this.get24hrTickers();
            return tickers
                .sort((a, b) => b.quoteVolume - a.quoteVolume)
                .slice(0, limit);
        } catch (error) {
            console.error('Error fetching top coins:', error.message);
            throw error;
        }
    }

    /**
     * Get coins with biggest price drops
     */
    async getBiggestDrops(limit = 10) {
        try {
            const tickers = await this.get24hrTickers();
            return tickers
                .filter(ticker => ticker.priceChangePercent < 0)
                .sort((a, b) => a.priceChangePercent - b.priceChangePercent)
                .slice(0, limit);
        } catch (error) {
            console.error('Error fetching biggest drops:', error.message);
            throw error;
        }
    }

    /**
     * Get Futures Top Trader Long/Short Ratio
     */
    async getTopLongShortRatio(symbol, period = '5m') {
        try {
            // Correct endpoint for Binance Futures Data Statistics
            const response = await axios.get(`https://fapi.binance.com/futures/data/topLongShortPositionRatio`, {
                params: { symbol, period, limit: 1 }
            });
            if (response.data && response.data.length > 0) {
                return {
                    longAccount: parseFloat(response.data[0].longAccount),
                    shortAccount: parseFloat(response.data[0].shortAccount),
                    longShortRatio: parseFloat(response.data[0].longShortRatio)
                };
            }
            return null;
        } catch (error) {
            // Only log if it's not a 404 (some symbols don't have L/S data)
            if (error.response && error.response.status !== 404) {
                console.error(`Error L/S ratio for ${symbol}:`, error.message);
            }
            return null;
        }
    }

    /**
     * Get Futures Open Interest
     */
    async getOpenInterest(symbol) {
        try {
            const response = await axios.get(`https://fapi.binance.com/fapi/v1/openInterest`, {
                params: { symbol }
            });
            return response.data ? parseFloat(response.data.openInterest) : null;
        } catch (error) {
            // Only log if it's not a 404
            if (error.response && error.response.status !== 404) {
                console.error(`Error Open Interest for ${symbol}:`, error.message);
            }
            return null;
        }
    }

    /**
     * Get Futures Open Interest Delta
     * Compares current OI with OI from a few minutes ago
     */
    async getOpenInterestDelta(symbol) {
        try {
            // Get current OI
            const currentOI = await this.getOpenInterest(symbol);
            if (currentOI === null) return null;

            // Get historical OI (e.g., from 15 minutes ago)
            const endTime = Date.now();
            const startTime = endTime - 15 * 60 * 1000;
            
            const response = await axios.get(`https://fapi.binance.com/fapi/v1/openInterestHist`, {
                params: { symbol, period: '5m', limit: 4, startTime, endTime }
            });

            if (response.data && response.data.length > 0) {
                const prevOI = parseFloat(response.data[0].sumOpenInterest);
                const delta = ((currentOI - prevOI) / prevOI) * 100;
                return {
                    current: currentOI,
                    previous: prevOI,
                    delta: parseFloat(delta.toFixed(2))
                };
            }
            return { current: currentOI, previous: null, delta: 0 };
        } catch (error) {
            return null;
        }
    }

    /**
     * Get Premium Index (Funding Rate + Mark Price + Index Price)
     */
    async getPremiumIndex(symbol) {
        try {
            const response = await axios.get(`https://fapi.binance.com/fapi/v1/premiumIndex`, {
                params: { symbol }
            });
            const data = response.data;
            const markPrice = parseFloat(data.markPrice);
            const indexPrice = parseFloat(data.indexPrice);
            const basis = ((markPrice - indexPrice) / indexPrice) * 100;

            return {
                symbol: data.symbol,
                markPrice,
                indexPrice, // Spot equivalent
                lastFundingRate: parseFloat(data.lastFundingRate),
                nextFundingTime: parseInt(data.nextFundingTime),
                basis: parseFloat(basis.toFixed(4)) // Premium/Discount %
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Get data for multiple timeframes (FUTURES)
     */
    async getMultiTimeframeData(symbol) {
        try {
            const [k4h, k1d] = await Promise.all([
                this.getFuturesKlines(symbol, '4h', 10),
                this.getFuturesKlines(symbol, '1d', 10)
            ]);
            
            return { k4h, k1d };
        } catch (error) {
            return { k4h: [], k1d: [] };
        }
    }

    /**
     * Get all Futures Premium Indices (Funding Rates)
     */
    async getAllPremiumIndices() {
        try {
            const response = await axios.get(`https://fapi.binance.com/fapi/v1/premiumIndex`);
            const indexMap = {};
            response.data.forEach(item => {
                indexMap[item.symbol] = item;
            });
            return indexMap;
        } catch (error) {
            console.error('Error fetching all premium indices:', error.message);
            throw new Error('Failed to fetch premium indices');
        }
    }

    /**
     * Fetch circulating supply from BAPI, cached for 1 hour locally.
     */
    async getSupplyData(symbol) {
        try {
            const now = Date.now();
            if (!this.supplyCache || now - this.supplyCacheTime > 60 * 60 * 1000) {
                const response = await axios.get('https://www.binance.com/bapi/asset/v1/public/asset-service/product/get-products', { headers: { 'User-Agent': 'Mozilla/5.0' } });
                const data = response.data.data;
                const map = {};
                if (data) {
                    data.forEach(item => {
                        map[item.b] = {
                            cs: parseFloat(item.cs), // circulating
                            ts: parseFloat(item.ts)  // total
                        };
                    });
                }
                this.supplyCache = map;
                this.supplyCacheTime = now;
            }

            const baseAsset = symbol.replace('USDT', '');
            const info = this.supplyCache[baseAsset];
            if (info && info.ts > 0) {
                const ratio = (info.cs / info.ts) * 100;
                let formattedRatio = (ratio % 1 === 0 || ratio >= 99.9) ? Math.round(ratio) : ratio.toFixed(1);
                
                // Account for rounding errors or exactly 100%
                if (formattedRatio >= 99.9) {
                    formattedRatio = 100;
                }
                
                return {
                    ratio: formattedRatio,
                    isMax: formattedRatio === 100
                };
            }
            return null;
        } catch (error) {
            // Silently fail to not interrupt signal sending
            return null;
        }
    }
}

module.exports = new BinanceService();
