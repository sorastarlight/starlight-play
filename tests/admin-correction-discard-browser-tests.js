// Real Firefox discard navigation with fictional trainer records and blocked writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({browser: 'firefox', headless: true});
  try {
    for (const kind of ['balance', 'hold', 'quantity', 'removal', 'history']) {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', request => request.abort());
      await page.setContent('<main id="editor"></main>');
      await page.addScriptTag({content: fs.readFileSync(process.argv[2] || path.join(__dirname, '../js/admin-trainer-corrections.js'), 'utf8')});
      await page.evaluate(async () => {
        const trainerId = '11111111-1111-4111-8111-111111111111';
        const id = '33333333-3333-4333-8333-333333333333';
        window.writes = 0;
        window.app = PLAY_TRAINER_CORRECTIONS.mount(document.querySelector('#editor'), async kind => {
          if (kind !== 'read') { writes++; throw Error('Writes blocked'); }
          return {trainerId, revision: 'r1', protected: false,
            values: [{id: 'coins', name: 'PokéCoins', kind: 'currency', value: 150, editable: true}],
            pokemon: [{id, dex: 1, name: 'Bulbasaur', level: 5, locked: false, favorite: false, trading: false}],
            pokemonOptions: [{catalogId: 'pokemon:1', dex: 1, name: 'Bulbasaur'}],
            tradeHolds: [{id, name: 'Bulbasaur', repairable: true, locked: false, favorite: false}], history: [{correction: {type: 'quantity', id: 'coins', before: 1, after: 2}, actor: 'Fixture staff', reason: 'Fixture history'}]};
        });
        await app.open(trainerId);
      });
      if (kind === 'history') {
        await page.click('[data-section=history]');
        await page.click('[data-correction-load]');
        await page.waitForFunction(() => document.activeElement.matches('[data-history-heading]'));
        assert.equal(await page.$$eval('.correction-history article', rows => rows.length), 1);
        assert.equal(await page.evaluate(() => writes), 0);
        console.log('PASS populated history reload retains history and restores heading focus');
        await page.close();
        continue;
      }
      if (kind === 'balance') {
        await page.click('[data-value-id]');
        await page.focus('[name=value]');
        await page.keyboard.press('ArrowUp');
      } else if (kind === 'hold') {
        await page.click('[data-section=tradeHolds]');
        await page.click('[data-hold-choice]');
      } else if (kind === 'quantity') {
        await page.click('[data-section=addPokemon]');
        await page.select('[name=addChoice]', 'pokemon:1');
        await page.type('[name=addTotal]', '2');
      } else {
        await page.click('[data-section=pokemon]');
        await page.click('[name=specimen]');
      }
      await page.type('[name=reason]', 'Fictional draft to discard');
      const discard = {balance: '[data-discard]', hold: '[data-discard-hold]', quantity: '[data-discard-add]', removal: '[data-discard-removal]'}[kind];
      await page.click(discard);
      const expected = {balance: '[name=value]', hold: '[name=reason]', quantity: '[name=addTotal]', removal: '[data-mon-search]'}[kind];
      assert.equal(await page.evaluate(selector => document.activeElement === document.querySelector(selector), expected), true);
      assert.equal(await page.evaluate(() => app.canLeave()), true);
      assert.equal(await page.evaluate(() => writes), 0);
      console.log(`PASS ${kind} discard restores editing focus, clears the draft and sends nothing`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
