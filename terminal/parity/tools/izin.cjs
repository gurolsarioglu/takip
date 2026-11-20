'use strict';
// Dosya öznitelikleri ve ACL (salt okunur).
const { execFileSync } = require('node:child_process'), path = require('node:path');
const V1 = path.resolve(__dirname, '..', '..', 'botlar-v1');
for (const f of ['web/public/signal-panel.css', 'web/public/signal-panel.js', 'web/public/terminal.html', 'db/test-signal-panel.cjs']) {
  const p = path.join(V1, f);
  for (const [c, a] of [['attrib', [p]], ['icacls', [p]]]) { try { console.log(execFileSync(c, a, { encoding: 'utf8' }).trim()); } catch (e) { console.log('HATA', c, String(e.stdout || e.message).slice(0, 300)); } }
}
