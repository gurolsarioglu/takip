import { TreasuryPosition, TreasurySettings } from '../types';

export const INITIAL_SETTINGS: TreasurySettings = {
  totalEquity: 10000.00,
  marginAllocPerTradePct: 2.00, // 2% per trade = $200
  maxPositionMarginPct: 5.00,   // Max 5% per coin = $500
  dailyRealizedPnl: 348.50,
  targetTpPct: 2.50,
  trailingStopPct: 1.00
};

export const INITIAL_POSITIONS: TreasuryPosition[] = [
  {
    id: 'pos_btc_1',
    symbol: 'BTCUSDT',
    botId: '4ssniper',
    botBadge: '4S SNIPER',
    side: 'LONG',
    entryPrice: 83120.00,
    curPrice: 83520.00,
    amount: 0.06,
    margin: 500.00,
    leverage: 10,
    liqPrice: 75223.00,
    tp1: 85200.00,
    tp2: 87000.00,
    openTime: '13:23',
    notes: 'NW UP Yapısal Boğa Dönüşü - Balina L/S %64'
  },
  {
    id: 'pos_eth_2',
    symbol: 'ETHUSDT',
    botId: 'hammerproplus',
    botBadge: 'PRO+',
    side: 'LONG',
    entryPrice: 2488.50,
    curPrice: 2505.20,
    amount: 1.0,
    margin: 500.00,
    leverage: 5,
    liqPrice: 2003.20,
    tp1: 2560.00,
    tp2: 2620.00,
    openTime: '13:23',
    notes: '#W1 Dip Teyidi & Likidasyon Koruması'
  },
  {
    id: 'pos_spcx_3',
    symbol: 'SOLUSDT',
    botId: '4ssniper',
    botBadge: '4S SNIPER',
    side: 'LONG',
    entryPrice: 154.20,
    curPrice: 157.39,
    amount: 5.8,
    margin: 300.00,
    leverage: 3,
    liqPrice: 104.50,
    tp1: 165.00,
    tp2: 172.00,
    openTime: '13:23',
    notes: 'Düşük kaldıraçlı (3x), %33.5 Liq Güvenlik Mesafesi'
  }
];
