const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Servisler
const binanceFutures = require('./services/binance-futures.service');
const divergenceService = require('./services/divergence.service');
const scorerService = require('./services/scorer.service');

// Ayarları Yükle
dotenv.config({ path: path.join(__dirname, '.env') });

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN eksik! .env dosyasını kontrol edin.');
    process.exit(1);
}

// Bot Instance
const bot = new TelegramBot(TOKEN, { polling: true });

// Yapılandırma
const SCAN_INTERVAL_MS = (parseInt(process.env.SCAN_INTERVAL_SECONDS) || 45) * 1000;
const COOLDOWN_MS = (parseInt(process.env.COOLDOWN_MINUTES) || 20) * 60 * 1000;
const MIN_24H_VOL = parseFloat(process.env.MIN_24H_VOLUME_USDT) || 3000000;
const MIN_ALERT_SCORE = parseInt(process.env.MIN_ALERT_SCORE) || 3;

// State & Bellek
const SUBSCRIBERS_FILE = path.join(__dirname, 'subscribers.json');
let subscribers = new Set();
const processedSignals = new Map(); // symbol -> { time, price, score }
let isScanning = false;
let lastScanTime = null;
let totalAlertsSent = 0;

// Abone Listesini Dosyadan Yükle
function loadSubscribers() {
    try {
        if (fs.existsSync(SUBSCRIBERS_FILE)) {
            const data = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8'));
            if (Array.isArray(data)) {
                subscribers = new Set(data);
                console.log(`📂 ${subscribers.size} abone dosyadan yüklendi.`);
            }
        }
    } catch (e) {
        console.error('Abone dosyası okuma hatası:', e.message);
    }
}

// Abone Listesini Kaydet
function saveSubscribers() {
    try {
        fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(Array.from(subscribers), null, 2));
    } catch (e) {
        console.error('Abone dosyası yazma hatası:', e.message);
    }
}

loadSubscribers();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 SqueezeHunter Bot v1.0 Başlatıldı');
console.log(`⏱️ Tarama Aralığı: ${SCAN_INTERVAL_MS / 1000} saniye`);
console.log(`🛡️ Cooldown: ${COOLDOWN_MS / 60000} dakika`);
console.log(`⭐ Minimum Bildirim Skoru: ${MIN_ALERT_SCORE}/5`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Ana Menü Klavyesi
const MAIN_KEYBOARD = {
    reply_markup: {
        keyboard: [
            [{ text: '🏆 Günün En Çok Yükselenleri' }, { text: '📡 Squeeze Radarı' }],
            [{ text: 'ℹ️ Strateji Rehberi' }, { text: '⚙️ Bot Durumu' }]
        ],
        resize_keyboard: true
    }
};

// ==================== TELEGRAM KOMUTLARI ====================

// /start Komutu
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || 'Yatırımcı';

    subscribers.add(chatId);
    saveSubscribers();

    const welcomeMsg =
        `👋 *Merhaba ${name}, SqueezeHunter Bot\'a Hoş Geldin!*\n\n` +
        `Bu bot, Binance Vadeli (Futures) piyasalarında:\n` +
        `⚡ *Ani Hacim Patlamalarını*\n` +
        `👥 *Short Squeeze Potansiyelini (%52+ Short Baskısı)*\n` +
        `🏆 *Günün En Çok Yükselenlerini*\n` +
        `📊 *Haftalık & Günlük Pozitif Uyumsuzlukları (RSI Divergence)*\n\n` +
        `7/24 otomatik olarak tarar ve fırsat doğduğu an sizi uyarır!\n\n` +
        `💡 *Hızlı Kullanım:*\n` +
        `• Herhangi bir coin adı yazın (Örn: \`APR\`, \`SOL\`, \`BTC\`) anında teknik squeeze raporu alın!\n` +
        `• Aşağıdaki menü butonlarını kullanarak anlık listelere ulaşın.`;

    bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown', ...MAIN_KEYBOARD });
});

