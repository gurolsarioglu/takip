import React, { useState, useMemo } from 'react';
import { MarketTicker } from '../types';
import { Star, ArrowUpDown, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface WatchlistProps {
  tickers: MarketTicker[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  favorites: Set<string>;
  onToggleFavorite: (symbol: string) => void;
  searchFilter: string;
}

type SortField = 'symbol' | 'price' | 'chg' | 'vol' | 'fr';

export const Watchlist: React.FC<WatchlistProps> = ({
  tickers,
  selectedSymbol,
  onSelectSymbol,
  favorites,
  onToggleFavorite,
  searchFilter
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'favorites' | 'gainers' | 'losers' | 'funding' | 'volume'>('all');
  const [sortField, setSortField] = useState<SortField>('vol');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredTickers = useMemo(() => {
    let result = tickers.slice();

    // Search query
    if (searchFilter.trim()) {
      const q = searchFilter.toUpperCase().trim();
      result = result.filter(t => t.symbol.includes(q));
    }

    // Category filter
    switch (activeCategory) {
      case 'favorites':
        result = result.filter(t => favorites.has(t.symbol));
        break;
      case 'gainers':
        result = result.filter(t => t.chgPct > 0).sort((a, b) => b.chgPct - a.chgPct);
        break;
      case 'losers':
        result = result.filter(t => t.chgPct < 0).sort((a, b) => a.chgPct - b.chgPct);
        break;
      case 'funding':
        result = result.slice().sort((a, b) => a.fr - b.fr);
        break;
      case 'volume':
        result = result.slice().sort((a, b) => b.volUsd - a.volUsd);
        break;
      default:
        break;
    }

    // Sort order
    if (activeCategory === 'all' || activeCategory === 'favorites') {
      result.sort((a, b) => {
        let diff = 0;
        if (sortField === 'symbol') diff = a.symbol.localeCompare(b.symbol);
        else if (sortField === 'price') diff = a.price - b.price;
        else if (sortField === 'chg') diff = a.chgPct - b.chgPct;
        else if (sortField === 'vol') diff = a.volUsd - b.volUsd;
        else if (sortField === 'fr') diff = a.fr - b.fr;
        return sortAsc ? diff : -diff;
      });
    }

    return result;
  }, [tickers, searchFilter, activeCategory, sortField, sortAsc, favorites]);

  const formatVolume = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border border-white/10 rounded-lg overflow-hidden select-none">
      {/* Başlık ve Filtre Çubuğu */}
      <div className="p-2 border-b border-white/10 bg-[#12161f]/90 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-200">Watchlist</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-cyan-400 font-bold">
              {filteredTickers.length}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Binance USDT-M</span>
        </div>

        {/* Filtre Butonları */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[10px]">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-2 py-0.5 rounded font-medium transition-colors shrink-0 ${
              activeCategory === 'all'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setActiveCategory('favorites')}
            className={`px-2 py-0.5 rounded font-medium transition-colors shrink-0 flex items-center gap-1 ${
              activeCategory === 'favorites'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            <Star className="w-2.5 h-2.5 fill-amber-400/50" />
            Favoriler
          </button>
          <button
            onClick={() => setActiveCategory('gainers')}
            className={`px-2 py-0.5 rounded font-medium transition-colors shrink-0 flex items-center gap-1 ${
              activeCategory === 'gainers'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            <TrendingUp className="w-2.5 h-2.5" />
            Yükselenler
          </button>
          <button
            onClick={() => setActiveCategory('losers')}
            className={`px-2 py-0.5 rounded font-medium transition-colors shrink-0 flex items-center gap-1 ${
              activeCategory === 'losers'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            <TrendingDown className="w-2.5 h-2.5" />
            Düşenler
          </button>
          <button
            onClick={() => setActiveCategory('funding')}
            className={`px-2 py-0.5 rounded font-medium transition-colors shrink-0 flex items-center gap-1 ${
              activeCategory === 'funding'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            <DollarSign className="w-2.5 h-2.5" />
            Ekstrem FR
          </button>
          <button
            onClick={() => setActiveCategory('volume')}
            className={`px-2 py-0.5 rounded font-medium transition-colors shrink-0 ${
              activeCategory === 'volume'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            Hacim
          </button>
        </div>
      </div>

      {/* Tablo Başlıkları */}
      <div className="grid grid-cols-12 gap-1 px-2 py-1.5 bg-[#080a0c] border-b border-white/5 text-[10px] text-slate-400 font-medium shrink-0">
        <div className="col-span-1 text-center">⭐</div>
        <div
          onClick={() => handleSort('symbol')}
          className="col-span-3 cursor-pointer hover:text-white flex items-center gap-0.5"
        >
          Symbol <ArrowUpDown className="w-2.5 h-2.5" />
        </div>
        <div
          onClick={() => handleSort('price')}
          className="col-span-3 text-right cursor-pointer hover:text-white flex items-center justify-end gap-0.5"
        >
          Price <ArrowUpDown className="w-2.5 h-2.5" />
        </div>
        <div
          onClick={() => handleSort('chg')}
          className="col-span-2 text-right cursor-pointer hover:text-white flex items-center justify-end gap-0.5"
        >
          Chg% <ArrowUpDown className="w-2.5 h-2.5" />
        </div>
        <div
          onClick={() => handleSort('vol')}
          className="col-span-3 text-right cursor-pointer hover:text-white flex items-center justify-end gap-0.5"
        >
          Vol (USD) <ArrowUpDown className="w-2.5 h-2.5" />
        </div>
      </div>

      {/* Tablo Satırları (Sanal Kaydırma) */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5 font-mono text-[11px]">
        {filteredTickers.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs">Kayıt bulunamadı</div>
        ) : (
          filteredTickers.map((t) => {
            const isSelected = t.symbol === selectedSymbol;
            const isFav = favorites.has(t.symbol);
            const isPositive = t.chgPct >= 0;

            return (
              <div
                key={t.symbol}
                onClick={() => onSelectSymbol(t.symbol)}
                className={`grid grid-cols-12 gap-1 px-2 py-1.5 items-center cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-cyan-500/15 border-l-2 border-cyan-400 text-white'
                    : 'hover:bg-white/5 text-slate-300'
                }`}
              >
                {/* Favori Yıldızı */}
                <div
                  className="col-span-1 text-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(t.symbol);
                  }}
                >
                  <Star
                    className={`w-3 h-3 mx-auto transition-colors ${
                      isFav ? 'text-amber-400 fill-amber-400' : 'text-slate-600 hover:text-slate-400'
                    }`}
                  />
                </div>

                {/* Sembol */}
                <div className="col-span-3 font-semibold text-slate-100 truncate">
                  {t.symbol.replace('USDT', '')}
                  <span className="text-[9px] text-slate-500 ml-0.5">.P</span>
                </div>

                {/* Fiyat */}
                <div className="col-span-3 text-right font-medium text-slate-200">
                  {t.priceStr}
                </div>

                {/* Değişim % */}
                <div
                  className={`col-span-2 text-right font-bold text-[10px] ${
                    isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {t.chgPct.toFixed(2)}%
                </div>

                {/* Hacim */}
                <div className="col-span-3 text-right text-slate-400 text-[10px] truncate">
                  {formatVolume(t.volUsd)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
