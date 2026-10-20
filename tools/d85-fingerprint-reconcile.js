// Read-only snapshot reconciliation. No database connection or gameplay execution.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const hash=(kind,s)=>crypto.createHash(kind).update(s,'utf8').digest('hex');
const snapshot=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/d85-current-function-catalog.json'),'utf8'));
const migration=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/d85-d55-installed-migration.json'),'utf8'));
const expected={spend_bag_item:'5419a99d0c1735f44564b84338e32578',announce_throws:'0cd4a8e2a647ba388ce19b14b6f5a8c4',capture_chance:'8fa515e574a89165c0adf11339ed73ba'};
function body(source,name){const start=new RegExp('create\\s+(?:or\\s+replace\\s+)?function\\s+private\\.'+name+'\\s*\\(', 'i').exec(source);assert(start,'Missing function '+name);const tail=source.slice(start.index);const m=/\bas\s+(\$\w*\$)([\s\S]*?)\1/i.exec(tail);assert(m,'Missing dollar body');return m[2];}
assert.equal(snapshot.functions.length,3);const names=new Set();let count=0;
for(const f of snapshot.functions){assert(expected[f.name]);assert(!names.has(f.name));names.add(f.name);assert.equal(hash('md5',f.definition),expected[f.name]);assert.equal(f.definition_md5,expected[f.name]);assert.equal(hash('sha256',f.definition),f.definition_sha256);const liveBody=body(f.definition,f.name);assert.equal(hash('md5',liveBody),f.body_md5);
 const file=f.name==='capture_chance'?'supabase/migrations/20260913033000_capture_service.sql':'supabase/unapplied/d55-economy/001_spend_rules.sql';const source=fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');assert.equal(body(source,f.name),liveBody);
 if(f.name!=='capture_chance')assert.equal(body(migration[0].statements.join('\n'),f.name),liveBody);
 assert.notEqual(f.body_md5,expected[f.name]);count++;console.log('PASS '+f.name+': historical hash equals full definition; body matches repository'+(f.name==='capture_chance'?'':' and installed migration'));}
console.log(count+' reconciled definitions; snapshot evidence only, no hosted calls or gameplay');
