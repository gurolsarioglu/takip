import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MarketTicker,
  SentimentData,
  CoinAnalytics200d,
  TreasuryPosition,
  TreasurySettings,
  BotSignal,
  BotId
} from './types';
import { BOT_CONFIGS } from './data/botConfigs';
import { INITIAL_POSITIONS, INITIAL_SETTINGS } from './data/initialPositions';
import { INITIAL_SIGNALS } from './data/initialSignals';
import {
  fetchWatchlist,
  fetchSentiment,
  compute200dAnalytics
} from './services/binanceApi';
import { generateLiveVerdict } from './services/verdictEngine';

import { Header } from './components/Header';
import { Watchlist } from './components/Watchlist';
import { TickerSnapshot } from './components/TickerSnapshot';
import { TreasuryCockpit } from './components/TreasuryCockpit';
import { TreasurySettingsModal } from './components/TreasurySettingsModal';
import { SentimentModal } from './components/SentimentModal';
import { CoinHistoryModal } from './components/CoinHistoryModal';
import { ChartView } from './components/ChartView';
import { BotHub } from './components/BotHub';
import { LiveVerdictCard } from './components/LiveVerdictCard';

const STORAGE_SETTINGS = 'alpha_treasury_settings_v2';
const STORAGE_POSITIONS = 'alpha_treasury_positions_v2';
const STORAGE_FAVORITES = 'alpha_terminal_favorites_v2';

