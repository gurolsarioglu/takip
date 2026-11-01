'use strict';
// Parity job runner. Started once on the Windows machine (start-parity-runner.bat).
// Watches parity/jobs for *.job.json files: {"script":"collect.cjs","args":["--pages","5"]}
// Runs `node <script> <args>` inside the parity folder only, logs to jobs/<name>.log, writes jobs/<name>.done.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const DIR = __dirname;
const JOBS = path.join(DIR, 'jobs');
fs.mkdirSync(JOBS, { recursive: true });
const running = new Map();

function heartbeat() {
  fs.writeFileSync(path.join(JOBS, '_runner.json'), JSON.stringify({ pid: process.pid, at: new Date().toISOString(), node: process.version, running: [...running.keys()] }));
}

function start(file) {
  const name = file.replace(/\.job\.json$/, '');
  const runPath = path.join(JOBS, name + '.running.json');
  fs.renameSync(path.join(JOBS, file), runPath);
  let job;
  try { job = JSON.parse(fs.readFileSync(runPath, 'utf8')); } catch (e) { fs.writeFileSync(path.join(JOBS, name + '.done'), 'bad job json'); return; }
  if (job.kill) { const p = running.get(job.kill); if (p) p.kill(); fs.writeFileSync(path.join(JOBS, name + '.done'), JSON.stringify({ killed: job.kill })); return; }
  const script = path.resolve(DIR, String(job.script));
  if (!script.startsWith(DIR + path.sep) || !script.endsWith('.cjs') || !fs.existsSync(script)) {
    fs.writeFileSync(path.join(JOBS, name + '.done'), JSON.stringify({ error: 'script rejected' })); return;
  }
  const log = fs.openSync(path.join(JOBS, name + '.log'), 'w');
  const p = spawn(process.execPath, ['--max-old-space-size=4096', script, ...(job.args || []).map(String)], { cwd: DIR, stdio: ['ignore', log, log], windowsHide: true });
  running.set(name, p);
  heartbeat();
  p.on('exit', (code, sig) => {
    running.delete(name);
    fs.closeSync(log);
    fs.writeFileSync(path.join(JOBS, name + '.done'), JSON.stringify({ code, sig, at: new Date().toISOString() }));
    heartbeat();
  });
}

console.log('Parity runner started. Leave this window open. Folder:', JOBS);
setInterval(() => {
  heartbeat();
  for (const f of fs.readdirSync(JOBS)) if (f.endsWith('.job.json')) { try { start(f); } catch (e) { console.error(f, e.message); } }
}, 2000);
heartbeat();
