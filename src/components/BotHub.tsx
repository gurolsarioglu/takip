import React, { useState, useMemo } from 'react';
import { BotConfig, BotSignal, BotId } from '../types';
import { Bot, Search, ExternalLink, Zap, Star, Shield, Filter } from 'lucide-react';

interface BotHubProps {
  bots: BotConfig[];
  signals: BotSignal[];
  selectedBotId: BotId | 'all';
  onSelectBotId: (id: BotId | 'all') => void;
  onSelectCoin: (symbol: string) => void;
  onSimulateSignal: (botId: BotId) => void;
}

export const BotHub: React.FC<BotHubProps> = ({
  bots,
  signals,
  selectedBotId,
  onSelectBotId,
  onSelectCoin,
  onSimulateSignal
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSignals = useMemo(() => {
    let list = signals;
    if (selectedBotId !== 'all') {
      list = list.filter((s) => s.botId === selectedBotId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toUpperCase().trim();
      list = list.filter((s) => s.symbol.includes(q) || s.botName.toUpperCase().includes(q));
    }
    return list;
  }, [signals, selectedBotId, searchQuery]);

  const activeBot = bots.find((b) => b.id === selectedBotId);

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-[#080a0c] overflow-hidden select-none">
      {/* Sol Dikey Bot Seçim Şeridi */}
      <aside className="w-full md:w-56 bg-[#0d1117] border-r border-white/10 flex md:flex-col shrink-0 overflow-x-auto md:overflow-y-auto no-scrollbar p-2 gap-1.5">
        <button
          onClick={() => onSelectBotId('all')}
          className={`flex items-center justify-between px-3 py-2 rounded text-xs font-mono font-bold transition-all shrink-0 ${
            selectedBotId === 'all'
              ? 'bg-gradient-to-r from-sky-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>🌐</span>
            <span>TÜM BOTLAR</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-slate-300">
            {signals.length}
          </span>
        </button>

        <div className="hidden md:block my-1 border-t border-white/5" />

        {bots.map((b) => {
          const isSelected = selectedBotId === b.id;
          const count = signals.filter((s) => s.botId === b.id).length;

          let badgeColorClass = 'text-cyan-400 border-cyan-500/30';
          if (b.color === 'gold') badgeColorClass = 'text-amber-400 border-amber-500/30';
          if (b.color === 'orange') badgeColorClass = 'text-orange-400 border-orange-500/30';
          if (b.color === 'red') badgeColorClass = 'text-rose-400 border-rose-500/30';
          if (b.color === 'purple') badgeColorClass = 'text-purple-400 border-purple-500/30';
          if (b.color === 'green') badgeColorClass = 'text-emerald-400 border-emerald-500/30';

          return (
            <button
              key={b.id}
              onClick={() => onSelectBotId(b.id)}
              className={`flex items-center justify-between px-3 py-2 rounded text-xs font-mono transition-all shrink-0 text-left ${
                isSelected
                  ? 'bg-cyan-500/20 text-white border border-cyan-500/50 shadow-md'
                  : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 font-bold">
                  <span className={`px-1 py-0.2 rounded text-[10px] bg-black/40 border ${badgeColorClass}`}>
                    {b.badge}
                  </span>
                  <span className="truncate">{b.name}</span>
                </div>
                <div className="text-[9px] text-slate-500 truncate mt-0.5">{b.strategy}</div>
              </div>

              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 font-bold text-slate-300 ml-1">
                {count}
              </span>
            </button>
          );
        })}
      </aside>

      {/* Sağ Sinyal Akış Listesi */}
      <main className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
        {/* Üst Arama ve Kontroller */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0d1117] border border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sinyallerde ara... (örn: AMD, ONDO, 4S)"
                className="bg-[#12161f] border border-white/10 rounded pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono w-48 sm:w-64"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              <strong>{filteredSignals.length}</strong> sinyal bulundu
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeBot && (
              <button
                onClick={() => onSimulateSignal(activeBot.id)}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors"
                title="Bu bot için yeni bir canlı sinyal tetikle"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                + Sinyal Tetikle
              </button>
            )}
          </div>
        </div>

        {/* Sinyal Kartları Listesi */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 pr-1 font-mono">
          {filteredSignals.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 text-xs">
              Bu filtreye uygun sinyal bulunamadı.
            </div>
          ) : (
            filteredSignals.map((s) => {
              const isLong = s.dot === '🟢';
              const rsiObj = typeof s.rsi === 'object' && s.rsi !== null ? s.rsi : null;
              const srsiObj = typeof s.srsi === 'object' && s.srsi !== null ? s.srsi : null;

              return (
                <div
                  key={s.id}
                  className="bg-[#0d1117] border border-white/10 hover:border-cyan-500/40 rounded-lg p-3 flex flex-col justify-between gap-2 transition-all shadow-sm hover:shadow-cyan-500/5 group"
                >
                  {/* Kart Başlığı */}
                  <div>
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{s.dot}</span>
                        <span className="font-bold text-white text-xs">{s.botName}</span>
                        {s.stars && <span className="text-amber-400 text-xs">{s.stars}</span>}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {s.dateStr} <strong className="text-slate-200">{s.time}</strong>
                      </div>
                    </div>

                    {/* Sembol ve Fiyat Bilgisi */}
                    <div className="flex items-baseline justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-cyan-300">{s.symbol}</span>
                        {s.strategy && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-slate-400 font-sans">
                            {s.strategy}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-100 text-xs">{s.currentPrice}</span>
                        {s.prevPrice && s.prevPrice !== '0.00' && (
                          <span className="text-[9px] text-slate-500 ml-1 block">
                            Önceki: {s.prevPrice}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* İndikatör ve Metrik Rozetleri */}
                    <div className="grid grid-cols-2 gap-1.5 mt-2.5 text-[10px] bg-[#12161f] p-2 rounded border border-white/5">
                      {s.boostValue && (
                        <div>
                          <span className="text-slate-500">Boost: </span>
                          <span className="text-emerald-400 font-bold">{s.boostValue}</span>
                        </div>
                      )}
                      {s.dropValue && (
                        <div>
                          <span className="text-slate-500">Drop: </span>
                          <span className="text-rose-400 font-bold">{s.dropValue}</span>
                        </div>
                      )}
                      {s.volume && (
                        <div>
                          <span className="text-slate-500">Hacim: </span>
                          <span className="text-amber-400 font-bold">{s.volume}</span>
                        </div>
                      )}
                      {s.fundingRate && (
                        <div>
                          <span className="text-slate-500">Fonlama: </span>
                          <span className="text-purple-400 font-bold">{s.fundingRate}</span>
                        </div>
                      )}
                      {s.traderPositioning && (
                        <div>
                          <span className="text-slate-500">Balina: </span>
                          <span className="text-emerald-400 font-bold">{s.traderPositioning}</span>
                        </div>
                      )}
                      {s.wt && (
                        <div>
                          <span className="text-slate-500">WaveTrend: </span>
                          <span className="text-cyan-400 font-bold">{s.wt}</span>
                        </div>
                      )}

                      {/* Çoklu Zaman Dilimi RSI */}
                      {rsiObj && (
                        <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-white/5 text-[9px]">
                          <span className="text-slate-500">RSI:</span>
                          {rsiObj.m1 && <span>1m: <strong className="text-white">{rsiObj.m1}</strong></span>}
                          {rsiObj.m5 && <span>5m: <strong className="text-white">{rsiObj.m5}</strong></span>}
                          {rsiObj.h1 && <span>1h: <strong className="text-white">{rsiObj.h1}</strong></span>}
                          {rsiObj.h4 && <span>4h: <strong className="text-white">{rsiObj.h4}</strong></span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Alt Eylem: Coini Terminalde Aç */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Stop-Loss'suz Marjin Modeli</span>
                    <button
                      onClick={() => onSelectCoin(s.symbol)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[10px] font-bold transition-colors"
                    >
                      <span>Kokpitte İncele</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};
