'use strict';
// PostgreSQL'i ön planda çalıştırır (runner işi olarak). Servis kurulunca gerek kalmaz.
const path = require('node:path'), { spawn } = require('node:child_process');
const BIN = path.resolve(__dirname, '..', '..', '..', 'araclar', 'pgsql', 'bin'), DATA = path.resolve(__dirname, '..', '..', 'botlar-v1', 'data', 'pg');
const p = spawn(path.join(BIN, 'postgres.exe'), ['-D', DATA], { stdio: 'inherit', windowsHide: true });
p.on('exit', c => process.exit(c || 0));
for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => { p.kill(); process.exit(0); });
