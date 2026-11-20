'use strict';
// Siteyi (127.0.0.1:3200) YALNIZ tailnet'e HTTPS ile açar: tailscale serve --bg 3200. Funnel (internete açma) kullanılmaz.
const { execFileSync } = require('node:child_process');
const exe = 'C:\\Program Files\\Tailscale\\tailscale.exe';
const run = a => { try { return execFileSync(exe, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60e3 }).trim(); } catch (e) { return 'HATA ' + String(e.stdout || '') + String(e.stderr || e.message).slice(0, 600); } };
console.log(run(['serve', '--bg', '--yes', 'http://127.0.0.1:3200']));
console.log('--- durum'); console.log(run(['serve', 'status']));
console.log('--- funnel'); console.log(run(['funnel', 'status']));
