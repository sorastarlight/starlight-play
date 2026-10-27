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
assert(!render({dailySupplyReady:true}).includes('claim-supply'));
assert(!render({dailySupplyReady:true}).includes('Daily Trainer supply'));
const checked = render({}, { active: true, source: 'twitch-sub', checkedAt: '2026-10-22T12:00:00Z' });
assert.equal((checked.match(/Last checked|Checked /g) || []).length, 1, 'duplicate check timestamp');
const off = render({}, { active: false });
assert(off.includes('Starlight Pass is inactive.'));
assert(off.includes('id="claim-daily" class="pass-claim-btn" type="button" disabled'));
assert(off.includes('id="claim-weekly" class="pass-claim-btn is-weekly" type="button" disabled'));
console.log('9 LOCAL actual Mart presentation scenarios passed; no claims or RPCs');


const utcUnverified=render({calendar:'UTC',dailyReady:false,weeklyReady:false});assert(utcUnverified.includes('Verify Pass'));assert(utcUnverified.includes('Check your subscription to unlock these supplies.'));
const utcClaimed=render({calendar:'UTC',dailyReady:false,weeklyReady:false,passDailyVerified:true,passWeeklyVerified:true,passDailyDelivered:true,passWeeklyDelivered:true,passWeeklyNextAt:'2026-11-02T00:00:00Z'});assert(utcClaimed.includes('>Claimed</button>'));assert(utcClaimed.includes('Times are local to your device'));assert(utcClaimed.includes('storage.html#items'));
console.log('UTC verified, unverified and claimed presentation checks passed');
