const dotenv = require('dotenv');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const binanceFutures = require('./services/binance-futures.service');
const divergenceService = require('./services/divergence.service');
const scorerService = require('./services/scorer.service');

dotenv.config({ path: path.join(__dirname, '.env') });

async function runTests() {
    console.log('🧪 SqueezeHunter Bot Test Başlatılıyor...\n');

    // 1. Telegram Bot Token Kontrolü
    const token = process.env.TELEGRAM_BOT_TOKEN;
    console.log(`1️⃣ Telegram Token Kontrolü: ${token ? '✅ Mevcut (' + token.substring(0, 10) + '...)' : '❌ Eksik'}`);

    try {
        const bot = new TelegramBot(token);
        const me = await bot.getMe();
        console.log(`🤖 Telegram Bot Bilgisi: @${me.username} (${me.first_name}) - ✅ BAŞARILI`);
    } catch (e) {
        console.error('❌ Telegram Bağlantı Hatası:', e.message);
    }

    // 2. Binance Futures API Testi
    console.log('\n2️⃣ Binance Futures 24hr Ticker Testi...');
    const tickers = await binanceFutures.get24hrTickers();
    console.log(`📊 Toplam Aktif Vadeli Çift Sayısı: ${tickers.length}`);

    if (tickers.length > 0) {
        const top1 = tickers.sort((a, b) => b.priceChangePercent - a.priceChangePercent)[0];
        console.log(`🏆 Günün 1 Numarası: #${top1.symbol} (+${top1.priceChangePercent.toFixed(2)}%) | Hacim: $${scorerService.formatNumber(top1.quoteVolume)}`);

        // 3. Test Coini İncele (Örn. Top 1 Coin veya BTC)
        const testSymbol = top1.symbol;
        console.log(`\n3️⃣ Detaylı Veri Testi (#${testSymbol})...`);

        const [ls, oi, fr, depth, tech] = await Promise.all([
            binanceFutures.getLongShortRatios(testSymbol),
            binanceFutures.getOpenInterest(testSymbol),
            binanceFutures.getFundingRate(testSymbol),
            binanceFutures.getOrderBookDepth(testSymbol),
            divergenceService.analyzeMultiTimeframe(testSymbol)
        ]);

        console.log(`👥 Long/Short: %${ls.longPercent} Long vs %${ls.shortPercent} Short (Top Trader: %${ls.topTraderShort} Short)`);
        console.log(`📈 Açık Pozisyon (OI): ${scorerService.formatNumber(oi.openInterest)} (${oi.oiTrend})`);
        console.log(`⏳ Fonlama Oranı: %${fr.rate} (${fr.status})`);
        console.log(`📖 Tahta: %${depth.bidRatio} Alış vs %${depth.askRatio} Satış`);
        console.log(`📊 Teknik: 1W RSI: ${tech.indicators.rsi1w}, 4H RSI: ${tech.indicators.rsi4h}, 5m Vol: ${tech.indicators.volumeSpike5mRatio}x`);
        console.log(`📢 Uyumsuzluk: ${tech.hasPositiveDivergence ? 'BOĞA UYUMSUZLUĞU VAR ✅' : 'Yok ➖'}`);

        // 4. Puanlama Testi
        const evaluation = scorerService.evaluateSignal({
            ticker: top1,
            rank: 1,
            longShort: ls,
            openInterest: oi,
            fundingRate: fr,
            orderBook: depth,
            technical: tech,
            volumeDeltaPercent: 0
        });

        console.log(`\n⭐ Sinyal Skoru: ${evaluation.stars} (${evaluation.score}/5) - ${evaluation.verdict}`);
        console.log('\n✅ TÜM TESTLER BAŞARIYLA TAMAMLANDI!');
    }
}

runTests();
