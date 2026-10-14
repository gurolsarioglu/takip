import React from 'react';
import { Search, Shield, Zap, TrendingUp, Cpu, Sliders, DollarSign } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeView: 'cockpit' | 'watchlist' | 'chart' | 'bots' | 'verdict';
  onViewChange: (view: 'cockpit' | 'watchlist' | 'chart' | 'bots' | 'verdict') => void;
  totalEquity: number;
  onOpenSettings: () => void;
  isLive: boolean;
  activeSymbol: string;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  activeView,
  onViewChange,
  totalEquity,
  onOpenSettings,
  isLive,
  activeSymbol
}) => {
  return (
    <header className="h-12 bg-[#0d1117] border-b border-white/10 px-3 flex items-center justify-between shrink-0 select-none z-50">
      {/* Sol Bölüm: Logo & Arama & Hızlı Kasa Etiketleri */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-gradient-to-r from-emerald-500/20 to-sky-500/20 border border-sky-500/40 shadow-sm shadow-sky-500/10">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="font-extrabold text-xs tracking-wider text-slate-100 font-mono">
            ALPHA KASA & BOT KOKPİTİ
          </span>
        </div>

        {/* Arama Girişi */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Ara... (${activeSymbol})`}
            className="w-36 md:w-48 bg-[#12161f] border border-white/10 focus:border-cyan-400 rounded pl-8 pr-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors font-mono"
            spellCheck={false}
          />
        </div>

        {/* Hızlı Bilgi Rozetleri (Desktop) */}
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
            💼 Kasa: ${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
            🛡️ Mod: Stop-Loss'suz (Marjin Kontrolü)
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            🤖 9 Quant Botu Aktif
          </span>
        </div>
      </div>

      {/* Orta Bölüm: Görünüm Sekmeleri */}
      <nav className="flex items-center gap-1 bg-[#12161f]/80 p-0.5 rounded-lg border border-white/5">
        <button
          onClick={() => onViewChange('cockpit')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
            activeView === 'cockpit'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Kasa Yönetimi & 9-Bot Matrisi"
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Kasa & Kokpit</span>
        </button>

        <button
          onClick={() => onViewChange('chart')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
            activeView === 'chart'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Grafik & Smart Money Derinlik"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Grafik & Derinlik</span>
        </button>

        <button
          onClick={() => onViewChange('bots')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
            activeView === 'bots'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="9 Quant Botu Sinyal İstasyonu"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">9 Bot Sinyalleri</span>
        </button>

        <button
          onClick={() => onViewChange('verdict')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
            activeView === 'verdict'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Akıllı Canlı Teşhis ve Taktik Motoru"
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Canlı Teşhis</span>
        </button>
      </nav>

      {/* Sağ Bölüm: Canlı Gösterge & Ayarlar */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/40 border border-white/10 text-xs">
          <span className="text-amber-400 font-bold">🟡</span>
          <span className="text-slate-300 font-mono text-[11px] hidden md:inline">Binance Futures</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-emerald-400 font-mono font-bold text-[10px]">CANLI</span>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors"
          title="Kasa Ayarları"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
