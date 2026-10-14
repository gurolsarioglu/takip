import React, { useState, useEffect } from 'react';
import { MarketTicker, SentimentData, CoinAnalytics200d } from '../types';
import { LayoutGrid, History, Clock } from 'lucide-react';

interface TickerSnapshotProps {
  ticker: MarketTicker | undefined;
  sentiment: SentimentData | undefined;
  analytics200d: CoinAnalytics200d | undefined;
  onOpenSentimentModal: () => void;
  onOpenCoinHistory: () => void;
}

export const TickerSnapshot: React.FC<TickerSnapshotProps> = ({
  ticker,
  sentiment,
  analytics200d,
  onOpenSentimentModal,
  onOpenCoinHistory
}) => {
  const [countdownStr, setCountdownStr] = useState('07:13:42');

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const nextTime = ticker?.nextFundingTime || now + 14400000;
      const diff = Math.max(0, nextTime - now);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdownStr(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [ticker?.nextFundingTime]);

  if (!ticker) {
    return (
      <div className="p-3 bg-[#0d1117] border border-white/10 rounded-lg text-slate-500 text-xs">
        Sembol seçiliyor...
      </div>
    );
  }

  const isPositive = ticker.chgPct >= 0;
  const longPct = sentiment?.topPosition?.longPct ?? 65.94;
  const shortPct = sentiment?.topPosition?.shortPct ?? 34.06;
  const fundingPct = (ticker.fr * 100).toFixed(4);
  const isNegFunding = ticker.fr < 0;

  return (
    <div className="bg-[#0d1117] border border-white/10 rounded-lg p-3 flex flex-col gap-2.5 select-none shrink-0 shadow-lg shadow-black/20">
      {/* 1. Üst Satır: Sembol Bilgisi & Fonlama */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
          <span className="font-extrabold text-sm text-slate-100 font-mono tracking-wide">
            {ticker.symbol}
            <span className="text-[10px] text-slate-500 font-normal">.P</span>
          </span>
          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
            Perp
          </span>
        </div>

        <div className="flex items-center gap-2 text-right">
          <div className="text-[11px] font-mono">
            <span className="text-slate-400">Funding ({ticker.frInterval}) </span>
            <span className={`font-bold ${isNegFunding ? 'text-purple-400' : 'text-amber-400'}`}>
              {fundingPct}% {isNegFunding ? '↘' : '↗'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded font-mono">
            <Clock className="w-2.5 h-2.5 text-cyan-400" />
            <span>{countdownStr}</span>
          </div>
        </div>
      </div>

      {/* 2. Orta Satır: Fiyat & Değişim */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span
            className={`text-2xl font-black font-mono tracking-tight ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {ticker.priceStr}
          </span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
              isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {ticker.chgPct.toFixed(2)}%
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
          <div>
            <span className="text-slate-500">24h Y:</span> <span className="text-slate-200">{ticker.high}</span>
          </div>
          <div>
            <span className="text-slate-500">24h D:</span> <span className="text-slate-200">{ticker.low}</span>
          </div>
        </div>
      </div>

      {/* 3. Alt Satır: Balina Long/Short Duyarlılık Çubuğu & Modal Butonu */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        <div className="text-[10px] font-mono text-slate-400 shrink-0">
          OI: <span className="text-cyan-400 font-bold">{sentiment?.openInterest?.toLocaleString() || '160,988,789'}</span>
        </div>

        {/* L/S Duyarlılık Çubuğu */}
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-2 w-full bg-rose-500/30 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${longPct}%` }}
              title={`Long: %${longPct}`}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono font-bold">
            <span className="text-emerald-400">L %{longPct.toFixed(1)}</span>
            <span className="text-rose-400">%{shortPct.toFixed(1)} S</span>
          </div>
        </div>

        {/* Eylem Butonları */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onOpenSentimentModal}
            className="p-1 px-1.5 rounded bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 hover:border-cyan-400/50 transition-colors flex items-center gap-1 text-[10px] font-medium"
            title="Derin Piyasa ve Balina Dağılımı Modalı"
          >
            <LayoutGrid className="w-3 h-3" />
            <span className="hidden sm:inline">Derinlik</span>
          </button>
          <button
            onClick={onOpenCoinHistory}
            className="p-1 px-1.5 rounded bg-white/5 hover:bg-white/10 text-amber-400 border border-white/10 hover:border-amber-400/50 transition-colors flex items-center gap-1 text-[10px] font-medium"
            title="Bu Coine Ait 60 Günlük Bot Sinyalleri"
          >
            <History className="w-3 h-3" />
            <span className="hidden sm:inline">Sinyaller</span>
          </button>
        </div>
      </div>

      {/* 4. 200 Günlük Quant Rozetleri */}
      {analytics200d && (
        <div className="grid grid-cols-5 gap-1.5 pt-1.5 border-t border-white/5 text-center">
          <div className="bg-[#12161f] p-1 rounded border border-white/5">
            <div className="text-[9px] text-slate-400">EMA200</div>
            <div className="text-[10px] font-bold text-cyan-400 font-mono">
              {analytics200d.emaDiffPct > 0 ? '+' : ''}
              {analytics200d.emaDiffPct}%
            </div>
          </div>
          <div className="bg-[#12161f] p-1 rounded border border-white/5">
            <div className="text-[9px] text-slate-400">200G Zirve</div>
            <div className="text-[10px] font-bold text-rose-400 font-mono">
              {analytics200d.athDiffPct}%
            </div>
          </div>
          <div className="bg-[#12161f] p-1 rounded border border-white/5">
            <div className="text-[9px] text-slate-400">200G Dip</div>
            <div className="text-[10px] font-bold text-emerald-400 font-mono">
              +{analytics200d.atlDiffPct}%
            </div>
          </div>
          <div className="bg-[#12161f] p-1 rounded border border-white/5">
            <div className="text-[9px] text-slate-400">Pozitif Gün</div>
            <div className="text-[10px] font-bold text-amber-400 font-mono">
              %{analytics200d.winRatePct}
            </div>
          </div>
          <div className="bg-[#12161f] p-1 rounded border border-white/5">
            <div className="text-[9px] text-slate-400">Seri</div>
            <div
              className={`text-[10px] font-bold font-mono ${
                analytics200d.streakType === 'green' ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {analytics200d.streak}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