export const App: React.FC = () => {
  // ─── Kalıcı Kasa ve Tercih State'leri ──────────────────────────────
  const [settings, setSettings] = useState<TreasurySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS);
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [positions, setPositions] = useState<TreasuryPosition[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_POSITIONS);
      return saved ? JSON.parse(saved) : INITIAL_POSITIONS;
    } catch {
      return INITIAL_POSITIONS;
    }
  });

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FAVORITES);
      return saved ? new Set(JSON.parse(saved)) : new Set(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
    } catch {
      return new Set(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
    }
  });

  // ─── Genel Terminal State'leri ────────────────────────────────────
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeView, setActiveView] = useState<'cockpit' | 'watchlist' | 'chart' | 'bots' | 'verdict'>('cockpit');
  const [selectedBotId, setSelectedBotId] = useState<BotId | 'all'>('all');
  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [sentiment, setSentiment] = useState<SentimentData | undefined>(undefined);
  const [signals, setSignals] = useState<BotSignal[]>(INITIAL_SIGNALS);
  const [bots, setBots] = useState(BOT_CONFIGS);
  const [isLive, setIsLive] = useState<boolean>(true);

  // ─── Modallar ─────────────────────────────────────────────────────
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isSentimentModalOpen, setIsSentimentModalOpen] = useState<boolean>(false);
  const [isCoinHistoryModalOpen, setIsCoinHistoryModalOpen] = useState<boolean>(false);

  // Kalıcılık Kayıtları
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_POSITIONS, JSON.stringify(positions));
    } catch {}
  }, [positions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FAVORITES, JSON.stringify(Array.from(favorites)));
    } catch {}
  }, [favorites]);

  // ─── Canlı Watchlist Veri Çekimi ve Polling ───────────────────────
  const refreshTickers = useCallback(async () => {
    const list = await fetchWatchlist();
    if (list.length > 0) {
      setTickers(list);
    }
  }, []);

  useEffect(() => {
    refreshTickers();
    const interval = setInterval(refreshTickers, 4000);
    return () => clearInterval(interval);
  }, [refreshTickers]);

  // ─── Seçili Coin Sentiment & Derinlik Çekimi ──────────────────────
  useEffect(() => {
    let isCurrent = true;
    fetchSentiment(selectedSymbol).then((data) => {
      if (isCurrent) setSentiment(data);
    });

    const interval = setInterval(() => {
      fetchSentiment(selectedSymbol).then((data) => {
        if (isCurrent) setSentiment(data);
      });
    }, 5000);

    return () => {
      isCurrent = false;
      clearInterval(interval);
    };
  }, [selectedSymbol]);

  // Seçili Ticker Objesi
  const activeTicker = useMemo(() => {
    return (
      tickers.find((t) => t.symbol === selectedSymbol) || {
        symbol: selectedSymbol,
        price: 83520,
        priceStr: '83,520.00',
        decimals: 2,
        minMove: 0.01,
        chg: 1240,
        chgPct: 3.42,
        volUsd: 14850000000,
        high: 84200,
        low: 81800,
        fr: 0.0001,
        frInterval: '8h',
        nextFundingTime: Date.now() + 14400000
      }
    );
  }, [tickers, selectedSymbol]);

  // 200 Günlük Analiz Verisi
  const analytics200d = useMemo(() => {
    return compute200dAnalytics(selectedSymbol, activeTicker.price);
  }, [selectedSymbol, activeTicker.price]);

  // Canlı Algoritmik Teşhis (Verdict)
  const verdict = useMemo(() => {
    return generateLiveVerdict(activeTicker, sentiment, 54);
  }, [activeTicker, sentiment]);

  // Favori Aç/Kapat
  const toggleFavorite = (sym: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      return next;
    });
  };

  // Pozisyon Ekle / Kapat / Marjin Ekle
  const handleAddPosition = (pos: TreasuryPosition) => {
    setPositions((prev) => [pos, ...prev]);
  };

  const handleClosePosition = (id: string) => {
    const pos = positions.find((p) => p.id === id);
    if (pos) {
      const curPrice = activeTicker.price || pos.curPrice;
      const diff = pos.side === 'LONG' ? curPrice - pos.entryPrice : pos.entryPrice - curPrice;
      const profit = diff * pos.amount;
      setSettings((prev) => ({
        ...prev,
        dailyRealizedPnl: prev.dailyRealizedPnl + profit
      }));
    }
    setPositions((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddMargin = (id: string, amount: number) => {
    setPositions((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newMargin = p.margin + amount;
          // Yeni likidasyon fiyatını hesapla (kaldıraç düşer, mesafe açılır)
          const newLev = Math.max(1, p.leverage * 0.85);
          const newLiq =
            p.side === 'LONG'
              ? Math.max(0, +(p.entryPrice * (1 - (1 / newLev) * 0.95)).toFixed(4))
              : +(p.entryPrice * (1 + (1 / newLev) * 0.95)).toFixed(4);
          return {
            ...p,
            margin: newMargin,
            leverage: Math.round(newLev),
            liqPrice: newLiq
          };
        }
        return p;
      })
    );
  };

  // Yeni Canlı Sinyal Simülasyonu
  const handleSimulateSignal = (botId: BotId) => {
    const b = bots.find((item) => item.id === botId);
    if (!b) return;

    const sym = ['SUIUSDT', 'SOLUSDT', 'NEARUSDT', 'DOGEUSDT', 'TAOUSDT'][
      Math.floor(Math.random() * 5)
    ];
    const priceNum = activeTicker.price || 100;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newSig: BotSignal = {
      id: `${botId}_${sym}_${Date.now()}`,
      botId,
      botName: b.name,
      symbol: sym,
      timestamp: Date.now(),
      isoDate: now.toISOString(),
      dateStr: now.toLocaleDateString(),
      time: timeStr,
      dot: '🟢',
      strategy: b.strategy,
      stars: '⭐⭐⭐',
      boostValue: `+${(Math.random() * 3 + 1).toFixed(2)}%`,
      currentPrice: priceNum.toFixed(2),
      prevPrice: (priceNum * 0.985).toFixed(2),
      rsi: { m1: '32 ❗', m5: '35', h1: '42' },
      srsi: { m1: '12 ❗', m5: '25' },
      wt: 'Dip Sıçrama 🟢'
    };

    setSignals((prev) => [newSig, ...prev]);
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-[#080a0c] text-[#eaecef] overflow-hidden select-none font-sans">
      {/* 1. Üst Başlık & Gezinme Çubuğu */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeView={activeView}
        onViewChange={setActiveView}
        totalEquity={settings.totalEquity}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isLive={isLive}
        activeSymbol={selectedSymbol}
      />

      {/* 2. Ana Çalışma Alanı (Body) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sol / Orta: Seçili Görünüm */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {activeView === 'cockpit' && (
            <TreasuryCockpit
              settings={settings}
              positions={positions}
              bots={bots}
              tickers={tickers}
              selectedSymbol={selectedSymbol}
              onSelectSymbol={setSelectedSymbol}
              onAddPosition={handleAddPosition}
              onClosePosition={handleClosePosition}
              onAddMargin={handleAddMargin}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
            />
          )}

          {activeView === 'chart' && (
            <ChartView
              symbol={selectedSymbol}
              ticker={activeTicker}
              sentiment={sentiment}
            />
          )}

          {activeView === 'bots' && (
            <BotHub
              bots={bots}
              signals={signals}
              selectedBotId={selectedBotId}
              onSelectBotId={setSelectedBotId}
              onSelectCoin={(sym) => {
                setSelectedSymbol(sym);
                setActiveView('cockpit');
              }}
              onSimulateSignal={handleSimulateSignal}
            />
          )}

          {activeView === 'verdict' && (
            <LiveVerdictCard
              verdict={verdict}
              ticker={activeTicker}
              sentiment={sentiment}
              onSelectSymbol={setSelectedSymbol}
            />
          )}

          {activeView === 'watchlist' && (
            <div className="flex-1 p-3 bg-[#080a0c] flex flex-col">
              <Watchlist
                tickers={tickers}
                selectedSymbol={selectedSymbol}
                onSelectSymbol={(sym) => {
                  setSelectedSymbol(sym);
                  setActiveView('cockpit');
                }}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                searchFilter={searchQuery}
              />
            </div>
          )}
        </div>

        {/* Sağ Kenar Çubuğu (Watchlist & Seçili Coin Snapshot) */}
        <aside className="hidden xl:flex w-84 2xl:w-96 flex-col border-l border-white/10 bg-[#0d1117] p-2 gap-2 shrink-0 overflow-y-auto">
          {/* Ticker Snapshot */}
          <TickerSnapshot
            ticker={activeTicker}
            sentiment={sentiment}
            analytics200d={analytics200d}
            onOpenSentimentModal={() => setIsSentimentModalOpen(true)}
            onOpenCoinHistory={() => setIsCoinHistoryModalOpen(true)}
          />

          {/* Hızlı Watchlist Tablosu */}
          <div className="flex-1 min-h-[360px] flex flex-col">
            <Watchlist
              tickers={tickers}
              selectedSymbol={selectedSymbol}
              onSelectSymbol={setSelectedSymbol}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              searchFilter={searchQuery}
            />
          </div>
        </aside>
      </div>

      {/* 3. Modallar */}
      <TreasurySettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSave={setSettings}
      />

      <SentimentModal
        isOpen={isSentimentModalOpen}
        onClose={() => setIsSentimentModalOpen(false)}
        sentiment={sentiment}
        ticker={activeTicker}
      />

      <CoinHistoryModal
        isOpen={isCoinHistoryModalOpen}
        onClose={() => setIsCoinHistoryModalOpen(false)}
        symbol={selectedSymbol}
        signals={signals}
      />
    </div>
  );
};
