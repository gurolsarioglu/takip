class ScorerService {
    /**
     * Sinyali 1-5 yıldız arasında puanlar
     */
    evaluateSignal(data) {
        let score = 0;
        const checks = {
            volumeSpike: false,
            topGainer: false,
            shortDominance: false,
            oiGrowth: false,
            bullishDivergence: false
        };

        // 1. Hacim Patlaması Kontrolü
        if (data.technical.indicators.volumeSpike5mRatio >= 2.0 || data.volumeDeltaPercent >= 10.0) {
            score += 1;
            checks.volumeSpike = true;
        }

        // 2. Günün En Çok Yükseleni / Top 10 Adayı
        if (data.rank <= 10 || data.ticker.priceChangePercent >= 5.0) {
            score += 1;
            checks.topGainer = true;
        }

        // 3. Shortçular Baskın (Short Squeeze Yakıtı)
        if (data.longShort.shortPercent >= 52.0 || data.longShort.topTraderShort >= 54.0) {
            score += 1;
            checks.shortDominance = true;
        }

        // 4. Açık Pozisyon (OI) Artışı
        if (data.openInterest.oiChangePercent5m > 0.3 || data.openInterest.oiChangePercent1h > 1.0) {
            score += 1;
            checks.oiGrowth = true;
        }

        // 5. Haftalık / Günlük Pozitif Uyumsuzluk
        if (data.technical.hasPositiveDivergence) {
            score += 1;
            checks.bullishDivergence = true;
        }

        const stars = '⭐'.repeat(score) + '☆'.repeat(5 - score);

        let verdict = 'DÜŞÜK OLASILIK';
        if (score === 5) verdict = '🔥 MÜKEMMEL EŞLEŞME (ULTRA SHORT SQUEEZE)';
        else if (score === 4) verdict = '🚀 GÜÇLÜ SQUEEZE SİNYALİ';
        else if (score === 3) verdict = '⚡ DİKKAT ÇEKEN HAREKET';

        return { score, stars, verdict, checks };
    }

    /**
     * Otomatik Tetikleme İçin Detaylı Telegram Mesajı Üretir
     */
    formatAlertMessage(data, evaluation) {
        const t = data.ticker;
        const ls = data.longShort;
        const oi = data.openInterest;
        const tech = data.technical;
        const fr = data.fundingRate;
        const depth = data.orderBook;

        const binanceUrl = `https://www.binance.com/en/futures/${t.symbol}`;
        const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Günün Sıralaması
        let rankText = `Sıra: #${data.rank} (Top 10'da ✅)`;
        if (data.rank > 10) {
            rankText = `Sıra: #${data.rank} (İlk 10 Adayı 🚀)`;
        }

        // Pozitif Uyumsuzluk Metni
        let divText = 'Bulunamadı ➖';
        if (tech.hasPositiveDivergence) {
            divText = `VAR ✅ (${tech.macroTimeframe} ${tech.macroDivergence.title})`;
        } else if (tech.macroDivergence && tech.macroDivergence.type === 'BEARISH') {
            divText = `Ayı Uyumsuzluğu ⚠️ (${tech.macroTimeframe})`;
        }

        // Hacim Formatla
        const volUsdFormatted = this.formatNumber(t.quoteVolume);

        const msg =
            `🚨 *SQUEEZE RADAR - BOĞA ALARMI* 🚀\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `💎 *#${t.symbol}* | Vadeli (Futures)\n` +
            `💰 *Anlık Fiyat:* \`${t.price.toFixed(4)}\` USDT\n` +
            `🏆 *Günün Durumu:* ${rankText}\n` +
            `📈 *24s Değişim:* \`+${t.priceChangePercent.toFixed(2)}%\` 🟢\n` +
            `\n` +
            `⚡ *HACİM & MOMENTUM*\n` +
            `• 5dk Hacim Çarpanı: \`${tech.indicators.volumeSpike5mRatio}x Katı\` 💥\n` +
            `• 24s Toplam Hacim: \`$${volUsdFormatted}\`\n` +
            `• 5dk / 15dk WaveTrend: ${tech.indicators.wt5m.cross} | ${tech.indicators.wt15m.cross}\n` +
            `\n` +
            `👥 *POZİSYON & SHORT BASKISI (Squeeze Fuel)*\n` +
            `• Global Dağılım: %${ls.shortPercent} Short 🔴 | %${ls.longPercent} Long 🟢\n` +
            `• Top Trader: %${ls.topTraderShort} Short ⚠️\n` +
            `• Squeeze Potansiyeli: *${ls.squeezePotential}*\n` +
            `• Açık Pozisyon (OI): \`${this.formatNumber(oi.openInterest)}\` (${oi.oiTrend})\n` +
            `• Fonlama Oranı (FR): \`%${fr.rate}\` (${fr.status})\n` +
            `• Tahta Derinliği: %${depth.bidRatio} Alış / %${depth.askRatio} Satış\n` +
            `\n` +
            `📊 *TEKNİK UYUMSUZLUK & RSI*\n` +
            `• Makro Uyumsuzluk: ${divText}\n` +
            `• RSI (1W/4H/15m): \`${tech.indicators.rsi1w}\` / \`${tech.indicators.rsi4h}\` / \`${tech.indicators.rsi15m}\`\n` +
            `• Stoch RSI (4H): K:\`${tech.indicators.stoch4h.k}\` D:\`${tech.indicators.stoch4h.d}\`\n` +
            `\n` +
            `🎯 *Sinyal Skoru:* ${evaluation.stars} (*${evaluation.score}/5*)\n` +
            `📌 *Değerlendirme:* ${evaluation.verdict}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🔗 [Binance Vadeli Grafiği Aç](${binanceUrl})\n` +
            `⏰ ${now} | *SqueezeHunter v1.0*`;

        return msg;
    }

    /**
     * Manuel Coin Sorgulaması İçin Telegram Kartı Üretir
     */
    formatOnDemandCard(data, evaluation) {
        const t = data.ticker;
        const ls = data.longShort;
        const oi = data.openInterest;
        const tech = data.technical;
        const fr = data.fundingRate;

        const binanceUrl = `https://www.binance.com/en/futures/${t.symbol}`;
        const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

        let divStatus = 'Tespit Edilmedi ➖';
        if (tech.hasPositiveDivergence) {
            divStatus = `✅ ${tech.macroTimeframe} Pozitif Uyumsuzluk (Boğa)`;
        } else if (tech.macroDivergence) {
            divStatus = `⚠️ ${tech.macroTimeframe} ${tech.macroDivergence.title}`;
        }

        const msg =
            `🔍 *#${t.symbol} SQUEEZE & TEKNİK ANALİZİ*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `💰 *Fiyat:* \`${t.price.toFixed(4)}\` USDT (${t.priceChangePercent >= 0 ? '+' : ''}${t.priceChangePercent.toFixed(2)}%)\n` +
            `🏆 *24s Sıralama:* #${data.rank} | 24s Hacim: \`$${this.formatNumber(t.quoteVolume)}\`\n` +
            `\n` +
            `🎯 *Squeeze / Pozisyon Analizi:*\n` +
            `• Short Oranı: *%${ls.shortPercent}* 🔴 (Shortçular: ${ls.shortPercent > 50 ? 'Baskın' : 'Azınlıkta'})\n` +
            `• Long Oranı: *%${ls.longPercent}* 🟢\n` +
            `• Top Trader: %${ls.topTraderShort} Short\n` +
            `• Açık Pozisyon (OI): \`${this.formatNumber(oi.openInterest)}\` (${oi.oiTrend})\n` +
            `• Fonlama (FR): \`%${fr.rate}\` (${fr.status})\n` +
            `\n` +
            `📈 *Teknik Uyumsuzluk & Göstergeler:*\n` +
            `• Makro Uyumsuzluk: ${divStatus}\n` +
            `• RSI Değerleri: 1W:\`${tech.indicators.rsi1w}\` | 4H:\`${tech.indicators.rsi4h}\` | 15m:\`${tech.indicators.rsi15m}\`\n` +
            `• 15m WaveTrend: ${tech.indicators.wt15m.cross}\n` +
            `• 5m Hacim Çarpanı: \`${tech.indicators.volumeSpike5mRatio}x\`\n` +
            `\n` +
            `⭐ *SqueezeHunter Skoru:* ${evaluation.stars} (*${evaluation.score}/5*)\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🔗 [Binance Vadeli İşlemler](${binanceUrl}) | ⏰ ${now}`;

        return msg;
    }

    /**
     * Sayıları B (Milyar), M (Milyon), K (Bin) olarak formatlar
     */
    formatNumber(num) {
        if (!num || isNaN(num)) return '0';
        const n = parseFloat(num);
        if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
        return n.toFixed(2);
    }
}

module.exports = new ScorerService();