// /help & Rehber
bot.onText(/\/help|ℹ️ Strateji Rehberi/, (msg) => {
    const chatId = msg.chat.id;
    const helpMsg =
        `📖 *SQUEEZEHUNTER STRATEJİSİ NASIL ÇALIŞIR?*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🎯 *Formül:* \`Hacim + Shortçular + Günün En Yükseleni + Pozitif Uyumsuzluk = Başarılı İşlem\`\n\n` +
        `1️⃣ *Hacim Botu:* Son 5 dakikada hacim ortalamanın 2-5 katına çıktığında hareket başlar başlamaz tespit edilir.\n` +
        `2️⃣ *Short Squeeze Yakıtı:* Fiyat yükselirken küçük yatırımcı tepe yakalamak için short açar (%55+ Short). Fiyat yükseldikçe short'lar tasfiye olur ve patlayıcı bir ralli yaratır.\n` +
        `3️⃣ *Günün En Çok Yükseleni:* İlk 10'daki veya adayı olan coinler tüm piyasanın ilgisini toplar.\n` +
        `4️⃣ *Haftalık Pozitif Uyumsuzluk:* Haftalık/Günlük grafikte RSI daha yüksek dip yaparken fiyatın dipte olması ana trendin yukarı döneceğini teyit eder.\n\n` +
        `⭐ *Puanlama:* Sistem 5 kriteri kontrol eder; 3 yıldız ve üzeri durumlarda güçlü sinyal üretir.`;

    bot.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown' });
});

// /top & Günün En Çok Yükselenleri
bot.onText(/\/top|🏆 Günün En Çok Yükselenleri/, async (msg) => {
    const chatId = msg.chat.id;
    const waitMsg = await bot.sendMessage(chatId, '🔄 *En çok yükselenler ve squeeze verileri taranıyor...*', { parse_mode: 'Markdown' });

    try {
        const tickers = await binanceFutures.get24hrTickers();
        const topGainers = tickers
            .filter(t => t.quoteVolume >= MIN_24H_VOL)
            .sort((a, b) => b.priceChangePercent - a.priceChangePercent)
            .slice(0, 10);

        if (!topGainers.length) {
            return bot.editMessageText('❌ Veri alınamadı.', { chat_id: chatId, message_id: waitMsg.message_id });
        }

        let response = `🏆 *GÜNÜN EN ÇOK YÜKSELENLERİ (FUTURES TOP 10)*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        for (let i = 0; i < topGainers.length; i++) {
            const t = topGainers[i];
            const ls = await binanceFutures.getLongShortRatios(t.symbol);
            const oi = await binanceFutures.getOpenInterest(t.symbol);

            const shortIndicator = ls.shortPercent >= 55 ? '🔥 %' + ls.shortPercent + ' Short' : '%' + ls.shortPercent + ' S';

            response +=
                `*#${i + 1} #${t.symbol}* \`+${t.priceChangePercent.toFixed(2)}%\`\n` +
                `💰 Fiyat: \`${t.price.toFixed(4)}\` | Hacim: \`$${scorerService.formatNumber(t.quoteVolume)}\`\n` +
                `👥 Pozisyon: ${shortIndicator} | OI: ${oi.oiTrend}\n` +
                `──────────────\n`;
        }

        response += `💡 *Detaylı analiz için coin ismini yazın (Örn: \`${topGainers[0].coin}\`)*`;

        bot.editMessageText(response, { chat_id: chatId, message_id: waitMsg.message_id, parse_mode: 'Markdown', disable_web_page_preview: true });
    } catch (e) {
        bot.editMessageText(`❌ Hata: ${e.message}`, { chat_id: chatId, message_id: waitMsg.message_id });
    }
});

