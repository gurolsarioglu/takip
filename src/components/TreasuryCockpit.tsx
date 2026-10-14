import React, { useState } from 'react';
import {
  TreasuryPosition,
  TreasurySettings,
  BotConfig,
  MarketTicker
} from '../types';
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  Percent,
  PlusCircle,
  XCircle,
  Sliders,
  DollarSign,
  Lock,
  ArrowRight
} from 'lucide-react';

interface TreasuryCockpitProps {
  settings: TreasurySettings;
  positions: TreasuryPosition[];
  bots: BotConfig[];
  tickers: MarketTicker[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onAddPosition: (pos: TreasuryPosition) => void;
  onClosePosition: (id: string) => void;
  onAddMargin: (id: string, amount: number) => void;
  onOpenSettings: () => void;
}

export const TreasuryCockpit: React.FC<TreasuryCockpitProps> = ({
  settings,
  positions,
  bots,
  tickers,
  selectedSymbol,
  onSelectSymbol,
  onAddPosition,
  onClosePosition,
  onAddMargin,
  onOpenSettings
}) => {
  // Simülatör / Yeni Pozisyon Açma State'i
  const [simSymbol, setSimSymbol] = useState(selectedSymbol);
  const [simSide, setSimSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [simLeverage, setSimLeverage] = useState<number>(5);
  const [simMargin, setSimMargin] = useState<number>(settings.totalEquity * (settings.marginAllocPerTradePct / 100));
  const [simBotId, setSimBotId] = useState<string>('hammerproplus');

  const selectedTicker = tickers.find((t) => t.symbol === simSymbol) || tickers[0];
  const simPrice = selectedTicker?.price || 100;

  // Likidasyon Formülü
  const calculateLiqPrice = (entry: number, lev: number, side: 'LONG' | 'SHORT') => {
    if (lev <= 1) return 0;
    const m = 0.95;
    if (side === 'LONG') {
      return Math.max(0, +(entry * (1 - (1 / lev) * m)).toFixed(4));
    } else {
      return +(entry * (1 + (1 / lev) * m)).toFixed(4);
    }
  };

  const simLiqPrice = calculateLiqPrice(simPrice, simLeverage, simSide);
  const simLiqDistancePct =
    simLiqPrice > 0
      ? Math.abs(((simPrice - simLiqPrice) / simPrice) * 100)
      : 100;

  const simNotional = simMargin * simLeverage;
  const simAmount = simPrice > 0 ? parseFloat((simNotional / simPrice).toFixed(4)) : 0;
  const simTpTargetPct = settings.targetTpPct || 2.5;
  const simTpPrice =
    simSide === 'LONG'
      ? +(simPrice * (1 + simTpTargetPct / 100)).toFixed(4)
      : +(simPrice * (1 - simTpTargetPct / 100)).toFixed(4);
  const simExpectedProfit = (simNotional * simTpTargetPct) / 100;

  // Kasa Metrikleri Hesaplamaları
  const inTradeMargin = positions.reduce((sum, p) => sum + p.margin, 0);
  const freeMargin = Math.max(0, settings.totalEquity - inTradeMargin);
  const marginUsagePct = (inTradeMargin / (settings.totalEquity || 1)) * 100;

  let totalUnrealizedPnl = 0;
  let minLiqDistance = 100;

  const enrichedPositions = positions.map((p) => {
    const tick = tickers.find((t) => t.symbol === p.symbol);
    const cur = tick?.price || p.curPrice;
    const diff = p.side === 'LONG' ? cur - p.entryPrice : p.entryPrice - cur;
    const pnl = diff * p.amount;
    const pnlPct = (pnl / (p.margin || 1)) * 100;

    const liqDist =
      p.liqPrice > 0 ? Math.abs(((cur - p.liqPrice) / cur) * 100) : 100;
    if (liqDist < minLiqDistance) minLiqDistance = liqDist;

    totalUnrealizedPnl += pnl;

    return {
      ...p,
      curPrice: cur,
      pnl,
      pnlPct,
      liqDist
    };
  });

  const handleCreatePosition = () => {
    const selectedBot = bots.find((b) => b.id === simBotId) || bots[0];
    const newPos: TreasuryPosition = {
      id: `pos_${simSymbol}_${Date.now()}`,
      symbol: simSymbol,
      botId: selectedBot.id,
      botBadge: selectedBot.badge,
      side: simSide,
      entryPrice: simPrice,
      curPrice: simPrice,
      amount: simAmount,
      margin: simMargin,
      leverage: simLeverage,
      liqPrice: simLiqPrice,
      tp1: simTpPrice,
      tp2: +(simTpPrice * (simSide === 'LONG' ? 1.02 : 0.98)).toFixed(4),
      openTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes: `${selectedBot.name} Stratejisi Girişi`
    };

    onAddPosition(newPos);
  };

  return (
    <div className="flex-1 flex flex-col gap-3 p-3 overflow-y-auto font-sans select-none bg-[#080a0c]">
      {/* 1. Üst Banner & Felsefe Bildirisi */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg bg-gradient-to-r from-[#0d1117] via-[#12161f] to-[#0d1117] border border-sky-500/30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-xl shrink-0">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-white tracking-wide font-mono">
                KASA YÖNETİMİ & 9-BOT KOKPİTİ
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/40">
                🛡️ STOP-LOSS'SUZ MARJİN GÜVENLİĞİ
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Sermaye dağılımı, % Liq güvenlik tamponu ve kademeli kâr alımı ile risksiz portföy büyümesi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/50 text-xs font-semibold transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            Kasa Ayarları
          </button>
        </div>
      </div>

      {/* 2. Kasa Özet Metrikleri (5 Kart) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        {/* Kart 1: Toplam Kasa */}
        <div className="bg-[#0d1117] border border-white/10 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-medium">
            <span>TOPLAM SERMAYE</span>
            <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-black text-white font-mono my-1">
            ${settings.totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <span>Günlük Kâr:</span>
            <span className="font-bold">+${settings.dailyRealizedPnl.toFixed(2)}</span>
          </div>
        </div>

        {/* Kart 2: İşlemdeki Teminat */}
        <div className="bg-[#0d1117] border border-white/10 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-medium">
            <span>İŞLEMDEKİ TEMİNAT</span>
            <Lock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-black text-amber-400 font-mono my-1">
            ${inTradeMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Kullanım: <span className="text-amber-300 font-bold">%{marginUsagePct.toFixed(1)}</span> (Max %35)
          </div>
        </div>

        {/* Kart 3: Boş Teminat */}
        <div className="bg-[#0d1117] border border-white/10 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-medium">
            <span>BOŞ KASA (TEMİNAT)</span>
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-black text-emerald-400 font-mono my-1">
            ${freeMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Korumalı Rezerv: <span className="text-emerald-300 font-bold">%{(100 - marginUsagePct).toFixed(1)}</span>
          </div>
        </div>

        {/* Kart 4: Gerçekleşmemiş PnL */}
        <div className="bg-[#0d1117] border border-white/10 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-medium">
            <span>CANLI PnL (AÇIK)</span>
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div
            className={`text-lg font-black font-mono my-1 ${
              totalUnrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalUnrealizedPnl >= 0 ? '+' : ''}
            ${totalUnrealizedPnl.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {positions.length} Açık Pozisyon
          </div>
        </div>

        {/* Kart 5: Portföy Güvenlik Skoru */}
        <div className="bg-[#0d1117] border border-white/10 rounded-lg p-2.5 flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-medium">
            <span>LİKİDASYON GÜVENLİĞİ</span>
            <Percent className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-black text-cyan-400 font-mono my-1">
            %{minLiqDistance.toFixed(1)}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold">
            <span
              className={`px-1.5 py-0.2 rounded ${
                minLiqDistance > 40
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : minLiqDistance > 20
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {minLiqDistance > 40 ? 'GÜVENLİ (DÜŞÜK RİSK)' : minLiqDistance > 20 ? 'DİKKAT (ORTA)' : 'RİSKLİ'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. 9 Quant Botu Canlı Takip & Sermaye Tahsisat Matrisi */}
      <div className="bg-[#0d1117] border border-white/10 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-white">🤖 9 Quant Botu Sermaye Tahsisatı</span>
            <span className="text-[10px] px-2 py-0.2 rounded bg-white/5 text-cyan-400 font-mono font-bold">
              9/9 Aktif
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Toplam Tahsisat: %100 ($10,000)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2">
          {bots.map((b) => {
            const allocUsd = (settings.totalEquity * b.allocPct) / 100;
            return (
              <div
                key={b.id}
                className="bg-[#12161f] border border-white/5 hover:border-white/20 p-2 rounded flex flex-col justify-between transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-100">{b.badge}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-white/5 text-amber-400 font-mono">
                      %{b.allocPct}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{b.name}</div>
                  <div className="text-[10px] font-mono font-bold text-cyan-400 mt-1">
                    ${allocUsd.toFixed(0)}
                  </div>
                </div>
                <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                  <span>Sinyal: {b.count}</span>
                  <span className="text-emerald-400 font-bold">%{b.winRate} WR</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Alt Bölüm: Aktif Pozisyonlar Tablosu & Yeni Pozisyon Hesaplayıcısı */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Pozisyonlar Tablosu (8 Kolon) */}
        <div className="lg:col-span-8 bg-[#0d1117] border border-white/10 rounded-lg p-3 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs text-white">
                💼 Aktif Pozisyonlar (Stop-Loss'suz & Likidasyon Korumalı)
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 font-mono">
                {positions.length}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              Kâr hedefi: %{settings.targetTpPct} | Güvenli Liq &gt; %35
            </span>
          </div>

          <div className="overflow-x-auto flex-1 font-mono text-[11px]">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-[10px] pb-1">
                  <th className="py-1 px-1.5">Coin / Bot</th>
                  <th className="py-1 px-1.5">Yön</th>
                  <th className="py-1 px-1.5 text-right">Giriş / Anlık</th>
                  <th className="py-1 px-1.5 text-right">Teminat & Kaldıraç</th>
                  <th className="py-1 px-1.5 text-right">Likidasyon Fiyatı</th>
                  <th className="py-1 px-1.5 text-right">Güvenlik %</th>
                  <th className="py-1 px-1.5 text-right">PnL ($ / %)</th>
                  <th className="py-1 px-1.5 text-right">Hedef (TP1)</th>
                  <th className="py-1 px-1.5 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {enrichedPositions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-500 text-xs">
                      Aktif pozisyon bulunmuyor. Aşağıdaki hesaplayıcıdan yeni bir işlem ekleyebilirsiniz.
                    </td>
                  </tr>
                ) : (
                  enrichedPositions.map((pos) => {
                    const isProfit = pos.pnl >= 0;
                    return (
                      <tr key={pos.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-2 px-1.5">
                          <div className="font-bold text-white flex items-center gap-1">
                            {pos.symbol}
                            <span className="text-[9px] px-1 rounded bg-white/10 text-slate-300 font-normal">
                              {pos.botBadge}
                            </span>
                          </div>
                          <div className="text-[9px] text-slate-500">{pos.openTime}</div>
                        </td>

                        <td className="py-2 px-1.5 font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              pos.side === 'LONG'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {pos.side}
                          </span>
                        </td>

                        <td className="py-2 px-1.5 text-right">
                          <div className="text-slate-200">{pos.entryPrice}</div>
                          <div className="text-[10px] text-slate-400">{pos.curPrice}</div>
                        </td>

                        <td className="py-2 px-1.5 text-right">
                          <div className="text-amber-400 font-bold">${pos.margin}</div>
                          <div className="text-[10px] text-slate-400">{pos.leverage}x</div>
                        </td>

                        <td className="py-2 px-1.5 text-right text-rose-400">
                          {pos.liqPrice > 0 ? pos.liqPrice : 'Spot/Yok'}
                        </td>

                        <td className="py-2 px-1.5 text-right">
                          <span
                            className={`font-bold ${
                              pos.liqDist > 40
                                ? 'text-emerald-400'
                                : pos.liqDist > 20
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            %{pos.liqDist.toFixed(1)}
                          </span>
                        </td>

                        <td className="py-2 px-1.5 text-right font-bold">
                          <div className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                            {isProfit ? '+' : ''}${pos.pnl.toFixed(2)}
                          </div>
                          <div className={`text-[10px] ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? '+' : ''}{pos.pnlPct.toFixed(2)}%
                          </div>
                        </td>

                        <td className="py-2 px-1.5 text-right text-cyan-400">
                          {pos.tp1}
                        </td>

                        <td className="py-2 px-1.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onClosePosition(pos.id)}
                              className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 text-[10px] font-semibold transition-colors"
                              title="Pozisyonu Kapat ve Kârı Kasaya Al"
                            >
                              Kâr Al
                            </button>
                            <button
                              onClick={() => onAddMargin(pos.id, 100)}
                              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] transition-colors"
                              title="+$100 Marjin Ekle (Likidasyonu Uzaklaştır)"
                            >
                              +DCA
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Yeni Pozisyon / Risk Simülatörü (4 Kolon) */}
        <div className="lg:col-span-4 bg-[#0d1117] border border-white/10 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-xs text-white">⚡ Yeni Pozisyon & Risk Simülatörü</span>
              <span className="text-[10px] text-cyan-400 font-mono">Stop-Loss'suz Model</span>
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              {/* Sembol Seçimi */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Coin Sembolü</label>
                <div className="grid grid-cols-3 gap-1">
                  {['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'SUIUSDT', 'DOGEUSDT', 'NEARUSDT'].map((sym) => (
                    <button
                      key={sym}
                      onClick={() => {
                        setSimSymbol(sym);
                        onSelectSymbol(sym);
                      }}
                      className={`py-1 text-[11px] font-mono rounded font-medium transition-colors ${
                        simSymbol === sym
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                          : 'bg-[#12161f] text-slate-300 hover:bg-white/5 border border-white/5'
                      }`}
                    >
                      {sym.replace('USDT', '')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bot ve Strateji Seçimi */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Strateji / Bot</label>
                <select
                  value={simBotId}
                  onChange={(e) => setSimBotId(e.target.value)}
                  className="w-full bg-[#12161f] border border-white/10 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-400 font-mono"
                >
                  {bots.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.badge} — {b.name} ({b.strategy})
                    </option>
                  ))}
                </select>
              </div>

              {/* Yön (LONG / SHORT) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSimSide('LONG')}
                  className={`py-1.5 rounded font-bold text-xs transition-colors ${
                    simSide === 'LONG'
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30'
                      : 'bg-[#12161f] text-slate-400 hover:text-white'
                  }`}
                >
                  🟢 LONG
                </button>
                <button
                  onClick={() => setSimSide('SHORT')}
                  className={`py-1.5 rounded font-bold text-xs transition-colors ${
                    simSide === 'SHORT'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                      : 'bg-[#12161f] text-slate-400 hover:text-white'
                  }`}
                >
                  🔴 SHORT
                </button>
              </div>

              {/* Kaldıraç Slider */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Kaldıraç:</span>
                  <span className="font-mono font-bold text-amber-400">{simLeverage}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={simLeverage}
                  onChange={(e) => setSimLeverage(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 h-1 bg-white/10 rounded cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                  <span>1x (Spot)</span>
                  <span>5x</span>
                  <span>10x (Max Güvenli)</span>
                  <span>20x</span>
                </div>
              </div>

              {/* Teminat Girişi */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Teminat (Margin):</span>
                  <span className="font-mono font-bold text-white">${simMargin}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[100, 200, 300, 500].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setSimMargin(amt)}
                      className={`flex-1 py-1 rounded text-[10px] font-mono transition-colors ${
                        simMargin === amt
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                          : 'bg-[#12161f] text-slate-400 hover:bg-white/5 border border-white/5'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Canlı Hesaplanan Risk & Likidasyon Kutusu */}
              <div className="bg-[#080a0c] border border-white/10 rounded p-2 flex flex-col gap-1 font-mono text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Pozisyon Değeri:</span>
                  <span className="text-white font-bold">${simNotional.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tahmini Liq Fiyatı:</span>
                  <span className="text-rose-400 font-bold">{simLiqPrice > 0 ? simLiqPrice : 'Yok (1x)'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Liq Güvenlik Mesafesi:</span>
                  <span
                    className={`font-bold ${
                      simLiqDistancePct > 40
                        ? 'text-emerald-400'
                        : simLiqDistancePct > 20
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    %{simLiqDistancePct.toFixed(1)} {simLiqDistancePct > 40 ? '🛡️' : '⚠️'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-white/5">
                  <span>Hedef TP (%{simTpTargetPct}):</span>
                  <span className="text-emerald-400 font-bold">
                    {simTpPrice} (+${simExpectedProfit.toFixed(2)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleCreatePosition}
            className="w-full mt-3 py-2 rounded bg-gradient-to-r from-emerald-500 to-sky-500 text-black font-extrabold text-xs shadow-md shadow-emerald-500/20 hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            Pozisyonu Kasaya Ekle
          </button>
        </div>
      </div>
    </div>
  );
};
