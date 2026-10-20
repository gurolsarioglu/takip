const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./test-module-loader.cjs');
test('central enrichment keeps account and position ratios separate', async () => {
  const service = load('services/derivatives-enricher.service.js', { https:{} });
  service._fetchJson = async url => url.includes('topLongShortPositionRatio') ? [{ longAccount:'.8',shortAccount:'.2',longShortRatio:'4' }] :
    url.includes('topLongShortAccountRatio') ? [{ longAccount:'.2',shortAccount:'.8',longShortRatio:'.25' }] :
    url.includes('globalLongShortAccountRatio') ? [{ longAccount:'.4',shortAccount:'.6',longShortRatio:'.6667' }] : [];
  const result = await service.enrich('AUDITUSDT');
  assert.equal(result.topTraderLongRatio,80);
  assert.equal(result.topTraderAccountLongRatio,20);
  assert.equal(result.globalLongRatio,40);
});
test('unavailable derivative data stays unknown rather than becoming neutral confirmations', async () => {
  const service = load('services/derivatives-enricher.service.js', { https:{} });
  service._fetchJson = async () => { throw new Error('offline'); };
  const result = await service.enrich('AUDITUSDT');
  assert.equal(result.topTraderLongRatio,null);
  assert.equal(result.topTraderAccountLongRatio,null);
  assert.equal(result.globalLongRatio,null);
  assert.equal(result.fundingRate,null);
  assert.equal(result.nextFundingTime,null);
});
