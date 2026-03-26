const analysisService = require('../services/analysis.service');

describe('Analysis Service', () => {

    describe('determineTrend', () => {
        it('should return GÜÇLÜ YÜKSELİŞ for high positive score factors', () => {
            // priceChange=4(+2), rsi=25(+1), stochRSI=10(+0.5), price>sma(+1), price>ema(+0.5) -> Score 5
            const trend = analysisService.determineTrend(4, 25, 10, 100, 90, 95);
            expect(trend).toBe('GÜÇLÜ YÜKSELİŞ');
        });

        it('should return YÜKSELİŞ for moderate positive score factors', () => {
            // priceChange=2(+1), rsi=60(+1), stochRSI=70(+0.5), price>sma(+1), price>ema(+0.5) -> Score 4
            // Wait, rsi>55=>+1, stochRSI>60=>+0.5
            // Actually score is 4. Still >= 3 => GÜÇLÜ YÜKSELİŞ.
            // Let's make it lower. Score=1.
            // priceChange=1(0), rsi=60(+1), stochRSI=50(0), price=100(0), sma=100(0), ema=100(0) -> Score 1 ... wait, 100 > 100 is false => price<sma => -1, so 100>sma?
            // Let's test precisely:
            // priceChange=1.5(+1), rsi=50(0), stochRSI=50(0), null, null -> Score 1
            const trend = analysisService.determineTrend(1.5, 50, 50, null, null, null);
            expect(trend).toBe('YÜKSELİŞ');
        });

        it('should return GÜÇLÜ DÜŞÜŞ for high negative score factors', () => {
            // priceChange=-4(-2), rsi=75(-1), stochRSI=85(-0.5), currentPrice<sma(-1), current<ema(-0.5) -> Score -5
            const trend = analysisService.determineTrend(-4, 75, 85, 90, 100, 100);
            expect(trend).toBe('GÜÇLÜ DÜŞÜŞ');
        });

        it('should return NÖTR for close to zero scores', () => {
            const trend = analysisService.determineTrend(0, 50, 50, null, null, null);
            expect(trend).toBe('NÖTR');
        });
    });

    describe('generateCommentary', () => {
        it('should generate appropriate commentary based on trend and indicators', () => {
            const indicators = {
                rsi: 75,
                rsiInterpretation: 'OVERBOUGHT',
                stochRSI: 85,
                stochRSIInterpretation: 'OVERBOUGHT'
            };
            const commentary = analysisService.generateCommentary('YÜKSELİŞ', indicators, 2.5);
            expect(commentary).toContain('Bitcoin yükseliş eğilimi gösteriyor.');
            expect(commentary).toContain('24 saatlik değişim: %2.5.');
            expect(commentary).toContain('RSI aşırı alım bölgesinde');
            expect(commentary).toContain('Stochastic RSI yüksek seviyelerde');
        });
    });

});
