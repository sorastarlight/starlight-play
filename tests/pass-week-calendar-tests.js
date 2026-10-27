const assert=require('node:assert/strict'),calendar=require('../js/pass-calendar');
const days=['claimed','missed','ready','unverified','upcoming','upcoming','upcoming'].map((state,i)=>({state,start:new Date(Date.UTC(2026,9,26+i)).toISOString(),today:i===2}));
const html=calendar.html({passDays:days},true);
assert.equal((html.match(/<li /g)||[]).length,7);assert.equal((html.match(/id="claim-daily"/g)||[]).length,1);assert.equal((html.match(/data-pass-missed/g)||[]).length,1);
assert(html.includes('Claimed'));assert(html.includes('Unclaimed'));assert(html.includes('Soon~'));assert(html.includes('aria-current="date"'));
assert(!calendar.html({passDays:days},false).includes('id="claim-daily"'));assert(calendar.html({passDays:days},false).includes('data-pass-missed'));
assert(calendar.html({},true).includes('history is unavailable'));assert(!calendar.html({},true).includes('data-pass-missed'));
assert(!calendar.html({passDays:days.map(d=>({...d,state:'<script>bad</script>',start:'invalid'}))},true).includes('<script>'));
console.log('Calendar rendering: seven days, claimed/missed/unverified/upcoming, lapse, missing history and invalid input pass');

for(const bad of [Array(7).fill(null),Array(7).fill(undefined),Array(7),Array(7).fill("ready"),Array(7).fill([])]){const output=calendar.html({passDays:bad},true);assert(output.includes("history is unavailable"));assert(!output.includes("claim-daily"));assert(!output.includes("data-pass-missed"));}
console.log("Malformed/sparse day records fail closed without blocking the Mart render");
const preview=calendar.html({passDays:days.map(d=>({...d,reward:{name:'Moon Ball',sprite:'images/items/moon-ball.png'}}))},true);
assert.equal((preview.match(/class="calendar-day-preview"/g)||[]).length,7);assert(preview.includes('Moon Ball'));assert(preview.includes('Preview Monday'));
const badSprite=calendar.html({passDays:days.map(d=>({...d,reward:{name:'<script>bad</script>',sprite:'javascript:alert(1)'}}))},true);assert(!badSprite.includes('javascript:'));assert(!badSprite.includes('<script>'));
const oak=calendar.html({oakDays:days},true,{scope:'oak'});assert(oak.includes('Day 7'));assert(oak.includes('Collected'));assert(!oak.includes('data-pass-missed'));assert(!oak.includes('claim-daily'));
console.log('Pass item previews escape text/reject unsafe sprites; Oak calendar uses consecutive days without Pass actions');
