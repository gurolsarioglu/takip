const axios = require('axios');

class BinanceFuturesService {
    constructor() {
        this.fapiBaseUrl = 'https://fapi.binance.com';
        this.axiosInstance = axios.create({
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
    }

    /**
     * Tüm aktif vadeli USDT çiftlerini ve 24s verilerini çeker
     */
    async get24hrTickers() {
        try {
            const res = await this.axiosInstance.get(`${this.fapiBaseUrl}/fapi/v1/ticker/24hr`);
            return res.data
                .filter(t => t.symbol.endsWith('USDT'))
                .map(t => ({
                    symbol: t.symbol,
                    coin: t.symbol.replace('USDT', ''),
                    price: parseFloat(t.lastPrice),
                    openPrice: parseFloat(t.openPrice),
                    highPrice: parseFloat(t.highPrice),
                    lowPrice: parseFloat(t.lowPrice),
                    priceChange: parseFloat(t.priceChange),
                    priceChangePercent: parseFloat(t.priceChangePercent),
                    volume: parseFloat(t.volume),
                    quoteVolume: parseFloat(t.quoteVolume), // USD Hacmi
                    trades: t.count
                }));
        } catch (error) {
            console.error('❌ Ticker 24hr hatası:', error.message);
            return [];
        }
    }

    /**
     * Mum verilerini çeker (5m, 15m, 1h, 4h, 1d, 1w)
     */
    async getKlines(symbol, interval = '5m', limit = 100) {
        try {
            const res = await this.axiosInstance.get(`${this.fapiBaseUrl}/fapi/v1/klines`, {
                params: { symbol, interval, limit }
            });
            return res.data.map(k => ({
                openTime: k[0],
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5]),
                closeTime: k[6],
                quoteVolume: parseFloat(k[7]),
                trades: k[8],
                takerBuyBaseVolume: parseFloat(k[9]),
                takerBuyQuoteVolume: parseFloat(k[10]),
                hlc3: (parseFloat(k[2]) + parseFloat(k[3]) + parseFloat(k[4])) / 3
            }));
        } catch (error) {
            // Sessizce boş döndür
            return [];
        }
    }

    /**
     * Anlık Açık Pozisyon (Open Interest) ve son 1 saatlik / 15dk değişimini çeker
     */
    async getOpenInterest(symbol) {
        try {
            const [currentRes, histRes] = await Promise.all([
                this.axiosInstance.get(`${this.fapiBaseUrl}/fapi/v1/openInterest`, { params: { symbol } }),
                this.axiosInstance.get(`${this.fapiBaseUrl}/futures/data/openInterestHist`, {
                    params: { symbol, period: '5m', limit: 12 } // Son 1 saat (12 adet 5dk)
                }).catch(() => ({ data: [] }))
            ]);

            const currentOI = parseFloat(currentRes.data.openInterest);
            let oiChangePercent5m = 0;
            let oiChangePercent1h = 0;
            let oiTrend = 'Yatay ➖';

            if (histRes.data && histRes.data.length >= 2) {
                const latest = parseFloat(histRes.data[histRes.data.length - 1].sumOpenInterest);
                const prev5m = parseFloat(histRes.data[histRes.data.length - 2].sumOpenInterest);
                const prev1h = parseFloat(histRes.data[0].sumOpenInterest);

                if (prev5m > 0) {
                    oiChangePercent5m = ((latest - prev5m) / prev5m) * 100;
                }
                if (prev1h > 0) {
                    oiChangePercent1h = ((latest - prev1h) / prev1h) * 100;
                }

                if (oiChangePercent5m > 1.5 || oiChangePercent1h > 5) {
                    oiTrend = 'Hızlı Artış 🚀';
                } else if (oiChangePercent5m > 0.3 || oiChangePercent1h > 1) {
                    oiTrend = 'Artışta ↗';
                } else if (oiChangePercent5m < -1.5) {
                    oiTrend = 'Düşüşte ↘';
                }
            }

            return {
                openInterest: currentOI,
                oiChangePercent5m: parseFloat(oiChangePercent5m.toFixed(2)),
                oiChangePercent1h: parseFloat(oiChangePercent1h.toFixed(2)),
                oiTrend
            };
        } catch (error) {
            return {
                openInterest: 0,
                oiChangePercent5m: 0,
                oiChangePercent1h: 0,
                oiTrend: 'Veri Yok'
            };
        }
    }

