export type BotId =
  | 'm1a'
  | 'm1premium'
  | 'hammerpro'
  | 'hammerproplus'
  | '4s'
  | '4ssniper'
  | 'div'
  | 'fr'
  | 'v3';

export interface BotConfig {
  id: BotId;
  badge: string;
  name: string;
  color: 'gold' | 'cyan' | 'bronze' | 'red' | 'purple' | 'green' | 'orange';
  strategy: string;
  allocPct: number;
  count: number;
  winRate: number;
  description: string;
  active: boolean;
}

export interface BotSignal {
  id: string;
  botId: BotId;
  botName: string;
  symbol: string;
  timestamp: number;
  isoDate: string;
  dateStr: string;
  time: string;
  dot: '🟢' | '🔴' | '🟡';
  strategy?: string;
  stars?: string;
  boostValue?: string;
  currentPrice: string;
  prevPrice?: string;
  rsi?: any;
  srsi?: any;
  wt?: string | null;
  pivot?: string | null;
  ema200?: string | null;
  traderPositioning?: string | null;
  marketExposure?: string | null;
  stochastic?: string | null;
  fundingRate?: string | null;
  difference?: string | null;
  timeRemaining?: string | null;
  hacimChange?: string | null;
  hacim24s?: string | null;
  btcStatus?: string | null;
  dropValue?: string | null;
  volume?: string | null;
}

export interface MarketTicker {
  symbol: string;
  price: number;
  priceStr: string;
  decimals: number;
  minMove: number;
  chg: number;
  chgPct: number;
  volUsd: number;
  high: number;
  low: number;
  fr: number;
  frInterval: string;
  nextFundingTime: number;
  isFavorite?: boolean;
}

export interface SentimentData {
  symbol: string;
  orderBook: {
    bidPct: number;
    askPct: number;
  };
  topPosition: {
    longPct: number;
    shortPct: number;
  };
  topAccount: {
    longPct: number;
    shortPct: number;
  };
  globalExposure: {
    longPct: number;
    shortPct: number;
  };
  takerRatio?: number;
  openInterest?: number;
  oiChange15m?: number;
  updatedAt: number;
}

export interface CoinAnalytics200d {
  symbol: string;
  ema200: number;
  emaDiffPct: number;
  ath200d: number;
  athDiffPct: number;
  atl200d: number;
  atlDiffPct: number;
  winRatePct: number;
  streak: string;
  streakType: 'green' | 'red';
}

export interface TreasuryPosition {
  id: string;
  symbol: string;
  botId: BotId;
  botBadge: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  curPrice: number;
  amount: number;
  margin: number;
  leverage: number;
  liqPrice: number;
  tp1: number;
  tp2?: number;
  openTime: string;
  notes?: string;
}

export interface TreasurySettings {
  totalEquity: number;
  marginAllocPerTradePct: number;
  maxPositionMarginPct: number;
  dailyRealizedPnl: number;
  targetTpPct: number;
  trailingStopPct?: number;
}

export interface KlinePoint {
  time: number;
  timeStr: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema20?: number;
  ema50?: number;
  ema200?: number;
  rsi?: number;
}

export interface VerdictAnalysis {
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'SQUEEZE_ALERT' | 'DANGER_DISTRIBUTION';
  headline: string;
  detail: string;
  whaleVerdict: string;
  retailVerdict: string;
  actionRecommendation: string;
  riskRating: 'DÜŞÜK' | 'ORTA' | 'YÜKSEK' | 'KRİTİK';
}
