'use strict';
// 19.11 v1_17 paketinden açılan dosyalardaki Windows "salt okunur" işaretini kaldırır (yalnız o liste).
const { execFileSync } = require('node:child_process'), path = require('node:path');
const V1 = path.resolve(__dirname, '..', '..', 'botlar-v1');
for (const f of ['db/terminal-deneme.cjs', 'db/test-indicator-engine.cjs', 'db/test-signal-archive.cjs', 'db/test-signal-feed.cjs', 'db/test-signal-panel.cjs', 'db/test-workspace-browser.cjs', 'db/test-workspace-layout.cjs', 'web/public/indicator-engine.js', 'web/public/signal-panel.css', 'web/public/signal-panel.js', 'web/public/terminal-ek.css', 'web/public/terminal-indicators.js', 'web/public/terminal.html', 'web/public/workspace.css', 'web/public/workspace.js', 'web/server.cjs', 'web/signal-archive.cjs', 'web/signal-feed.cjs']) {
  try { execFileSync('attrib', ['-R', path.join(V1, f)]); console.log('tamam', f); } catch (e) { console.log('HATA', f, e.message); }
}
