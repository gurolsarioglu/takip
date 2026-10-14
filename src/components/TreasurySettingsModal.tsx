import React, { useState } from 'react';
import { TreasurySettings } from '../types';
import { X, Sliders, Shield, Save } from 'lucide-react';

interface TreasurySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TreasurySettings;
  onSave: (updated: TreasurySettings) => void;
}

export const TreasurySettingsModal: React.FC<TreasurySettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave
}) => {
  const [totalEquity, setTotalEquity] = useState(settings.totalEquity);
  const [marginAllocPct, setMarginAllocPct] = useState(settings.marginAllocPerTradePct);
  const [maxPositionPct, setMaxPositionPct] = useState(settings.maxPositionMarginPct);
  const [targetTpPct, setTargetTpPct] = useState(settings.targetTpPct);
  const [dailyRealizedPnl, setDailyRealizedPnl] = useState(settings.dailyRealizedPnl);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      totalEquity,
      marginAllocPerTradePct: marginAllocPct,
      maxPositionMarginPct: maxPositionPct,
      targetTpPct,
      dailyRealizedPnl
    });
    onClose();
  };

  const calculatedTradeMargin = (totalEquity * marginAllocPct) / 100;
  const calculatedMaxMargin = (totalEquity * maxPositionPct) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div className="bg-[#0d1117] border border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col font-sans">
        {/* Başlık */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#12161f]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white font-mono">
              ⚙️ Kasa ve Risk Yönetimi Ayarları
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Alanı */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3.5 text-xs">
          {/* Toplam Sermaye */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Toplam Kasa Sermayesi (USDT):
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-500 font-mono">$</span>
              <input
                type="number"
                step="100"
                value={totalEquity}
                onChange={(e) => setTotalEquity(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#12161f] border border-white/10 rounded pl-7 pr-3 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Portföyün ana ana parası.
            </span>
          </div>

          {/* İşlem Başı Kasa Teminatı % */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                İşlem Başı Teminat (%):
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="20"
                value={marginAllocPct}
                onChange={(e) => setMarginAllocPct(parseFloat(e.target.value) || 1)}
                className="w-full bg-[#12161f] border border-white/10 rounded px-3 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-400"
              />
              <span className="text-[10px] text-cyan-400 font-mono mt-0.5 block">
                = ${calculatedTradeMargin.toFixed(2)}
              </span>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Tek Coine Max Teminat (%):
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="50"
                value={maxPositionPct}
                onChange={(e) => setMaxPositionPct(parseFloat(e.target.value) || 5)}
                className="w-full bg-[#12161f] border border-white/10 rounded px-3 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-400"
              />
              <span className="text-[10px] text-amber-400 font-mono mt-0.5 block">
                = ${calculatedMaxMargin.toFixed(2)} Max
              </span>
            </div>
          </div>

          {/* Hedef Kâr & Günlük Gerçekleşen PnL */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Varsayılan TP Hedefi (%):
              </label>
              <input
                type="number"
                step="0.25"
                min="0.5"
                max="50"
                value={targetTpPct}
                onChange={(e) => setTargetTpPct(parseFloat(e.target.value) || 2.5)}
                className="w-full bg-[#12161f] border border-white/10 rounded px-3 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Bugün Gerçekleşen Kâr ($):
              </label>
              <input
                type="number"
                step="10"
                value={dailyRealizedPnl}
                onChange={(e) => setDailyRealizedPnl(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#12161f] border border-white/10 rounded px-3 py-1.5 text-emerald-400 font-mono font-bold focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Bilgi Kutusu */}
          <div className="p-2.5 rounded bg-sky-500/10 border border-sky-500/20 flex items-start gap-2 text-[11px] text-sky-200">
            <Shield className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong>Stop-Loss'suz Kasa Prensibi:</strong> Her pozisyon düşük teminatla (%1 - %3) açılır. Likidasyon fiyatı en az %40-%60 uzakta tutularak piyasa yapıcı iğnelerinden ve erken stoplanmaktan korunulur.
            </div>
          </div>

          {/* Butonlar */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-medium transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-cyan-500/30"
            >
              <Save className="w-3.5 h-3.5" />
              Ayarları Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
