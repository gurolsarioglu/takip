import React from 'react';
import { SentimentData, MarketTicker } from '../types';
import { X, Users, Activity, BarChart2, ShieldAlert } from 'lucide-react';

interface SentimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sentiment: SentimentData | undefined;
  ticker: MarketTicker | undefined;
}

export const SentimentModal: React.FC<SentimentModalProps> = ({
  isOpen,
  onClose,
  sentiment,
  ticker
}) => {
  if (!isOpen || !ticker) return null;

  const orderBook = sentiment?.orderBook || { bidPct: 52.4, askPct: 47.6 };
  const topPos = sentiment?.topPosition || { longPct: 65.94, shortPct: 34.06 };
  const topAcc = sentiment?.topAccount || { longPct: 54.20, shortPct: 45.80 };
  const globalExp = sentiment?.globalExposure || { longPct: 44.15, shortPct: 55.85 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="bg-[#0d1117] border border-white/10 rounded-xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col font-sans">
        {/* Modal Başlık */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#12161f]">
          <div className="flex items-center gap-2">
            <span className="text-base">◫</span>
            <h3 className="text-sm font-bold text-white font-mono">
              {ticker.symbol} — Derin Piyasa Dağılımı & Akıllı Para Radarı
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal İçerik */}
        <div className="p-4 flex flex-col gap-4 text-xs font-mono">
          {/* 1. Emir Defteri (Order Book Bids vs Asks) */}
          <div className="bg-[#12161f] p-3 rounded-lg border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-bold flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                EMİR DEFTERİ DERİNLİĞİ (TOP 50 KADEME)
              </span>
              <span className="text-[10px] text-slate-400 font-sans">Alış vs Satış Hacim Baskısı</span>
            </div>

            <div className="h-3 w-full bg-rose-500/20 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${orderBook.bidPct}%` }}
              />
            </div>

            <div className="flex justify-between font-bold text-[11px]">
              <span className="text-emerald-400">Alıcı (Bids): %{orderBook.bidPct}</span>
              <span className="text-rose-400">Satıcı (Asks): %{orderBook.askPct}</span>
            </div>
          </div>

          {/* 2. Top Trader Balina Pozisyon Dağılımı */}
          <div className="bg-[#12161f] p-3 rounded-lg border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                TOP TRADER POZİSYON ORANI (BALİNA PARİTESİ)
              </span>
              <span className="text-emerald-400 font-bold">
                {(topPos.longPct / (topPos.shortPct || 1)).toFixed(2)}x
              </span>
            </div>

            <div className="h-3 w-full bg-rose-500/20 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${topPos.longPct}%` }}
              />
            </div>

            <div className="flex justify-between font-bold text-[11px]">
              <span className="text-emerald-400">Balina Long: %{topPos.longPct}</span>
              <span className="text-rose-400">Balina Short: %{topPos.shortPct}</span>
            </div>
          </div>

          {/* 3. Top Trader Elit Hesap Dağılımı */}
          <div className="bg-[#12161f] p-3 rounded-lg border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                TOP TRADER HESAP ORANI (BÜYÜK HESAPLAR)
              </span>
              <span className="text-slate-400 font-sans text-[10px]">Net Hesap Sayısı</span>
            </div>

            <div className="h-3 w-full bg-rose-500/20 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${topAcc.longPct}%` }}
              />
            </div>

            <div className="flex justify-between font-bold text-[11px]">
              <span className="text-emerald-400">Long Hesap: %{topAcc.longPct}</span>
              <span className="text-rose-400">Short Hesap: %{topAcc.shortPct}</span>
            </div>
          </div>

          {/* 4. Global Market Perakende Oranı */}
          <div className="bg-[#12161f] p-3 rounded-lg border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                GLOBAL PERAKENDE (KÜÇÜK YATIRIMCI) ORANI
              </span>
              <span className="text-amber-400 text-[10px] font-sans">Ters İndikatör</span>
            </div>

            <div className="h-3 w-full bg-rose-500/20 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${globalExp.longPct}%` }}
              />
            </div>

            <div className="flex justify-between font-bold text-[11px]">
              <span className="text-emerald-400">Perakende Long: %{globalExp.longPct}</span>
              <span className="text-rose-400">Perakende Short: %{globalExp.shortPct}</span>
            </div>
          </div>
        </div>

        {/* Modal Alt Kapat Butonu */}
        <div className="p-3 bg-[#12161f] border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