// /radar & Squeeze Radarı
bot.onText(/\/radar|📡 Squeeze Radarı/, async (msg) => {
    const chatId = msg.chat.id;
    const waitMsg = await bot.sendMessage(chatId, '📡 *Squeeze radarı çalıştırılıyor, potansiyel fırsatlar taranıyor...*', { parse_mode: 'Markdown' });

    try {
        const tickers = await binanceFutures.get24hrTickers();
        const sorted = tickers
            .filter(t => t.quoteVolume >= MIN_24H_VOL)
            .sort((a, b) => b.priceChangePercent - a.priceChangePercent)
            .slice(0, 25);

        const radarResults = [];

        for (const t of sorted) {
            const [ls, oi, tech] = await Promise.all([
                binanceFutures.getLongShortRatios(t.symbol),
                binanceFutures.getOpenInterest(t.symbol),
                divergenceService.analyzeMultiTimeframe(t.symbol)
            ]);

            const evalRes = scorerService.evaluateSignal({
                ticker: t,
                rank: sorted.indexOf(t) + 1,
                longShort: ls,
                openInterest: oi,
                technical: tech,
                volumeDeltaPercent: 0
            });

            if (evalRes.score >= 2 || ls.shortPercent >= 54.0 || tech.hasPositiveDivergence) {
                radarResults.push({ ticker: t, ls, oi, tech, evalRes });
            }
        }

        if (radarResults.length === 0) {
            return bot.editMessageText('📡 *Şu an radar kriterlerine uyan olağandışı bir durum bulunamadı.*', {
                chat_id: chatId,
                message_id: waitMsg.message_id,
                parse_mode: 'Markdown'
            });
        }

        let response = `📡 *SQUEEZE RADARI AKTİF FIRSATLAR*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        for (const item of radarResults.slice(0, 6)) {
            const divTag = item.tech.hasPositiveDivergence ? '✅ Pozitif Uyumsuzluk' : '➖';
            response +=
                `💎 *#${item.ticker.symbol}* (${item.evalRes.stars})\n` +
                `💰 Fiyat: \`${item.ticker.price.toFixed(4)}\` (\`+${item.ticker.priceChangePercent.toFixed(2)}%\`)\n` +
                `👥 Short: *%${item.ls.shortPercent}* | Hacim Çarpanı: \`${item.tech.indicators.volumeSpike5mRatio}x\`\n` +
                `📊 Uyumsuzluk: ${divTag}\n` +
                `──────────────\n`;
        }

        response += `💡 *İncelemek istediğiniz coinin adını yazın (Örn: \`${radarResults[0].ticker.coin}\`)*`;

        bot.editMessageText(response, {
            chat_id: chatId,
            message_id: waitMsg.message_id,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
    } catch (e) {
        bot.editMessageText(`❌ Radar Hatası: ${e.message}`, { chat_id: chatId, message_id: waitMsg.message_id });
    }
});

// /status & Bot Durumu
bot.onText(/\/status|⚙️ Bot Durumu/, (msg) => {
    const chatId = msg.chat.id;
    const uptimeMinutes = Math.floor(process.uptime() / 60);
    const lastScan = lastScanTime ? lastScanTime.toLocaleTimeString('tr-TR') : 'Henüz yapılmadı';

    const statusMsg =
        `⚙️ *SQUEEZEHUNTER BOT SİSTEM DURUMU*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🟢 *Durum:* Aktif & Taramada\n` +
        `👥 *Kayıtlı Abone Sayısı:* ${subscribers.size}\n` +
        `⏱️ *Çalışma Süresi:* ${uptimeMinutes} dakika\n` +
        `🔄 *Son Tarama:* ${lastScan}\n` +
        `🚨 *Gönderilen Toplam Sinyal:* ${totalAlertsSent}\n` +
        `⚡ *Tarama Periyodu:* ${SCAN_INTERVAL_MS / 1000} saniye\n` +
        `🛡️ *Spam Koruması (Cooldown):* ${COOLDOWN_MS / 60000} dakika\n` +
        `⭐ *Min Alarm Skoru:* ${MIN_ALERT_SCORE}/5`;

    bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
});

// Anlık Coin Sorgulama (Kullanıcı doğrudan 'APR', 'BTC', 'ETH' veya '/analiz APR' yazdığında)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    if (!text || text.startsWith('/') || ['🏆 Günün En Çok Yükselenleri', '📡 Squeeze Radarı', 'ℹ️ Strateji Rehberi', '⚙️ Bot Durumu'].includes(text)) {
        return;
    }

    let rawSymbol = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let symbol = rawSymbol.endsWith('USDT') ? rawSymbol : `${rawSymbol}USDT`;

    const waitMsg = await bot.sendMessage(chatId, `🔍 *#${symbol} inceleniyor, veriler toplanıyor...*`, { parse_mode: 'Markdown' });

    try {
        const [tickers, klines5m] = await Promise.all([
            binanceFutures.get24hrTickers(),
            binanceFutures.getKlines(symbol, '5m', 10)
        ]);

        const ticker = tickers.find(t => t.symbol === symbol);
        if (!ticker || !klines5m.length) {
            return bot.editMessageText(`❌ *#${symbol}* Binance Vadeli (Futures) piyasasında bulunamadı. Lütfen geçerli bir USDT çifti girin (Örn: \`APR\`, \`SOL\`, \`BTC\`).`, {
                chat_id: chatId,
                message_id: waitMsg.message_id,
                parse_mode: 'Markdown'
            });
        }

        // Sıralama
        const sorted = tickers.sort((a, b) => b.priceChangePercent - a.priceChangePercent);
        const rank = sorted.findIndex(t => t.symbol === symbol) + 1;

        const [ls, oi, fr, depth, tech] = await Promise.all([
            binanceFutures.getLongShortRatios(symbol),
            binanceFutures.getOpenInterest(symbol),
            binanceFutures.getFundingRate(symbol),
            binanceFutures.getOrderBookDepth(symbol),
            divergenceService.analyzeMultiTimeframe(symbol)
        ]);

        const fullData = {
            ticker,
            rank,
            longShort: ls,
            openInterest: oi,
            fundingRate: fr,
            orderBook: depth,
            technical: tech,
            volumeDeltaPercent: 0
        };

        const evaluation = scorerService.evaluateSignal(fullData);
        const cardMessage = scorerService.formatOnDemandCard(fullData, evaluation);

        bot.editMessageText(cardMessage, {
            chat_id: chatId,
            message_id: waitMsg.message_id,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
    } catch (e) {
        bot.editMessageText(`❌ Analiz Hatası: ${e.message}`, { chat_id: chatId, message_id: waitMsg.message_id });
    }
});

