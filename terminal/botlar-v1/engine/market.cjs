'use strict';
// Live market state for all Binance USDⓈ-M perpetuals: REST bootstrap + WebSocket 1m klines,
// higher timeframes aggregated from closed 1m bars, funding from markPrice@arr, 24h stats from !ticker@arr.
const { getJson, toBar, IMS, sleep } = require('../lib/net.cjs');

const FAPI = 'https://fapi.binance.com';
const WS = process.env.BINANCE_WS || 'wss://fstream.binance.com/market/stream?streams=';

// Bir zaman diliminde t anını içeren mumun açılışı. Haftalık mum Binance'te PAZARTESİ 00:00 UTC açılır; epoch (1.1.1970)
// perşembe olduğu için düz floor() perşembeye hizalar → 10.11.2026'ya kadar haftalık seri bozuk üretiliyordu (pivot yanlış haftadan).
const WEEK_SHIFT = 4 * 86400e3;
function barOpen(tf, t) { const ms = IMS[tf]; return tf === '1w' ? Math.floor((t - WEEK_SHIFT) / ms) * ms + WEEK_SHIFT : Math.floor(t / ms) * ms; }

class Series {
  constructor(tf, max) { this.tf = tf; this.ms = IMS[tf]; this.max = max; this.closed = []; this.agg = null; }
  // bootstrap: REST bars incl. the live one; minuteLive = REST live 1m bar at the same moment
  setHistory(bars, now, minuteLive) {
    this.closed = bars.filter(b => b.closeTime < now).slice(-this.max);
    const l = bars.find(b => b.openTime <= now && b.closeTime >= now);
    this.agg = null;
    if (l && this.tf !== '1m') {
      // aggregate of closed minutes only: remove the partial current minute's volume (its high/low stay; they are a subset)
      const mv = minuteLive && minuteLive.openTime >= l.openTime ? minuteLive : null;
      this.agg = { openTime: l.openTime, open: l.open, high: l.high, low: l.low, close: l.close, volume: l.volume - (mv ? mv.volume : 0), quoteVolume: l.quoteVolume - (mv ? mv.quoteVolume : 0), closeTime: l.closeTime };
    }
  }
  // feed a CLOSED 1m bar
  pushMinute(m) {
    if (this.tf === '1m') { if (!this.closed.length || this.closed.at(-1).openTime < m.openTime) { this.closed.push(m); if (this.closed.length > this.max) this.closed.shift(); } return; }
    const open = barOpen(this.tf, m.openTime);
    if (this.agg && this.agg.openTime !== open) this.flush();
    if (!this.agg) this.agg = { openTime: open, open: m.open, high: m.high, low: m.low, close: m.close, volume: m.volume, quoteVolume: m.quoteVolume, closeTime: open + this.ms - 1 };
    else { const a = this.agg; a.high = Math.max(a.high, m.high); a.low = Math.min(a.low, m.low); a.close = m.close; a.volume += m.volume; a.quoteVolume += m.quoteVolume; }
    if (m.closeTime >= this.agg.closeTime) this.flush();
  }
  flush() {
    const b = this.agg; this.agg = null;
    if (b && (!this.closed.length || this.closed.at(-1).openTime < b.openTime)) { this.closed.push(b); if (this.closed.length > this.max) this.closed.shift(); }
  }
  // closed bars + live bar (agg of closed minutes in this bar + live minute + current price)
  view(minuteLive, price) {
    const out = this.closed.slice();
    let l = null;
    if (this.tf === '1m') l = minuteLive ? { ...minuteLive } : null;
    else {
      const a = this.agg, m = minuteLive;
      const open = m ? barOpen(this.tf, m.openTime) : (a ? a.openTime : null);
      if (a && a.openTime === open) l = { ...a, high: m ? Math.max(a.high, m.high) : a.high, low: m ? Math.min(a.low, m.low) : a.low, close: m ? m.close : a.close, volume: a.volume + (m ? m.volume : 0), quoteVolume: a.quoteVolume + (m ? m.quoteVolume : 0) };
      else if (m) l = { openTime: open, open: m.open, high: m.high, low: m.low, close: m.close, volume: m.volume, quoteVolume: m.quoteVolume, closeTime: open + this.ms - 1 };
    }
    if (l) {
      if (Number.isFinite(price)) { l.close = price; l.high = Math.max(l.high, price); l.low = Math.min(l.low, price); }
      l.isLive = true; out.push(l);
    }
    return out;
  }
}

