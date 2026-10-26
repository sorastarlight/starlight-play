const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/store.js'), 'utf8');
function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert(start >= 0, `${name} missing`);
  const next = source.indexOf('\n  function ', start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}
const context = {
  window: { playDailyStreakHtml: () => '<p>Seven-day track</p>', playItemSprite: () => 'images/items/poke-ball.png', playItemLabel: value => value },
  esc: value => String(value ?? ''), lastLinkedLogin: ''
};
vm.createContext(context);
vm.runInContext(['describePass', 'dailyBonusLine', 'passSupplyTiming', 'passFloor'].map(extract).join('\n'), context);
const render = (wallet, pass = { active: true }) => context.passFloor({ name: 'Starlight Pass' }, pass, wallet);
const supplyButton = html => html.match(/<button id="claim-supply"([^>]*)>([^<]*)<\/button>/).slice(1);
for (const [wallet, label, disabled] of [
  [{ dailySupplyReady: true, dailyClaimed: false }, 'Claim Supply', false],
  [{ dailySupplyReady: false, dailyClaimed: false }, 'On cooldown', true],
  [{ dailySupplyReady: false, dailyClaimed: true }, 'Claimed', true],
  [{ dailySupplyReady: true, dailyClaimed: true }, 'Claimed', true],
  [{}, 'Claim Supply', false],
  [null, 'Claim Supply', false]
]) {
  const [attributes, text] = supplyButton(render(wallet));
  assert.equal(text, label);
  assert.equal(/disabled/.test(attributes), disabled);
}
const cooldown = render({ dailySupplyReady: false, dailyClaimed: false });
assert(cooldown.includes('not ready yet'));
assert(cooldown.includes('>Cooldown</span>'));
assert(!cooldown.includes('>Claimed</button>'));
const checked = render({}, { active: true, source: 'twitch-sub', checkedAt: '2026-10-22T12:00:00Z' });
assert.equal((checked.match(/Last checked|Checked /g) || []).length, 1, 'duplicate check timestamp');
const off = render({}, { active: false });
assert(off.includes('Starlight Pass is inactive.'));
assert(off.includes('id="claim-daily" class="pass-claim-btn" type="button" disabled'));
assert(off.includes('id="claim-weekly" class="pass-claim-btn is-weekly" type="button" disabled'));
console.log('9 LOCAL actual Mart presentation scenarios passed; no claims or RPCs');

