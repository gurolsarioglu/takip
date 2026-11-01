'use strict';
// Parser for Visivero /api/bot-messages records (all bots). Pure; no network.

const num = s => { if (s == null) return null; const v = Number(String(s).replace(/[%\s]/g, '')); return Number.isFinite(v) ? v : null; };

function tfMap(line) {
  const out = {};
  if (!line) return out;
  for (const m of line.matchAll(/(\d+[mhdw])\.(-?[\d.]+)(❗️|❗)?/gi)) {
    const tf = m[1].toLowerCase();
    // 1dws duplicates "1d" labels; keep first occurrence and also an indexed list
    if (!(tf in out)) out[tf] = Number(m[2]);
  }
  return out;
}

function parse(row) {
  const raw = String(row.message || '');
  const text = raw.replace(/<[^>]*>/g, '');
  const lines = text.split('\n').map(s => s.trim());
  const first = lines[0] || '';
  const field = label => { const l = lines.find(x => x.startsWith(label + ':')); return l ? l.slice(label.length + 1).trim() : null; };
  const direction = first.startsWith('🟢') ? 'up' : first.startsWith('🔴') ? 'down' : null;
  const stars = (first.match(/⭐/g) || []).length;
  const symMatch = first.match(/#([A-Z0-9_]+)/);
  const boostLine = field('Boost Value') ?? field('Drop Value');
  const rec = {
    id: row.id,
    botId: row.botId,
    symbol: row.symbol || (symMatch && symMatch[1]),
    exchange: row.exchange,
    marketType: row.marketType,
    createdAt: row.createdAt,
    t: Date.parse(row.createdAt),
    direction,
    stars,
    strategy: field('Strategy'),
    boostPct: num(boostLine),
    price: num(field('Current Price')),
    prevPrice: num(field('Previous Price')),
    rsi: tfMap(field('RSI')),
    srsi: tfMap(field('SRSI')),
    wt: field('WT'),
    divergence: field('Divergence'),
    pivotPct: num((field('Pivot') || '').replace(/^%/, '').replace('⚠️', '')),
    ema200Pct: num((field('4H.E200') || '').replace(/^%/, '').replace('⚠️', '')),
    fr: num((field('FR') || '').replace('⚠️', '')),
    btcStatus: field('BTC Status'),
    traderPositioning: field('Trader Positioning'),
    marketExposure: field('Market Exposure'),
    market: field('Market'),
    // M1-A specific
    volumePct: num(field('Volume')),
    rsiSingle: null,
    stochKD: null,
    // FR
    fundingRate: num(field('Funding Rate')),
    previousFunding: num(field('Previous Funding')),
    difference: num(field('Difference')),
    timeRemaining: field('Time Remaining'),
    frFlip: /Funding changed/i.test(text) ? (lines.find(l => /Funding changed/i.test(l)) || '').replace('⚠️', '').trim() : null,
    // V3
    hacimPct: num(field('Hacim')),
    hacim24s: field('24s Hacim'),
    raw
  };
  if (row.botId === 'm1') {
    const r = field('RSI'); if (r) rec.rsiSingle = num(r.replace('⚠️', ''));
    const s = field('Stochastic (K/D)'); if (s) { const m = s.match(/(-?[\d.]+)\s*\/\s*(-?[\d.]+)/); if (m) rec.stochKD = { k: Number(m[1]), d: Number(m[2]) }; }
  }
  if (row.botId === '1dws') {
    // RSI line is "1h.X | 1d.Y | 1d.Z" (labels duplicated: 1d and 1w?) keep ordered list
    rec.rsiList = [...(field('RSI') || '').matchAll(/(\d+[mhdw])\.(-?[\d.]+)/g)].map(m => Number(m[2]));
    rec.srsiList = [...(field('SRSI') || '').matchAll(/(\d+[mhdw])\.(-?[\d.]+)/g)].map(m => Number(m[2]));
  }
  const pos = s => { if (!s) return null; const m = s.match(/([\d.]+)%\s*(🟢|🔴)/); return m ? { pct: Number(m[1]), side: m[2] === '🟢' ? 'long' : 'short' } : null; };
  rec.tp = pos(rec.traderPositioning); rec.me = pos(rec.marketExposure);
  return rec;
}

module.exports = { parse, tfMap };