class Market {
  constructor({ needs, log = console.log }) {
    this.needs = needs; // {tf: bars}
    this.log = log;
    this.sym = new Map(); // symbol -> {series:{tf:Series}, minuteLive, price, priceStr, funding, ticker}
    this.listeners = [];
    this.sockets = [];
  }
  onTick(fn) { this.listeners.push(fn); }
  async loadUniverse() {
    const info = await getJson(`${FAPI}/fapi/v1/exchangeInfo`);
    this.info = Object.fromEntries(info.symbols.map(s => [s.symbol, s]));
    this.symbols = info.symbols.filter(s => s.status === 'TRADING' && ['USDT', 'USDC'].includes(s.quoteAsset) && /PERPETUAL/.test(s.contractType)).map(s => s.symbol);
    try { const fi = await getJson(`${FAPI}/fapi/v1/fundingInfo`); this.fundingInfo = Object.fromEntries(fi.map(x => [x.symbol, x])); } catch { this.fundingInfo = {}; }
    return this.symbols;
  }
  async bootstrap(symbols = this.symbols) {
    const tfs = Object.keys(this.needs);
    let n = 0;
    const queue = symbols.slice();
    const worker = async () => { for (let s; (s = queue.shift());) await this.bootOne(s, tfs, () => { if (++n % 50 === 0) this.log('bootstrap', n, '/', symbols.length); }); };
    await Promise.all(Array.from({ length: Number(process.env.BOOT_CONCURRENCY || 8) }, worker));
  }
  async bootOne(s, tfs, done) {
    {
      const st = { symbol: s, series: {}, minuteLive: null, price: NaN, funding: null, ticker: null };
      const now = Date.now();
      for (const tf of tfs) {
        const lim = Math.min(1500, this.needs[tf] + 2);
        const ser = new Series(tf, this.needs[tf]);
        try {
          const raw = (await getJson(`${FAPI}/fapi/v1/klines?symbol=${s}&interval=${tf}&limit=${lim}`)).map(toBar);
          if (tf === '1m') { const l = raw.find(b => b.openTime <= now && b.closeTime >= now); if (l) { st.minuteLive = { ...l }; st.price = l.close; } }
          ser.setHistory(raw, now, st.minuteLive);
        } catch (e) { this.log('bootstrap fail', s, tf, e.message); }
        st.series[tf] = ser;
      }
      st.lastMinute = st.minuteLive ? st.minuteLive.openTime - 60e3 : Math.floor(now / 60e3) * 60e3 - 60e3;
      this.sym.set(s, st);
      done();
    }
  }
  connect() {
    const syms = [...this.sym.keys()];
    const chunks = [];
    for (let i = 0; i < syms.length; i += 200) chunks.push(syms.slice(i, i + 200).map(s => s.toLowerCase() + '@kline_1m'));
    chunks.push(['!markPrice@arr@1s', '!ticker@arr']);
    for (const streams of chunks) this.openSocket(streams);
  }
  openSocket(streams, reopen = false) {
    const url = WS + streams.join('/');
    const ws = new WebSocket(url);
    const syms = streams.filter(x => x.endsWith('@kline_1m')).map(x => x.split('@')[0].toUpperCase());
    ws.onopen = () => {
      // after a reconnect, re-fetch the 1m bars missed while the socket was down (else higher timeframes drift)
      if (reopen && syms.length) this.gapfill(syms.map(s => this.sym.get(s)).filter(Boolean)).then(() => this.log('refilled after reconnect', syms.length));
    };
    ws.lastMsg = Date.now();
    ws.onmessage = ev => { ws.lastMsg = Date.now(); try { this.handle(JSON.parse(ev.data)); } catch (e) { } };
    // watchdog: a socket can stall silently (no close event). 26.10 00:10–00:40 UTC: 30 min without data, no log.
    // No message for 45 s -> force close; onclose reopens it and the reopen refills the missed 1m bars.
    ws.watch = setInterval(() => {
      if (ws.readyState === 1 && Date.now() - ws.lastMsg > 45000) { this.log('ws stalled', Math.round((Date.now() - ws.lastMsg) / 1000), 's, forcing reconnect', streams.length); clearInterval(ws.watch); try { ws.close(); } catch (e) { } setTimeout(() => { if (!ws.reopened) { ws.reopened = true; this.openSocket(streams, true); } }, 5000); }
    }, 15000);
    ws.onclose = ev => { clearInterval(ws.watch); if (ws.reopened) return; ws.reopened = true; this.log('ws closed, reconnecting', streams.length, 'code', ev?.code); setTimeout(() => this.openSocket(streams, true), 3000); };
    ws.onerror = () => { };
    this.sockets = this.sockets.filter(x => x.readyState <= 1); this.sockets.push(ws);
  }
  handle(msg) {
    const d = msg.data; if (!d) return;
    if (msg.stream === '!markPrice@arr@1s') { for (const x of d) { const st = this.sym.get(x.s); if (st) st.funding = { rate: +x.r, nextFundingTime: x.T, markPrice: +x.p, indexPrice: +x.i, t: x.E }; } return; }
    if (msg.stream === '!ticker@arr') { for (const x of d) { const st = this.sym.get(x.s); if (st) st.ticker = { volume: +x.v, quoteVolume: +x.q, changePct: +x.P, last: +x.c, t: x.E }; } return; }
    if (d.e === 'kline') {
      const st = this.sym.get(d.s); if (!st) return;
      const k = d.k;
      const bar = { openTime: k.t, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v, quoteVolume: +k.q, takerBuyBase: +k.V, closeTime: k.T, trades: k.n };
      st.price = bar.close; st.priceStr = k.c; st.eventTime = d.E;
      if (k.x) {
        if (st.buffering) st.buf.push(bar); else this.closeMinute(st, bar);
        // synthetic next live minute (opened at the close) so "last element = live bar" always holds
        st.minuteLive = { openTime: k.T + 1, open: bar.close, high: bar.close, low: bar.close, close: bar.close, volume: 0, quoteVolume: 0, takerBuyBase: 0, closeTime: k.T + 60000, synthetic: true };
        for (const fn of this.listeners) fn(st, { closed: true, t: d.E });
      } else {
        st.minuteLive = bar;
        for (const fn of this.listeners) fn(st, { closed: false, t: d.E });
      }
    }
  }
  closeMinute(st, bar) {
    if (bar.openTime <= st.lastMinute) return;
    for (const ser of Object.values(st.series)) ser.pushMinute(bar);
    st.lastMinute = bar.openTime;
  }
  // fill 1m bars that closed between bootstrap and websocket start
  // call right after connect(): live closed minutes are buffered until REST gap is filled
  async gapfill(list = [...this.sym.values()]) {
    for (const st of list) { if (!st.buffering) { st.buffering = true; st.buf = []; } }
    const one = async st => {
      try {
        const now = Date.now();
        // kopukluk uzun sürdüyse (uyku, ağ kesintisi) eksik dakikaların hepsini iste; eskiden hep 30'du → uzun kesintide seri delik kalıyordu
        const lim = Math.min(1500, Math.max(30, Math.ceil((now - (st.lastMinute || now)) / 60e3) + 5));
        if (lim >= 1500) this.log('gapfill: kesinti 25 saatten uzun, seri eksik kalabilir (motoru yeniden başlatın)', st.symbol);
        const raw = (await getJson(`${FAPI}/fapi/v1/klines?symbol=${st.symbol}&interval=1m&limit=${lim}`)).map(toBar);
        for (const b of raw) if (b.closeTime < now) this.closeMinute(st, b);
      } catch (e) { this.log('gapfill fail', st.symbol, e.message); }
      for (const b of st.buf) this.closeMinute(st, b);
      st.buffering = false; st.buf = [];
      st.ready = true;
    };
    const q = list.slice();
    await Promise.all(Array.from({ length: 8 }, async () => { for (let st; (st = q.shift());) await one(st); }));
  }
  // bars for a symbol/timeframe with live bar at the current price
  bars(st, tf) {
    const ser = st.series[tf]; if (!ser) return [];
    return ser.view(st.minuteLive, st.price);
  }
}

module.exports = { Market, Series, barOpen };
