const { test } = require('node:test');
const assert = require('node:assert/strict');
test('scan loop never overlaps and schedules only after completion', async () => {
  const { createScanLoop } = require('../services/scan-loop.service');
  let release, calls = 0;
  const scheduled = [];
  const loop = createScanLoop(async () => { calls++; await new Promise(r => { release = r; }); }, 100,
    { schedule: fn => { scheduled.push(fn); return 1; }, cancel() {} });
  const first = loop.run();
  const second = loop.run();
  assert.equal(calls, 1);
  assert.equal(scheduled.length, 0);
  release();
  await Promise.all([first, second]);
  assert.equal(scheduled.length, 1);
  loop.stop();
  await scheduled[0]();
  assert.equal(calls, 1);
});
test('scan errors are reported and permit a later scan', async () => {
  const { createScanLoop } = require('../services/scan-loop.service');
  let calls = 0, errors = 0;
  const scheduled = [];
  const loop = createScanLoop(async () => { if (++calls === 1) throw new Error('network'); }, 100,
    { schedule: fn => { scheduled.push(fn); return 1; }, cancel() {}, onError: () => { errors++; } });
  await loop.run();
  assert.equal(errors, 1);
  await scheduled.shift()();
  assert.equal(calls, 2);
  loop.stop();
});