    /**
     * Long / Short Oranlarını (Global Hesap & Top Trader) çeker
     */
    async getLongShortRatios(symbol) {
        try {
            const [globalRes, topAccountRes, topPositionRes] = await Promise.all([
                this.axiosInstance.get(`${this.fapiBaseUrl}/futures/data/globalLongShortAccountRatio`, {
                    params: { symbol, period: '5m', limit: 1 }
                }).catch(() => ({ data: [] })),
                this.axiosInstance.get(`${this.fapiBaseUrl}/futures/data/topLongShortAccountRatio`, {
                    params: { symbol, period: '5m', limit: 1 }
                }).catch(() => ({ data: [] })),
                this.axiosInstance.get(`${this.fapiBaseUrl}/futures/data/topLongShortPositionRatio`, {
                    params: { symbol, period: '5m', limit: 1 }
                }).catch(() => ({ data: [] }))
            ]);

            // Global Account Ratio
            let longPercent = 50.0;
            let shortPercent = 50.0;
            let lsRatio = 1.0;

            if (globalRes.data && globalRes.data.length > 0) {
                const g = globalRes.data[0];
                longPercent = parseFloat((parseFloat(g.longAccount) * 100).toFixed(2));
                shortPercent = parseFloat((parseFloat(g.shortAccount) * 100).toFixed(2));
                lsRatio = parseFloat(parseFloat(g.longShortRatio).toFixed(2));
            }

            // Top Trader Positioning
            let topTraderLong = 50.0;
            let topTraderShort = 50.0;
            if (topPositionRes.data && topPositionRes.data.length > 0) {
                const t = topPositionRes.data[0];
                topTraderLong = parseFloat((parseFloat(t.longAccount || t.longPosition) * 100).toFixed(2));
                topTraderShort = parseFloat((parseFloat(t.shortAccount || t.shortPosition) * 100).toFixed(2));
            } else if (topAccountRes.data && topAccountRes.data.length > 0) {
                const t = topAccountRes.data[0];
                topTraderLong = parseFloat((parseFloat(t.longAccount) * 100).toFixed(2));
                topTraderShort = parseFloat((parseFloat(t.shortAccount) * 100).toFixed(2));
            }

            const isShortDominant = shortPercent >= 52.0 || topTraderShort >= 54.0;
            const squeezePotential = shortPercent >= 58.0 || topTraderShort >= 60.0 ? 'ÇOK YÜKSEK 🔥🔥' : (isShortDominant ? 'YÜKSEK 🔥' : 'NORMAL ⚖️');

            return {
                longPercent,
                shortPercent,
                lsRatio,
                topTraderLong,
                topTraderShort,
                isShortDominant,
                squeezePotential
            };
        } catch (error) {
            return {
                longPercent: 50.0,
                shortPercent: 50.0,
                lsRatio: 1.0,
                topTraderLong: 50.0,
                topTraderShort: 50.0,
                isShortDominant: false,
                squeezePotential: 'Bilinmiyor'
            };
        }
    }

    /**
     * Fonlama Oranı (Funding Rate) ve sonraki fonlama zamanı
     */
    async getFundingRate(symbol) {
        try {
            const res = await this.axiosInstance.get(`${this.fapiBaseUrl}/fapi/v1/premiumIndex`, {
                params: { symbol }
            });
            const rate = parseFloat(res.data.lastFundingRate) * 100; // Yüzdeye çevir
            const nextFundingTime = res.data.nextFundingTime;

            let status = 'Normal 🟢';
            if (rate < -0.05) {
                status = 'Aşırı Negatif (Shortlar Cezalı) 🚨🔥';
            } else if (rate < 0) {
                status = 'Negatif (Shortlar Fonlama Ödüyor) ⚠️';
            } else if (rate > 0.08) {
                status = 'Yüksek Pozitif (Longlar Coşkulu) 📈';
            }

            return {
                rate: parseFloat(rate.toFixed(4)),
                nextFundingTime,
                status
            };
        } catch (error) {
            return { rate: 0.0, nextFundingTime: 0, status: 'Veri Yok' };
        }
    }

    /**
     * Order Book (Alış / Satış Derinliği) Oranı
     */
    async getOrderBookDepth(symbol) {
        try {
            const res = await this.axiosInstance.get(`${this.fapiBaseUrl}/fapi/v1/depth`, {
                params: { symbol, limit: 50 }
            });
            const bidsVol = res.data.bids.reduce((sum, b) => sum + (parseFloat(b[0]) * parseFloat(b[1])), 0);
            const asksVol = res.data.asks.reduce((sum, a) => sum + (parseFloat(a[0]) * parseFloat(a[1])), 0);
            const total = bidsVol + asksVol;
            if (total === 0) return { bidRatio: 50, askRatio: 50 };

            const bidRatio = parseFloat(((bidsVol / total) * 100).toFixed(1));
            const askRatio = parseFloat(((asksVol / total) * 100).toFixed(1));
            return { bidRatio, askRatio };
        } catch (error) {
            return { bidRatio: 50, askRatio: 50 };
        }
    }
}

module.exports = new BinanceFuturesService();
