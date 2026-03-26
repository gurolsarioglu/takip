const technicalService = require('../services/technical.service');

describe('Technical Service', () => {

    describe('getRSIInterpretation', () => {
        it('should return OVERSOLD for RSI <= 30', () => {
            expect(technicalService.getRSIInterpretation(30)).toBe('OVERSOLD');
            expect(technicalService.getRSIInterpretation(15)).toBe('OVERSOLD');
        });

        it('should return OVERBOUGHT for RSI >= 70', () => {
            expect(technicalService.getRSIInterpretation(70)).toBe('OVERBOUGHT');
            expect(technicalService.getRSIInterpretation(85)).toBe('OVERBOUGHT');
        });

        it('should return NEUTRAL for 30 < RSI < 70', () => {
            expect(technicalService.getRSIInterpretation(50)).toBe('NEUTRAL');
        });

        it('should return UNKNOWN for null or undefined', () => {
            expect(technicalService.getRSIInterpretation(null)).toBe('UNKNOWN');
            expect(technicalService.getRSIInterpretation(undefined)).toBe('UNKNOWN');
        });
    });

    describe('getStochRSIInterpretation', () => {
        it('should return OVERSOLD for StochRSI <= 20', () => {
            expect(technicalService.getStochRSIInterpretation(20)).toBe('OVERSOLD');
            expect(technicalService.getStochRSIInterpretation(5)).toBe('OVERSOLD');
        });

        it('should return OVERBOUGHT for StochRSI >= 80', () => {
            expect(technicalService.getStochRSIInterpretation(80)).toBe('OVERBOUGHT');
            expect(technicalService.getStochRSIInterpretation(95)).toBe('OVERBOUGHT');
        });

        it('should return NEUTRAL for 20 < StochRSI < 80', () => {
            expect(technicalService.getStochRSIInterpretation(50)).toBe('NEUTRAL');
        });

        it('should return UNKNOWN for null or undefined', () => {
            expect(technicalService.getStochRSIInterpretation(null)).toBe('UNKNOWN');
            expect(technicalService.getStochRSIInterpretation(undefined)).toBe('UNKNOWN');
        });
    });

    describe('calculateSMA', () => {
        it('should correctly calculate SMA for given values', () => {
            const values = [10, 20, 30, 40, 50];
            const period = 3;
            // The last 3 values are 30, 40, 50 -> Sum = 120 -> SMA = 40
            expect(technicalService.calculateSMA(values, period)).toBe(40);
        });

        it('should return null if values length is less than period', () => {
            const values = [10, 20];
            const period = 3;
            expect(technicalService.calculateSMA(values, period)).toBeNull();
        });
    });

    describe('Advanced Indicators', () => {
        it('calculateFullStochRSI should return k and d arrays for given klines', () => {
            const klines = Array.from({length: 50}, (_, i) => ({ close: 10 + i%10 }));
            const result = technicalService.calculateFullStochRSI(klines, 14, 14, 3, 3);
            expect(result).toHaveProperty('k');
            expect(result).toHaveProperty('d');
            expect(Array.isArray(result.k)).toBe(true);
            expect(Array.isArray(result.d)).toBe(true);
        });

        it('calculateADX should return an array of ADX values', () => {
            const klines = Array.from({length: 50}, (_, i) => ({ high: 15+i%5, low: 10+i%5, close: 12+i%5 }));
            const adx = technicalService.calculateADX(klines, 14);
            expect(Array.isArray(adx)).toBe(true);
            expect(adx.length).toBeGreaterThan(0);
        });

        it('calculateWaveTrend should return wt1, wt2, and clear cross indicator', () => {
             const klines = Array.from({length: 30}, (_, i) => ({ hlc3: 10 + i%3 }));
             const wt = technicalService.calculateWaveTrend(klines);
             expect(wt).toHaveProperty('wt1');
             expect(wt).toHaveProperty('wt2');
             expect(wt).toHaveProperty('cross');
        });
    });
});
