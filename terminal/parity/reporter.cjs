'use strict';
// Saatlik başarı kaydı + günlük rapor.
// Her saat başı (+3 dk) bir önceki saat için compare.cjs çalıştırır, sonucu data/score-history.jsonl'e ekler
// ve ..\raporlar\YYYY-MM-DD.md (Türkiye saatiyle gün) dosyasını yeniden yazar.
// node reporter.cjs [--backfill-from 2026-10-27T17:00:00Z]
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, 'data');
const HIST = path.join(ROOT, 'score-history.jsonl');
const REP = path.join(__dirname, '..', 'raporlar');
const H = 3600e3, TR = 3 * H;
const BOTS = ['m1', 'm1-premium', 'hammer', 'hammer-pro', 'hammer-pro-plus', '1d-hammer-pro', '4s', '4sniper', '1dws', 'div', 'fr', 'v3'];
const NAMES = { 'm1': 'M1-A', 'm1-premium': 'M1 Premium', 'hammer': 'Hammer', 'hammer-pro': 'Hammer Pro', 'hammer-pro-plus': 'Hammer Pro+', '1d-hammer-pro': '1D Hammer Pro', '4s': '4S', '4sniper': '4S Sniper', '1dws': '1DWS', 'div': 'DIV', 'fr': 'FR', 'v3': 'V3' };
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
fs.mkdirSync(REP, { recursive: true });
const log = (...a) => console.log(new Date().toISOString(), ...a);

function runHour(h0) {
  const from = new Date(h0).toISOString(), to = new Date(h0 + H).toISOString();
  execFileSync(process.execPath, [path.join(__dirname, 'compare.cjs'), '--from', from, '--to', to, '--warmup', '0'], { cwd: __dirname, stdio: 'ignore', timeout: 600e3 });
  const r = JSON.parse(fs.readFileSync(path.join(ROOT, 'live', 'parity-report.json'), 'utf8'));
  const rec = { hour: from, bots: {} };
  for (const b of BOTS) { const x = r.bots[b]; if (x) rec.bots[b] = { vv: x.refEpisodes, ours: x.ourEpisodes, tp: x.tp, fn: x.fn, fp: x.fp }; }
  return rec;
}
const readHist = () => { try { return fs.readFileSync(HIST, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch { return []; } };
const pct = (a, b) => (b ? Math.round(100 * a / b) + '%' : '—');

function writeDay(dayTR) { // dayTR = 'YYYY-MM-DD' in Turkey time
  const rows = readHist().filter(r => new Date(Date.parse(r.hour) + TR).toISOString().slice(0, 10) === dayTR).sort((a, b) => a.hour.localeCompare(b.hour));
  if (!rows.length) return;
  const sum = {}; for (const b of BOTS) sum[b] = { vv: 0, ours: 0, tp: 0, fn: 0, fp: 0 };
  for (const r of rows) for (const [b, x] of Object.entries(r.bots)) for (const k of Object.keys(sum[b])) sum[b][k] += x[k] || 0;
  const L = [];
  L.push(`# Günlük rapor — ${dayTR}`, '', `Bizim botlar vs Visivero. Saatler Türkiye saati. Son güncelleme: ${new Date(Date.now() + TR).toISOString().slice(0, 16).replace('T', ' ')}`, '',
    '**Yakalama** = Visivero sinyallerinden bizim de verdiğimiz. **İsabet** = bizim sinyallerden Visivero\'da da olan. Tekrarlayan mesajlar tek sinyal sayılır.', '',
    '## Gün toplamı', '', '| Bot | Visivero | Biz | Eşleşen | Kaçan | Fazla | Yakalama | İsabet |', '|---|---|---|---|---|---|---|---|');
  for (const b of BOTS) { const s = sum[b]; if (!s.vv && !s.ours) continue; L.push(`| ${NAMES[b]} | ${s.vv} | ${s.ours} | ${s.tp} | ${s.fn} | ${s.fp} | ${pct(s.tp, s.tp + s.fn)} | ${pct(s.tp, s.tp + s.fp)} |`); }
  L.push('', '## Saat saat (yakalama / isabet)', '');
  const act = BOTS.filter(b => sum[b].vv || sum[b].ours);
  L.push('| Saat | ' + act.map(b => NAMES[b]).join(' | ') + ' |', '|---|' + act.map(() => '---').join('|') + '|');
  for (const r of rows) {
    const hh = new Date(Date.parse(r.hour) + TR).toISOString().slice(11, 16);
    L.push(`| ${hh} | ` + act.map(b => { const x = r.bots[b]; if (!x || (!x.vv && !x.ours)) return '·'; return `${pct(x.tp, x.tp + x.fn)} / ${pct(x.tp, x.tp + x.fp)}`; }).join(' | ') + ' |');
  }
  fs.writeFileSync(path.join(REP, dayTR + '.md'), L.join('\n') + '\n');
}

function catchUp() {
  const hist = readHist(), done = new Set(hist.map(r => r.hour));
  const start = Date.parse(arg('backfill-from', hist.length ? hist.at(-1).hour : new Date(Math.floor(Date.now() / H) * H - H).toISOString()));
  const last = Math.floor(Date.now() / H) * H - H; // last fully finished hour
  const days = new Set();
  for (let h = start; h <= last; h += H) {
    const iso = new Date(h).toISOString(); if (done.has(iso)) continue;
    try { const rec = runHour(h); fs.appendFileSync(HIST, JSON.stringify(rec) + '\n'); days.add(new Date(h + TR).toISOString().slice(0, 10)); log('saat kaydedildi', iso); }
    catch (e) { log('hata', iso, e.message); }
  }
  for (const d of days) writeDay(d);
}

catchUp();
setInterval(() => { const m = new Date().getUTCMinutes(); if (m === 3 || m === 4) catchUp(); }, 60e3);
log('reporter çalışıyor; rapor klasörü:', REP);
