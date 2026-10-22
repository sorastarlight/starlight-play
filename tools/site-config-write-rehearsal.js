// Fictional local RLS/ACL test only. Never connects to the hosted database.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{pathToFileURL}=require('url');
const {refuseHosted}=require('./a19-schema-rehearsal');
async function main(){
 refuseHosted();
 const root=path.resolve(__dirname,'..'),folder=path.join(root,'supabase/unapplied/site-config-write-boundary');
 const base=JSON.parse(fs.readFileSync(path.join(folder,'baseline.json'))),table=base.find(x=>x.kind==='table').metadata;
 const lit=s=>"'"+s.replaceAll("'","''")+"'",ident=s=>'"'+s.replaceAll('"','""')+'"';
 const cols=table.columns.filter(x=>x.acl).map(x=>x.name);
 assert.deepEqual(cols.slice().sort(),['broadcaster_twitch_login','game_settings','twitch_broadcaster_id','twitch_client_id'].sort());
 assert(table.columns.filter(x=>x.acl).every(x=>x.acl==='{authenticated=w/postgres}'));
 const fnGuard=base.filter(x=>x.kind==='function').map(x=>`IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(${lit(x.signature)}) AND md5(prosrc)=${lit(x.metadata.hash)} AND proacl::text IS NOT DISTINCT FROM ${x.metadata.acl===null?'NULL':lit(x.metadata.acl)} AND proconfig IS NOT DISTINCT FROM ${x.metadata.config===null?'NULL':'ARRAY['+x.metadata.config.map(lit)+']'} AND pg_get_userbyid(proowner)=${lit(x.metadata.owner)} AND prosecdef=${x.metadata.securityDefiner} AND provolatile=${lit(x.metadata.volatility)}) THEN RAISE EXCEPTION 'Configuration authorization dependency drift'; END IF;`).join('\n');
 const tableGuard=acl=>`IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.site_config'::regclass AND relacl::text=${lit(acl)} AND relrowsecurity AND NOT relforcerowsecurity AND pg_get_userbyid(relowner)=${lit(table.owner)}) THEN RAISE EXCEPTION 'Configuration table privilege drift'; END IF;`;
 const policyGuard=`IF (SELECT jsonb_agg(jsonb_build_object('name',policyname,'roles',roles,'cmd',cmd,'using',qual,'check',with_check) ORDER BY policyname) FROM pg_policies WHERE schemaname='public' AND tablename='site_config') IS DISTINCT FROM ${lit(JSON.stringify(table.policies))}::jsonb THEN RAISE EXCEPTION 'Configuration policy drift'; END IF;`;
 const columnGuard=after=>`IF (SELECT jsonb_agg(jsonb_build_object('name',a.attname,'acl',a.attacl::text) ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid='public.site_config'::regclass AND a.attnum>0 AND NOT a.attisdropped) IS DISTINCT FROM ${lit(JSON.stringify(table.columns.map(x=>({...x,acl:after?null:x.acl}))))}::jsonb THEN RAISE EXCEPTION 'Configuration column privilege drift'; END IF;`;
 // Pinned expected ACL after revoking only UPDATE from the two browser roles.
 const afterAcl=table.acl.replace('anon=arwdDxtm/','anon=ardDxtm/').replace('authenticated=arwdDxtm/','authenticated=ardDxtm/');
 assert.notEqual(afterAcl,table.acl);
 const guard=(after)=>`DO $guard$ BEGIN\n${fnGuard}\n${tableGuard(after?afterAcl:table.acl)}\n${policyGuard}\n${columnGuard(after)}\nEND $guard$;\n`;
 const permissionCheck=`DO $check$ BEGIN IF EXISTS(SELECT 1 FROM (VALUES('anon'),('authenticated'))r(role) WHERE has_table_privilege(role,'public.site_config','UPDATE') OR has_any_column_privilege(role,'public.site_config','UPDATE')) THEN RAISE EXCEPTION 'Browser configuration UPDATE remains'; END IF; IF NOT has_table_privilege('service_role','public.site_config','UPDATE') OR NOT has_table_privilege('authenticated','public.site_config','SELECT') OR NOT has_table_privilege('anon','public.site_config','SELECT') THEN RAISE EXCEPTION 'Required configuration access missing'; END IF; END $check$;\n`;
 const install='BEGIN;\nSET LOCAL lock_timeout=\'5s\';\n'+guard(false)+`REVOKE UPDATE ON public.site_config FROM PUBLIC, anon, authenticated;\nREVOKE UPDATE (${cols.map(ident).join(',')}) ON public.site_config FROM PUBLIC, anon, authenticated;\n`+permissionCheck+guard(true)+'COMMIT;\n';
 const rollback='-- Restores the vulnerable direct-write access. Emergency review only.\nBEGIN;\n'+guard(true)+`GRANT UPDATE ON public.site_config TO anon, authenticated;\nGRANT UPDATE (${cols.map(ident).join(',')}) ON public.site_config TO authenticated;\n`+guard(false)+'COMMIT;\n';
 fs.writeFileSync(path.join(folder,'INSTALL.sql'),install);fs.writeFileSync(path.join(folder,'ROLLBACK.sql'),rollback);
 const cache=path.join(__dirname,'.cache/d54-pg-harness'),Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const cluster=new Embedded({databaseDir:fs.mkdtempSync(path.join(cache,'config-write-')),user:'postgres',password:'fictional-only',port:55486,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});
 let db;const checks=[],pass=s=>{checks.push(s);console.log('PASS '+s);};
 const mod='aaaaaaaa-0073-4073-8073-000000000001',owner='aaaaaaaa-0073-4073-8073-000000000002',ordinary='aaaaaaaa-0073-4073-8073-000000000003';
 try{
  await cluster.initialise();await cluster.start();db=cluster.getPgClient('postgres','127.0.0.1');await db.connect();
  assert.equal((await db.query('select host(inet_server_addr()) h')).rows[0].h,'127.0.0.1');
  await db.query(`CREATE SCHEMA private;CREATE SCHEMA auth;CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('fixture.uid',true),'')::uuid$$;
   CREATE TABLE public.site_config(id int PRIMARY KEY,broadcaster_twitch_login text,game_settings jsonb,twitch_client_id text,twitch_broadcaster_id text,bits_store_enabled boolean,updated_at timestamptz);
   CREATE TABLE public.staff_roles(user_id uuid PRIMARY KEY,role text);CREATE TABLE public.twitch_connections(user_id uuid,confirmed boolean,twitch_user_id text,twitch_login text);CREATE TABLE auth.identities(user_id uuid,provider text,identity_data jsonb,provider_id text);
   INSERT INTO public.site_config VALUES(1,'fictional-owner','{}',null,'owner-provider-id',false,now());
   INSERT INTO public.staff_roles VALUES('${mod}','moderator'),('${owner}','owner');INSERT INTO public.twitch_connections VALUES('${mod}',true,'moderator-provider-id','fictional-moderator');
   GRANT USAGE ON SCHEMA public,private,auth TO anon,authenticated,service_role;
   GRANT ALL ON public.site_config TO anon,authenticated,service_role;
   GRANT UPDATE (${cols.map(ident)}) ON public.site_config TO authenticated;
   ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;`);
  for(const x of base.filter(x=>x.kind==='function').sort((a,b)=>Number(!a.signature.startsWith('private.play_staff_role'))-Number(!b.signature.startsWith('private.play_staff_role')))){
   await db.query(x.metadata.definition);
   if(x.metadata.acl!==null){await db.query('REVOKE ALL ON FUNCTION '+x.signature+' FROM PUBLIC');if(x.metadata.acl.includes('authenticated=X/'))await db.query('GRANT EXECUTE ON FUNCTION '+x.signature+' TO authenticated');}
  }
  for(const p of table.policies)await db.query(`CREATE POLICY ${ident(p.name)} ON public.site_config FOR ${p.cmd} TO ${p.roles.map(ident)} USING (${p.using})${p.check?' WITH CHECK ('+p.check+')':''}`);
  await db.query('CREATE TRIGGER keep_bits_off BEFORE INSERT OR UPDATE ON public.site_config FOR EACH ROW EXECUTE FUNCTION private.keep_bits_off();CREATE TRIGGER site_config_updated_at BEFORE UPDATE ON public.site_config FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at()');
  const as=async(role,uid,sql)=>{await db.query('BEGIN');try{await db.query('SET LOCAL ROLE '+role);await db.query("select set_config('fixture.uid',$1,true)",[uid||'']);const r=await db.query(sql);await db.query('COMMIT');return r;}catch(e){await db.query('ROLLBACK');throw e;}};
  assert.equal((await as('authenticated',mod,"SELECT private.play_staff_role() r")).rows[0].r,'moderator');
  const escalate="UPDATE public.site_config SET broadcaster_twitch_login='fictional-moderator',twitch_broadcaster_id='moderator-provider-id' WHERE id=1";
  assert.equal((await as('authenticated',mod,escalate)).rowCount,1);
  assert.equal((await as('authenticated',mod,'SELECT private.play_staff_role() r')).rows[0].r,'owner');pass('Baseline exact policy/helpers allow moderator direct configuration update and derived owner escalation');
  await db.query("UPDATE public.site_config SET broadcaster_twitch_login='fictional-owner',twitch_broadcaster_id='owner-provider-id'");
  assert.equal((await as('authenticated',ordinary,escalate)).rowCount,0);pass('Baseline ordinary trainer denied by existing RLS');
  // The fixture models only needed columns. Test guards against actual catalog-shaped snapshot separately below.
  const fixtureCols=JSON.stringify((await db.query("SELECT jsonb_agg(jsonb_build_object('name',attname,'acl',attacl::text) ORDER BY attnum) c FROM pg_attribute WHERE attrelid='public.site_config'::regclass AND attnum>0 AND NOT attisdropped")).rows[0].c);
  const fixtureInstall=install.replace(lit(JSON.stringify(table.columns)),lit(fixtureCols)).replace(lit(JSON.stringify(table.columns.map(x=>({...x,acl:null})))),lit(JSON.stringify(JSON.parse(fixtureCols).map(x=>({...x,acl:null})))));
  const fixtureRollback=rollback.replace(lit(JSON.stringify(table.columns)),lit(fixtureCols)).replace(lit(JSON.stringify(table.columns.map(x=>({...x,acl:null})))),lit(JSON.stringify(JSON.parse(fixtureCols).map(x=>({...x,acl:null})))));
  await db.query(fixtureInstall);pass('Guarded UPDATE revocation installs with exact helper/policy/ACL checks');
  for(const [name,uid] of [['moderator',mod],['owner',owner],['ordinary',ordinary]]){await assert.rejects(()=>as('authenticated',uid,escalate),e=>e.code==='42501');pass('Direct table update denied for '+name);}
  await assert.rejects(()=>as('anon','',escalate),e=>e.code==='42501');pass('Anonymous direct table update denied');
  for(const col of cols){const p=(await db.query('select has_column_privilege(\'authenticated\',\'public.site_config\',$1,\'UPDATE\') b',[col])).rows[0];assert.equal(p.b,false);}pass('All four previous column UPDATE grants removed, closing column-only bypass');
  assert.equal((await as('authenticated',ordinary,'SELECT id FROM public.site_config')).rowCount,1);assert.equal((await as('anon','','SELECT id FROM public.site_config')).rowCount,1);pass('Public/authenticated configuration reads preserved');
  assert.equal((await as('service_role','',"UPDATE public.site_config SET twitch_client_id='fictional-client' WHERE id=1")).rowCount,1);pass('Service-role configuration update preserved');
  await db.query(`CREATE FUNCTION public.fixture_owner_config() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$BEGIN IF private.can_manage_secrets() IS NOT TRUE THEN RAISE EXCEPTION 'not allowed' USING ERRCODE='42501';END IF;UPDATE public.site_config SET twitch_client_id='fictional-owner-client' WHERE id=1;END;$$`);
  await as('authenticated',owner,'SELECT public.fixture_owner_config()');await assert.rejects(()=>as('authenticated',mod,'SELECT public.fixture_owner_config()'),e=>e.code==='42501');pass('Owner-guarded SECURITY DEFINER write remains possible;nonowner denied (fictional RPC stand-in)');
  await db.query(fixtureRollback);assert.equal((await as('authenticated',mod,escalate)).rowCount,1);pass('Exact rollback restores original ACLs and reproduces baseline risk');
  await db.query("UPDATE public.site_config SET broadcaster_twitch_login='fictional-owner',twitch_broadcaster_id='owner-provider-id'");
  await db.query('GRANT UPDATE (updated_at) ON public.site_config TO authenticated');await assert.rejects(()=>db.query(fixtureInstall),/column privilege drift/);await db.query('ROLLBACK');await db.query('REVOKE UPDATE (updated_at) ON public.site_config FROM authenticated');pass('Unexpected column grant refuses installation without permission changes');
  await db.query("CREATE OR REPLACE FUNCTION private.can_manage_secrets() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT true$$");await assert.rejects(()=>db.query(fixtureInstall),/dependency drift/);await db.query('ROLLBACK');pass('Authorization dependency drift refuses installation');
  fs.writeFileSync(path.join(folder,'local-results.json'),JSON.stringify({classification:'REAL LOCAL SQL;fictional data;exact captured policy/authorization helpers;minimal table shape and fictional owner-RPC stand-in',passed:checks.length,checks,installedHosted:false},null,2)+'\n');
 }finally{if(db)await db.end().catch(()=>{});await cluster.stop().catch(()=>{});}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
