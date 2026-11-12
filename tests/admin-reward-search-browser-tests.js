// Real Firefox keyboard checks with fictional catalogs and no hosted transport.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({browser: 'firefox', headless: true});
  try {
    for (const kind of ['item', 'pokemon', 'candy']) {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', request => request.abort());
      await page.setContent('<main id="editor"><div data-trainer-rewards></div></main>');
      await page.addScriptTag({content: fs.readFileSync(path.join(__dirname, '../js/admin-next-rewards.js'), 'utf8')});
      await page.evaluate(async kind => {
        window.writes = 0;
        window.PLAY_SPECIES = ['Bulbasaur', 'Ivysaur'];
        await PLAY_ADMIN_REWARDS.mount(document.querySelector('#editor'), {id: 'fixture-trainer'}, 'gifts', {
          read: async () => ({canWrite: true, catalog: {items: [{id: 'pokeball', name: 'Poké Ball'}]}, actions: []}),
          write: async () => { window.writes++; throw Error('No gift is permitted in this fixture'); }
        });
        if (kind !== 'item') {
          const choice = document.querySelector('[name=gift_kind]');
          choice.value = kind;
          choice.dispatchEvent(new Event('change', {bubbles: true}));
        }
      }, kind);
      const search = kind === 'item' ? '[data-gift-search]' : '[data-species-search]';
      const count = kind === 'item' ? '[data-choice-count]' : '[data-picker-count]';
      for (const query of ['zzzz', kind === 'item' ? 'Ball' : 'Bulbasaur']) {
        await page.focus(search);
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        await page.keyboard.type(query);
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => document.activeElement.getAttribute('role')), 'status');
        assert.match(await page.$eval(count, node => node.getAttribute('aria-label')), query === 'zzzz' ? /No matching|0 / : /1/);
        assert.equal(await page.$('dialog .reward-review-form'), null, 'Search must not open a gift review');
      }
      if (kind === 'item') {
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.name), 'key', 'Results should lead to the item choice');
      }
      assert.equal(await page.evaluate(() => writes), 0);
      console.log(`PASS ${kind} Enter search summary, focus and zero submissions`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
