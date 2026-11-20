'use strict';
// Tailscale kurulu mu, durumu ne? (salt okunur)
const fs = require('node:fs'), { execFileSync } = require('node:child_process');
const run = (c, a) => { try { return execFileSync(c, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60e3 }).trim(); } catch (e) { return 'HATA ' + String(e.stdout || '') + String(e.stderr || e.message).slice(0, 300); } };
const exe = 'C:\\Program Files\\Tailscale\\tailscale.exe';
console.log('exe var mı', fs.existsSync(exe));
console.log('winget', run('winget', ['list', '--id', 'Tailscale.Tailscale', '--accept-source-agreements']));
console.log('winget search', run('winget', ['show', '--id', 'Tailscale.Tailscale', '--accept-source-agreements']).split('\n').slice(0, 6).join(' | '));
if (fs.existsSync(exe)) { console.log('status', run(exe, ['status'])); console.log('serve', run(exe, ['serve', 'status'])); }
