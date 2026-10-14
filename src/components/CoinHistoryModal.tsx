import React, { useMemo } from 'react';
import { BotSignal } from '../types';
import { X, History, Sparkles } from 'lucide-react';

interface CoinHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  signals: BotSignal[];
}

export const CoinHistoryModal: React.FC<CoinHistoryModalProps> = ({
  isOpen,
  onClose,
  symbol,
  signals
}) => {
  if (!isOpen) return null;

  const coinSignals = useMemo(() => {
    return signals.filter(
      (s) => s.symbol.toUpperCase() === symbol.replace('.P', '').toUpperCase()
    );
  }, [signals, symbol]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="bg-[#0d1117] border border-white/10 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col font-sans">
        {/* Başlık */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#12161f]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white font-mono">
              {symbol} — Sinyal Geçmişi & Bot Kayıtları
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
              {coinSignals.length} Sinyal
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Liste */}
        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs flex flex-col gap-2">
          {coinSignals.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Bu sembole ait son arşivde kayıtlı bot sinyali bulunmuyor.
            </div>
          ) : (
            coinSignals.map((s) => (
              <div
                key={s.id}
                className="bg-[#12161f] border border-white/5 hover:border-white/20 p-2.5 rounded-lg flex flex-col gap-1.5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{s.dot}</span>
                    <span className="font-bold text-white">{s.botName}</span>
                    {s.stars && <span className="text-amber-400">{s.stars}</span>}
                    {s.strategy && (
                      <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.2 rounded font-sans">
                        {s.strategy}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {s.dateStr} {s.time}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-white/5 text-slate-300">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Fiyat:</span>
                    <span className="text-cyan-400 font-bold">{s.currentPrice}</span>
                  </div>
                  {s.boostValue && (
                    <div>
                      <span className="text-slate-500 text-[10px] block">Boost:</span>
                      <span className="text-emerald-400 font-bold">{s.boostValue}</span>
                    </div>
                  )}
                  {s.dropValue && (
                    <div>
                      <span className="text-slate-500 text-[10px] block">Drop:</span>
                      <span className="text-rose-400 font-bold">{s.dropValue}</span>
                    </div>
                  )}
                  {s.volume && (
                    <div>
                      <span className="text-slate-500 text-[10px] block">Hacim:</span>
                      <span className="text-amber-400 font-bold">{s.volume}</span>
                    </div>
                  )}
                  {s.fundingRate && (
                    <div>
                      <span className="text-slate-500 text-[10px] block">Fonlama:</span>
                      <span className="text-purple-400 font-bold">{s.fundingRate}</span>
                    </div>
                  )}
                  {typeof s.rsi === 'string' && (
                    <div>
                      <span className="text-slate-500 text-[10px] block">RSI:</span>
                      <span className="text-slate-200">{s.rsi}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Alt Bilgi */}
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
