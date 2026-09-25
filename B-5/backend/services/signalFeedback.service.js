const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dataFile = path.join(dataDir, 'signal_history.json');

// Ensure directory and file exist
if (!fs.existsSync(dataDir)) {
    try {
        fs.mkdirSync(dataDir, { recursive: true });
    } catch (e) { }
}

if (!fs.existsSync(dataFile)) {
    try {
        fs.writeFileSync(dataFile, JSON.stringify([], null, 2), 'utf8');
    } catch (e) { }
}

class SignalFeedbackService {
    constructor() {
        this.signals = this.loadFromFile();
    }

    loadFromFile() {
        try {
            if (fs.existsSync(dataFile)) {
                const raw = fs.readFileSync(dataFile, 'utf8');
                const data = JSON.parse(raw);
                return Array.isArray(data) ? data : [];
            }
        } catch (err) {
            console.error('Error loading signal_history.json:', err.message);
        }
        return [];
    }

    saveToFile() {
        try {
            fs.writeFileSync(dataFile, JSON.stringify(this.signals, null, 2), 'utf8');
        } catch (err) {
            console.error('Error saving signal_history.json:', err.message);
        }
    }

    /**
     * Sinyali kalıcı listeye ekler
     */
    saveSignal(signalData) {
        if (!signalData) return null;

        const id = signalData.id || `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const timestamp = signalData.timestamp || Date.now();

        // 1 dakika içinde gelen birebir aynı coin ve timeframe sinyali varsa mükerrer kaydı önle
        const existingIndex = this.signals.findIndex(s => 
            s.coin === signalData.coin && 
            s.timeframe === signalData.timeframe && 
            Math.abs((s.timestamp || 0) - timestamp) < 60 * 1000
        );

        const record = {
            id,
            coin: signalData.coin || 'UNKNOWN',
            timeframe: signalData.timeframe || '15m',
            botType: signalData.botType || signalData.timeframe || '15m',
            position: signalData.position || (signalData.type && signalData.type.includes('Buy') ? 'Long' : 'Short'),
            price: signalData.price || 0,
            rsi: signalData.rsi !== undefined ? signalData.rsi : null,
            rsiWarning: signalData.rsiWarning || '',
            rsi1h: signalData.rsi1h || null,
            rsi4h: signalData.rsi4h || null,
            rsi1d: signalData.rsi1d || null,
            rsi1w: signalData.rsi1w || null,
            stochK: signalData.stochK !== undefined ? signalData.stochK : null,
            stochD: signalData.stochD !== undefined ? signalData.stochD : null,
            volume: signalData.volume || 'Normal',
            trend: signalData.trend || '',
            demaAlert: !!signalData.demaAlert,
            boost: signalData.boost || null,
            swingComment: signalData.swingComment || null,
            supplyStr: signalData.supplyStr || null,
            traderPositioning: signalData.traderPositioning || null,
            marketExposure: signalData.marketExposure || null,
            date: signalData.date || new Date().toLocaleDateString('tr-TR'),
            time: signalData.time || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            timestamp,
            feedback: null // Henüz değerlendirilmedi
        };

        if (existingIndex >= 0) {
            // Mevcut feedback varsa koru, sinyali güncelle
            if (this.signals[existingIndex].feedback) {
                record.feedback = this.signals[existingIndex].feedback;
            }
            record.id = this.signals[existingIndex].id;
            this.signals[existingIndex] = record;
        } else {
            this.signals.unshift(record); // En başa ekle
        }

        // Maksimum 2000 sinyal sakla
        if (this.signals.length > 2000) {
            this.signals = this.signals.slice(0, 2000);
        }

        this.saveToFile();
        return record;
    }

    /**
     * Sinyale Doğru/Yanlış ve açıklama ekler
     */
    saveFeedback(signalId, { status, notes, tags }) {
        const signal = this.signals.find(s => s.id === signalId);
        if (!signal) return null;

        signal.feedback = {
            status: status === 'CORRECT' ? 'CORRECT' : 'WRONG',
            notes: (notes || '').trim(),
            tags: Array.isArray(tags) ? tags : [],
            evaluatedAt: new Date().toISOString()
        };

        this.saveToFile();
        return signal;
    }

    /**
     * Kayıtlı sinyalleri döner
     */
    getSignals(limit = 100, timeframe = null) {
        let list = this.signals;
        if (timeframe) {
            list = list.filter(s => s.timeframe === timeframe || s.botType === timeframe);
        }
        return list.slice(0, limit);
    }

    /**
     * Sinyal kalite analiz istatistiklerini hesaplar
     */
    getStats() {
        const totalSignals = this.signals.length;
        const evaluatedSignals = this.signals.filter(s => s.feedback && s.feedback.status);
        const totalEvaluated = evaluatedSignals.length;

        const correctSignals = evaluatedSignals.filter(s => s.feedback.status === 'CORRECT');
        const wrongSignals = evaluatedSignals.filter(s => s.feedback.status === 'WRONG');

        const winRate = totalEvaluated > 0 
            ? parseFloat(((correctSignals.length / totalEvaluated) * 100).toFixed(1)) 
            : 0;

        // Timeframe kırılımı
        const byTimeframe = {};
        evaluatedSignals.forEach(s => {
            const tf = s.timeframe || 'other';
            if (!byTimeframe[tf]) {
                byTimeframe[tf] = { total: 0, correct: 0, wrong: 0, winRate: 0 };
            }
            byTimeframe[tf].total++;
            if (s.feedback.status === 'CORRECT') byTimeframe[tf].correct++;
            else byTimeframe[tf].wrong++;
            byTimeframe[tf].winRate = parseFloat(((byTimeframe[tf].correct / byTimeframe[tf].total) * 100).toFixed(1));
        });

        // Balina Verisi (Trader Positioning) Renk Korelasyonu
        const byPositioning = {
            green: { total: 0, correct: 0, wrong: 0, winRate: 0 },
            neutral: { total: 0, correct: 0, wrong: 0, winRate: 0 },
            red: { total: 0, correct: 0, wrong: 0, winRate: 0 },
            unknown: { total: 0, correct: 0, wrong: 0, winRate: 0 }
        };

        evaluatedSignals.forEach(s => {
            const pos = s.traderPositioning || '';
            let key = 'unknown';
            if (pos.includes('🟢')) key = 'green';
            else if (pos.includes('🔴')) key = 'red';
            else if (pos.includes('⚪')) key = 'neutral';

            byPositioning[key].total++;
            if (s.feedback.status === 'CORRECT') byPositioning[key].correct++;
            else byPositioning[key].wrong++;
            byPositioning[key].winRate = byPositioning[key].total > 0
                ? parseFloat(((byPositioning[key].correct / byPositioning[key].total) * 100).toFixed(1))
                : 0;
        });

        // En çok kullanılan etiketler
        const tagCounts = {};
        evaluatedSignals.forEach(s => {
            (s.feedback.tags || []).forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        return {
            totalSignals,
            totalEvaluated,
            correctCount: correctSignals.length,
            wrongCount: wrongSignals.length,
            winRate,
            byTimeframe,
            byPositioning,
            topTags: Object.entries(tagCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([tag, count]) => ({ tag, count }))
        };
    }

    /**
     * Değerlendirilen verileri Excel/CSV formatına dönüştürür
     */
    exportCSV() {
        const rows = [
            [
                'ID', 'Tarih', 'Saat', 'Coin', 'Periyot', 'Yön', 'Fiyat', 'RSI',
                'Trader Positioning', 'Market Exposure', 'Hacim', 'Sonuç', 'Açıklama', 'Etiketler', 'Değerlendirilme Zamanı'
            ]
        ];

        this.signals.forEach(s => {
            const fb = s.feedback || {};
            rows.push([
                s.id || '',
                s.date || '',
                s.time || '',
                s.coin || '',
                s.timeframe || '',
                s.position || '',
                s.price || '',
                s.rsi || '',
                `"${(s.traderPositioning || '').replace(/"/g, '""')}"`,
                `"${(s.marketExposure || '').replace(/"/g, '""')}"`,
                `"${(s.volume || '').replace(/"/g, '""')}"`,
                fb.status ? (fb.status === 'CORRECT' ? 'DOĞRU' : 'YANLIŞ') : 'DEĞERLENDİRİLMEDİ',
                `"${(fb.notes || '').replace(/"/g, '""')}"`,
                `"${(fb.tags || []).join(', ')}"`,
                fb.evaluatedAt || ''
            ]);
        });

        // UTF-8 BOM ekleyerek Türkçe karakterlerin Excel'de bozulmadan açılmasını sağla
        const bom = '\uFEFF';
        return bom + rows.map(r => r.join(';')).join('\r\n');
    }
}

module.exports = new SignalFeedbackService();
