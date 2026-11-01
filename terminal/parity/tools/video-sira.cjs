'use strict';
// Sırayla yazıya dök: önce bekleme işi bitsin (jobs/<bekle>.done), sonra her ID için whisper; çıktının başına başlık ekle.
// node tools/video-sira.cjs <bekle-job> id1 id2 ...
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const [WAIT, ...IDS] = process.argv.slice(2);
const VID = path.resolve(__dirname, '..', '..', 'video'), JOBS = path.resolve(__dirname, '..', 'jobs');
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
while (WAIT && WAIT !== '-' && !fs.existsSync(path.join(JOBS, WAIT + '.done'))) { log('bekleniyor', WAIT); sleep(60e3); }
IDS.forEach((ID, k) => {
  const wav = path.join(VID, ID + '.wav');
  while (!fs.existsSync(wav + '.hazir')) { log('wav bekleniyor', ID); sleep(30e3); }
  if (!fs.existsSync(path.join(VID, ID + '.txt'))) {
    log('yazıya dökülüyor', k + 1, ID);
    const r = spawnSync(process.execPath, [path.join(__dirname, 'video-yazi.cjs'), wav], { stdio: 'inherit' });
    log('whisper kod', r.status);
  }
  const txt = path.join(VID, ID + '.txt'), title = fs.existsSync(path.join(VID, ID + '.title')) ? fs.readFileSync(path.join(VID, ID + '.title'), 'utf8').trim() : ID;
  if (fs.existsSync(txt)) {
    const body = fs.readFileSync(txt, 'utf8');
    if (!body.startsWith('# ')) fs.writeFileSync(txt, `# Video ${k + 1}: ${title}\n# https://www.youtube.com/watch?v=${ID}\n\n` + body);
  }
});
log('HEPSI BITTI');
