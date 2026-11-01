'use strict';
// 1) yt-dlp.exe + whisper.cpp (Windows x64) + ggml-small model -> C:\projeler\newbot\araclar
// 2) videonun yalnız sesi -> C:\projeler\newbot\terminal\video\<id>.<ext>
// Kullanım: node tools/video-al.cjs <youtube-id>
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const IDS = process.argv.slice(2);
const TOOLS = path.resolve(__dirname, '..', '..', '..', 'araclar');      // C:\projeler\newbot\araclar
const OUT = path.resolve(__dirname, '..', '..', 'video');                  // C:\projeler\newbot\terminal\video
fs.mkdirSync(TOOLS, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
async function dl(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 1e6) { log('var:', file); return; }
  log('indiriliyor:', url);
  const r = await fetch(url, { headers: { 'user-agent': 'parity-runner' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  const tmp = file + '.part'; const ws = fs.createWriteStream(tmp); let n = 0;
  for await (const chunk of r.body) { ws.write(chunk); n += chunk.length; if (n % (50 * 1048576) < chunk.length) log('  ', (n / 1048576).toFixed(0), 'MB'); }
  await new Promise(res => ws.end(res)); fs.renameSync(tmp, file); log('tamam', (n / 1048576).toFixed(1), 'MB ->', file);
}
(async () => {
  await dl('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', path.join(TOOLS, 'yt-dlp.exe'));
  const zip = path.join(TOOLS, 'whisper-bin-x64.zip');
  try { await dl('https://github.com/ggml-org/whisper.cpp/releases/latest/download/whisper-bin-x64.zip', zip); }
  catch (e) { log('latest yok, listeden aranıyor', e.message); const rels = await (await fetch('https://api.github.com/repos/ggml-org/whisper.cpp/releases?per_page=10', { headers: { 'user-agent': 'parity-runner' } })).json(); const a = rels.flatMap(r => r.assets || []).find(a => /^whisper-bin-x64\.zip$/i.test(a.name)); if (!a) throw new Error('whisper zip yok: ' + JSON.stringify(rels).slice(0, 300)); await dl(a.browser_download_url, zip); }
  const wdir = path.join(TOOLS, 'whisper');
  if (!fs.existsSync(wdir)) { execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -Path '${zip}' -DestinationPath '${wdir}' -Force`]); log('açıldı', wdir); }
  await dl('https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin', path.join(TOOLS, 'ggml-small.bin'));
  for (const ID of IDS) {
    if (fs.readdirSync(OUT).some(f => f.startsWith(ID + '.') && !f.endsWith('.part') && !f.endsWith('.title'))) { log('ses var', ID); }
    else { log('ses indiriliyor', ID); execFileSync(path.join(TOOLS, 'yt-dlp.exe'), ['-f', 'bestaudio', '--no-playlist', '-o', path.join(OUT, '%(id)s.%(ext)s'), `https://www.youtube.com/watch?v=${ID}`], { stdio: 'inherit' }); }
    const title = execFileSync(path.join(TOOLS, 'yt-dlp.exe'), ['--encoding', 'utf-8', '--no-playlist', '--skip-download', '--print', '%(title)s | %(upload_date)s | %(duration_string)s', `https://www.youtube.com/watch?v=${ID}`]).toString().trim();
    fs.writeFileSync(path.join(OUT, ID + '.title'), title); log('başlık', ID, title);
  }
  log('BITTI', fs.readdirSync(OUT).join(', '));
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
