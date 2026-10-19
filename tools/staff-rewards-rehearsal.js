/* Local synthetic SQL contracts only. No hosted access or actual Pokémon generation. */
const fs=require("fs"),path=require("path"),assert=require("node:assert/strict");
const {pathToFileURL}=require("url");
const {refuseHosted,splitSql}=require("./a19-schema-rehearsal.js");
const root=path.resolve(__dirname,".."),cache=path.join(__dirname,".cache","d54-pg-harness");
const A="aaaaaaaa-0000-4000-8000-000000000091",B="bbbbbbbb-0000-4000-8000-000000000091",C="cccccccc-0000-4000-8000-000000000091";
const fixture=`
CREATE SCHEMA auth; CREATE SCHEMA private;
CREATE ROLE authenticated NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
CREATE FUNCTION private.require_staff_edit() RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF auth.uid() IS DISTINCT FROM '${A}'::uuid OR coalesce(current_setting('fixture.staff_role',true),'') NOT IN ('owner','admin') THEN RAISE EXCEPTION 'not allowed' USING ERRCODE='42501'; END IF; END $$;
CREATE FUNCTION private.streamlink_protected_trainer(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='${C}'::uuid $$;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,starlight_pass boolean,pass_source text,pass_checked_at timestamptz,updated_at timestamptz DEFAULT now());
CREATE TABLE public.inventories(user_id uuid PRIMARY KEY,pass_daily_at timestamptz,pass_weekly_at timestamptz,coins integer DEFAULT 0,bag_bonus integer DEFAULT 0,items jsonb DEFAULT '{}');
INSERT INTO public.profiles VALUES('${A}',false,null,null,now()),('${B}',true,'twitch-sub',now(),now()),('${C}',false,null,null,now());
INSERT INTO public.inventories(user_id) VALUES('${B}');
CREATE TABLE public.reward_events(user_id uuid,idempotency text,reason text,source_id text,grants jsonb,created_at timestamptz DEFAULT now(),UNIQUE(user_id,idempotency));
CREATE TABLE public.item_ledger(user_id uuid,item_key text,amount integer,idempotency text,UNIQUE(user_id,idempotency));
CREATE TABLE public.coin_ledger(user_id uuid,amount integer,idempotency text,UNIQUE(user_id,idempotency));
CREATE TABLE public.progression_titles(id text,name text,enabled boolean); INSERT INTO public.progression_titles VALUES('starter','Starter',true);
CREATE TABLE public.progression_badges(id text,name text,enabled boolean); INSERT INTO public.progression_badges VALUES('badge','Badge',true);
CREATE TABLE public.progression_cosmetics(id text,name text,kind text,enabled boolean); INSERT INTO public.progression_cosmetics VALUES('sky','Sky','background',true);
CREATE TABLE public.fixture_dispatches(kind text,payload jsonb);
CREATE FUNCTION private.extra_ball_keys() RETURNS text[] LANGUAGE sql AS $$ SELECT ARRAY['masterball'] $$;
CREATE FUNCTION private.capture_berry_keys() RETURNS text[] LANGUAGE sql AS $$ SELECT ARRAY['nanab'] $$;
CREATE FUNCTION private.evo_item_keys() RETURNS text[] LANGUAGE sql AS $$ SELECT ARRAY['waterstone'] $$;
CREATE FUNCTION private.valuable_item_keys() RETURNS text[] LANGUAGE sql AS $$ SELECT ARRAY['nugget'] $$;
CREATE FUNCTION private.pass_reward_grants(text) RETURNS jsonb LANGUAGE sql AS $$ SELECT CASE WHEN $1='daily' THEN '{"berry":2,"coins":20}'::jsonb ELSE '{"pokeball":5,"coins":150}'::jsonb END $$;
CREATE FUNCTION private.grant_items(uuid,jsonb,text,text,text,boolean) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE k text;n integer; BEGIN
 INSERT INTO public.reward_events(user_id,idempotency,reason,source_id,grants) VALUES($1,$5,$3,$4,$2);
 FOR k,n IN SELECT key,value::integer FROM jsonb_each_text($2) LOOP
 IF k='coins' THEN UPDATE public.inventories SET coins=coins+n WHERE user_id=$1;INSERT INTO public.coin_ledger VALUES($1,n,$5||':coins');
 ELSE UPDATE public.inventories SET items=jsonb_set(items,ARRAY[k],to_jsonb(coalesce((items->>k)::integer,0)+n)) WHERE user_id=$1;INSERT INTO public.item_ledger VALUES($1,k,n,$5||':'||k);END IF;
 END LOOP;
 IF current_setting('fixture.delivery_fail',true)='on' THEN RAISE EXCEPTION 'synthetic storage failure';END IF;
 RETURN jsonb_build_object('ok',true,'granted',$2-'coins','coins',coalesce(($2->>'coins')::integer,0)); END $$;
CREATE FUNCTION public.admin_grant_candy(uuid,integer,integer) RETURNS jsonb LANGUAGE plpgsql AS $$ BEGIN IF $2 NOT BETWEEN 1 AND 151 THEN RAISE EXCEPTION 'bad species'; END IF; INSERT INTO public.fixture_dispatches VALUES('candy',jsonb_build_object('qty',$3)); RETURN '{"ok":true}'; END $$;
CREATE FUNCTION public.admin_grant_title(uuid,text,text) RETURNS jsonb LANGUAGE plpgsql AS $$ BEGIN IF $2<>'starter' THEN RAISE EXCEPTION 'bad title'; END IF; INSERT INTO public.fixture_dispatches VALUES('title',jsonb_build_object('id',$2)); RETURN '{"ok":true}'; END $$;
CREATE FUNCTION public.admin_grant_cosmetic(uuid,text,text) RETURNS jsonb LANGUAGE plpgsql AS $$ BEGIN INSERT INTO public.fixture_dispatches VALUES('cosmetic',jsonb_build_object('id',$2)); RETURN '{"ok":true}'; END $$;
CREATE FUNCTION public.admin_grant_badge(uuid,text,text) RETURNS jsonb LANGUAGE plpgsql AS $$ BEGIN INSERT INTO public.fixture_dispatches VALUES('badge',jsonb_build_object('id',$2)); RETURN '{"ok":true}'; END $$;
CREATE FUNCTION private.fixture_dispatch_staff_gift(uuid,integer,integer,text,text,text,uuid,boolean,text,text,text,text,text) RETURNS jsonb LANGUAGE plpgsql AS $$ BEGIN INSERT INTO public.fixture_dispatches VALUES('canonical-pokemon',jsonb_build_object('dex',$2,'level',$3,'context',$4,'shiny',$8)); RETURN '{"ok":true,"catchId":"synthetic-only"}'; END $$;
GRANT USAGE ON SCHEMA public,auth,private TO authenticated,anon;
`;
async function main(){
 refuseHosted();
 const dataDir=fs.mkdtempSync(path.join(cache,"staff-rewards-"));
 assert(path.resolve(dataDir).startsWith(path.resolve(cache)+path.sep));
 const Embedded=(await import(pathToFileURL(path.join(cache,"node_modules/embedded-postgres/dist/index.js")).href)).default;
 const cluster=new Embedded({databaseDir:dataDir,user:"postgres",password:"synthetic-staff-only",port:55459,persistent:false,initdbFlags:["--encoding=UTF8","--no-locale"],postgresFlags:["-c","listen_addresses=127.0.0.1"],onLog:()=>{}});
 let client;let count=0;
 try{
  await cluster.initialise();await cluster.start();client=cluster.getPgClient("postgres","127.0.0.1");await client.connect();
  const target=(await client.query("select host(inet_server_addr()) as host,current_database() as db")).rows[0];assert.equal(target.host,"127.0.0.1");assert.equal(target.db,"postgres");
  await client.query(fixture);
  await assert.rejects(()=>client.query(fs.readFileSync(path.join(root,"supabase/unapplied/codex-staff-rewards/INSTALL.sql"),"utf8")),/prerequisite drifted/);
  await client.query("ROLLBACK");
  assert.equal((await client.query("select to_regclass('private.staff_reward_actions') as object")).rows[0].object,null);
  count++;console.log("PASS Install preflight rejects drift before creating reward objects");
  await client.query("alter function private.fixture_dispatch_staff_gift(uuid,integer,integer,text,text,text,uuid,boolean,text,text,text,text,text) rename to persist_staff_gift");
  await client.query(fs.readFileSync(path.join(root,"supabase/unapplied/codex-staff-rewards/001_staff_rewards.sql"),"utf8"));
  const q=async(sql,args)=>(await client.query(sql,args)).rows;
  const set=async(name,val)=>q("select set_config($1,$2,false)",[name,val]);
  await set("request.jwt.claim.sub",A);await set("request.jwt.claim.role","authenticated");await set("fixture.staff_role","owner");
  const id=(n)=>`dddddddd-0000-4000-8000-${String(n).padStart(12,"0")}`;
  const act=async(n,action,payload={},targetId=B)=> (await q("select public.admin_trainer_reward_action($1,$2,$3,$4,$5) as result",[targetId,id(n),action,payload,"Synthetic rehearsal reason"]))[0].result;
  const check=(name,run)=>Promise.resolve().then(run).then(()=>{count++;console.log("PASS "+name);});
  await check("Pass off preserves Twitch origin",async()=>{assert((await act(1,"pass_off")).ok);const p=(await q("select * from public.profiles where id=$1",[B]))[0];assert.equal(p.starlight_pass,false);assert.equal(p.pass_source,"twitch-sub");});
  await check("Subscription refresh cannot override staff off",async()=>{await set("request.jwt.claim.role","service_role");await q("update public.profiles set starlight_pass=true,pass_source='twitch-sub',pass_checked_at=now() where id=$1",[B]);assert.equal((await q("select starlight_pass from public.profiles where id=$1",[B]))[0].starlight_pass,false);await set("request.jwt.claim.role","authenticated");});
  await check("Clear override restores last subscription state",async()=>{assert((await act(2,"pass_sync")).ok);assert.equal((await q("select starlight_pass from public.profiles where id=$1",[B]))[0].starlight_pass,true);});
  await check("Staff on records gifted provenance",async()=>{assert((await act(3,"pass_on")).ok);assert.equal((await q("select pass_source from public.profiles where id=$1",[B]))[0].pass_source,"admin");});
  await act(4,"pass_off");
  await check("Re-grant works while Pass is off, without changing claim clocks",async()=>{await q("update public.inventories set pass_daily_at=now(),pass_weekly_at=now() where user_id=$1",[B]);const before=(await q("select pass_daily_at::text,pass_weekly_at::text from public.inventories where user_id=$1",[B]))[0];assert((await act(5,"pass_daily")).ok);assert((await act(6,"pass_weekly")).ok);assert.deepEqual((await q("select pass_daily_at::text,pass_weekly_at::text from public.inventories where user_id=$1",[B]))[0],before);});
  await check("Replay returns same receipt without duplicate delivery",async()=>{const before=(await q("select coins from public.inventories where user_id=$1",[B]))[0].coins;assert((await act(5,"pass_daily")).replayed);assert.equal((await q("select coins from public.inventories where user_id=$1",[B]))[0].coins,before);});
  await check("Concurrent duplicate requests deliver exactly once",async()=>{
   const other=cluster.getPgClient("postgres","127.0.0.1");await other.connect();
   try{await other.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false),set_config('fixture.staff_role','owner',false)",[A]);
    const before=(await q("select coins from public.inventories where user_id=$1",[B]))[0].coins;
    const responses=await Promise.all([act(18,"pass_daily"),other.query("select public.admin_trainer_reward_action($1,$2,'pass_daily','{}','Synthetic rehearsal reason') as result",[B,id(18)]).then(r=>r.rows[0].result)]);
    assert(responses.every(r=>r.ok));assert.equal(responses.filter(r=>r.replayed).length,1);
    assert.equal((await q("select coins from public.inventories where user_id=$1",[B]))[0].coins,before+20);
   }finally{await other.end();}
  });
  await check("Request cannot be rebound to a different gift",async()=>{await assert.rejects(()=>act(5,"item",{key:"coins",qty:1}));});
  await check("Failed delivery rolls back gifts and persists a failed receipt",async()=>{await set("fixture.delivery_fail","on");const before=(await q("select coins,items from public.inventories where user_id=$1",[B]))[0];assert.equal((await act(7,"pass_daily")).ok,false);assert.deepEqual((await q("select coins,items from public.inventories where user_id=$1",[B]))[0],before);assert.equal((await q("select status from private.staff_reward_actions where request_id=$1",[id(7)]))[0].status,"failed");await set("fixture.delivery_fail","off");});
  await check("Failed receipt replay cannot unexpectedly re-grant",async()=>{const result=await act(7,"pass_daily");assert(result.replayed);assert.equal(result.ok,false);});
  await check("Positive item grants only; arbitrary keys rejected",async()=>{assert.equal((await act(8,"item",{key:"coins",qty:-3})).ok,false);assert.equal((await act(9,"item",{key:"arbitrary",qty:1})).ok,false);assert((await act(10,"item",{key:"pokeball",qty:3})).ok);});
  await check("Pokemon dispatch uses canonical grant context",async()=>{assert((await act(11,"pokemon",{dex:25,level:5,shiny:true})).ok);const row=(await q("select payload from public.fixture_dispatches where kind='canonical-pokemon'"))[0].payload;assert.equal(row.context,"grant");assert.equal(row.shiny,true);assert.equal((await act(12,"pokemon",{dex:200,level:5})).ok,false);});
  await check("Titles, cosmetics, badges and Candy dispatch successfully",async()=>{assert((await act(13,"title",{id:"starter"})).ok);assert((await act(14,"cosmetic",{id:"sky"})).ok);assert((await act(15,"badge",{id:"badge"})).ok);assert((await act(16,"candy",{dex:1,qty:3})).ok);});
  await check("Protected trainer is rejected",async()=>{await assert.rejects(()=>act(17,"pass_on",{},C));});
  await check("Inspect returns receipts and policy after authorization",async()=>{const data=(await q("select public.admin_trainer_rewards($1) as data",[B]))[0].data;assert(data.ok);assert(data.actions.some(row=>row.status==="failed"));assert(data.catalog.items.length>0);});
  await check("Moderator and viewer cannot inspect or mutate",async()=>{for(const role of ["moderator","viewer"]){await set("fixture.staff_role",role);await assert.rejects(()=>act(20,"pass_on"));await assert.rejects(()=>q("select public.admin_trainer_rewards($1)",[B]));}await set("fixture.staff_role","owner");});
  await check("Authenticated role has no direct receipt/override table access",async()=>{await q("set role authenticated");await assert.rejects(()=>q("select * from private.staff_reward_actions"));await assert.rejects(()=>q("delete from private.staff_pass_overrides"));await q("reset role");});
  await check("Anonymous role cannot execute public reward functions",async()=>{await q("set role anon");await assert.rejects(()=>q("select public.admin_trainer_rewards($1)",[B]));await assert.rejects(()=>act(21,"pass_on"));await q("reset role");});
  await cluster.createDatabase("staff_gift_generation");
  const generator=cluster.getPgClient("staff_gift_generation","127.0.0.1");await generator.connect();
  try{
   const apply=async(file)=>{for(const statement of splitSql(fs.readFileSync(path.join(root,file),"utf8")))await generator.query(statement);};
   await apply("supabase/unapplied/a19-schema/rehearsal/000_synthetic_baseline.sql");
   await apply("supabase/unapplied/a19-schema/001_private_ref_tables.sql");
   for(const file of ["00_meta.sql","01_natures.sql","02_species.sql","03_forms.sql","04_abilities.sql","05_form_abilities.sql","06_moves.sql","07_learnsets.sql","08_evolutions.sql","09_obtain.sql","10_form_policies.sql"])await apply("supabase/unapplied/a19-schema/seed/"+file);
   await apply("supabase/unapplied/a19-schema/002_catches_nullable_extensions.sql");
   await apply("supabase/unapplied/a19-genval/001_generate_and_assert.sql");
   await apply("supabase/unapplied/a19-wire/local/020_wire_baseline.sql");
   await apply("supabase/unapplied/a19-wire/local/010_stamp_replica.sql");
   await apply("supabase/unapplied/a19-wire/001_wire_switch_and_persist.sql");
   await generator.query("create function private.require_staff_edit() returns void language plpgsql as $$ begin if current_setting('fixture.staff_role',true) is distinct from 'owner' then raise exception 'not allowed' using errcode='42501';end if;end $$");
   await apply("supabase/unapplied/codex-staff-rewards/002_staff_gift_persist.sql");
   await generator.query("select set_config('fixture.staff_role','owner',false)");
   await check("Actual canonical generator persists a staff gift with WIRE still off",async()=>{
    const result=(await generator.query("select private.persist_staff_gift('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',25,5,'grant','grant:staff-reward:synthetic','poke',null,true) as result")).rows[0].result;
    assert.equal(result.ok,true,JSON.stringify(result));assert.equal((await generator.query("select private.streamlink_wire_is_enabled() as enabled")).rows[0].enabled,false);
    const mon=(await generator.query("select nature_id,ability_id,move_slots,content_build from public.catches where id=$1",[result.catchId])).rows[0];assert(mon.nature_id);assert(mon.ability_id);assert.equal(mon.content_build,"sl-ref-20261013-227b573");
   });
   await check("Staff-only persister refuses catch context and direct client EXECUTE",async()=>{
    await assert.rejects(()=>generator.query("select private.persist_staff_gift('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',1,5,'catch','play:synthetic')"));
    await generator.query("set role authenticated");await assert.rejects(()=>generator.query("select private.persist_staff_gift('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',1,5,'grant','grant:staff-reward:direct')"));await generator.query("reset role");
   });
  }finally{await generator.end();}
  console.log(`${count}/${count} REAL SQL checks passed on 127.0.0.1:55459. Reward dispatch helpers are synthetic; staff gift generation also exercised the pinned generator, validator and persistence on synthetic local schema. No hosted mutations.`);
 }finally{if(client)await client.end();await cluster.stop();}
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exit(1);});
