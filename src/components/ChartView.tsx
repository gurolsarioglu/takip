import React, { useState, useEffect, useMemo, useRef } from 'react';
import { KlinePoint, MarketTicker, SentimentData } from '../types';
import { fetchKlines } from '../services/binanceApi';
import { Activity, BarChart2, Eye, EyeOff, Layers, RefreshCw } from 'lucide-react';

interface ChartViewProps {
  symbol: string;
  ticker: MarketTicker | undefined;
  sentiment: SentimentData | undefined;
}

export const ChartView: React.FC<ChartViewProps> = ({ symbol, ticker, sentiment }) => {
  const [interval, setInterval] = useState<string>('15m');
  const [klines, setKlines] = useState<KlinePoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showEma20, setShowEma20] = useState<boolean>(true);
  const [showEma50, setShowEma50] = useState<boolean>(true);
  const [showEma200, setShowEma200] = useState<boolean>(false);
  const [showRsi, setShowRsi] = useState<boolean>(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchKlines(symbol, interval, 60).then((data) => {
      if (isMounted) {
        setKlines(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [symbol, interval]);

  // SVG Chart Dimensions & Scales
  const chartHeight = 340;
  const rsiHeight = showRsi ? 100 : 0;
  const padding = { top: 20, right: 60, bottom: 25, left: 10 };

  const { minPrice, maxPrice, maxVol } = useMemo(() => {
    if (klines.length === 0) return { minPrice: 0, maxPrice: 100, maxVol: 1000 };
    let min = Infinity;
    let max = -Infinity;
    let mv = 0;
    klines.forEach((k) => {
      if (k.low < min) min = k.low;
      if (k.high > max) max = k.high;
      if (k.volume > mv) mv = k.volume;
    });
    const spread = max - min || 1;
    return {
      minPrice: min - spread * 0.05,
      maxPrice: max + spread * 0.05,
      maxVol: mv || 1
    };
  }, [klines]);

  const getY = (val: number) => {
    const range = maxPrice - minPrice || 1;
    return chartHeight - padding.bottom - ((val - minPrice) / range) * (chartHeight - padding.top - padding.bottom);
  };

  const getRsiY = (rsiVal: number) => {
    // 0 to 100 scale inside rsiHeight
    const top = chartHeight + 10;
    const h = rsiHeight - 20;
    return top + h - (rsiVal / 100) * h;
  };

  const candleWidth = 6;
  const stepX = 14;

  const activePoint = hoveredIndex !== null && klines[hoveredIndex] ? klines[hoveredIndex] : klines[klines.length - 1];

  return (
    <div className="flex-1 flex flex-col bg-[#080a0c] p-3 gap-3 overflow-y-auto select-none">
      {/* 1. Üst Kontrol Çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0d1117] border border-white/10 shrink-0">
        {/* Zaman Dilimleri */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-bold text-slate-300 font-mono mr-1">
            {symbol}
          </span>
          {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => (
            <button
              key={tf}
              onClick={() => setInterval(tf)}
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-colors ${
                interval === tf
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Göstergeler Aç/Kapat */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowEma20(!showEma20)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] transition-colors ${
              showEma20 ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500'
            }`}
          >
            <span className="w-2 h-0.5 bg-cyan-400 rounded-full" />
            EMA 20
          </button>

          <button
            onClick={() => setShowEma50(!showEma50)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] transition-colors ${
              showEma50 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500'
            }`}
          >
            <span className="w-2 h-0.5 bg-amber-400 rounded-full" />
            EMA 50
          </button>

          <button
            onClick={() => setShowEma200(!showEma200)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] transition-colors ${
              showEma200 ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-slate-500'
            }`}
          >
            <span className="w-2 h-0.5 bg-purple-400 rounded-full" />
            EMA 200
          </button>

          <button
            onClick={() => setShowRsi(!showRsi)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] transition-colors ${
              showRsi ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500'
            }`}
          >
            <Activity className="w-3 h-3" />
            RSI (14)
          </button>
        </div>
      </div>

      {/* 2. Grafik Alanı */}
      <div className="bg-[#0d1117] border border-white/10 rounded-lg p-3 flex flex-col relative overflow-hidden shadow-xl">
        {/* Canlı Mum Bilgisi Başlığı */}
        {activePoint && (
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-300 mb-2 pb-1 border-b border-white/5">
            <span className="text-slate-400">{activePoint.timeStr}</span>
            <span>A: <strong className="text-white">{activePoint.open.toFixed(2)}</strong></span>
            <span>Y: <strong className="text-emerald-400">{activePoint.high.toFixed(2)}</strong></span>
            <span>D: <strong className="text-rose-400">{activePoint.low.toFixed(2)}</strong></span>
            <span>K: <strong className={activePoint.close >= activePoint.open ? 'text-emerald-400' : 'text-rose-400'}>{activePoint.close.toFixed(2)}</strong></span>
            {activePoint.rsi !== undefined && showRsi && (
              <span>RSI: <strong className="text-cyan-400">{activePoint.rsi}</strong></span>
            )}
            {activePoint.ema20 !== undefined && showEma20 && (
              <span className="text-cyan-400">EMA20: {activePoint.ema20.toFixed(2)}</span>
            )}
          </div>
        )}

        {/* SVG Canvas Renderer */}
        <div className="w-full overflow-x-auto no-scrollbar relative min-h-[380px]">
          {loading ? (
            <div className="h-[380px] flex items-center justify-center text-slate-500 text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              Grafik mumları ve göstergeler hesaplanıyor...
            </div>
          ) : (
            <svg
              width={Math.max(800, klines.length * stepX + padding.right + 20)}
              height={chartHeight + rsiHeight}
              className="overflow-visible"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Izgara Çizgileri */}
              {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
                const y = padding.top + ratio * (chartHeight - padding.top - padding.bottom);
                const priceAtY = maxPrice - ratio * (maxPrice - minPrice);
                return (
                  <g key={ratio}>
                    <line
                      x1={0}
                      y1={y}
                      x2={klines.length * stepX + padding.right}
                      y2={y}
                      stroke="rgba(255,255,255,0.05)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={klines.length * stepX + 10}
                      y={y + 3}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                    >
                      {priceAtY.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Hacim Barları */}
              {klines.map((k, i) => {
                const x = padding.left + i * stepX;
                const isGreen = k.close >= k.open;
                const volH = (k.volume / maxVol) * 45;
                const volY = chartHeight - padding.bottom - volH;
                return (
                  <rect
                    key={`vol-${i}`}
                    x={x - candleWidth / 2}
                    y={volY}
                    width={candleWidth}
                    height={volH}
                    fill={isGreen ? 'rgba(14, 203, 129, 0.25)' : 'rgba(246, 70, 93, 0.25)'}
                  />
                );
              })}

              {/* Candlestick Mumları */}
              {klines.map((k, i) => {
                const x = padding.left + i * stepX;
                const isGreen = k.close >= k.open;
                const color = isGreen ? '#0ecb81' : '#f6465d';
                const yOpen = getY(k.open);
                const yClose = getY(k.close);
                const yHigh = getY(k.high);
                const yLow = getY(k.low);

                const bodyY = Math.min(yOpen, yClose);
                const bodyH = Math.max(2, Math.abs(yOpen - yClose));

                return (
                  <g
                    key={`candle-${i}`}
                    onMouseEnter={() => setHoveredIndex(i)}
                    className="cursor-crosshair"
                  >
                    {/* Fitil */}
                    <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.2" />
                    {/* Gövde */}
                    <rect
                      x={x - candleWidth / 2}
                      y={bodyY}
                      width={candleWidth}
                      height={bodyH}
                      fill={color}
                      rx="1"
                    />
                  </g>
                );
              })}

              {/* EMA Çizgileri */}
              {showEma20 && klines.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#00e5ff"
                  strokeWidth="1.5"
                  strokeOpacity="0.8"
                  points={klines
                    .map((k, i) =>
                      k.ema20 ? `${padding.left + i * stepX},${getY(k.ema20)}` : ''
                    )
                    .filter(Boolean)
                    .join(' ')}
                />
              )}

              {showEma50 && klines.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#f0b90b"
                  strokeWidth="1.5"
                  strokeOpacity="0.8"
                  points={klines
                    .map((k, i) =>
                      k.ema50 ? `${padding.left + i * stepX},${getY(k.ema50)}` : ''
                    )
                    .filter(Boolean)
                    .join(' ')}
                />
              )}

              {showEma200 && klines.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="1.5"
                  strokeOpacity="0.8"
                  points={klines
                    .map((k, i) =>
                      k.ema200 ? `${padding.left + i * stepX},${getY(k.ema200)}` : ''
                    )
                    .filter(Boolean)
                    .join(' ')}
                />
              )}

              {/* RSI Alt Grafiği */}
              {showRsi && (
                <g>
                  {/* RSI Ayırıcı Çizgi */}
                  <line
                    x1={0}
                    y1={chartHeight}
                    x2={klines.length * stepX + padding.right}
                    y2={chartHeight}
                    stroke="rgba(255,255,255,0.1)"
                  />

                  {/* 70 & 30 Eşikleri */}
                  <line
                    x1={0}
                    y1={getRsiY(70)}
                    x2={klines.length * stepX}
                    y2={getRsiY(70)}
                    stroke="rgba(246, 70, 93, 0.4)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={klines.length * stepX + 10}
                    y={getRsiY(70) + 3}
                    fill="#f6465d"
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                  >
                    70
                  </text>

                  <line
                    x1={0}
                    y1={getRsiY(30)}
                    x2={klines.length * stepX}
                    y2={getRsiY(30)}
                    stroke="rgba(14, 203, 129, 0.4)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={klines.length * stepX + 10}
                    y={getRsiY(30) + 3}
                    fill="#0ecb81"
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                  >
                    30
                  </text>

                  {/* RSI Çizgisi */}
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    points={klines
                      .map((k, i) =>
                        k.rsi !== undefined
                          ? `${padding.left + i * stepX},${getRsiY(k.rsi)}`
                          : ''
                      )
                      .filter(Boolean)
                      .join(' ')}
                  />
                </g>
              )}

              {/* Crosshair (Fare Gezinme Çizgisi) */}
              {hoveredIndex !== null && (
                <line
                  x1={padding.left + hoveredIndex * stepX}
                  y1={0}
                  x2={padding.left + hoveredIndex * stepX}
                  y2={chartHeight + rsiHeight}
                  stroke="rgba(255,255,255,0.3)"
                  strokeDasharray="2 2"
                />
              )}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};
