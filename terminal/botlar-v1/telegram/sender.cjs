'use strict';
// Botlar V1.1 — Telegram gönderici. Motorun yazdığı data/live/signals-*.jsonl dosyasını izler,
// M1 Premium'un ⭐ (yıldızlı) sinyallerini Telegram'a gönderir. Ayarlar: telegram/ayarlar.json
//   { "token": "<BotFather'ın verdiği token>", "chatId": "" }   chatId boşsa bota /start yazınca kendiliğinden bulunur.
// Çalıştır: node telegram/sender.cjs      (deneme mesajı: node telegram/sender.cjs --test)
const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname, ROOT = path.join(DIR, '..', 'data'), LIVE = path.join(ROOT, 'live');
const CFG = path.join(DIR, 'ayarlar.json'), STATE = path.join(ROOT, 'telegram-durum.json');
const BOT = 'm1-premium', DEDUP_MS = 15 * 60e3, MAX_AGE_MS = 2 * 60e3;
const log = (...a) => console.log(new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }), ...a);

let cfg;
try { cfg = JSON.parse(fs.readFileSync(CFG, 'utf8')); } catch { cfg = {}; }
if (!cfg.token || /BURAYA/.test(cfg.token)) {
  console.log('\nTelegram token yok. telegram\\ayarlar.ornek.json dosyasını "ayarlar.json" adıyla kopyalayın,\n"token" alanına BotFather\'ın verdiği tokeni yapıştırıp kaydedin, sonra bu pencereyi yeniden başlatın.\n');
  process.exit(1);
}
const API = `https://api.telegram.org/bot${cfg.token}`;
const saveCfg = () => fs.writeFileSync(CFG, JSON.stringify(cfg, null, 2));
async function tg(method, body) {
  const r = await fetch(`${API}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) { const e = new Error(j.description || `HTTP ${r.status}`); e.retry = j.parameters && j.parameters.retry_after; throw e; }
  return j.result;
}
async function findChat() {
  log('Sohbet kimliği aranıyor — Telegram\'da botunuza /start yazın…');
  for (;;) {
    try {
      const ups = await tg('getUpdates', { timeout: 25 });
      const m = ups.map(u => u.message || u.my_chat_member).filter(Boolean).find(m => m.chat && m.chat.type === 'private');
      if (m) { cfg.chatId = String(m.chat.id); saveCfg(); log('Sohbet bulundu:', m.chat.first_name || '', '(', cfg.chatId, ')'); return; }
    } catch (e) { log('getUpdates hata:', e.message); await new Promise(r => setTimeout(r, 5000)); }
  }
}

// ---------- mesaj ----------
const trTime = t => new Date(t).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function format(s) {
  let body = esc(s.text).replace(/&lt;(\/?)b&gt;/g, '<$1b>');
  const dl = (s.text.match(/Divergence:([^\n]*)/) || [])[1] || '';
  if (s.direction === 'up' && dl.includes('1m✅') && dl.includes('5m✅'))
    body += '\n\n⚠️ <b>Yorgunluk uyarısı:</b> yükseliş sinyali ama 1m ve 5m\'de tepe uyumsuzluğu var (fiyat yeni tepe, RSI düşük tepe). Long için onay değil.';
  const tv = `https://www.tradingview.com/chart/?symbol=BINANCE:${encodeURIComponent(s.symbol)}.P`;
  const when = trTime(s.t), lag = Math.max(0, Math.round((Date.now() - s.t) / 1000));
  return `${body}\n\n🕒 ${when} · gönderim +${lag} sn\n<a href="${tv}">TradingView</a> · M1 Premium`;
}
const starred = s => (String(s.text).split('\n')[0] || '').includes('⭐');

// ---------- izleme ----------
let st; try { st = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { st = {}; }
st.files = st.files || {}; st.last = st.last || {}; st.sent = st.sent || 0;
const saveState = () => { try { fs.writeFileSync(STATE, JSON.stringify({ ...st, at: new Date().toISOString(), chatId: cfg.chatId ? 'var' : 'yok' })); } catch { } };
const queue = [];
function scan() {
  const day = t => new Date(t).toISOString().slice(0, 10);
  for (const d of [...new Set([day(Date.now() - 3600e3), day(Date.now())])]) {
    const f = path.join(LIVE, `signals-${d}.jsonl`); let size; try { size = fs.statSync(f).size; } catch { continue; }
    if (st.files[f] == null) st.files[f] = size;           // ilk açılışta geçmişi gönderme, sondan başla
    if (size < st.files[f]) st.files[f] = 0;
    if (size === st.files[f]) continue;
    const fd = fs.openSync(f, 'r'), len = size - st.files[f], buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, st.files[f]); fs.closeSync(fd);
    const txt = buf.toString('utf8'), cut = txt.lastIndexOf('\n') + 1; st.files[f] += Buffer.byteLength(txt.slice(0, cut));
    for (const l of txt.slice(0, cut).split('\n')) {
      if (!l.includes(`"${BOT}"`)) continue;
      let s; try { s = JSON.parse(l); } catch { continue; }
      if (s.botId !== BOT) continue;
      lastSeen = Math.max(lastSeen || 0, s.t);
      if (!starred(s)) continue;
      const k = s.symbol + '|' + s.direction;
      if (st.last[k] && s.t - st.last[k] < DEDUP_MS) continue;
      st.last[k] = s.t; queue.push(s);
    }
  }
  for (const [k, t] of Object.entries(st.last)) if (Date.now() - t > 3 * 3600e3) delete st.last[k];
}
async function pump() {
  while (queue.length) {
    const s = queue.shift();
    if (Date.now() - s.t > MAX_AGE_MS) { log('eski, atlandı:', s.symbol); continue; }
    try { await tg('sendMessage', { chat_id: cfg.chatId, text: format(s), parse_mode: 'HTML', disable_web_page_preview: true }); st.sent++; st.lastSentAt = Date.now(); log('gönderildi:', s.symbol, s.direction, trTime(s.t)); }
    catch (e) { log('gönderilemedi:', s.symbol, e.message); if (e.retry) { queue.unshift(s); await new Promise(r => setTimeout(r, e.retry * 1000)); } }
    await new Promise(r => setTimeout(r, 1100));
  }
}
// ---------- komutlar: /durum ----------
let upOffset = 0, lastSeen = null; const bootAt = Date.now();
function engineInfo() { try { const x = JSON.parse(fs.readFileSync(path.join(LIVE, 'status.json'), 'utf8')); return { ok: Date.now() - Date.parse(x.at) < 60e3, at: Date.parse(x.at), symbols: x.symbols }; } catch { return { ok: false }; } }
async function commands() {
  let ups; try { ups = await tg('getUpdates', { offset: upOffset, timeout: 0 }); } catch { return; }
  for (const u of ups) {
    upOffset = u.update_id + 1;
    const m = u.message; if (!m || String(m.chat.id) !== String(cfg.chatId) || m.date * 1000 < bootAt - 60e3) continue;
    const t = (m.text || '').trim().toLowerCase();
    if (t === '/durum' || t === '/start' || t === 'durum') {
      const e = engineInfo();
      await tg('sendMessage', { chat_id: cfg.chatId, parse_mode: 'HTML', text:
        `📡 <b>Botlar V1 durum</b> — ${trTime(Date.now())}\n` +
        `Motor: ${e.ok ? '🟢 çalışıyor · ' + e.symbols + ' coin' : '🔴 çalışmıyor' + (e.at ? ' (son: ' + trTime(e.at) + ')' : '')}\n` +
        `Son M1 Premium verisi: ${lastSeen ? trTime(lastSeen) : '—'}\n` +
        `Son ⭐ gönderim: ${st.lastSentAt ? trTime(st.lastSentAt) : '—'}\n` +
        `Toplam gönderilen: ${st.sent}\nGönderici açık: ${trTime(bootAt)}'den beri` }).catch(() => { });
    }
  }
}

(async () => {
  const me = await tg('getMe').catch(e => { console.log('Token geçersiz ya da Telegram\'a ulaşılamıyor:', e.message); process.exit(1); });
  log('Bot:', '@' + me.username);
  if (!cfg.chatId) await findChat();
  if (process.argv.includes('--test')) { await tg('sendMessage', { chat_id: cfg.chatId, text: '✅ Botlar V1 Telegram bağlantısı çalışıyor. M1 Premium ⭐ sinyalleri buraya gelecek.' }); log('deneme mesajı gönderildi'); }
  log('M1 Premium ⭐ sinyalleri izleniyor…');
  let tick = 0;
  for (;;) { try { scan(); await pump(); if (++tick % 5 === 0) await commands(); saveState(); } catch (e) { log('hata:', e.message); } await new Promise(r => setTimeout(r, 1000)); }
})();
