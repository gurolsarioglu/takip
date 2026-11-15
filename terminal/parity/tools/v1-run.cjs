'use strict';
// Runner köprüsü: Botlar V1 süreçlerini (motor / web) parity runner'dan başlatır. node tools/v1-run.cjs engine|web|telegram|yazici
const path = require('node:path'); const { spawn } = require('node:child_process');
const V1 = path.resolve(__dirname, '..', '..', 'botlar-v1');
const what = process.argv[2];
const script = { engine: ['--max-old-space-size=4096', 'engine/live.cjs'], web: ['web/server.cjs'], telegram: ['telegram/sender.cjs'], yazici: ['db/yazici.cjs'] }[what];
if (!script) { console.error('engine | web | telegram | yazici'); process.exit(1); }
const p = spawn(process.execPath, script, { cwd: V1, stdio: 'inherit', windowsHide: true });
p.on('exit', c => process.exit(c || 0));
for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => { p.kill(); process.exit(0); });
