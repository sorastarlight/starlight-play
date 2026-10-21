/* Generates reviewed candidates only; never connects to a database. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),base=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/legacy-retirement-function-baseline.json'))),dir=path.join(root,'supabase/unapplied/legacy-retirement');fs.mkdirSync(dir,{recursive:true});
const hash=d=>crypto.createHash('md5').update(d.split('$function$')[1]).digest('hex');
const changes=[];
for(const x of base){let d=x.definition;assert.equal(hash(d),x.body_md5);
 if(x.name==='catch_json'){
  d=d.replace('  spec public.lgpe_species;\n','');
  d=d.replace(/  select \* into spec from public\.lgpe_species[^\n]*\n/,'');
  d=d.replace(/^  st_\w+ := private\.lgpe_stat[^\n]*\n/gm,'');
  d=d.replace("    'types', coalesce(spec.types, '{}'::text[]),","    'types', coalesce(gen_form.types, '{}'::text[]),");
  d=d.replace(/^    'avs', [^\n]*\n/gm,'').replace(/^    'cp', [^\n]*\n/gm,'');
  d=d.replace('  payload := jsonb_build_object(',"  select * into gen_form from private.ref_forms where content_build=case when c.ruleset_id='streamlink-gen9-xgen' then c.content_build else 'sl-ref-20261013-227b573' end and form_id=case when c.ruleset_id='streamlink-gen9-xgen' then c.pokemon_form_id else fid end and dex=c.dex;\n  payload := jsonb_build_object(");
  d=d.replace('  -- Legacy payload/CP and all non-stat fields retain their existing behavior.','  -- Unpinned old specimens have no invented modern battle stats.');
  assert(!/lgpe|av_hp|'cp'|'avs'/.test(d));
 }else if(x.name==='admin_catch_battle_json')d=d.replace(/^ 'avs', [^\n]*\n/gm,'');
 else if(x.name==='persist_staff_gift'||x.name==='persist_streamlink_catch'){
  d=d.replace(/      av_hp, av_atk, av_def, av_spa, av_spd, av_spe,\r?\n/,'');
  d=d.replace(/      0, 0, 0, 0, 0, 0,\r?\n      legacy,/, '      legacy,');
  assert(!/av_hp/.test(d));
 }else if(x.name==='stamp_catch_row')d=d.replace(/^  if c\.av_\w+ is null then c\.av_\w+ := 0; end if;\n/gm,'');
 else continue;
 assert.notEqual(d,x.definition);changes.push({...x,replacement:d,after_md5:hash(d)});
}
assert.equal(changes.length,5);
const guard=(reverse=false)=>'do $guard$ begin\n'+changes.map(x=>` if (select md5(prosrc) from pg_proc where oid='${x.schema}.${x.name}(${x.args.replace(/\b\w+ (?=(?:uuid|integer|text|boolean|catches))/g,'')})'::regprocedure) is distinct from '${reverse?x.after_md5:x.body_md5}' then raise exception 'Source drift: ${x.name}'; end if;`).join('\n')+'\nend $guard$;\n';
fs.writeFileSync(path.join(dir,'INSTALL.sql'),'-- CANDIDATE ONLY. No specimen deletion, schema drop, grant or activation.\nbegin;\n'+guard()+changes.map(x=>x.replacement+';').join('\n')+'\ncommit;\n');
fs.writeFileSync(path.join(dir,'ROLLBACK.sql'),'-- Guarded exact function rollback; no specimen mutation.\nbegin;\n'+guard(true)+changes.map(x=>x.definition+';').join('\n')+'\ncommit;\n');
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(changes.map(({schema,name,args,body_md5,after_md5})=>({schema,name,args,before:body_md5,after:after_md5})),null,2)+'\n');
console.log('Prepared five-function CP/AV retirement candidate; SQL NOT applied.');
