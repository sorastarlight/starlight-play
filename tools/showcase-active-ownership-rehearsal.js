// Captured hosted functions; disposable localhost database and fictional trainers only.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');const {refuseHosted}=require('./a19-schema-rehearsal');
async function main(){
 refuseHosted();const root=path.resolve(__dirname,'..'),folder=path.join(root,'supabase/unapplied/showcase-active-ownership');
 const base=JSON.parse(fs.readFileSync(path.join(folder,'baseline.json')));
 const md5=s=>crypto.createHash('md5').update(s).digest('hex');
 const body=s=>s.split('AS $function$')[1].split('$function$')[0];
 const patched=base.map(x=>({...x,definition:x.definition.includes('FUNCTION public.play_save_trainer_id(')
   ?x.definition.replace("c.id = shiny_id and c.variant like '%shiny%'","c.id = shiny_id and c.transferred_at is null and c.variant like '%shiny%'")
   :x.definition.replace('c.user_id = p_uid and c.id = p_id','c.user_id = p_uid and c.id = p_id and c.transferred_at is null')}));
 for(let i=0;i<base.length;i++)assert.notEqual(base[i].definition,patched[i].definition);
 const literal=v=>"'"+v.replaceAll("'","''")+"'";
 const guard=rows=>'DO $guard$ BEGIN\n'+rows.map(x=>{
  const sig=x.signature.startsWith('private.')?x.signature:'public.'+x.signature;
  const config=x.proconfig===null?'proconfig is null':'proconfig=ARRAY['+x.proconfig.map(literal).join(',')+']';
  const acl=x.acl===null?'proacl is null':'proacl::text='+literal(x.acl);
  return `IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=${literal(sig)}::regprocedure AND md5(prosrc)=${literal(md5(body(x.definition)))} AND ${acl} AND ${config} AND prosecdef=${x.security_definer} AND provolatile=${literal(x.volatility)} AND pg_get_userbyid(proowner)='postgres') THEN RAISE EXCEPTION 'Showcase source or privilege drift'; END IF;`;
 }).join('\n')+'\nEND $guard$;\n';
 const packet=(from,to)=>'BEGIN;\n'+guard(from)+to.map(x=>x.definition+';').join('\n')+'\nCOMMIT;\n';
 const install=packet(base,patched),rollback=packet(patched,base);
 fs.writeFileSync(path.join(folder,'INSTALL.sql'),install);fs.writeFileSync(path.join(folder,'ROLLBACK.sql'),rollback);
 const cache=path.join(__dirname,'.cache/d54-pg-harness');
 const Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const cluster=new Embedded({databaseDir:fs.mkdtempSync(path.join(cache,'showcase-')),user:'postgres',password:'fictional-only',port:55483,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});
 const A='aaaaaaaa-0057-4057-8057-000000000001',B='bbbbbbbb-0057-4057-8057-000000000001',X='aaaaaaaa-0057-4057-8057-000000000002',Y='bbbbbbbb-0057-4057-8057-000000000002',Z='cccccccc-0057-4057-8057-000000000002';
 let db;const checks=[],pass=s=>{checks.push(s);console.log('PASS '+s);};
 try{
  await cluster.initialise();await cluster.start();db=cluster.getPgClient('postgres','127.0.0.1');await db.connect();assert.equal((await db.query('select host(inet_server_addr()) h')).rows[0].h,'127.0.0.1');
  await db.query(`create schema private;create schema auth;create role anon;create role authenticated;create role service_role;
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('fixture.uid',true),'')::uuid$$;
   create table profiles(id uuid primary key,xp int,trainer_sprite text,card_bg text,card_frame text,team_bg text,active_title_id text,trainer_title text,featured_badge_ids text[],favorite_dex int,favorite_variant text,showcase jsonb,updated_at timestamptz);
   create table catches(id uuid primary key,user_id uuid,dex int,name text,variant text,gender text,ball text,caught_at timestamptz,transferred_at timestamptz);
   create table progression_titles(id text,enabled bool,name text);create table trainer_titles(user_id uuid,title_id text);
   create table trainer_badges(user_id uuid,badge_id text);create table trainer_achievements(user_id uuid,achievement_id text,unlocked_at timestamptz);
   create function private.evaluate_cosmetics(uuid) returns void language plpgsql as $$begin return;end$$;
   create function private.trainer_sprite_ok(text) returns bool language sql as $$select true$$;
   create function private.premium_sprite_pack(text) returns text language sql as $$select null::text$$;
   create function private.owns_avatar_pack(uuid,text) returns bool language sql as $$select false$$;
   create function private.assert_cosmetic_owned(uuid,text,text) returns void language plpgsql as $$begin return;end$$;
   create function private.identity_cosmetics_json(uuid) returns jsonb language sql as $$select '{}'::jsonb$$;
   insert into profiles(id,xp,showcase) values('${A}',123,'{}'),('${B}',456,'{}');
   insert into catches(id,user_id,dex,name,variant,transferred_at) values('${X}','${A}',10,'Fictional Shiny','shiny',now()),('${Y}','${B}',11,'Other Shiny','shiny',null),('${Z}','${A}',13,'Normal','normal',null);`);
  for(const x of base)await db.query(x.definition);
  await db.query(`grant execute on function public.${base.find(x=>!x.signature.startsWith('private.')).signature} to anon,authenticated,service_role`);
  await db.query("create function private.trainer_card(p_uid uuid) returns jsonb language sql as $$select jsonb_build_object('shinyCatch',private.catch_brief(p_uid,nullif(showcase->>'shinyCatchId','')::uuid)) from profiles where id=p_uid$$");
  await db.query("select set_config('fixture.uid',$1,false)",[A]);
  const save=id=>db.query("select public.play_save_trainer_id(p_showcase=>jsonb_build_object('shinyCatchId',$1::text)) r",[id]);
  const brief=async id=>(await db.query('select private.catch_brief($1,$2) r',[A,id])).rows[0].r;
  await save(X);assert.equal((await brief(X)).id,X);pass('Baseline accepts and displays released shiny retained under former owner ID');
  await db.query(install);
  await assert.rejects(save(X),/Shiny Pokémon you own/);assert.equal(await brief(X),null);pass('Released shiny rejected on save and hidden from existing stale pointer');
  await assert.rejects(save(Y),/Shiny Pokémon you own/);assert.equal(await brief(Y),null);pass('Other trainer shiny rejected and hidden');
  await assert.rejects(save(Z),/Shiny Pokémon you own/);pass('Normal Pokemon still rejected as Featured Shiny');
  await db.query('update catches set transferred_at=null where id=$1',[X]);const valid=(await save(X)).rows[0].r;assert.equal(valid.trainer.shinyCatch.id,X);pass('Active owned shiny saves and remains visible');
  await db.query('update catches set user_id=$1 where id=$2',[B,X]);assert.equal(await brief(X),null);pass('Subsequent trade ownership change hides former showcase');
  await save('');assert.equal((await db.query('select showcase from profiles where id=$1',[A])).rows[0].showcase.shinyCatchId,null);pass('Clearing showcase still works');
  await db.query("select set_config('fixture.uid','',false)");await db.query('set role anon');await assert.rejects(save(X),/Sign in first/);await db.query('reset role');pass('Unauthenticated mutation rejected');
  assert.equal((await db.query('select xp from profiles where id=$1',[A])).rows[0].xp,123);assert.equal((await db.query('select xp from profiles where id=$1',[B])).rows[0].xp,456);pass('No XP changes in fixture');
  await db.query(rollback);for(const x of base){const sig=x.signature.startsWith('private.')?x.signature:'public.'+x.signature;assert.equal((await db.query('select md5(prosrc) h from pg_proc where oid=$1::regprocedure',[sig])).rows[0].h,x.source_md5);}pass('Rollback restores both exact original sources');
  await db.query('alter function private.catch_brief(uuid,uuid) stable set search_path=public');await assert.rejects(db.query(install),/source or privilege drift/);await db.query('rollback');pass('Install refuses helper configuration drift');
  fs.writeFileSync(path.join(root,'evidence/showcase-active-ownership-local.json'),JSON.stringify({label:'REAL LOCAL SQL;fictional helpers/data;no hosted writes',checks,functions:patched.map(x=>({signature:x.signature,sourceMd5:md5(body(x.definition))}))},null,2)+'\n');
 }finally{if(db)await db.end();await cluster.stop();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
