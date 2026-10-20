/* REAL local SQL guard tests; Auth JWT/session/role providers are fixtures.
 * Does not connect to Supabase or exercise a real OAuth provider. */
const fs=require('fs');const path=require('path');const assert=require('assert/strict');
const {pathToFileURL}=require('url');const {refuseHosted}=require('./a19-schema-rehearsal');
const root=path.resolve(__dirname,'..'),cache=path.resolve(__dirname,'.cache/d54-pg-harness');
const uuid=n=>`bbbbbbbb-0017-4017-8017-${String(n).padStart(12,'0')}`;
async function main(){
 refuseHosted();
 const Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const dir=fs.mkdtempSync(path.join(cache,'twitch17-'));
 const cluster=new Embedded({databaseDir:dir,user:'postgres',password:'twitch17-local',port:55466,persistent:false,
  initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});
 let c,c2;let n=0;const pass=s=>{n++;console.log('PASS '+s);};
 try{
 await cluster.initialise();await cluster.start();c=cluster.getPgClient('postgres','127.0.0.1');await c.connect();
 const addr=(await c.query('SELECT host(inet_server_addr()) addr')).rows[0].addr;assert.equal(addr,'127.0.0.1');pass('Loopback embedded database');
 if(process.argv.includes('--verify-failure-exit'))throw new Error('Intentional local failure-exit check');
 await c.query(`CREATE SCHEMA auth;CREATE SCHEMA private;
  CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;
  CREATE TABLE auth.users(id uuid PRIMARY KEY,deleted_at timestamptz,banned_until timestamptz,email text,email_confirmed_at timestamptz,encrypted_password text);
  CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,not_after timestamptz);
  CREATE TABLE auth.identities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users(id),provider text,provider_id text,identity_data jsonb,last_sign_in_at timestamptz,UNIQUE(provider,provider_id));
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('fixture.uid',true),'')::uuid$$;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT coalesce(nullif(current_setting('fixture.jwt',true),''),'{}')::jsonb$$;
  CREATE TABLE public.profiles(id uuid PRIMARY KEY,display_name text,avatar_url text,twitch_login text,twitch_user_id text,updated_at timestamptz);
  CREATE TABLE public.inventories(user_id uuid PRIMARY KEY);
  CREATE TABLE public.staff_roles(user_id uuid PRIMARY KEY,role text);
  CREATE FUNCTION private.play_staff_role(p_uid uuid DEFAULT auth.uid()) RETURNS text LANGUAGE sql STABLE AS $$SELECT role FROM public.staff_roles WHERE user_id=p_uid$$;
  CREATE FUNCTION private.streamlink_protected_trainer(p_uid uuid) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT p_uid='${uuid(6)}'::uuid$$;
  CREATE TABLE private.account_audit(actor_id uuid,target_id uuid,action text,detail jsonb);
  CREATE FUNCTION private.account_audit_write(p_action text,p_target uuid,p_twitch_user_id text DEFAULT NULL,p_detail jsonb DEFAULT '{}') RETURNS void LANGUAGE sql AS $$INSERT INTO private.account_audit VALUES(auth.uid(),p_target,p_action,p_detail)$$;
  CREATE TABLE public.twitch_connections(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES public.profiles(id),twitch_user_id text UNIQUE NOT NULL,twitch_login text NOT NULL,twitch_display_name text,avatar_url text,is_primary boolean DEFAULT false,gameplay_enabled boolean DEFAULT true,login_enabled boolean DEFAULT true,connection_type text,confirmed boolean DEFAULT false,last_verified_at timestamptz,authorization_status text DEFAULT 'connected',created_at timestamptz DEFAULT now(),linked_at timestamptz DEFAULT now(),updated_at timestamptz);
  CREATE UNIQUE INDEX one_primary ON public.twitch_connections(user_id) WHERE is_primary AND confirmed;
  REVOKE ALL ON public.twitch_connections FROM PUBLIC,anon,authenticated;
  GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
  GRANT EXECUTE ON FUNCTION auth.uid(),auth.jwt() TO anon,authenticated;`);
 // Use the actual recent-owner AMR/session validation, with synthetic Auth data.
 const recovery=fs.readFileSync(path.join(root,'supabase/owner-recovery-email.sql'),'utf8');
 const recent=recovery.match(/CREATE FUNCTION private\.require_recent_recovery_owner\(\)[\s\S]*?\$\$;/)[0];
 await c.query(recent);
 const funcs=require('../docs/project-command-center/evidence/issue17-current-functions.json').functions;
 await c.query(funcs.find(f=>f.name==='handle_new_identity').definition);
 await c.query('CREATE TRIGGER on_auth_identity_created AFTER INSERT ON auth.identities FOR EACH ROW EXECUTE FUNCTION private.handle_new_identity()');
 await c.query(fs.readFileSync(path.join(root,'supabase/unapplied/account-link-policy/001_link_guard.sql'),'utf8'));
 const user=async(id,role='player')=>{await c.query("INSERT INTO auth.users(id,email,email_confirmed_at,encrypted_password) VALUES($1,$2,now(),'synthetic-not-a-real-password-hash')",[id,id+'@example.invalid']);await c.query('INSERT INTO public.profiles(id,display_name) VALUES($1,\'Fixture\')',[id]);await c.query('INSERT INTO public.staff_roles VALUES($1,$2)',[id,role]);await c.query("INSERT INTO auth.identities(user_id,provider,provider_id,identity_data) VALUES($1,'email',$2,'{}')",[id,id+'@example.invalid']);};
 for(let i=1;i<=20;i++)await user(uuid(i),i===4?'moderator':i===5?'owner':'player');
 const link=async(db,id,providerId)=>db.query("INSERT INTO auth.identities(user_id,provider,provider_id,identity_data) VALUES($1,'twitch',$2,$3)",[id,providerId,{sub:providerId,preferred_username:'fixture'+providerId}]);
 const count=async(id)=>Number((await c.query('SELECT count(*) n FROM public.twitch_connections WHERE user_id=$1',[id])).rows[0].n);
 async function denied(name,f,code){let e;try{await f();}catch(x){e=x;}assert(e,name+' should be denied');if(code)assert.equal(e.code,code,name+': '+e.message);pass(name);}
 // Preserve a realistic existing multi-link account when policy is enabled.
 await link(c,uuid(3),'301');await link(c,uuid(3),'302');
 await c.query('UPDATE public.twitch_connections SET confirmed=true WHERE user_id=$1',[uuid(3)]);
 await link(c,uuid(11),'1101');await link(c,uuid(11),'1102');
 assert.equal(await count(uuid(3)),2);pass('Disabled installation preserves existing linking behavior');
 await c.query('UPDATE private.twitch_link_policy_settings SET enabled=true,qa_user=$1',[uuid(15)]);
 await link(c,uuid(16),'1601');await link(c,uuid(16),'1602');assert.equal(await count(uuid(16)),2);pass('QA-only staging leaves other trainers on existing behavior');
 await link(c,uuid(15),'1501');await denied('QA-only staging enforces cap for selected synthetic trainer',()=>link(c,uuid(15),'1502'),'23514');
 await c.query('UPDATE private.twitch_link_policy_settings SET qa_user=NULL');
 await link(c,uuid(1),'101');assert.equal(await count(uuid(1)),1);pass('First ordinary link passes canonical Auth trigger');
 await denied('Second ordinary OAuth identity rolls back',()=>link(c,uuid(1),'102'),'23514');
 assert.equal((await c.query("SELECT count(*)::int n FROM auth.identities WHERE provider_id='102'")).rows[0].n,0);pass('Rejected second link leaves no Auth identity or connection');
 await denied('Canonical alias collision cannot move identity',()=>link(c,uuid(2),'miu:000101'),'42501');
 await denied('Same-owner alias cannot create duplicate connection',()=>link(c,uuid(1),'miu:000101'),'42501');
 await denied('Provider ID and returned subject must agree',()=>c.query("INSERT INTO auth.identities(user_id,provider,provider_id,identity_data) VALUES($1,'twitch','103','{\"sub\":\"104\"}')",[uuid(2)]),'22023');
 await denied('Unverified application connection is rejected',()=>c.query("INSERT INTO public.twitch_connections(user_id,twitch_user_id,twitch_login) VALUES($1,'999','forged')",[uuid(2)]),'42501');
 await denied('Invalid provider identity rejected',()=>link(c,uuid(2),'not-a-numeric-id'),'22023');
 await c.query("UPDATE auth.identities SET identity_data=identity_data||'{\"preferred_username\":\"renamed\"}' WHERE provider_id='101'");pass('Same verified identity metadata refresh allowed');
 await denied('Provider identity transfer denied',()=>c.query('UPDATE auth.identities SET user_id=$1 WHERE provider_id=\'101\'',[uuid(2)]),'42501');
 await denied('Provider ID cannot change under existing subject',()=>c.query("UPDATE auth.identities SET provider_id='105' WHERE provider_id='101'"),'42501');
 await denied('Changing an email provider into Twitch cannot bypass ingress',()=>c.query("UPDATE auth.identities SET provider='twitch',provider_id='107',identity_data='{\"sub\":\"107\"}' WHERE user_id=$1 AND provider='email'",[uuid(1)]),'42501');
 await denied('Pending confirmation rechecks count on server',()=>c.query("UPDATE public.twitch_connections SET confirmed=true WHERE twitch_user_id='1102'"),'23514');
 assert.equal((await c.query("SELECT confirmed FROM public.twitch_connections WHERE twitch_user_id='1102'")).rows[0].confirmed,false);pass('Denied pending confirmation leaves original link pending');
 await denied('Application identity reassignment denied',()=>c.query("UPDATE public.twitch_connections SET user_id=$1 WHERE twitch_user_id='101'",[uuid(2)]),'42501');
 await c.query("UPDATE public.twitch_connections SET login_enabled=false WHERE user_id=$1",[uuid(3)]);
 assert.equal(await count(uuid(3)),2);pass('Existing extra links preserved on activation and flag refresh');
 await denied('Existing multi-link account cannot add another',()=>link(c,uuid(3),'303'),'23514');
 await link(c,uuid(4),'401');
 await denied('Moderator role alone grants no exception',()=>link(c,uuid(4),'402'),'23514');
 const sid=uuid(999);await c.query('INSERT INTO auth.sessions VALUES($1,$2,NULL)',[sid,uuid(5)]);
 async function actor(id,age=0,db=c){await db.query('UPDATE auth.sessions SET user_id=$1,not_after=NULL WHERE id=$2',[id,sid]);await db.query("SELECT set_config('fixture.uid',$1,false),set_config('fixture.jwt',$2,false)",[id,JSON.stringify({session_id:sid,amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)-age}]})]);}
 const exception=async(target,enabled=true,rev=0)=>c.query("SELECT public.owner_twitch_link_exception($1,$2,2,'Separate streaming identity','Fixture policy review','LOCAL-QA-17',$3) data",[target,enabled,rev]);
 await actor(uuid(4));await denied('Moderator cannot approve exception',()=>exception(uuid(4)),'42501');
 await actor(uuid(5),600);await denied('Stale owner authentication denied',()=>exception(uuid(4)),'42501');
 await actor(uuid(5));await denied('Ordinary player cannot receive exception',()=>exception(uuid(2)),'42501');
 await denied('Protected target exception denied',()=>exception(uuid(6)),'42501');
 assert.equal((await exception(uuid(4))).rows[0].data.revision,1);pass('Fresh owner grants bounded staff exception');
 await denied('Stale exception revision cannot duplicate approval',()=>exception(uuid(4)),'40001');
 assert.equal((await c.query('SELECT count(*)::int n FROM private.account_audit')).rows[0].n,1);pass('Exception audit contains one approved change');
 await link(c,uuid(4),'402');assert.equal(await count(uuid(4)),2);pass('Explicit staff exception allows second verified link');
 await denied('Staff exception cap enforced',()=>link(c,uuid(4),'403'),'23514');
 await c.query("UPDATE public.staff_roles SET role='player' WHERE user_id=$1",[uuid(4)]);
 await denied('Demotion blocks further linking',()=>link(c,uuid(4),'404'),'23514');
 assert.equal(await count(uuid(4)),2);pass('Demotion does not remove existing links');
 await exception(uuid(4),false,1);assert.equal(await count(uuid(4)),2);pass('Exception revocation preserves links');
 await actor(uuid(4));let state=(await c.query('SELECT public.play_twitch_link_policy() data')).rows[0].data;
 assert.equal(state.needsReview,true);assert.equal(state.canAdd,false);assert.equal(state.limit,1);pass('Own policy state flags non-destructive review');
 await c.query('SET ROLE authenticated');await denied('Players cannot inspect private exceptions',()=>c.query('SELECT * FROM private.twitch_link_exceptions'),'42501');await c.query('RESET ROLE');
 await c.query('SET ROLE anon');await denied('Anonymous policy RPC denied',()=>c.query('SELECT public.play_twitch_link_policy()'),'42501');await c.query('RESET ROLE');
 await c.query('UPDATE auth.sessions SET not_after=now()-interval \'1 second\' WHERE id=$1',[sid]);await denied('Expired session policy read denied',()=>c.query('SELECT public.play_twitch_link_policy()'),'42501');
 c2=cluster.getPgClient('postgres','127.0.0.1');await c2.connect();
 let races=await Promise.allSettled([link(c,uuid(7),'701'),link(c2,uuid(7),'702')]);
 assert.equal(races.filter(x=>x.status==='fulfilled').length,1);assert.equal(await count(uuid(7)),1);pass('Concurrent ordinary links serialize to one winner');
 await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ');await c2.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
 await c.query('SELECT count(*) FROM private.twitch_link_mutex');await c2.query('SELECT count(*) FROM private.twitch_link_mutex');
 // Commit each winner immediately so the competing transaction can finish.
 const tx=async(db,id)=>{try{await link(db,uuid(8),id);await db.query('COMMIT');return true;}catch(e){await db.query('ROLLBACK');assert(['40001','23514'].includes(e.code),e.message);return false;}};
 races=await Promise.all([tx(c,'801'),tx(c2,'802')]);assert.equal(races.filter(Boolean).length,1);assert.equal(await count(uuid(8)),1);pass('Repeatable-read stale-snapshot race also fails closed');
 // A preexisting unrepresented Auth identity still consumes the one slot.
 await c.query('ALTER TABLE auth.identities DISABLE TRIGGER on_auth_identity_created');await link(c,uuid(9),'901');await c.query('ALTER TABLE auth.identities ENABLE TRIGGER on_auth_identity_created');
 await denied('Auth identity without application row reserves slot',()=>link(c,uuid(9),'902'),'23514');
 assert.equal(await count(uuid(9)),0);pass('No repair grant or synthetic connection inserted');
 await actor(uuid(5));await c.query("UPDATE public.staff_roles SET role='moderator' WHERE user_id=$1",[uuid(12)]);
 await exception(uuid(12));await link(c,uuid(12),'1201');
 const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;
 await c2.query('BEGIN');await c2.query("UPDATE public.staff_roles SET role='player' WHERE user_id=$1",[uuid(12)]);
 const blocked=link(c,uuid(12),'1202').then(()=>({ok:true}),error=>({ok:false,error}));
 let waited=false;
 for(let i=0;i<100;i++){
  if((await c2.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",[pid])).rows[0].wait_event_type==='Lock'){waited=true;break;}
  await new Promise(r=>setTimeout(r,10));
 }
 assert(waited,'Link did not wait for concurrent role update');
 await c2.query('COMMIT');const demotion=await blocked;assert.equal(demotion.ok,false);assert.equal(demotion.error.code,'23514');
 assert.equal(await count(uuid(12)),1);pass('Concurrent committed demotion blocks exception before linking');
 // Verified disconnect RPCs. Auth's provider deletion below is explicitly a
 // synthetic stand-in for unlinkIdentity, never a hosted SQL operation.
 for(const name of ['profile_has_password','twitch_login_methods','sync_primary_twitch','play_disconnect_twitch'])await c.query(funcs.find(f=>f.name===name).definition);
 await c.query("CREATE FUNCTION public.play_account_state() RETURNS jsonb LANGUAGE sql AS $$SELECT '{}'::jsonb$$");
 const priorAcl=(await c.query("SELECT coalesce(proacl,acldefault('f',proowner))::text acl FROM pg_proc WHERE oid='public.play_disconnect_twitch(text)'::regprocedure")).rows[0].acl;
 await c.query(fs.readFileSync(path.join(root,'supabase/unapplied/account-link-policy/002_verified_disconnect.sql'),'utf8'));
 const prepare=async(who,id)=> (await c.query('SELECT public.play_prepare_twitch_disconnect($1,$2) data',[who,id])).rows[0].data;
 const finish=async(id,db=c)=>(await db.query('SELECT public.play_finish_twitch_disconnect($1) data',[id])).rows[0].data;
 const cancel=async(id)=>(await c.query('SELECT public.play_cancel_twitch_disconnect($1) data',[id])).rows[0].data;
 await actor(uuid(1));await denied('Old disconnect RPC cannot bypass enabled workflow',()=>c.query("SELECT public.play_disconnect_twitch('101')"),'55000');
 await actor(uuid(1),600);await denied('Disconnect requires recent password authentication',()=>prepare('101',uuid(3000)),'42501');
 await actor(uuid(1));await c.query('UPDATE auth.users SET email_confirmed_at=NULL WHERE id=$1',[uuid(1)]);
 await denied('Unverified email is not usable backup proof',()=>prepare('101',uuid(3000)),'42501');
 await c.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[uuid(1)]);
 await actor(uuid(6));await denied('Protected player disconnect rejected',()=>prepare('101',uuid(3000)),'42501');
 await actor(uuid(1));let request=await prepare('101',uuid(3001));assert.equal(request.state,'prepared');assert.equal((await prepare('101',uuid(3001))).identityId,request.identityId);pass('Disconnect prepare is bound and idempotent');
 assert.equal((await c.query('SELECT public.play_twitch_disconnect_state() data')).rows[0].data.requestUuid,uuid(3001));pass('Own pending request can be recovered without browser storage');
 assert.equal((await finish(request.requestUuid)).state,'awaitingProvider');assert.equal(await count(uuid(1)),1);pass('Client success claim cannot remove a present provider identity');
 await actor(uuid(2));assert.equal((await c.query('SELECT public.play_twitch_disconnect_state() data')).rows[0].data.state,'none');pass('Pending request state is isolated by actor');await denied('Foreign disconnect request cannot finish',()=>finish(uuid(3001)),'42501');
 await actor(uuid(1));await denied('Reusing request UUID with another identity denied',()=>prepare('999',uuid(3001)),'42501');
 assert.equal((await cancel(uuid(3001))).state,'cancelled');assert.equal(await count(uuid(1)),1);pass('Cancel before provider removal preserves connection');
 request=await prepare('101',uuid(3002));await c.query('DELETE FROM auth.identities WHERE id=$1',[request.identityId]);
 assert.equal((await cancel(uuid(3002))).state,'needsReconciliation');pass('Provider absence cannot be falsely cancelled as unchanged');
 assert.equal((await finish(uuid(3002))).state,'completed');assert.equal(await count(uuid(1)),0);assert.equal((await c.query('SELECT twitch_user_id FROM public.profiles WHERE id=$1',[uuid(1)])).rows[0].twitch_user_id,null);pass('SIMULATED provider removal permits verified finalization and clears matching legacy ID');
 assert.equal((await finish(uuid(3002))).state,'completed');assert.equal((await c.query("SELECT count(*)::int n FROM private.account_audit WHERE action='TWITCH_UNLINKED' AND target_id=$1",[uuid(1)])).rows[0].n,1);pass('Disconnect finish replay does not duplicate audit');
 await link(c,uuid(1),'106');assert.equal(await count(uuid(1)),1);pass('Verified removal frees slot for one replacement identity');
 await actor(uuid(9));request=await prepare('901',uuid(3003));await c.query('DELETE FROM auth.identities WHERE id=$1',[request.identityId]);assert.equal((await finish(request.requestUuid)).state,'completed');assert.equal((await c.query('SELECT public.play_twitch_link_policy() data')).rows[0].data.canAdd,true);pass('Orphan Auth identity reconciles without inventing a connection');
 await link(c,uuid(13),'1301');await actor(uuid(13));request=await prepare('1301',uuid(3004));await c.query('DELETE FROM auth.identities WHERE id=$1',[request.identityId]);await actor(uuid(13),0,c2);
 const done=await Promise.all([finish(request.requestUuid),finish(request.requestUuid,c2)]);assert(done.every(x=>x.state==='completed'));assert.equal((await c.query("SELECT count(*)::int n FROM private.account_audit WHERE action='TWITCH_UNLINKED' AND target_id=$1",[uuid(13)])).rows[0].n,1);pass('Concurrent disconnect completion produces one audit outcome');
 await link(c,uuid(14),'1401');await actor(uuid(14));for(let i=0;i<5;i++){await prepare('1401',uuid(3100+i));await cancel(uuid(3100+i));}await denied('Disconnect prepare rate limit enforced',()=>prepare('1401',uuid(3105)),'54000');
 await c.query('SET ROLE authenticated');await denied('Disconnect receipts are private',()=>c.query('SELECT * FROM private.twitch_disconnect_requests'),'42501');await c.query('RESET ROLE');
 const totals=async()=> (await c.query('SELECT (SELECT count(*)::int FROM auth.identities) identities,(SELECT count(*)::int FROM public.twitch_connections) connections,(SELECT count(*)::int FROM public.profiles) profiles,(SELECT count(*)::int FROM private.account_audit) audits')).rows[0];
 const beforeRollback=await totals();
 await c.query(fs.readFileSync(path.join(root,'supabase/unapplied/account-link-policy/rollback_verified_disconnect.sql'),'utf8'));
 assert.equal((await c.query("SELECT md5(prosrc) hash FROM pg_proc WHERE oid='public.play_disconnect_twitch(text)'::regprocedure")).rows[0].hash,'9eb6275c39191242b6789697a6e419ce');pass('Disconnect rollback restores exact prior function body');
 const restoredAcl=(await c.query("SELECT coalesce(proacl,acldefault('f',proowner))::text acl FROM pg_proc WHERE oid='public.play_disconnect_twitch(text)'::regprocedure")).rows[0].acl;
 assert.deepEqual(restoredAcl.slice(1,-1).split(',').sort(),priorAcl.slice(1,-1).split(',').sort());pass('Disconnect rollback restores captured execute ACL');
 await c.query(fs.readFileSync(path.join(root,'supabase/unapplied/account-link-policy/rollback_link_guard.sql'),'utf8'));
 assert.deepEqual(await totals(),beforeRollback);assert.equal((await c.query("SELECT to_regprocedure('public.play_twitch_link_policy()') f")).rows[0].f,null);pass('Rollback removes guard only and preserves identities, links, profiles and audit');
 console.log(`${n} REAL LOCAL SQL checks passed; Auth/session/role fixtures; no hosted calls or provider OAuth tests`);
 }finally{
  if(c2)await c2.end().catch(()=>{});if(c)await c.end().catch(()=>{});await cluster.stop().catch(()=>{});
  const resolved=path.resolve(dir);assert(resolved.startsWith(cache+path.sep)&&path.basename(resolved).startsWith('twitch17-'));fs.rmSync(resolved,{recursive:true,force:true});
 }
}
// embedded-postgres registers an async beforeExit hook with code0. Explicitly
// exit after finally/cleanup so a failed rehearsal cannot be reported as green.
main().catch(e=>{console.error('TWITCH POLICY STOP:',e);process.exit(1);});
