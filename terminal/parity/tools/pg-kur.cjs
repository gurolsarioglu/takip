'use strict';
// PostgreSQL 18.6 (Windows x64 zip, EDB) -> C:\projeler\newbot\araclar\pgsql ; veri: botlar-v1\data\pg ; port 5433 ; yalnız 127.0.0.1
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { execFileSync } = require('node:child_process');
const TOOLS = path.resolve(__dirname, '..', '..', '..', 'araclar'), V1 = path.resolve(__dirname, '..', '..', 'botlar-v1');
const ZIP = path.join(TOOLS, 'postgresql-18.6-1-windows-x64-binaries.zip'), PG = path.join(TOOLS, 'pgsql'), BIN = path.join(PG, 'bin');
const DATA = path.join(V1, 'data', 'pg'), CFG = path.join(V1, 'db', 'baglanti.json');
const URL = 'https://get.enterprisedb.com/postgresql/postgresql-18.6-1-windows-x64-binaries.zip';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
(async () => {
  fs.mkdirSync(TOOLS, { recursive: true });
  if (!fs.existsSync(ZIP)) {
    log('indiriliyor', URL);
    const r = await fetch(URL); if (!r.ok) throw new Error('HTTP ' + r.status);
    const ws = fs.createWriteStream(ZIP + '.part'); let n = 0;
    for await (const c of r.body) { ws.write(c); n += c.length; if (n % (50 * 1048576) < c.length) log((n / 1048576).toFixed(0), 'MB'); }
    await new Promise(res => ws.end(res)); fs.renameSync(ZIP + '.part', ZIP); log('indirildi', (n / 1048576).toFixed(0), 'MB');
  }
  if (!fs.existsSync(path.join(BIN, 'postgres.exe'))) {
    log('açılıyor…'); execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -Path '${ZIP}' -DestinationPath '${TOOLS}' -Force`], { stdio: 'inherit' });
  }
  log('sürüm:', execFileSync(path.join(BIN, 'postgres.exe'), ['--version'], { encoding: 'utf8' }).trim());
  fs.mkdirSync(path.dirname(CFG), { recursive: true });
  let cfg; try { cfg = JSON.parse(fs.readFileSync(CFG, 'utf8')); } catch { cfg = { host: '127.0.0.1', port: 5433, user: 'botlar', database: 'botlar', password: crypto.randomBytes(18).toString('base64url') }; fs.writeFileSync(CFG, JSON.stringify(cfg, null, 2)); }
  if (!fs.existsSync(path.join(DATA, 'PG_VERSION'))) {
    const pw = path.join(V1, 'db', '.pw.tmp'); fs.writeFileSync(pw, cfg.password);
    log('initdb…');
    execFileSync(path.join(BIN, 'initdb.exe'), ['-D', DATA, '-U', cfg.user, '--pwfile', pw, '-A', 'scram-sha-256', '-E', 'UTF8', '--locale=C'], { stdio: 'inherit' });
    fs.unlinkSync(pw);
    fs.appendFileSync(path.join(DATA, 'postgresql.conf'), `\n# botlar-v1\nlisten_addresses = '127.0.0.1'\nport = ${cfg.port}\nshared_buffers = 2GB\nwork_mem = 64MB\nmaintenance_work_mem = 1GB\nmax_wal_size = 4GB\nlogging_collector = on\nlog_directory = 'log'\ntimezone = 'Europe/Istanbul'\n`);
  }
  log('HAZIR', 'bin=' + BIN, 'data=' + DATA, 'port=' + cfg.port);
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
