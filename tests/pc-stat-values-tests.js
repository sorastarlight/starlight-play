const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../js/storage.js'),'utf8');
const fn=source.slice(source.indexOf('  function statRows(mon) {'),source.indexOf('\n  function renderDetail(mon) {'));
const statRows=vm.runInNewContext('('+fn.trim()+')');
const valid=statRows({stats:{hp:22,atk:8,def:9,spa:7,spd:6,spe:11}});assert(valid.includes('<strong>22</strong>'));assert(!valid.includes('Stat unavailable'));
const missing=statRows({stats:{hp:null,atk:0,def:undefined,spa:'',spd:'bad',spe:12}});assert.equal((missing.match(/title="Stat unavailable"/g)||[]).length,4);assert(missing.includes('<strong>0</strong>'));assert(missing.includes('<strong>12</strong>'));assert(missing.includes('aria-label="HP unavailable">—'));
assert.equal((statRows({}).match(/title="Stat unavailable"/g)||[]).length,6);
console.log('3 LOCAL HARNESS checks passed: actual stat renderer preserves known/zero values and marks missing data unavailable');