// ==================== ARKA PLAN TARAMA MOTORU ====================

async function runMarketScan() {
    if (isScanning) return;
    isScanning = true;
    lastScanTime = new Date();

    try {
        const tickers = await binanceFutures.get24hrTickers();
        if (!tickers.length) {
            isScanning = false;
            return;
        }

        // Filtrele: Minimum Hacim ve USDT
        const eligibleTickers = tickers.filter(t => t.quoteVolume >= MIN_24H_VOL);

        // Sıralama: En çok yükselenler
        const sortedByGain = [...eligibleTickers].sort((a, b) => b.priceChangePercent - a.priceChangePercent);
        const topGainers = sortedByGain.slice(0, 30); // İlk 30 coini derinlemesine incele

        for (const ticker of topGainers) {
            const symbol = ticker.symbol;
            const rank = sortedByGain.findIndex(t => t.symbol === symbol) + 1;

            // Cooldown Kontrolü
            const now = Date.now();
            if (processedSignals.has(symbol)) {
                const prev = processedSignals.get(symbol);
                if (now - prev.time < COOLDOWN_MS) {
                    continue;
                }
            }

            try {
                // Detaylı analiz verilerini paralel topla
                const [ls, oi, fr, depth, tech] = await Promise.all([
                    binanceFutures.getLongShortRatios(symbol),
                    binanceFutures.getOpenInterest(symbol),
                    binanceFutures.getFundingRate(symbol),
                    binanceFutures.getOrderBookDepth(symbol),
                    divergenceService.analyzeMultiTimeframe(symbol)
                ]);

                const signalData = {
                    ticker,
                    rank,
                    longShort: ls,
                    openInterest: oi,
                    fundingRate: fr,
                    orderBook: depth,
                    technical: tech,
                    volumeDeltaPercent: 0
                };

                const evaluation = scorerService.evaluateSignal(signalData);

                // Tetikleme Şartı: Puan >= MIN_ALERT_SCORE ve (Hacim Patlaması VEYA Short Baskısı)
                if (evaluation.score >= MIN_ALERT_SCORE) {
                    processedSignals.set(symbol, { time: now, price: ticker.price, score: evaluation.score });
                    totalAlertsSent++;

                    const alertMsg = scorerService.formatAlertMessage(signalData, evaluation);
                    console.log(`\n🚨 [ALARM] #${symbol} - Skor: ${evaluation.score}/5 (${evaluation.verdict})`);

                    // Tüm abonelere gönder
                    for (const chatId of subscribers) {
                        try {
                            await bot.sendMessage(chatId, alertMsg, {
                                parse_mode: 'Markdown',
                                disable_web_page_preview: true
                            });
                        } catch (sendErr) {
                            if (sendErr.response && sendErr.response.statusCode === 403) {
                                // Kullanıcı botu engellemişse listeden çıkar
                                subscribers.delete(chatId);
                                saveSubscribers();
                            }
                        }
                    }
                }

                // API Rate limit koruması
                await new Promise(r => setTimeout(r, 200));
            } catch (coinErr) {
                // Münferit coin hatalarını sessiz geç
                continue;
            }
        }
    } catch (scanErr) {
        console.error('Tarama döngüsü hatası:', scanErr.message);
    } finally {
        isScanning = false;
    }
}

// Periyodik Taramayı Başlat
setInterval(runMarketScan, SCAN_INTERVAL_MS);

// İlk Taramayı 3 saniye sonra başlat
setTimeout(runMarketScan, 3000);
