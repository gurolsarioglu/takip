'use strict';
// Dört panelli terminalin ağsız Chromium kabulü. Yalnız yerel deneme sunucusunu başlatır.
// Çalıştırma: TERMINAL_PLAYWRIGHT ve isteğe bağlı TERMINAL_BROWSER_CHANNEL ile node --test db/test-workspace-browser.cjs
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { join } = require('node:path');
const { test } = require('node:test');

function serveFixture(t) {
  const child = spawn(process.execPath, [join(__dirname, 'terminal-deneme.cjs')], {
    env: { ...process.env, DENEME_PORT: '0', DENEME_DB: '' },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => child.kill());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Deneme sunucusu zamanında başlamadı')), 10_000);
    const fail = error => { clearTimeout(timer); reject(error); };
    let output = '';
    child.once('error', fail);
    child.once('exit', code => fail(new Error('Deneme sunucusu kapandı: ' + code + '\n' + output)));
    child.stderr.on('data', chunk => { output += chunk; });
    child.stdout.on('data', chunk => {
      output += chunk;
      const url = output.match(/http:\/\/127\.0\.0\.1:\d+\/terminal\.html/);
      if (url) { clearTimeout(timer); resolve(url[0]); }
    });
  });
}

test('masaüstü terminalinde grafikler, botlar, ayırıcı ve arşiv birlikte çalışır', { timeout: 70_000 }, async t => {
  const { chromium } = require(process.env.TERMINAL_PLAYWRIGHT || 'playwright');
  const address = await serveFixture(t), origin = new URL(address).origin;
  const browser = await chromium.launch({ channel: process.env.TERMINAL_BROWSER_CHANNEL, headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, locale: 'tr-TR' });
  page.setDefaultTimeout(7_000);
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    external.push(route.request().url());
    return route.abort();
  });
  const response = await page.goto(address + '?s=BTCUSDT');
  assert.equal(response.status(), 200);
  const botPanel = page.locator('#signal-panel');
  const pane = page.locator('#grid .pane');
  await page.locator('#grid .pane').last().waitFor();
  await page.waitForFunction(() => P.length === 4 && P.every(p => p.loaded && p.ch.data.length > 100), null, { timeout: 15_000 });
  assert.equal(await pane.count(), 4);
  const boxes = await Promise.all((await pane.all()).map(element => element.boundingBox()));
  assert.ok(boxes.every((box, i) => box.y === boxes[0].y && (!i || box.x > boxes[i - 1].x)));
  const watchBox = await page.locator('#wl').boundingBox(), botBox = await botPanel.boundingBox();
  assert.ok(watchBox.x > boxes[3].x && botBox.x > boxes[3].x && botBox.y >= watchBox.y + watchBox.height - 2);

  const premium = botPanel.getByRole('button', { name: /^M1 Premium\b/ }).first();
  await premium.waitFor();
  assert.equal(await botPanel.locator('.sp-bot').count(), 9);
  if (await premium.getAttribute('aria-expanded') !== 'true') await premium.click();
  const arc = botPanel.getByRole('button', { name: /ARCUSDT grafiğini/ }).first();
  await arc.waitFor();
  const liveTimes = await botPanel.locator('.sp-list time').evaluateAll(nodes => nodes.map(node => node.dateTime));
  assert.ok(liveTimes.length > 1);
  assert.deepEqual(liveTimes, [...liveTimes].sort().reverse());
  await arc.click();
  await page.waitForFunction(() => S.sym === 'ARCUSDT' && P.every(p => p.loaded && p.ch.data.length > 100), null, { timeout: 15_000 });
  assert.equal(await botPanel.getByRole('button', { name: /^M1 Premium\b/ }).first().getAttribute('aria-expanded'), 'true');
  await botPanel.getByText('Stoch: 95(K)/92(D)', { exact: false }).first().waitFor();   // V1.17.1: mesaj satırda
  const div = botPanel.getByRole('button', { name: /^DIV\b/ }).first();
  await div.click();
  assert.equal(await div.getAttribute('aria-expanded'), 'true');
  assert.equal(await premium.getAttribute('aria-expanded'), 'false');

  const archiveReply = page.waitForResponse(res => res.url().includes('/api/t/signal-archive?'));
  await botPanel.getByRole('button', { name: /Arşiv/i }).first().click();
  const archive = await archiveReply;
  assert.equal(archive.status(), 200);
  assert.equal(new URL(archive.url()).searchParams.get('symbol'), 'ARCUSDT');
  assert.equal(new URL(archive.url()).searchParams.get('bot'), 'div');
  const { items: records, nextCursor } = await archive.json();
  assert.ok(records.length > 1 && records.every((row, i) => i === 0 || records[i - 1].t >= row.t));
  assert.ok(nextCursor);
  const olderReply = page.waitForResponse(res => res.url().includes('/api/t/signal-archive?') && new URL(res.url()).searchParams.has('cursor'));
  await botPanel.getByRole('button', { name: 'Daha eski sinyaller' }).click();
  const older = await olderReply;
  const { items: olderRecords } = await older.json();
  assert.ok(olderRecords.length > 0 && olderRecords[0].t < records.at(-1).t);

  const summary = page.locator('#market-summary summary');
  const summaryReply = page.waitForResponse(res => res.url().includes('/api/t/turev?symbol=ARCUSDT'));
  await summary.click();
  assert.equal((await summaryReply).status(), 200);
  await summary.click();

  const indicators = page.locator('#pnb');
  assert.match(await indicators.textContent(), /Göstergeler/);
  await indicators.click();
  const waveTrend = page.locator('#pnm input[data-pn="wt"]');
  await waveTrend.uncheck();
  assert.ok(await page.evaluate(() => P.every(p => !p.ch.panes.wt)));
  await waveTrend.check();
  assert.ok(await page.evaluate(() => P.every(p => p.ch.panes.wt)));
  await indicators.click();
  const savedTimeframes = await page.evaluate(() => P.map(p => p.tf));
  assert.deepEqual(savedTimeframes, ['5m', '15m', '1h', '4h']);
  await page.locator('[data-lay="uzun"]').click();
  assert.deepEqual(await page.evaluate(() => P.map(p => p.tf)), ['4h', '1d', '1w', '1M']);
  await page.locator('[data-lay="kisa"]').click();
  assert.deepEqual(await page.evaluate(() => P.map(p => p.tf)), savedTimeframes);
  await pane.nth(1).locator('select').selectOption('1d');
  await page.waitForFunction(() => P[1].loaded && P[1].ch.iv === '1d', null, { timeout: 12_000 });
  assert.deepEqual(await page.evaluate(() => P.map(p => p.tf)), savedTimeframes.map((tf, i) => i === 1 ? '1d' : tf));

  const dividers = page.getByRole('separator');
  assert.equal(await dividers.count(), 4);
  const leftDivider = dividers.first();
  const handle = await leftDivider.boundingBox();
  assert.ok(handle && handle.width > 0);
  const before = await pane.first().boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 30, handle.y + handle.height / 2, { steps: 5 });
  await page.mouse.up();
  const after = await pane.first().boundingBox();
  assert.ok(Math.abs(after.width - before.width) >= 15);
  const side = dividers.last(), sideBefore = await botPanel.boundingBox();
  await side.focus();
  await page.keyboard.press('ArrowLeft');
  assert.ok(Math.abs((await botPanel.boundingBox()).width - sideBefore.width) >= 5);
  const savedWidth = (await pane.first().boundingBox()).width;
  await page.reload();
  assert.ok(Math.abs((await pane.first().boundingBox()).width - savedWidth) < 4);

  for (const width of [1920, 1024, 390]) {
    await page.setViewportSize({ width, height: 768 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), String(width));
    if (width === 390) {
      const chart = await pane.first().boundingBox(), sidebar = await page.locator('#wl').boundingBox();
      assert.ok(chart && sidebar && sidebar.y > chart.y);
    }
  }
  if (process.env.TERMINAL_SCREENSHOT) {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.evaluate(() => {
      localStorage.removeItem('v1.t.workspace');
      localStorage.removeItem('v1.t.tfs');
    });
    await page.goto(address + '?s=ARCUSDT');
    await page.waitForFunction(() => P.every(p => p.loaded && p.ch.data.length > 100), null, { timeout: 15_000 });
    await botPanel.getByRole('button', { name: /ARCUSDT/ }).first().waitFor();
    await page.screenshot({ path: process.env.TERMINAL_SCREENSHOT });
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
});
