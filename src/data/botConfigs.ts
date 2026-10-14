import { BotConfig } from '../types';

export const BOT_CONFIGS: BotConfig[] = [
  {
    id: 'm1a',
    badge: 'M1-A',
    name: 'M1-A Drop',
    color: 'gold',
    strategy: '1m Ani Düşüş',
    allocPct: 10,
    count: 279,
    winRate: 74.2,
    description: '1 dakikalık zaman diliminde ani hacimli sert düşüşleri ve aşırı satım sıçramalarını yakalar.',
    active: true
  },
  {
    id: 'm1premium',
    badge: 'M1P',
    name: 'M1 Premium',
    color: 'gold',
    strategy: '1m Momentum & Sıçrama',
    allocPct: 15,
    count: 113,
    winRate: 78.5,
    description: '1m / 5m / 1h MTF RSI ve Stokastik RSI uyumunu birleştirerek yüksek momentumlu tepkileri filtreler.',
    active: true
  },
  {
    id: 'hammerpro',
    badge: 'PRO',
    name: 'Hammer Pro',
    color: 'cyan',
    strategy: '#W1 Dip Dönüş',
    allocPct: 15,
    count: 16,
    winRate: 83.1,
    description: 'Haftalık ve günlük dip dönüş formasyonları, Heikin-Ashi teyidi ve WaveTrend dip kesişimleri ile çalışır.',
    active: true
  },
  {
    id: 'hammerproplus',
    badge: 'PRO+',
    name: 'Hammer Pro+',
    color: 'orange',
    strategy: 'Yapısal Mum Çerçevesi',
    allocPct: 20,
    count: 14,
    winRate: 86.8,
    description: 'Gelişmiş mum çubuğu fitil analizi, likidite süpürmeleri (#W1 / #S1) ve çoklu zaman dilimi teyidi.',
    active: true
  },
  {
    id: '4s',
    badge: '4S',
    name: '4S Multi-Angle',
    color: 'red',
    strategy: '4H Yapı & Trend',
    allocPct: 10,
    count: 18,
    winRate: 71.9,
    description: '4 Saatlik majör piyasa yapısı, RSI SMA kesişimi ve Boost trend momentum tarayıcısı.',
    active: true
  },
  {
    id: '4ssniper',
    badge: 'SNIPER',
    name: '4S Sniper',
    color: 'bronze',
    strategy: 'NW UP Balina Reversal',
    allocPct: 10,
    count: 37,
    winRate: 81.4,
    description: '4 Saatlik NW UP dönüş formasyonu, Top Trader balina alım pozisyonlaması (%60+) teyitli keskin giriş.',
    active: true
  },
  {
    id: 'div',
    badge: 'DIV',
    name: 'Divergence MTF',
    color: 'purple',
    strategy: 'RSI Uyumsuzluk & Kesişim',
    allocPct: 10,
    count: 212,
    winRate: 77.3,
    description: 'Gizli ve normal pozitif/negatif RSI uyumsuzluklarını 5m, 15m, 1h ve 4h grafiklerinde tespit eder.',
    active: true
  },
  {
    id: 'fr',
    badge: 'FR',
    name: 'Funding Rate',
    color: 'cyan',
    strategy: 'Ekstrem Squeeze & FR',
    allocPct: 5,
    count: 908,
    winRate: 75.0,
    description: 'Aşırı negatif fonlama oranlarında short sıkıştırması (short squeeze) potansiyelini anlık izler.',
    active: true
  },
  {
    id: 'v3',
    badge: 'V3',
    name: 'V3-A Hacim',
    color: 'green',
    strategy: 'Real-Time Volume Spike',
    allocPct: 5,
    count: 522,
    winRate: 69.4,
    description: '24 saatlik ortalamanın katbekat üzerine çıkan anlık agresif taker hacim patlamalarını yakalar.',
    active: true
  }
];
