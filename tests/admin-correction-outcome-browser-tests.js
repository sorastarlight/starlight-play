// Actual Firefox focus checks. All reads and corrections use fictional transports.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({browser: 'firefox', headless: true});
  try {
    for (const outcome of ['saved', 'denied', 'unknown', 'session-unknown']) {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', request => request.abort());
      await page.setContent('<main id="editor"></main>');
      await page.addScriptTag({content: fs.readFileSync(path.join(__dirname, '../js/admin-trainer-corrections.js'), 'utf8')});
      await page.evaluate(async outcome => {
        const trainerId = '11111111-1111-4111-8111-111111111111';
        let failRead = true;
        window.writes = 0;
        Object.defineProperty(crypto, 'randomUUID', {value: () => '22222222-2222-4222-8222-222222222222'});
        window.app = PLAY_TRAINER_CORRECTIONS.mount(document.querySelector('#editor'), async (kind, payload) => {
          if (kind === 'read') {
            if (failRead) { failRead = false; throw Error('Fictional read failed'); }
            return {trainerId, revision: 'r1', protected: false, values: [
              {id: 'coins', name: 'PokéCoins', kind: 'currency', value: 150, editable: true}
            ], pokemon: [], history: []};
          }
          writes++;
          if (outcome === 'denied') throw Object.assign(Error('Denied'), {code: '42501'});
          if (outcome !== 'saved') throw Object.assign(Error('Missing receipt'), {correctionOutcomeUnknown: outcome === 'session-unknown'});
          return {requestId: payload.requestId, trainerId, status: 'saved'};
        });
        await app.open(trainerId);
      }, outcome);
      await page.waitForFunction(() => document.activeElement.getAttribute('role') === 'status');
      assert.match(await page.$eval('[role=status]', node => node.textContent), /Fictional read failed/);
      await page.click('[data-correction-load]');
      await page.waitForSelector('[data-value-id]');
      await page.click('[data-value-id]');
      await page.focus('[name=value]');
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await page.keyboard.type('151');
      await page.focus('[name=reason]');
      await page.keyboard.type('Fictional correction');
      await page.click('[data-correction-form] button[type=submit]');
      await page.waitForSelector('[data-correction-save]');
      await page.click('[data-correction-save]');
      await page.waitForFunction(() => app.state.phase !== 'saving' && document.activeElement.getAttribute('role') === 'status');
      assert.equal(await page.evaluate(() => writes), 1);
      if (outcome === 'denied' || outcome === 'session-unknown') {
        assert.equal(await page.evaluate(() => app.state.snapshot), null);
      }
      console.log(`PASS correction ${outcome}: read retry, one fictional save, result focus`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
