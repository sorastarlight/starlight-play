/* Source preflight, not a SQL security parser or a replacement for role/RLS tests. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const digest=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
function statements(sql){
 // Ignore comments and stored routine/string bodies; dynamic DDL requires manual review.
 return sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|\$([a-z_][a-z_0-9]*)?\$[\s\S]*?\$\1\$/gi,' ').toLowerCase().split(';');
}
function inspect(sql){
 const parts=statements(sql),errors=[];
 for(const s of parts){
  const m=s.match(/\bcreate\s+(?:(?:unlogged|temporary|temp)\s+)?table\s+(?:if\s+not\s+exists\s+)?((?:"?[a-z_][a-z_0-9]*"?\s*\.\s*)?"?[a-z_][a-z_0-9]*"?)/);
  if(!m||/\bcreate\s+(?:temporary|temp)\s+table/.test(s))continue;
  const name=m[1].replace(/["\s]/g,'');
  if(!name.includes('.')){errors.push(name+': schema-qualify table creation and declare its access');continue;}
  if(!name.startsWith('public.'))continue;
  const relation=name.replace('.','\\s*\\.\\s*'),on=new RegExp('\\bon\\s+(?:table\\s+)?'+relation+'(?=\\s|,|$)');
  const access=parts.filter(p=>/^\s*(grant|revoke)\b/.test(p)&&on.test(p.replace(/"/g,'')));
  const reset=access.some(p=>/^\s*revoke\s+all(?:\s+privileges)?\s+on/.test(p)&&/\bfrom\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role\s*$/.test(p));
  if(!reset)errors.push(name+': explicitly revoke all from PUBLIC, anon, authenticated, service_role before scoped grants');
  const grants=access.filter(p=>/^\s*grant\b/.test(p));
  if(grants.some(p=>/\bto\s+(?:[^;]*,\s*)?public\s*(?:,|$)/.test(p)))errors.push(name+': do not grant table access to PUBLIC');
  const player=grants.some(p=>/\bto\b[\s\S]*\b(anon|authenticated)\b/.test(p));
  if(player&&!parts.some(p=>new RegExp('\\balter\\s+table\\s+(?:if\\s+exists\\s+)?'+relation+'\\s+enable\\s+row\\s+level\\s+security').test(p.replace(/"/g,''))))errors.push(name+': player grants require RLS in the same file');
 }
 return errors;
}
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):e.name.endsWith('.sql')?[path.join(dir,e.name)]:[]);}
function check(){
 const historical=JSON.parse(fs.readFileSync(path.join(root,'supabase/table-access-history.json'),'utf8')),errors=[];let reviewed=0,unchanged=0;
 for(const file of files(path.join(root,'supabase'))){const rel=path.relative(root,file).replace(/\\/g,'/'),sql=fs.readFileSync(file,'utf8');if(historical.files[rel]===digest(sql)){unchanged++;continue;}reviewed++;errors.push(...inspect(sql).map(x=>rel+': '+x));}
 return {errors,reviewed,unchanged};
}
if(require.main===module){const r=check();if(r.errors.length){console.error(r.errors.join('\n'));process.exitCode=1;}else console.log(`TABLE ACCESS PREFLIGHT PASS: ${r.reviewed} new/changed SQL files; ${r.unchanged} unchanged historical snapshots`);}
module.exports={inspect,check,digest,files};
