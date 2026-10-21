// Approved CODEX-65 logical recovery only. Never prints rows, credentials or native stderr.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),REF='dtflmlbjhttoewqgkujf';
const BASE=path.resolve(process.env.LOCALAPPDATA,'PokemonStreamLink/recovery/codex65-20261021');
const BIN='C:/Program Files/PostgreSQL/17/bin';
const {Client}=require(path.join(__dirname,'.cache/codex65-pg17/node_modules/pg'));
const OMIT=['private.stream_bridge','private.twitch_ad_auth','private.oauth_intents','private.catch_insert_authority','private.streamlink_hidden_tickets','private.twitch_disconnect_requests'];
const AUTH_OMIT=['confirmation_token','recovery_token','email_change_token_new','email_change_token_current','phone_change_token','reauthentication_token','email_change','phone_change','raw_app_meta_data','raw_user_meta_data'];
const IDENTITY_KEYS=['sub','email','email_verified','phone_verified','preferred_username','nickname','name','full_name','avatar_url','picture','iss'];
const IDENT=n=>'"'+n.replaceAll('"','""')+'"',LIT=n=>"'"+n.replaceAll("'","''")+"'";
const target=t=>t.schema+'.'+t.name,qualified=t=>IDENT(t.schema)+'.'+IDENT(t.name);
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const FRIEND_SOURCE='CHECK ((((pokeapi_base_friendship >= 0) AND (pokeapi_base_friendship <= 255)) AND ((streamlink_base_friendship >= 0) AND (streamlink_base_friendship <= 255))))';
const FRIEND_RESTORED='CHECK (((pokeapi_base_friendship >= 0) AND (pokeapi_base_friendship <= 255) AND ((streamlink_base_friendship >= 0) AND (streamlink_base_friendship <= 255))))';
const save=(p,x)=>fs.writeFileSync(p,typeof x==='string'?x:JSON.stringify(x,null,2)+'\n',{mode:0o600});
function inside(p){assert(path.resolve(p).startsWith(BASE+path.sep),'OUTSIDE_RESTRICTED_WORKSPACE');assert(!path.resolve(p).startsWith(ROOT+path.sep),'INSIDE_GIT_FORBIDDEN');}
function localEnv(){const e={...process.env};for(const k of Object.keys(e))if(/^PG|DATABASE_URL|SUPABASE|CODEX65_DB_PASSWORD/.test(k))delete e[k];return e;}
function projection(t){
  const name=target(t),cols=t.columns.filter(c=>!c.generated).map(c=>c.name);
  const drop=name==='auth.users'?AUTH_OMIT:[];
  const fields=cols.filter(c=>!drop.includes(c));
  const pairs=fields.flatMap(c=>{
    let expr='t.'+IDENT(c);
    if(name==='auth.identities'&&c==='identity_data')expr=`(select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) from jsonb_each(t.identity_data) where key=any(array[${IDENTITY_KEYS.map(LIT)}]))`;
    if(name==='private.owner_recovery_challenges'){
      if(c==='session_id')expr="'00000000-0000-0000-0000-000000000000'::uuid";
      if(c==='revision')expr="repeat('0',64)";
      if(c==='created_at')expr="'1970-01-01Z'::timestamptz";
      if(c==='expires_at')expr="'1970-01-02Z'::timestamptz";
    }
    return [LIT(c),expr];
  });
  // jsonb_build_object's function-argument bound is100; users stay below it.
  assert(pairs.length<=100,'PROJECTION_TOO_WIDE');
  return {fields,expr:`jsonb_build_object(${pairs.join(',')})`};
}
function excluded(t){return (t.schema==='auth'&&!['users','identities'].includes(t.name))||OMIT.includes(target(t));}
async function catalog(db){
  const {rows}=await db.query(`select n.nspname as schema,c.relname as name,jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'generated',a.attgenerated<>'') order by a.attnum) as columns from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped where n.nspname in ('public','private','auth') and c.relkind in ('r','p') group by 1,2 order by 1,2`);
  return rows;
}
function validateCatalog(tables){
  const allow={ 'auth.users':AUTH_OMIT.concat('encrypted_password','recovery_sent_at'),'auth.identities':[], 'private.stream_bridge':['token_hash','eventsub_secret','twitch_client_secret','github_token'],'private.twitch_ad_auth':['access_token']};
  for(const t of tables){
    if(excluded(t))continue;
    for(const c of t.columns)if(/secret|token|password|code_verifier/i.test(c.name))assert((allow[target(t)]||[]).includes(c.name),'UNREVIEWED_SENSITIVE_COLUMN');
  }
}
async function connectSource(){
  assert(process.env.CODEX65_DB_PASSWORD,'CREDENTIAL_REQUIRED');
  assert(fs.readFileSync(path.join(ROOT,'supabase/.temp/project-ref'),'utf8').trim()===REF,'PROJECT_MISMATCH');
  const ca=fs.readFileSync(path.join(BASE,'supabase-ca.crt'),'utf8');
  const db=new Client({host:'aws-0-us-west-1.pooler.supabase.com',port:5432,user:'postgres.'+REF,database:'postgres',password:process.env.CODEX65_DB_PASSWORD,ssl:{ca,rejectUnauthorized:true},connectionTimeoutMillis:10000,statement_timeout:120000,application_name:'codex65-approved-readonly-drill'});
  await db.connect();await db.query("begin isolation level repeatable read read only;set local timezone='UTC'");return db;
}
async function metadata(db){
  const roles=(await db.query("select rolname,rolbypassrls,rolinherit from pg_roles where rolname!~'^pg_' order by rolname")).rows;
  const members=(await db.query('select a.rolname as granted,b.rolname as member from pg_auth_members m join pg_roles a on a.oid=m.roleid join pg_roles b on b.oid=m.member order by 1,2')).rows;
  const functions=(await db.query("select n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' as signature,md5(p.prosrc) as hash,pg_get_userbyid(proowner) as owner,prosecdef,provolatile,proconfig,(select array_agg(x::text order by x::text) from unnest(proacl)x) as acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private','auth') order by 1")).rows;
  const tables=(await db.query("select n.nspname as schema,c.relname as name,pg_get_userbyid(c.relowner) as owner,c.relrowsecurity,c.relforcerowsecurity,c.reloptions,(select array_agg(x::text order by x::text) from unnest(c.relacl)x) as acl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private','auth') and c.relkind in ('r','p','v') order by 1,2")).rows;
  const policies=(await db.query("select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname in ('public','private','auth') order by 1,2,3")).rows;
  const constraints=(await db.query("select n.nspname||'.'||c.relname||'.'||k.conname as name,pg_get_constraintdef(k.oid) as definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private','auth') order by 1")).rows;
  return {roles,members,functions,tables,policies,constraints,structure:await structure(db)};
}
async function structure(db){
  const prior=(await db.query('show search_path')).rows[0].search_path;
  await db.query("select set_config('search_path','public,extensions',false)");
  try {
  return (await db.query(`select jsonb_build_object('constraints',(select jsonb_build_object('count',count(*),'hash',md5(string_agg(n.nspname||'.'||c.relname||':'||k.conname||':'||pg_get_constraintdef(k.oid),E'\\n' order by n.nspname,c.relname,k.conname))) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private','auth')),'triggers',(select jsonb_build_object('count',count(*),'hash',md5(string_agg(n.nspname||'.'||c.relname||':'||t.tgname||':'||pg_get_triggerdef(t.oid),E'\\n' order by n.nspname,c.relname,t.tgname))) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private','auth') and not t.tgisinternal),'indexes',(select jsonb_build_object('count',count(*),'hash',md5(string_agg(schemaname||'.'||tablename||':'||indexname||':'||indexdef,E'\\n' order by schemaname,tablename,indexname))) from pg_indexes where schemaname in ('public','private','auth'))) as result`)).rows[0].result;
  } finally { await db.query("select set_config('search_path',$1,false)",[prior]); }
}
async function digest(db,t){
  const special=['auth.users','auth.identities','private.owner_recovery_challenges'].includes(target(t));
  const expr=special?projection(t).expr:'to_jsonb(t)';
  return (await db.query(`select count(*)::int as rows,md5(coalesce(string_agg(h,'' order by h),'')) as hash from(select md5((${expr})::text) as h from ${qualified(t)} t)q`)).rows[0];
}
function native(name,args,env,run,output){
  // pg_ctl's detached Windows server inherits handles: pipes would wait for the server's exit.
  const fd=output?fs.openSync(output,'w',0o600):(name==='pg_ctl'?fs.openSync(path.join(run,'pg_ctl-output.log'),'a',0o600):null);
  const errfd=name==='pg_ctl'?fs.openSync(path.join(run,'pg_ctl-diagnostic.log'),'a',0o600):null;
  const r=spawnSync(path.join(BIN,name+'.exe'),args,{env,encoding:'utf8',windowsHide:true,timeout:240000,maxBuffer:32*1024*1024,stdio:fd===null?'pipe':['ignore',fd,errfd===null?'pipe':errfd]});
  if(fd!==null)fs.closeSync(fd);if(errfd!==null)fs.closeSync(errfd);
  if(r.status!==0){if(r.stderr)save(path.join(run,name+'-failure.log'),r.stderr);throw Object.assign(new Error('NATIVE_'+name.toUpperCase()+'_FAILED'),{exitCode:r.status});}
  return r.stdout||'';
}
async function startLocal(run){
  const dir=path.join(run,'pg17'),pwfile=path.join(run,'local-runtime-password.txt'),password=crypto.randomBytes(32).toString('hex'),port=55487;
  save(pwfile,password+'\n');
  native('initdb',['-D',dir,'-U','postgres','--pwfile='+pwfile,'--auth=scram-sha-256','--encoding=UTF8','--no-locale'],localEnv(),run);
  fs.appendFileSync(path.join(dir,'postgresql.conf'),`\nlisten_addresses='127.0.0.1'\nport=${port}\nshared_preload_libraries=''\nsession_preload_libraries=''\nlocal_preload_libraries=''\nmax_worker_processes=0\nmax_replication_slots=0\nmax_wal_senders=0\ntimezone='UTC'\n`);
  try { native('pg_ctl',['-D',dir,'-l',path.join(run,'local-postgres.log'),'-t','20','-w','start'],localEnv(),run); }
  catch(e) { spawnSync(path.join(BIN,'pg_ctl.exe'),['-D',dir,'-m','fast','-w','stop'],{env:localEnv(),windowsHide:true,stdio:'ignore'});throw e; }
  const config={host:'127.0.0.1',port,user:'postgres',password,database:'postgres',connectionTimeoutMillis:10000};
  const db=new Client(config);try { await db.connect();assert.equal((await db.query('select host(inet_server_addr()) as host')).rows[0].host,'127.0.0.1'); }
  catch(e) { await db.end().catch(()=>{});spawnSync(path.join(BIN,'pg_ctl.exe'),['-D',dir,'-m','fast','-w','stop'],{env:localEnv(),windowsHide:true,stdio:'ignore'});throw e; }
  return {db,config,dir,password,port,env:{...localEnv(),PGHOST:'127.0.0.1',PGPORT:String(port),PGUSER:'postgres',PGPASSWORD:password,PGDATABASE:'postgres'}};
}
async function fixture(local,run){
  await local.db.query('create database recovery_filter_fixture');
  const db=new Client({...local.config,database:'recovery_filter_fixture'});await db.connect();
  const checks=[];try{
    await db.query(`create schema auth;create schema private;create table auth.users(id uuid,encrypted_password text,confirmation_token text,recovery_token text,raw_app_meta_data jsonb,raw_user_meta_data jsonb);create table auth.identities(id uuid,identity_data jsonb);create table private.owner_recovery_challenges(id uuid,session_id uuid,revision text,created_at timestamptz,expires_at timestamptz);insert into auth.users values('aaaaaaaa-0000-4000-8000-000000000001','fictional-approved-hash','LIVE_SECRET_CONFIRM','LIVE_SECRET_RESET','{"secret":"LIVE_SECRET_APP"}','{"token":"LIVE_SECRET_META"}');insert into auth.identities values('aaaaaaaa-0000-4000-8000-000000000001','{"sub":"fictional-provider","email":"qa@example.invalid","access_token":"LIVE_SECRET_PROVIDER","custom":{"token":"LIVE_SECRET_NESTED"}}');insert into private.owner_recovery_challenges values('aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000002','LIVE_SECRET_REVISION',now(),now()+interval '1 hour')`);
    const tables=await catalog(db);validateCatalog(tables);checks.push('Reviewed sensitive-column allowlist accepts known fixture');
    for(const t of tables){const result=(await db.query(`select ${projection(t).expr} as row from ${qualified(t)} t`)).rows;assert(!JSON.stringify(result).includes('LIVE_SECRET'));checks.push('Source projection strips live secrets from '+target(t));}
    const user=(await db.query(`select ${projection(tables.find(t=>target(t)==='auth.users')).expr} as row from auth.users t`)).rows[0].row;
    assert.equal(user.encrypted_password,'fictional-approved-hash');checks.push('Explicitly approved credential hash survives filtering');
    const bad=JSON.parse(JSON.stringify(tables));bad[0].columns.push({name:'new_unreviewed_token',type:'text',generated:false});assert.throws(()=>validateCatalog(bad));checks.push('Unknown sensitive column refuses export');
    const challenge=(await db.query(`select ${projection(tables.find(t=>target(t)==='private.owner_recovery_challenges')).expr} as row from private.owner_recovery_challenges t`)).rows[0].row;assert.equal(challenge.session_id,'00000000-0000-0000-0000-000000000000');assert(new Date(challenge.expires_at)<new Date());checks.push('Recovery audit parent retains FK identity with expired synthetic authorization');
    assert.equal((await local.db.query('show max_worker_processes')).rows[0].max_worker_processes,'0');assert.equal((await local.db.query("select count(*)::int n from pg_extension where extname in ('pg_cron','pg_net','dblink','postgres_fdw','supabase_vault')")).rows[0].n,0);checks.push('Scheduling/network extensions absent and background workers disabled');
    const archive=path.join(run,'fictional-schema.dump');native('pg_dump',['-Fc','--schema-only','--schema=public','--schema=private','--schema=auth','--dbname=recovery_filter_fixture'],local.env,run,archive);
    await local.db.query('create database recovery_filter_target');
    const targetDb=new Client({...local.config,database:'recovery_filter_target'});await targetDb.connect();try {
      assert.equal((await targetDb.query('select current_database() n')).rows[0].n,'recovery_filter_target');await targetDb.query('drop schema public');
      native('pg_restore',['--exit-on-error','--section=pre-data','--dbname=recovery_filter_target',archive],local.env,run);
      for(const t of tables){const p=projection(t),rows=(await db.query(`select ${p.expr} as row from ${qualified(t)} t`)).rows;for(const r of rows)await targetDb.query(`insert into ${qualified(t)}(${p.fields.map(IDENT)}) select ${p.fields.map(IDENT)} from jsonb_populate_record(null::${qualified(t)},$1::jsonb)`,[JSON.stringify(r.row)]);assert.deepEqual(await digest(targetDb,t),await digest(db,t));}
    }finally{await targetDb.end();}
    native('pg_restore',['--exit-on-error','--section=post-data','--dbname=recovery_filter_target',archive],local.env,run);checks.push('Native PG17 schema restore and filtered parameterized imports match source projections');
    await db.query('create table private.owner_acl_fixture(id int);revoke all on private.owner_acl_fixture from public');
    const a=(await db.query("select relacl::text as raw,coalesce(relacl,acldefault('r',relowner))::text as effective from pg_class where oid='private.owner_acl_fixture'::regclass")).rows[0];
    await db.query('create table private.default_acl_fixture(id int)');
    const b=(await db.query("select relacl::text as raw,coalesce(relacl,acldefault('r',relowner))::text as effective from pg_class where oid='private.default_acl_fixture'::regclass")).rows[0];
    assert.notEqual(a.raw,b.raw);assert.equal(a.effective,b.effective);checks.push('Explicit owner-only ACL and NULL table ACL have identical PostgreSQL effective ACLs');
    const expressionProof=await friendshipEquivalence(db);assert(expressionProof.equivalent&&expressionProof.cases===49);checks.push('Reviewed PG17 friendship CHECK parenthesizations match across49 null/boundary combinations');
    save(path.join(run,'fictional-filter-checks.json'),{checks});console.log(JSON.stringify({phase:'FICTIONAL_SQL_FILTERS_PASS',checks:checks.length}));return checks;
  }finally{await db.end();}
}
function normalizeTableACL(rows){return rows.map(r=>{assert(/^[A-Za-z_][A-Za-z_0-9]*$/.test(r.owner),'UNREVIEWED_OWNER_NAME');return {...r,acl:r.acl??[`${r.owner}=arwdDxtm/${r.owner}`]};});}
async function verifyRestored(db,tables,meta,counts,run){
  const comparisons=[];
    for(const t of tables.filter(t=>!excluded(t))){const after=await digest(db,t);assert.deepEqual(after,counts[target(t)],'DATA_DIGEST_MISMATCH');comparisons.push({relation:target(t),rows:after.rows,matches:true});}
    for(const t of tables.filter(excluded))assert.equal((await db.query(`select count(*)::int n from ${qualified(t)}`)).rows[0].n,0,'OMITTED_DATA_PRESENT');
    const tokenColumns=tables.find(t=>target(t)==='auth.users').columns.filter(c=>/token/i.test(c.name)).map(c=>IDENT(c.name));
    assert.equal((await db.query(`select count(*)::int n from auth.users where ${tokenColumns.map(c=>`coalesce(${c},'')<>''`).join(' or ')}`)).rows[0].n,0,'AUTH_TOKEN_PRESENT');
    assert.equal((await db.query("select count(*)::int n from private.owner_recovery_challenges where session_id<>'00000000-0000-0000-0000-000000000000'::uuid or expires_at>now() or revision<>repeat('0',64)")).rows[0].n,0,'LIVE_RECOVERY_AUTHORIZATION_PRESENT');
  const restored=await metadata(db);for(const k of ['functions','tables','policies'])assert.deepEqual(k==='tables'?normalizeTableACL(restored[k]):restored[k],k==='tables'?normalizeTableACL(meta[k]):meta[k],'METADATA_'+k.toUpperCase()+'_MISMATCH');
  const constraintDetails=(await db.query("select n.nspname||'.'||c.relname||'.'||k.conname as name,pg_get_constraintdef(k.oid) as definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private','auth') order by 1")).rows;
  save(path.join(run,'constraint-local-details.json'),constraintDetails);
  const followup=path.join(run,'source-structure-followup.json'),expectedStructure=meta.structure||(fs.existsSync(followup)?JSON.parse(fs.readFileSync(followup,'utf8')):null);
  let structuralException=null;
  if(expectedStructure){
    save(path.join(run,'structure-local-diagnostic.json'),restored.structure);
    assert.deepEqual(restored.structure.indexes,expectedStructure.indexes,'INDEX_METADATA_MISMATCH');assert.deepEqual(restored.structure.triggers,expectedStructure.triggers,'TRIGGER_METADATA_MISMATCH');
    if(restored.structure.constraints.hash!==expectedStructure.constraints.hash){
      const sourceDetails=meta.constraints||JSON.parse(fs.readFileSync(path.join(run,'constraint-source-details.json'),'utf8'));
      const sources=new Map(sourceDetails.map(x=>[x.name,x.definition])),actuals=new Map(constraintDetails.map(x=>[x.name,x.definition]));
      const differences=[...new Set([...sources.keys(),...actuals.keys()])].filter(k=>sources.get(k)!==actuals.get(k));
      assert.deepEqual(differences,['private.ref_species.ref_species_friendship'],'UNREVIEWED_CONSTRAINT_DIFFERENCE');
      assert.equal(sources.get(differences[0]),FRIEND_SOURCE,'UNREVIEWED_SOURCE_EXPRESSION');assert.equal(actuals.get(differences[0]),FRIEND_RESTORED,'UNREVIEWED_RESTORED_EXPRESSION');
      const extracted=path.join(run,'schema-pre-data.sql');native('pg_restore',['--section=pre-data','--file='+extracted,path.join(run,'schema.dump')],localEnv(),run);
      assert(fs.readFileSync(extracted,'utf8').split('\n').some(line=>line.includes('CONSTRAINT ref_species_friendship ')&&line.includes(FRIEND_SOURCE)),'ORIGINAL_ARCHIVE_CONSTRAINT_NOT_CONFIRMED');
      const check=await friendshipEquivalence(db);assert(check.equivalent&&check.cases===49,'CONSTRAINT_LOGIC_MISMATCH');
      structuralException={name:differences[0],reason:'PG17.6 to17.11 parser/deparser AND parenthesization only;exact original archive checked',source:FRIEND_SOURCE,restored:FRIEND_RESTORED,cases:check.cases,sourceHash:expectedStructure.constraints.hash,restoredHash:restored.structure.constraints.hash};
    }
    assert.equal(restored.structure.constraints.count,expectedStructure.constraints.count,'CONSTRAINT_COUNT_MISMATCH');
  }
    assert.equal((await db.query("select count(*)::int n from pg_extension where extname not in ('plpgsql','pgcrypto','uuid-ossp')")).rows[0].n,0,'UNEXPECTED_EXTENSION');
    assert.equal((await db.query('show max_worker_processes')).rows[0].max_worker_processes,'0');
    save(path.join(run,'verification.json'),{comparisons,metadataFunctions:meta.functions.length,metadataRelations:meta.tables.length,metadataPolicies:meta.policies.length,structure:expectedStructure?restored.structure:null,structuralException,isolationVerified:true,omittedTablesEmpty:true});
  return {tables:comparisons.length,functions:meta.functions.length,relations:meta.tables.length,policies:meta.policies.length,structure:expectedStructure?restored.structure:null,structuralException,isolationVerified:true};
}
async function friendshipEquivalence(db){return (await db.query(`with valueset(n) as(values(null::int),(-1),(0),(1),(70),(255),(256)),points as(select a.n as pokeapi_base_friendship,b.n as streamlink_base_friendship from valueset a cross join valueset b) select count(*)::int as cases,bool_and((${FRIEND_SOURCE.slice(6)}) is not distinct from (${FRIEND_RESTORED.slice(6)})) as equivalent from points`)).rows[0];}
async function main(){
  inside(path.join(BASE,'guard'));assert(JSON.parse(fs.readFileSync(path.join(BASE,'workspace.json'),'utf8').replace(/^\uFEFF/,'')).projectRef===REF,'WORKSPACE_PROJECT_MISMATCH');
  const mode=process.argv[2];if(mode==='--verify-existing')return verifyExisting(process.argv[3]);assert(['--plan','--fixture','--run'].includes(mode),'EXPLICIT_MODE_REQUIRED');
  const run=fs.mkdtempSync(path.join(BASE,mode==='--fixture'?'fixture-':'drill-'));inside(run);
  let source,local;const report={mode,startedAt:new Date().toISOString(),productionWrites:false,exported:false,restored:false};
  try{
    if(mode!=='--plan'){local=await startLocal(run);report.fixtureChecks=await fixture(local,run);}
    if(mode==='--fixture')return;
    source=await connectSource();report.sourceSnapshotAt=(await source.query('select transaction_timestamp() as at')).rows[0].at;
    assert.equal((await source.query('select count(*)::int n from pg_largeobject_metadata')).rows[0].n,0,'UNREVIEWED_LARGE_OBJECTS');
    assert.equal((await source.query("select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname in ('public','private','auth') and l.lanname not in ('sql','plpgsql')")).rows[0].n,0,'UNREVIEWED_PROCEDURAL_LANGUAGE');
    const tables=await catalog(source);validateCatalog(tables);
    const meta=await metadata(source);
    const manifest={project:REF,sourceTables:tables,omittedTableData:tables.filter(excluded).map(target),authUserOmittedColumns:AUTH_OMIT,identityAllowedKeys:IDENTITY_KEYS,recoveryChallengeTransformation:'Preserve record ID/actor/target and masked destination;replace session with zero UUID,revision with64 zeros,and creation/expiry with1970 timestamps. Keeps audit FK without copying live session authorization.',safeExtensions:['plpgsql','pgcrypto','uuid-ossp'],omittedExtensions:['pg_cron','pg_net','supabase_vault','pg_stat_statements','dblink','postgres_fdw'],roleSafetyDelta:'Roles other than local postgres are NOLOGIN,NOSUPERUSER,NOCREATEDB,NOCREATEROLE,NOREPLICATION. Membership and bypass-RLS flag retained for metadata coverage;no role password hashes copied.',commands:{schema:['pg_dump','-Fc','--schema-only','--schema=public','--schema=private','--schema=auth','--snapshot=<exported-snapshot>'],data:['pg_dump','-Fc','--data-only','--schema=public','--schema=private','--schema=auth','--exclude-table-data=auth.*',...OMIT.map(t=>'--exclude-table-data='+t),'--exclude-table-data=private.owner_recovery_challenges','--snapshot=<same-snapshot>'],filtered:['SELECT source projections to restricted JSON files for auth.users,auth.identities,private.owner_recovery_challenges'],restore:['pg_restore --section=pre-data','parameterized filtered inserts and trigger-disabled data restore','pg_restore --section=post-data','metadata/data/isolation verification','pg_ctl stop']}};
    save(path.join(run,'omission-manifest.json'),manifest);save(path.join(run,'source-metadata.json'),meta);
    console.log(JSON.stringify({phase:'MANIFEST_READY',tables:tables.length,omittedTables:manifest.omittedTableData.length,sourceVersion:(await source.query('show server_version')).rows[0].server_version}));
    if(mode==='--plan')return;
    const reviewed=path.join(BASE,'reviewed-manifest.json');assert(fs.existsSync(reviewed),'REVIEWED_MANIFEST_REQUIRED');const approved=JSON.parse(fs.readFileSync(reviewed,'utf8'));assert.deepEqual(manifest,approved,'MANIFEST_DRIFT');
    const snapshot=(await source.query('select pg_export_snapshot() as id')).rows[0].id;
    assert.equal((await source.query("select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private','auth') and p.prosrc ~ '(eyJ[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+|sb_secret_[A-Za-z0-9]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})'")).rows[0].n,0,'POSSIBLE_EMBEDDED_SCHEMA_SECRET');
    const pgEnv={...localEnv(),PGHOST:'aws-0-us-west-1.pooler.supabase.com',PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'postgres.'+REF,PGPASSWORD:process.env.CODEX65_DB_PASSWORD,PGSSLMODE:'verify-full',PGSSLROOTCERT:path.join(BASE,'supabase-ca.crt'),PGAPPNAME:'codex65-approved-logical-export'};
    const common=['--format=custom','--schema=public','--schema=private','--schema=auth','--no-publications','--no-subscriptions','--snapshot='+snapshot,'--lock-wait-timeout=15s'];
    const schema=path.join(run,'schema.dump'),data=path.join(run,'application-data.dump');
    native('pg_dump',[...common,'--schema-only'],pgEnv,run,schema);
    const toc=native('pg_restore',['--list',schema],localEnv(),run);save(path.join(run,'schema-toc.txt'),toc);
    assert(!/^\d+;.*\b(?:EXTENSION|EVENT TRIGGER|SERVER|USER MAPPING|SUBSCRIPTION|PUBLICATION|PROCEDURAL LANGUAGE)\b/m.test(toc),'UNSAFE_SCHEMA_TOC');
    const counts={};for(const t of tables.filter(t=>!excluded(t)))counts[target(t)]=await digest(source,t);save(path.join(run,'source-data-digests.json'),counts);
    for(const t of tables.filter(t=>['auth.users','auth.identities','private.owner_recovery_challenges'].includes(target(t)))){
      const rows=(await source.query(`select ${projection(t).expr} as row from ${qualified(t)} t`)).rows.map(r=>r.row);save(path.join(run,t.schema+'-'+t.name+'.filtered.json'),rows);
    }
    native('pg_dump',[...common,'--data-only','--exclude-table-data=auth.*',...OMIT.map(t=>'--exclude-table-data='+t),'--exclude-table-data=private.owner_recovery_challenges'],pgEnv,run,data);
    report.exported=true;report.exportCompletedAt=new Date().toISOString();
    const jobs=(await source.query('select jobname,schedule,command,active,username,nodename,nodeport from cron.job order by jobid')).rows;save(path.join(run,'cron-inert-metadata.json'),jobs);
    const migration=(await source.query('select version,name from supabase_migrations.schema_migrations order by version')).rows;save(path.join(run,'migration-inventory.json'),migration);
    await source.query('rollback');await source.end();source=null;console.log(JSON.stringify({phase:'FILTERED_EXPORT_COMPLETE',tables:Object.keys(counts).length}));
    for(const r of meta.roles)if(r.rolname!=='postgres')await local.db.query(`create role ${IDENT(r.rolname)} nologin nosuperuser nocreatedb nocreaterole noreplication ${r.rolbypassrls?'bypassrls':'nobypassrls'} ${r.rolinherit?'inherit':'noinherit'}`);
    for(const m of meta.members)await local.db.query(`grant ${IDENT(m.granted)} to ${IDENT(m.member)}`);
    await local.db.query('create database codex65_restored');await local.db.end();local.db=new Client({...local.config,database:'codex65_restored'});await local.db.connect();
    assert.equal((await local.db.query('select current_database() n')).rows[0].n,'codex65_restored');await local.db.query('drop schema public');
    const env={...local.env,PGDATABASE:'codex65_restored'};
    // Only harmless crypto/UUID support. No scheduler, Vault or network extension is installed.
    await local.db.query('create schema extensions;create extension pgcrypto with schema extensions;create extension "uuid-ossp" with schema extensions');
    native('pg_restore',['--exit-on-error','--section=pre-data','--dbname=codex65_restored',schema],env,run);
    await local.db.query("set timezone='UTC';set session_replication_role='replica'");
    for(const t of tables.filter(t=>['auth.users','auth.identities','private.owner_recovery_challenges'].includes(target(t)))){
      const rows=JSON.parse(fs.readFileSync(path.join(run,t.schema+'-'+t.name+'.filtered.json'),'utf8')),cols=projection(t).fields;
      for(const row of rows)await local.db.query(`insert into ${qualified(t)}(${cols.map(IDENT)}) select ${cols.map(IDENT)} from jsonb_populate_record(null::${qualified(t)},$1::jsonb)`,[JSON.stringify(row)]);
    }
    native('pg_restore',['--exit-on-error','--disable-triggers','--data-only','--dbname=codex65_restored',data],env,run);
    await local.db.query("set session_replication_role='origin'");
    native('pg_restore',['--exit-on-error','--section=post-data','--dbname=codex65_restored',schema],env,run);
    report.restored=true;report.verification=await verifyRestored(local.db,tables,meta,counts,run);report.status='PASS';
    console.log(JSON.stringify({phase:'RESTORE_VERIFIED',...report.verification}));
  }catch(e){report.status='STOP';report.safeCode=/^[A-Z0-9_]+$/.test(e.message)?e.message:e.code||'GUARD_OR_RESTORE_FAILURE';save(path.join(run,'private-diagnostic.json'),{message:e.message,stack:e.stack,detail:e.detail});throw Object.assign(new Error(report.safeCode),{safe:true});}
  finally{
    if(source){await source.query('rollback').catch(()=>{});await source.end().catch(()=>{});}
    if(local){await local.db.end().catch(()=>{});native('pg_ctl',['-D',local.dir,'-m','fast','-w','stop'],localEnv(),run);report.localRuntimeStopped=true;}
    report.endedAt=new Date().toISOString();save(path.join(run,'summary.json'),report);console.log(JSON.stringify({phase:'SUMMARY',status:report.status||mode,exported:report.exported,restored:report.restored,localRuntimeStopped:report.localRuntimeStopped||false}));
  }
}
async function verifyExisting(basename){
  assert(/^drill-[A-Za-z0-9]+$/.test(basename||''),'INVALID_EXISTING_RUN');
  const run=path.join(BASE,basename);inside(run);
  const report=JSON.parse(fs.readFileSync(path.join(run,'summary.json'),'utf8'));
  assert(report.exported&&report.restored&&report.localRuntimeStopped,'INCOMPLETE_EXISTING_RUN');
  const manifest=JSON.parse(fs.readFileSync(path.join(run,'omission-manifest.json'),'utf8'));assert.equal(manifest.project,REF);
  assert.deepEqual(manifest,JSON.parse(fs.readFileSync(path.join(BASE,'reviewed-manifest.json'),'utf8')),'EXISTING_MANIFEST_DRIFT');
  const dir=path.join(run,'pg17'),conf=fs.readFileSync(path.join(dir,'postgresql.conf'),'utf8');
  assert(conf.includes("listen_addresses='127.0.0.1'")&&conf.includes("max_worker_processes=0")&&conf.includes("shared_preload_libraries=''"),'ISOLATION_CONFIGURATION_DRIFT');
  const config={host:'127.0.0.1',port:55487,user:'postgres',database:'codex65_restored',password:fs.readFileSync(path.join(run,'local-runtime-password.txt'),'utf8').trim(),connectionTimeoutMillis:10000};
  let db;
  try{
    native('pg_ctl',['-D',dir,'-l',path.join(run,'local-postgres.log'),'-t','20','-w','start'],localEnv(),run);db=new Client(config);await db.connect();
    const observed=(await db.query("select current_database() as name,current_setting('data_directory') as dir,host(inet_server_addr()) as host")).rows[0];
    assert.equal(observed.name,'codex65_restored');assert.equal(observed.host,'127.0.0.1');assert.equal(path.resolve(observed.dir).toLowerCase(),path.resolve(dir).toLowerCase());await db.query("set timezone='UTC'");
    report.verification=await verifyRestored(db,manifest.sourceTables,JSON.parse(fs.readFileSync(path.join(run,'source-metadata.json'),'utf8')),JSON.parse(fs.readFileSync(path.join(run,'source-data-digests.json'),'utf8')),run);
    report.status='PASS';delete report.safeCode;report.aclComparison='Table NULL ACL normalized to PostgreSQL17 owner-only default;all nondefault ACLs compared exactly. Function ACLs remain exact.';report.verifiedAt=new Date().toISOString();
    console.log(JSON.stringify({phase:'EXISTING_RESTORE_VERIFIED',...report.verification}));
  }catch(e){report.status='STOP';report.safeCode=e.code||e.message.split('\n')[0];save(path.join(run,'verification-diagnostic.json'),{message:e.message,stack:e.stack});throw Object.assign(new Error(report.safeCode),{safe:true});}
  finally{if(db)await db.end().catch(()=>{});native('pg_ctl',['-D',dir,'-m','fast','-t','20','-w','stop'],localEnv(),run);report.localRuntimeStopped=true;save(path.join(run,'summary.json'),report);}
}
if(require.main===module)main().catch(e=>{console.error(JSON.stringify({status:'DRILL_STOP',code:e.safe?e.message:'GUARD_OR_RUNTIME_FAILURE'}));process.exitCode=1;});
module.exports={projection,excluded,validateCatalog};
