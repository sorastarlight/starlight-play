// Exact captured GTS functions/tradability trigger; fictional local rows and reward helpers.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),crypto=require('crypto');
const {pathToFileURL}=require('node:url');const {refuseHosted}=require('./a19-schema-rehearsal');
async function main(){
 refuseHosted();const root=path.resolve(__dirname,'..'),folder=path.join(root,'supabase/unapplied/gts-final-cooldown');
 const rows=JSON.parse(fs.readFileSync(path.join(folder,'baseline.json'))),base=rows.find(x=>x.signature==='play_trade_accept(uuid)');
 const marker='  update public.catches set user_id = o.user_id where id = listed.id;';
 assert.equal(base.definition.split(marker).length,2);
 const fixed=base.definition.replace(marker,"  if (listed.trade_locked_until is not null and listed.trade_locked_until > now())\n     or (offered.trade_locked_until is not null and offered.trade_locked_until > now()) then\n    raise exception 'That Pokémon was just received. Wait a few minutes before trading it again.';\n  end if;\n"+marker);
 const body=s=>s.split('AS $function$')[1].split('$function$')[0],md5=s=>crypto.createHash('md5').update(s).digest('hex');
 const guard=s=>`DO $guard$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_trade_accept(uuid)'::regprocedure AND md5(prosrc)='${md5(body(s))}' AND proacl::text='${base.acl}' AND proconfig=ARRAY['search_path=public'] AND prosecdef AND provolatile='v' AND pg_get_userbyid(proowner)='postgres') THEN RAISE EXCEPTION 'GTS acceptance source or privilege drift'; END IF; END $guard$;\n`;
 const install='BEGIN;\n'+guard(base.definition)+fixed+';\nCOMMIT;\n',rollback='BEGIN;\n'+guard(fixed)+base.definition+';\nCOMMIT;\n';
 fs.writeFileSync(path.join(folder,'INSTALL.sql'),install);fs.writeFileSync(path.join(folder,'ROLLBACK.sql'),rollback);
 const cache=path.join(__dirname,'.cache/d54-pg-harness'),Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const cluster=new Embedded({databaseDir:fs.mkdtempSync(path.join(cache,'gts-final-')),user:'postgres',password:'fictional-only',port:55484,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});
 const A='aaaaaaaa-0058-4058-8058-000000000001',B='bbbbbbbb-0058-4058-8058-000000000001',C='cccccccc-0058-4058-8058-000000000001',X='aaaaaaaa-0058-4058-8058-000000000002',Y='bbbbbbbb-0058-4058-8058-000000000002';
 let db;const checks=[],pass=s=>{checks.push(s);console.log('PASS '+s);};
 try{
  await cluster.initialise();await cluster.start();db=cluster.getPgClient('postgres','127.0.0.1');await db.connect();assert.equal((await db.query('select host(inet_server_addr()) h')).rows[0].h,'127.0.0.1');
  await db.query(`create schema auth;create schema private;create role anon;create role authenticated;create role service_role;
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('fixture.uid',true),'')::uuid$$;
   create table catches(id uuid primary key,user_id uuid,dex int,variant text default 'normal',gender text,transferred_at timestamptz,locked bool default false,favorite bool default false,trade_locked_until timestamptz);
   create table species(dex int primary key,tradable bool);insert into species values(10,true),(11,true);
   create table trade_listings(id uuid primary key default gen_random_uuid(),catch_id uuid unique,user_id uuid,want_dex int,note text,accept_any bool,want_gender text,want_shiny bool,status text default 'open',created_at timestamptz default now());
   create table trade_offers(id uuid primary key default gen_random_uuid(),listing_id uuid,user_id uuid,catch_id uuid,status text default 'pending');
   create table trainer_stats(user_id uuid,trades_done int default 0,traded_away int default 0,traded_in int default 0,updated_at timestamptz);insert into trainer_stats(user_id) values('${A}'),('${B}');
   create table private.fixture_effects(kind text,trainer uuid);
   create function private.pull_from_team(uuid,uuid) returns void language plpgsql as $$begin return;end$$;
   create function private.mark_trade_receive(uuid,uuid,uuid) returns void language sql as $$update catches set trade_locked_until=now()+interval '5 minutes' where id=$2$$;
   create function private.trade_xp(uuid,text) returns void language sql as $$insert into private.fixture_effects values('xp',$1)$$;
   create function private.evaluate_achievements(uuid,bool) returns void language plpgsql as $$begin return;end$$;
   create function private.lgpe_gender_rate(int) returns int language sql as $$select 4$$;
   create function private.trade_listing_json(public.trade_listings) returns jsonb language sql as $$select to_jsonb($1)$$;`);
  for(const row of rows)await db.query(row.definition);
  await db.query(`grant execute on function public.play_trade_accept(uuid) to public,anon,authenticated,service_role;
   create trigger trade_listings_tradable before insert or update of catch_id,status on trade_listings for each row when(new.status='open') execute function private.assert_catch_tradable();
   create trigger trade_offers_tradable before insert on trade_offers for each row execute function private.assert_catch_tradable();`);
  const user=uid=>db.query("select set_config('fixture.uid',$1,false)",[uid||'']);
  const reset=async()=>{await db.query(`truncate catches,trade_listings,trade_offers,private.fixture_effects;update species set tradable=true;update trainer_stats set trades_done=0,traded_away=0,traded_in=0;insert into catches(id,user_id,dex) values('${X}','${A}',10),('${Y}','${B}',11)`);await user(A);};
  const create=async()=>(await db.query('select public.play_trade_create($1) r',[X])).rows[0].r.listing.id;
  const offer=id=>db.query('select public.play_trade_offer($1,$2)',[id,Y]);
  const negotiate=async()=>{const id=await create();await user(B);await offer(id);await user(A);return(await db.query('select id from trade_offers')).rows[0].id;};
  const accept=id=>db.query('select public.play_trade_accept($1)',[id]);
  const unchanged=async()=>{assert.equal((await db.query('select user_id from catches where id=$1',[X])).rows[0].user_id,A);assert.equal((await db.query('select count(*) n from private.fixture_effects')).rows[0].n,'0');};
  await reset();await db.query("update catches set trade_locked_until=now()+interval '5 minutes' where id=$1",[X]);await assert.rejects(create,/just received/);pass('Exact existing listing trigger already rejects cooldown');
  await reset();let listing=await create();await user(B);await db.query("update catches set trade_locked_until=now()+interval '5 minutes' where id=$1",[Y]);await assert.rejects(()=>offer(listing),/just received/);pass('Exact existing offer trigger already rejects cooldown');
  await reset();let id=await negotiate();await db.query("update catches set trade_locked_until=now()+interval '5 minutes'");await accept(id);assert.equal((await db.query('select user_id from catches where id=$1',[X])).rows[0].user_id,B);pass('Baseline final acceptance swaps stale offers despite current cooldown');
  await db.query(install);pass('Guarded one-function correction installs');
  for(const target of [X,Y]){await reset();id=await negotiate();await db.query("update catches set trade_locked_until=now()+interval '5 minutes' where id=$1",[target]);await assert.rejects(()=>accept(id),/just received/);await unchanged();pass('Final acceptance rejects current cooldown on '+(target===X?'listed':'offered')+' Pokemon without swap/rewards');}
  await reset();id=await negotiate();await db.query("update catches set trade_locked_until=now()-interval '1 second'");await accept(id);assert.equal((await db.query('select count(*) n from private.fixture_effects')).rows[0].n,'2');assert.equal((await db.query('select count(*) n from catches where trade_locked_until>now()')).rows[0].n,'2');pass('Expired cooldown and sole-copy trade succeeds with two receive locks and one reward per trainer');
  await assert.rejects(()=>accept(id),/offer is gone/);assert.equal((await db.query('select count(*) n from private.fixture_effects')).rows[0].n,'2');pass('Completed-offer replay denied without repeated rewards');
  for(const flag of ['locked','favorite']){await reset();id=await negotiate();await db.query('update catches set '+flag+'=true where id=$1',[Y]);await assert.rejects(()=>accept(id),/locked or favorite/);await unchanged();pass('Final '+flag+' protection preserved');}
  await reset();id=await negotiate();await db.query('update species set tradable=false where dex=11');await assert.rejects(()=>accept(id),/cannot be traded/);await unchanged();pass('Final species tradability recheck preserved');
  await reset();id=await negotiate();await user(C);await assert.rejects(()=>accept(id),/Only the listing/);await user(null);await assert.rejects(()=>accept(id),/Sign in first/);await unchanged();pass('Other trainer and unauthenticated acceptance denied');
  await db.query(rollback);assert.equal((await db.query("select md5(prosrc) h from pg_proc where oid='public.play_trade_accept(uuid)'::regprocedure")).rows[0].h,base.source_md5);pass('Rollback restores exact original source');
  await db.query('revoke execute on function public.play_trade_accept(uuid) from anon');await assert.rejects(db.query(install),/privilege drift/);await db.query('rollback');pass('Install refuses ACL drift');
  fs.writeFileSync(path.join(root,'evidence/gts-final-cooldown-local.json'),JSON.stringify({label:'REAL LOCAL SQL; exact GTS bodies and initial triggers; fictional data/reward helpers; no hosted trade',checks,newSourceMd5:md5(body(fixed)),limitations:'Stale queued state is injected locally after valid offer creation, not a full hosted race or multi-route acquisition reproduction.'},null,2)+'\n');
 }finally{if(db)await db.end();await cluster.stop();}
}
main().catch(e=>{console.error(e);process.exit(1)});
