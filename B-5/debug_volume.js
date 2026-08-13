const binanceService = require('./backend/services/binance.service');
const technicalService = require('./backend/services/technical.service');

async function debugVolume() {
    try {
        console.log('--- Hacim Avcısı Diagnostik Başladı ---');
        const tickers = await binanceService.getFutures24hrTickers();
        console.log(`Toplam ${tickers.length} Futures çifti bulundu.`);

        const topVolSymbols = tickers
            .sort((a, b) => b.quoteVolume - a.quoteVolume)
            .slice(0, 10)
            .map(t => t.symbol);

        console.log('Top 10 Hacimli Coinler taranıyor...');

        for (const symbol of topVolSymbols) {
            const klines5m = await binanceService.getFuturesKlines(symbol, '5m', 15);
            const volumes = klines5m.map(k => k.volume);
            const relVol = technicalService.calculateRelativeVolume(volumes, 9);
            console.log(`${symbol}: Hacim Rasyosu: ${relVol}x`);
        }
        console.log('---------------------------------------');
    } catch (e) {
        console.error('Hata:', e.message);
    }
}

debugVolume();
