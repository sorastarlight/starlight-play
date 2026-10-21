/* Current-ruleset replacements, generated locally. No network/apply helper. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),e=path.join(root,'docs/project-command-center/evidence');
const read=f=>JSON.parse(fs.readFileSync(path.join(e,f),'utf8'));
const all=[...read('legacy-fallback-function-baseline.json')[0].audit.functions,...read('legacy-fallback-callers.json')[0].functions,...read('legacy-catch-update-callers.json')[0].functions,...read('legacy-fallback-extra-baseline.json')];
const find=(name,schema='private')=>all.find(f=>f.name===name&&f.schema===schema);
const hash=d=>crypto.createHash('md5').update(d.split('$function$')[1]).digest('hex');
const body=(d,content)=>d.slice(0,d.indexOf('$function$')+10)+'\n'+content+'\n$function$\n';
const changes=[];
function change(name,schema,fn){const b=find(name,schema);assert(b,name);const before=b.body_md5||b.md5;assert.equal(hash(b.definition),before);const definition=fn(b.definition);assert.notEqual(definition,b.definition);changes.push({...b,before,after:hash(definition),replacement:definition});}
change('materialize_streamlink_catch','private',d=>body(d,`begin
 return private.persist_streamlink_catch(p_user_id,p_form_id,p_level,p_ctx,p_source_key,p_ball,p_round_id,p_shiny,p_content_build,p_hidden_ticket,p_variant,p_name,p_gender);
end;`));
change('persist_streamlink_catch','private',d=>d.replace("jsonb_build_array('wire-disabled'), 'path', 'stamp'","jsonb_build_array('wire-disabled'), 'path', 'wire'"));
change('record_stream_catch','private',d=>body(d,`begin
 -- Legacy bridge results are not current-ruleset specimen authority.
 return false;
end;`));
change('bridge_import_catches','public',d=>body(d,`begin
 if not private.bridge_ok(p_token) then raise exception 'not allowed' using errcode='42501';end if;
 return jsonb_build_object('ok',false,'imported',0,'error','legacy-catch-import-retired','message','Catch imports have retired. Use Play for catches and Trainer Gifts for staff grants.');
end;`));
change('bridge_publish','public',d=>{const start=d.indexOf('  if v_resolved then\n    for rec');assert(start>0);const end=d.indexOf("  return jsonb_build_object('ok', true, 'id', round_id);",start);assert(end>start);return d.slice(0,start)+"  -- Keep status/round publishing; external catch result imports are retired.\n"+d.slice(end).replace("'id', round_id)","'id', round_id, 'catchImportsRetired', true)");});
change('admin_grant_pokemon','public',d=>body(d,`begin
 perform private.require_staff_edit();
 raise exception 'This grant tool has retired. Open the Trainer record and use Gifts.';
end;`));
change('admin_oak_qa','public',d=>{const pattern=/(  (?:if|elsif) action = '([^']+)' then\n)([\s\S]*?)(?=\n  elsif action = |\n  else\n)/g;let n=0;d=d.replace(pattern,(whole,head,label,branch)=>{if(!/insert into public.catches/.test(branch))return whole;n++;return head+"    raise exception 'This Pokémon preset has retired. Open the Trainer record and use Gifts.';\n";});assert.equal(n,3);assert(!/insert into public.catches/.test(d));return d;});
for(const name of ['phase2_evolution_selftest','phase4_catch_candy_selftest'])change(name,'private',d=>body(d,`begin
 raise exception 'This legacy specimen self-test has retired. Use the isolated current-ruleset rehearsal.';
end;`));
change('launch_community_round','private',d=>d.replace('begin\n  r :=',`begin
  if not private.streamlink_wire_is_enabled() then
    raise exception 'Catch generation is temporarily unavailable. Please try again later.';
  end if;
  r :=`));
change('stamp_catch_row','private',d=>body(d,`declare
 seed bigint;size_roll int;trainer public.profiles%rowtype;generated_moves text[];move_count int;
begin
 if c.ruleset_id is distinct from 'streamlink-gen9-xgen' or nullif(c.content_build,'') is null then
  raise exception 'This Pokémon creation method is no longer supported. Use Play or Trainer Gifts.' using errcode='22023';
 end if;
 if c.level is null or c.pokemon_form_id is null or c.nature_id is null or c.ability_id is null or c.ability_slot is null
 or c.iv_hp is null or c.iv_atk is null or c.iv_def is null or c.iv_spa is null or c.iv_spd is null or c.iv_spe is null
 or c.ev_hp is null or c.ev_atk is null or c.ev_def is null or c.ev_spa is null or c.ev_spd is null or c.ev_spe is null
 or c.hp_max is null or c.hp_current is null or c.height_m is null or c.weight_kg is null or c.friendship is null
 or c.gender is null or jsonb_typeof(c.move_slots) is distinct from 'array' then
  raise exception 'This Pokémon battle record is incomplete. Contact support.' using errcode='22023';
 end if;
 if not exists(select 1 from private.ref_forms f where f.content_build=c.content_build and f.form_id=c.pokemon_form_id and f.dex=c.dex) then
  raise exception 'This Pokémon form record is unavailable. Contact support.' using errcode='22023';
 end if;
 if c.public_id is null or btrim(c.public_id)='' then c.public_id:=private.streamlink_next_public_id('SL');end if;
 seed:=abs((('x'||substr(md5(c.id::text),1,8))::bit(32)::int)::bigint);
 if c.size_class is null or c.size_class not in('XS','S','M','L','XL') then
  size_roll:=seed%256;c.size_class:=case when size_roll<12 then 'XS' when size_roll<72 then 'S' when size_roll<184 then 'M' when size_roll<244 then 'L' else 'XL' end;
 end if;
 if c.moves is null or cardinality(c.moves)=0 then
  select array_agg(initcap(replace(m.slug,'-',' ')) order by x.ord),count(m.move_id) into generated_moves,move_count
  from jsonb_array_elements(c.move_slots) with ordinality x(slot,ord)
  left join private.ref_moves m on m.content_build=c.content_build and m.move_id::text=x.slot->>'moveId';
  if move_count<1 or move_count<>jsonb_array_length(c.move_slots) then raise exception 'This Pokémon move record is unavailable. Contact support.' using errcode='22023';end if;
  c.moves:=generated_moves;
 end if;
 -- Preserve generated IVs, EVs, gender, dimensions, friendship and learned moves.
 if c.met_level is null then c.met_level:=c.level;end if;
 if c.met_location is null or btrim(c.met_location)='' then c.met_location:=private.lgpe_habitat(c.dex);end if;
 if c.ot_user_id is null then c.ot_user_id:=c.user_id;end if;
 if c.ot_name is null or btrim(c.ot_name)='' or c.ot_number is null then
  select * into trainer from public.profiles where id=coalesce(c.ot_user_id,c.user_id);
  if c.ot_name is null or btrim(c.ot_name)='' then c.ot_name:=coalesce(nullif(btrim(trainer.display_name),''),nullif(trainer.twitch_login,''),'Trainer');end if;
  if c.ot_number is null and trainer.id is not null then c.ot_number:=10000+(abs(hashtext(trainer.id::text)::bigint)%90000);end if;
 end if;
 return c;
end;`));
change('evolve_catch','private',d=>{
 d=d.replace('  c public.catches;',`  c public.catches;
  source_form private.ref_forms;target_form private.ref_forms;target_count int;normal_count int;
  target_ability int;target_slot text;new_hp int;new_current int;`);
 d=d.replace("  if rule.id is null or rule.from_dex <> c.dex then", "  if rule.id is null then");
 d=d.replace("if p_idem is not null and exists (select 1 from public.evolution_log e where e.catch_id = c.id and e.to_dex = rule.to_dex)","if p_idem is not null and c.dex=rule.to_dex and exists (select 1 from public.evolution_log e where e.catch_id=c.id and e.from_dex=rule.from_dex and e.to_dex=rule.to_dex)");
 const marker="  trade_path := rule.condition_type = 'TRADE_OR_ITEM' and c.trade_evo_ready;";
 assert(d.includes(marker));d=d.replace(marker,`  if rule.from_dex<>c.dex then raise exception 'That evolution is not available.';end if;
  if c.ruleset_id is distinct from 'streamlink-gen9-xgen' or c.content_build is null then raise exception 'This Pokémon needs a supported battle record before evolution.';end if;
  select * into source_form from private.ref_forms where content_build=c.content_build and form_id=c.pokemon_form_id and dex=c.dex;
  if source_form.form_id is null or source_form.kind not in('base','regional') then raise exception 'This Pokémon form cannot evolve through this route.';end if;
  select count(*) into target_count from private.ref_forms where content_build=c.content_build and dex=rule.to_dex and form_key=source_form.form_key and kind=source_form.kind and mapping_status='ok';
  if target_count<>1 then raise exception 'That evolution form is not available. No candy or items were spent.';end if;
  select * into target_form from private.ref_forms where content_build=c.content_build and dex=rule.to_dex and form_key=source_form.form_key and kind=source_form.kind and mapping_status='ok';
  if private.streamlink_form_blocked(c.content_build,target_form.form_id) or not private.streamlink_obtain_ok(c.content_build,'evolve',target_form.form_id) then raise exception 'That evolution form is not available.';end if;
  if c.ability_slot not in('1','2') or c.ability_slot is null then raise exception 'This ability inheritance is not supported yet. No candy or items were spent.';end if;
  if not exists(select 1 from private.ref_form_abilities where content_build=c.content_build and form_id=c.pokemon_form_id and slot=c.ability_slot and ability_id=c.ability_id) then raise exception 'This Pokémon ability record needs support review.';end if;
  target_slot:=c.ability_slot;
  select ability_id into target_ability from private.ref_form_abilities where content_build=c.content_build and form_id=target_form.form_id and slot=target_slot and not is_hidden;
  if target_ability is null then
   select count(*) into normal_count from private.ref_form_abilities where content_build=c.content_build and form_id=target_form.form_id and not is_hidden;
   if target_slot='2' and normal_count=1 then target_slot:='1';select ability_id into target_ability from private.ref_form_abilities where content_build=c.content_build and form_id=target_form.form_id and slot='1' and not is_hidden;end if;
  end if;
  if target_ability is null then raise exception 'That evolution ability mapping is unavailable. No candy or items were spent.';end if;
  if c.level is null or c.iv_hp is null or c.ev_hp is null or c.hp_current is null or c.hp_max is null or c.hp_current<0 or c.hp_current>c.hp_max
     or not exists(select 1 from private.ref_natures where content_build=c.content_build and id=c.nature_id)
     or c.hp_max is distinct from private.streamlink_hp_max(source_form.hp,c.iv_hp,c.ev_hp,c.level) then raise exception 'This Pokémon battle record needs support review before evolution.';end if;
  new_hp:=private.streamlink_hp_max(target_form.hp,c.iv_hp,c.ev_hp,c.level);
  if new_hp is null or target_form.height_m is null or target_form.weight_kg is null then raise exception 'That evolution reference is incomplete.';end if;
  new_current:=case when c.hp_current=0 then 0 else greatest(1,least(new_hp,c.hp_current+new_hp-c.hp_max)) end;
${marker}`);
 d=d.replace('  new_name := coalesce(dest.name, c.name);',"  new_name := private.form_display_name(rule.to_dex,target_form.form_id);");
 d=d.replace('     set dex = rule.to_dex,',`     set dex = rule.to_dex,
         pokemon_form_id=target_form.form_id,ability_id=target_ability,ability_slot=target_slot,
         hp_max=new_hp,hp_current=new_current,height_m=target_form.height_m,weight_kg=target_form.weight_kg,`);
 assert(d.includes('pokemon_form_id=target_form.form_id'));return d;
});
function sig(f){return `${f.schema}.${f.name}(${f.args.split(',').filter(Boolean).map(a=>a.trim().replace(/^\w+\s+/, '')).join(',')})`;}
function guard(reverse){return 'do $guard$ begin\n'+changes.map(f=>` if (select md5(prosrc) from pg_proc where oid='${sig(f)}'::regprocedure) is distinct from '${reverse?f.after:f.before}' then raise exception 'Runtime source drift: ${f.name}';end if;`).join('\n')+'\nend $guard$;\n';}
function generate(){const folder=path.join(root,'supabase/unapplied/legacy-runtime-retirement');fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(path.join(folder,'INSTALL.sql'),"-- Current-ruleset routing and approved legacy writer retirement. No specimen mutation.\nbegin;set local lock_timeout='5s';set local statement_timeout='30s';\n"+guard(false)+changes.map(f=>f.replacement+';').join('\n')+'\ncommit;\n');
 fs.writeFileSync(path.join(folder,'ROLLBACK.sql'),'-- Exact source rollback; reviewed recovery only.\nbegin;\n'+guard(true)+changes.slice().reverse().map(f=>f.definition+';').join('\n')+'\ncommit;\n');
 fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(changes.map(f=>({name:f.name,schema:f.schema,signature:sig(f),before:f.before,after:f.after})),null,2)+'\n');console.log(changes.length+' current-ruleset replacements prepared locally.');}
if(require.main===module)generate();module.exports={changes,generate};
