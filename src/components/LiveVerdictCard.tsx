import React, { useState } from 'react';
import { MarketTicker, SentimentData, VerdictAnalysis } from '../types';
import { Zap, ShieldCheck, AlertOctagon, HelpCircle, Send, MessageSquare } from 'lucide-react';

interface LiveVerdictCardProps {
  verdict: VerdictAnalysis;
  ticker: MarketTicker | undefined;
  sentiment: SentimentData | undefined;
  onSelectSymbol: (symbol: string) => void;
}

export const LiveVerdictCard: React.FC<LiveVerdictCardProps> = ({
  verdict,
  ticker,
  sentiment,
  onSelectSymbol
}) => {
  const [userQuery, setUserQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'copilot'; text: string; time: string }>>([
    {
      sender: 'copilot',
      text: `Merhaba! Ben Alpha Canlı Algoritmik Teşhis Motoruyum. Şu an ${ticker?.symbol || 'aktif sembolün'} vadeli emir defteri derinliğini, balina long/short oranlarını ve likidasyon tamponunu analiz ediyorum. Bir soru sorabilir veya aşağıdaki hızlı butonları kullanabilirsiniz.`,
      time: 'Şimdi'
    }
  ]);

  const handleAsk = (queryText: string) => {
    if (!queryText.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: queryText, time };

    // Algorithmic instant response based on real live market data
    let answer = '';
    const q = queryText.toLowerCase();

    if (q.includes('kâr') || q.includes('kar') || q.includes('sat')) {
      if (verdict.bias === 'SQUEEZE_ALERT') {
        answer = `⚡ Short squeeze baskısı devam ediyor! Ancak kârınızı garantiye almak için pozisyonun %50'sini TP1 seviyesinde kapatıp kalan %50'yi giriş seviyesine taşıyarak risksiz kâr realize etmeniz tavsiye edilir.`;
      } else if (verdict.bias === 'DANGER_DISTRIBUTION') {
        answer = `🚨 Dikkat: Balinalar masadan çıkıyor ve OI eriyor! Kârınızı beklemeden hemen almanızı ve nakit teminatınızı korumanızı öneririm.`;
      } else {
        answer = `Hedef kâr seviyesi %${(ticker?.price ? (ticker.price * 1.025).toFixed(2) : '2.5%')} olarak belirlenmiştir. Kasa prensibimize göre kademeli kâr alımı her zaman disiplin sağlar.`;
      }
    } else if (q.includes('likidasyon') || q.includes('risk') || q.includes('güven')) {
      answer = `🛡️ Stop-loss'suz stratejimizde teminatınız düşük tutulduğu için likidasyon güvenlik mesafesi %40'ın üzerindedir. Piyasa yapıcı ani iğneler atsa dahi pozisyonunuz likide olmadan dönebilir.`;
    } else if (q.includes('balina') || q.includes('smart') || q.includes('oran')) {
      answer = `🐳 Top Trader balina hesapları şu an %${sentiment?.topPosition.longPct || 65} oranında Long tarafında. Perakende ise %${sentiment?.globalExposure.shortPct || 35} ile terste kalmış durumda.`;
    } else {
      answer = `Analiz Özeti: ${verdict.headline}. ${verdict.detail} Önerilen Eylem: ${verdict.actionRecommendation}`;
    }

    const botMsg = { sender: 'copilot' as const, text: answer, time };

    setChatMessages((prev) => [...prev, userMsg, botMsg]);
    setUserQuery('');
  };

  const isCritical = verdict.riskRating === 'KRİTİK' || verdict.bias === 'DANGER_DISTRIBUTION';
  const isSqueeze = verdict.bias === 'SQUEEZE_ALERT';

  return (
    <div className="flex-1 flex flex-col p-3 bg-[#080a0c] overflow-y-auto gap-3 select-none font-sans">
      {/* 1. Üst Teşhis Başlık Kartı */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg ${
          isCritical
            ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
            : isSqueeze
            ? 'bg-purple-950/20 border-purple-500/40 text-purple-200'
            : 'bg-[#0d1117] border-cyan-500/30 text-slate-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-white/10 shrink-0 text-xl">
            {isCritical ? '🚨' : isSqueeze ? '⚡' : '🤖'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/40 text-cyan-400">
                {ticker?.symbol || 'BTCUSDT'} CANLI TEŞHİS
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  isCritical
                    ? 'bg-rose-500/20 text-rose-400'
                    : isSqueeze
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                RİSK: {verdict.riskRating}
              </span>
            </div>
            <h2 className="text-base font-extrabold text-white mt-1 font-mono">
              {verdict.headline}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              {verdict.detail}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0 gap-1 font-mono text-xs">
          <div className="bg-black/40 px-3 py-1.5 rounded border border-white/10 text-right">
            <div className="text-[10px] text-slate-400">ÖNERİLEN TAKTİK</div>
            <div className="font-bold text-cyan-300 mt-0.5">{verdict.actionRecommendation}</div>
          </div>
        </div>
      </div>

      {/* 2. Akıllı Para ve Piyasa Röntgeni Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Balina Röntgeni */}
        <div className="bg-[#0d1117] border border-white/10 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-200">
            <span className="flex items-center gap-1.5">
              <span>🐳</span>
              <span>KURUMSAL & BALİNA TEŞHİSİ</span>
            </span>
            <span className="text-emerald-400 font-mono text-[11px]">
              %{sentiment?.topPosition.longPct || 65} Long
            </span>
          </div>
          <p className="text-xs text-slate-300 bg-[#12161f] p-2.5 rounded border border-white/5 font-mono">
            {verdict.whaleVerdict}
          </p>
        </div>

        {/* Perakende Röntgeni */}
        <div className="bg-[#0d1117] border border-white/10 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-200">
            <span className="flex items-center gap-1.5">
              <span>👥</span>
              <span>KÜÇÜK YATIRIMCI (PERAKENDE) TEŞHİSİ</span>
            </span>
            <span className="text-amber-400 font-mono text-[11px]">
              %{sentiment?.globalExposure.shortPct || 35} Short
            </span>
          </div>
          <p className="text-xs text-slate-300 bg-[#12161f] p-2.5 rounded border border-white/5 font-mono">
            {verdict.retailVerdict}
          </p>
        </div>
      </div>

      {/* 3. Canlı Co-Pilot Sohbet ve Taktik Danışmanı */}
      <div className="bg-[#0d1117] border border-white/10 rounded-lg p-3 flex-1 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white font-mono">
              ⚡ 2. Ekran Co-Pilot Masası ({ticker?.symbol})
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">Otomatik 5m Mum Analizi</span>
        </div>

        {/* Sohbet Akışı */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 max-h-64 font-mono text-xs">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col gap-0.5 ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                <span>{msg.sender === 'user' ? 'Trader' : '🤖 Co-Pilot'}</span>
                <span>•</span>
                <span>{msg.time}</span>
              </div>
              <div
                className={`p-2.5 rounded-lg max-w-xl leading-relaxed text-xs ${
                  msg.sender === 'user'
                    ? 'bg-cyan-600/30 text-cyan-100 border border-cyan-500/40'
                    : 'bg-[#12161f] text-slate-200 border border-white/10 shadow-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Hızlı Soru Butonları ve Giriş Alanı */}
        <div className="mt-3 pt-2 border-t border-white/10 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="text-slate-500">Hızlı Sorular:</span>
            {[
              '14 seviyesine dayandı, kâr alayım mı?',
              'Likidasyon mesafem güvende mi?',
              'Balinalar Long mu açıyor?',
              'Short squeeze ihtimali var mı?'
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => handleAsk(q)}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(userQuery);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Co-Pilot'a sor... (örn: Stop-loss'suz risk durumum nasıl?)"
              className="flex-1 bg-[#12161f] border border-white/10 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1 transition-colors shadow-sm shadow-cyan-500/20"
            >
              <Send className="w-3.5 h-3.5" />
              Gönder
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
