'use strict';
// jobs/<klasör>/ içindeki dosyaları botlar-v1'deki yerlerine kopyalar (eşleme aşağıda). Önce eskisini parity/yedek'e alır.
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const SRC = path.join(__dirname, '..', 'jobs', process.argv[2] || 'v1171'), V1 = path.resolve(__dirname, '..', '..', 'botlar-v1');
const MAP = { 'signal-panel.css': 'web/public/signal-panel.css', 'signal-panel.js': 'web/public/signal-panel.js',
  'test-signal-panel.cjs': 'db/test-signal-panel.cjs', 'test-workspace-browser.cjs': 'db/test-workspace-browser.cjs' };
for (const f of fs.readdirSync(SRC)) {
  const dst = MAP[f] && path.join(V1, MAP[f]); if (!dst) { console.log('atlandı', f); continue; }
  try { if (fs.existsSync(dst)) execFileSync('attrib', ['-R', dst]); fs.copyFileSync(path.join(SRC, f), dst); console.log('tamam', MAP[f]); } catch (e) { console.log('HATA', MAP[f], e.code, e.message); }
}
