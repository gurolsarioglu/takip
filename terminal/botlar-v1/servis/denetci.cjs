'use strict';
// Botlar V1 denetçisi: Windows açılışında (Görev Zamanlayıcı, SYSTEM) başlar; motoru, web sunucusunu ve veritabanı
// yazıcısını çalıştırır, çökerse yeniden başlatır, her gece veritabanı yedeği alır.
// Bir parçayı yeniden başlatmak için: data\kontrol\<isim>.yeniden dosyası oluşturun (motor | web | yazici | mumlar | karne | turev | akis).
const fs = require('node:fs'), path = require('node:path'), { spawn, execFile } = require('node:child_process');
const V1 = path.resolve(__dirname, '..'), DATA = path.join(V1, 'data'), LOGD = path.join(DATA, 'log'), CTRL = path.join(DATA, 'kontrol'), BAK = path.join(DATA, 'yedek');
const PGBIN = path.resolve(V1, '..', '..', 'araclar', 'pgsql', 'bin');
for (const d of [LOGD, CTRL, BAK]) fs.mkdirSync(d, { recursive: true });
const PARTS = {
  motor: ['--max-old-space-size=4096', 'engine/live.cjs'],
  web: ['web/server.cjs'],
  yazici: ['db/yazici.cjs'],
  mumlar: ['db/mumlar.cjs'],   // 5 dk'lık Binance mumları (karne için)
  karne: ['db/karne.cjs'],     // sinyal karnesi, 15 dk'da bir
  turev: ['db/turev.cjs'],     // OI + long/short geçmişi, 6 saatte bir (Binance yalnız 30 gün tutuyor)
  akis: ['db/akis.cjs'],       // tasfiyeler + büyük işlemler, sürekli WebSocket (V1.16.0; Binance sonradan vermiyor)
};
const now = () => new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
const DLOG = path.join(LOGD, 'denetci.log');
const say = (...a) => { const l = `${now()} ${a.join(' ')}\n`; try { fs.appendFileSync(DLOG, l); } catch { } };
function logStream(name) {
  const f = path.join(LOGD, name + '.log');
  try { if (fs.statSync(f).size > 50e6) fs.renameSync(f, f + '.1'); } catch { }
  return fs.openSync(f, 'a');
}
const st = {};
function start(name) {
  const fd = logStream(name);
  const p = spawn(process.execPath, PARTS[name], { cwd: V1, stdio: ['ignore', fd, fd], windowsHide: true });
  st[name] = { ...(st[name] || { restarts: 0 }), pid: p.pid, startedAt: Date.now(), proc: p, stopping: false };
  say('başladı', name, 'pid', p.pid);
  p.on('error', e => say('BAŞLATILAMADI', name, e.message));   // spawn hatası denetçiyi düşürmesin (exit olayı yeniden deneme yapar)
  p.on('exit', (code, sig) => {
    fs.closeSync(fd);
    const s = st[name]; s.lastExit = { code, sig, at: Date.now() }; s.pid = null;
    const ranMs = Date.now() - s.startedAt;
    if (s.stopping) { say('durduruldu', name); setTimeout(() => start(name), 1000); return; }
    s.restarts++; const wait = ranMs > 120e3 ? 5e3 : Math.min(60e3, 5e3 * s.restarts);
    say('kapandı', name, 'kod', code, sig || '', `→ ${wait / 1000} sn sonra yeniden`);
    setTimeout(() => start(name), wait);
  });
}
function writeStatus() {
  const o = { at: new Date().toISOString(), pid: process.pid, parts: Object.fromEntries(Object.entries(st).map(([k, v]) => [k, { pid: v.pid, startedAt: v.startedAt, restarts: v.restarts, lastExit: v.lastExit }])) };
  try { fs.writeFileSync(path.join(DATA, 'denetci.json'), JSON.stringify(o, null, 1)); } catch { }
}
function control() {
  let files = []; try { files = fs.readdirSync(CTRL); } catch { return; }
  for (const f of files) {
    const m = f.match(/^(motor|web|yazici|mumlar|karne|turev|akis)\.yeniden$/); try { fs.unlinkSync(path.join(CTRL, f)); } catch { }
    if (m && st[m[1]] && st[m[1]].proc) { say('yeniden başlatma isteği', m[1]); st[m[1]].stopping = true; st[m[1]].proc.kill(); }
  }
}
// Gece yedeği 03:30 (TR): pg_dump -Fc, son 7 gün tutulur
let lastBackupDay = null;
function backup() {
  const tr = new Date(Date.now() + 3 * 3600e3), day = tr.toISOString().slice(0, 10), hm = tr.toISOString().slice(11, 16);
  if (hm < '03:30' || lastBackupDay === day) return; lastBackupDay = day;
  let cfg; try { cfg = JSON.parse(fs.readFileSync(path.join(V1, 'db', 'baglanti.json'), 'utf8')); } catch { return; }
  const out = path.join(BAK, `botlar-${day}.dump`);
  execFile(path.join(PGBIN, 'pg_dump.exe'), ['-h', cfg.host, '-p', String(cfg.port), '-U', cfg.user, '-Fc', '-f', out, cfg.database], { env: { ...process.env, PGPASSWORD: cfg.password } }, err => {
    if (err) { say('YEDEK HATA', err.message); lastBackupDay = null; return; }
    say('yedek alındı', out);
    const old = fs.readdirSync(BAK).filter(f => /^botlar-\d{4}-\d{2}-\d{2}\.dump$/.test(f)).sort().slice(0, -7);
    for (const f of old) { try { fs.unlinkSync(path.join(BAK, f)); say('eski yedek silindi', f); } catch { } }
  });
}
say('denetçi başladı', 'pid', process.pid, 'node', process.version);
for (const n of Object.keys(PARTS)) start(n);
setInterval(() => { control(); writeStatus(); }, 5000);
setInterval(backup, 60e3);
for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => { for (const v of Object.values(st)) { v.stopping = true; try { v.proc.kill(); } catch { } } process.exit(0); });
