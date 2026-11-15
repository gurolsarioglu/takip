'use strict';
// node tools/v1-db.cjs dogrula  -> botlar-v1/db/<isim>.cjs'yi botlar-v1 klasöründe çalıştırır
const path = require('node:path'), { spawn } = require('node:child_process');
const V1 = path.resolve(__dirname, '..', '..', 'botlar-v1'), n = String(process.argv[2] || '').replace(/[^a-z0-9-]/gi, '');
const p = spawn(process.execPath, [path.join('db', n + '.cjs'), ...process.argv.slice(3)], { cwd: V1, stdio: 'inherit', windowsHide: true });
p.on('exit', c => process.exit(c || 0));
