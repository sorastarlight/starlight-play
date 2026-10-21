/* Local packet generation only. No database connection. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'supabase/unapplied/wire-stat-formatter');fs.mkdirSync(folder,{recursive:true});
const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/wire-catch-json-formatter-baseline.json')))[0];
const hash=def=>crypto.createHash('md5').update(def.split('$function$')[1]).digest('hex');assert.equal(hash(baseline.definition),baseline.body_md5);
let replacement=baseline.definition.replace('  fid int;','  payload jsonb;\n  gen_form private.ref_forms;\n  gen_nature private.ref_natures;\n  fid int;').replace('  return jsonb_build_object(','  payload := jsonb_build_object(');
const genStats=['atk','def','spa','spd','spe'].map(key=>`      '${key}', private.streamlink_stat(gen_form.${key}, c.iv_${key}, c.ev_${key}, c.level, case when gen_nature.id is null then null when gen_nature.up_stat='${key}' then 1.1 when gen_nature.down_stat='${key}' then 0.9 else 1 end)`).join(',\n');
const tail=`  );
  -- Use the stored WIRE ruleset and its immutable reference pin for display.
  -- Legacy payload/CP and all non-stat fields retain their existing behavior.
  if c.ruleset_id = 'streamlink-gen9-xgen' then
    select * into gen_form from private.ref_forms where content_build=c.content_build and form_id=c.pokemon_form_id and dex=c.dex;
    select * into gen_nature from private.ref_natures where content_build=c.content_build and id=c.nature_id;
    payload := payload || jsonb_build_object('stats', jsonb_build_object(
      'hp', c.hp_max,
${genStats}
    ));
  end if;
  return payload;
end;
$function$`;
assert(replacement.includes('  );\nend;\n$function$'));replacement=replacement.replace('  );\nend;\n$function$',tail);
assert.notEqual(replacement,baseline.definition);const newHash=hash(replacement);
fs.writeFileSync(path.join(folder,'INSTALL.sql'),`-- UNAPPLIED read formatter correction only; no catch update, grant or generation change.\nbegin;\ndo $guard$ begin\n if (select md5(prosrc) from pg_proc where oid='private.catch_json(public.catches)'::regprocedure) is distinct from '${baseline.body_md5}' then raise exception 'Catch formatter drift'; end if;\n if (select md5(prosrc) from pg_proc where oid='private.streamlink_stat(integer,integer,integer,integer,numeric)'::regprocedure) is distinct from '2f2c6b077f6afb56811c099311fd68cf' then raise exception 'Stat helper drift'; end if;\nend $guard$;\n${replacement};\ncommit;\n`);
fs.writeFileSync(path.join(folder,'ROLLBACK.sql'),`-- Restores old display mismatch; review before use.\nbegin;\ndo $guard$ begin\n if (select md5(prosrc) from pg_proc where oid='private.catch_json(public.catches)'::regprocedure) is distinct from '${newHash}' then raise exception 'Rollback source drift'; end if;\nend $guard$;\n${baseline.definition};\ncommit;\n`);
fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify({before:baseline.body_md5,after:newHash,scope:'Only stats for streamlink-gen9-xgen; HP stored, other stats existing server helper/pinned form/nature. CP and other fields unchanged.'},null,2)+'\n');console.log('Prepared unapplied formatter '+newHash);
