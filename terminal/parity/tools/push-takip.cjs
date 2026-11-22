'use strict';
// Bizim işleri (botlar-v1, parity kodu, Takip.md, raporlar, video metinleri) takip reposuna gönderir.
// Kullanıcının çalışma kopyasına dokunmaz: ayrı bir worktree'de takip/master üzerine commit atar.
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const REPO = path.resolve(__dirname, '..', '..', '..'), T = path.join(REPO, 'terminal'), WT = path.join(REPO, '_takip-push');
const g = (cwd, ...a) => { console.log('> git', a.join(' ')); const o = execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64e6 }); if (o.trim()) console.log(o.trim().slice(0, 3000)); return o; };
const SKIP_DIR = new Set(['data', 'jobs', 'node_modules', '_to_delete', 'parca', '.git']);
const SKIP_FILE = f => /\.(wav|webm|hazir|log)$/i.test(f) || f === 'ayarlar.json' || f === 'baglanti.json' || f === 'coingecko.json' || /\.tmp$/.test(f);
function copy(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) { fs.mkdirSync(dst, { recursive: true }); for (const e of fs.readdirSync(src)) { if (SKIP_DIR.has(e)) continue; copy(path.join(src, e), path.join(dst, e)); } }
  else if (!SKIP_FILE(path.basename(src))) { if (st.size > 20e6) { console.log('büyük dosya atlandı', src, st.size); return; } fs.copyFileSync(src, dst); }
}
try {
  g(REPO, 'fetch', 'takip');
  if (fs.existsSync(WT)) { try { g(REPO, 'worktree', 'remove', '--force', WT); } catch { } }
  g(REPO, 'worktree', 'add', '--detach', WT, 'takip/master');
  for (const p of ['botlar-v1', 'parity', 'Takip.md', 'raporlar', 'video']) copy(path.join(T, p), path.join(WT, 'terminal', p));
  g(WT, 'add', '-A', 'terminal');
  const staged = g(WT, 'diff', '--cached', '--name-only').trim().split('\n').filter(Boolean);
  console.log('dosya sayısı', staged.length);
  if (staged.some(f => /ayarlar\.json$|baglanti\.json$|coingecko\.json$|binance_api_config/.test(f))) throw new Error('gizli dosya bulundu, iptal');
  g(WT, '-c', 'user.name=gurolsarioglu', '-c', 'user.email=gurolsarioglu@gmail.com', 'commit', '-q', '-m', process.argv[2] || 'Botlar V1.1 + parity laboratuvarı + Takip/raporlar/video notları',
    '-m', 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_017B6eUd2YvvbviXpRM5WQP7');
  g(WT, 'push', 'takip', 'HEAD:refs/heads/master');
  console.log('PUSH OK', g(WT, 'rev-parse', '--short', 'HEAD').trim());
  g(REPO, 'worktree', 'remove', '--force', WT);
} catch (e) { console.log('HATA', e.message, e.stdout || '', e.stderr || ''); process.exitCode = 1; }
