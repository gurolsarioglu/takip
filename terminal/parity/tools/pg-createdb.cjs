'use strict';
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const BIN = path.resolve(__dirname, '..', '..', '..', 'araclar', 'pgsql', 'bin');
const cfg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'botlar-v1', 'db', 'baglanti.json'), 'utf8'));
const env = { ...process.env, PGPASSWORD: cfg.password };
try { execFileSync(path.join(BIN, 'createdb.exe'), ['-h', cfg.host, '-p', String(cfg.port), '-U', cfg.user, '-E', 'UTF8', cfg.database], { env, stdio: 'inherit' }); console.log('oluşturuldu'); }
catch (e) { console.log('createdb:', e.message); }
