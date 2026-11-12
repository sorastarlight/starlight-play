// Actual recovery reload UI with fictional correction receipts and no hosted calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({browser: 'firefox', headless: true});
  try {
    for (const found of [true, false]) {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', request => request.abort());
      await page.setContent('<main id="editor"></main>');
      await page.addScriptTag({content: fs.readFileSync(path.join(__dirname, '../js/admin-trainer-corrections.js'), 'utf8')});
      await page.evaluate(async found => {
        const trainerId = '11111111-1111-4111-8111-111111111111';
        let request;
        window.writes = 0;
        window.app = PLAY_TRAINER_CORRECTIONS.mount(document.querySelector('#editor'), async (kind, payload) => {
          if (kind === 'save') {
            writes++;
            request = structuredClone(payload);
            throw Object.assign(Error('Fictional unconfirmed dispatch'), {correctionOutcomeUnknown: true});
          }
          return {trainerId, revision: 'r1', protected: false,
            values: [{id: 'coins', name: 'PokéCoins', kind: 'currency', value: found && request ? 151 : 150, editable: true}],
            pokemon: [], history: found && request ? [{requestId: request.requestId, status: 'saved', correction: request.correction}] : []};
        });
        await app.open(trainerId);
        app.review({type: 'quantity', id: 'coins', value: 151}, 'Fictional correction', '22222222-2222-4222-8222-222222222222');
      }, found);
      await page.focus('[data-correction-save]');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => app.state.phase === 'uncertain' && document.activeElement.getAttribute('role') === 'status');
      await page.focus('[data-correction-load]');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => app.state.phase === 'ready' && document.activeElement.getAttribute('role') === 'status');
      assert.match(await page.$eval('[role=status]', node => node.textContent), found ? /recorded as saved/ : /still unconfirmed/);
      assert.equal(await page.evaluate(() => Boolean(app.state.recovery)), !found);
      assert.equal(await page.evaluate(() => app.canLeave()), found);
      assert.equal(await page.evaluate(() => writes), 1, 'Reload must never repeat a correction');
      console.log(`PASS recovery ${found ? 'receipt found' : 'still unconfirmed'}: result focus and no repeated write`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
