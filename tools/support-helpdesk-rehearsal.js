const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');const {pathToFileURL}=require('url');const {refuseHosted}=require('./a19-schema-rehearsal');
async function main(){refuseHosted();const cache=path.join(__dirname,'.cache','d54-pg-harness');const dir=fs.mkdtempSync(path.join(cache,'support-'));const Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;const db=new Embedded({databaseDir:dir,user:'postgres',password:'synthetic-only',port:55464,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});let c,n=0;
try{await db.initialise();await db.start();c=db.getPgClient('postgres','127.0.0.1');await c.connect();assert.equal((await c.query('select host(inet_server_addr()) h')).rows[0].h,'127.0.0.1');
await c.query(`CREATE SCHEMA auth;CREATE SCHEMA private;CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;CREATE ROLE service_role NOLOGIN;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('fixture.uid',true),'')::uuid$$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT current_setting('fixture.jwt',true)::jsonb$$;
CREATE FUNCTION private.play_staff_role() RETURNS text LANGUAGE sql AS $$SELECT nullif(current_setting('fixture.role',true),'')$$;
CREATE TABLE auth.users(id uuid PRIMARY KEY,deleted_at timestamptz,banned_until timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,not_after timestamptz);`);
const a='aaaaaaaa-0000-4000-8000-000000000001',b='aaaaaaaa-0000-4000-8000-000000000002',owner='aaaaaaaa-0000-4000-8000-000000000003',sid='bbbbbbbb-0000-4000-8000-000000000001';
for(const id of [a,b,owner])await c.query('insert into auth.users values($1,null,null)',[id]);await c.query('insert into auth.sessions values($1,$2,null)',[sid,a]);
await c.query(fs.readFileSync(path.join(__dirname,'../supabase/support-helpdesk.sql'),'utf8'));
let activeActor=a;const set=async(id=a,role='player')=>{activeActor=id;await c.query('update auth.sessions set user_id=$1,not_after=null',[id]);await c.query("select set_config('fixture.uid',$1,false),set_config('fixture.role',$2,false),set_config('fixture.jwt',$3,false)",[id,role,JSON.stringify({session_id:sid})]);};
let seq=0;const rid=()=>`cccccccc-0000-4000-8000-${String(++seq).padStart(12,'0')}`;const call=async(action,p={})=>(await c.query('select public.support_call($1,$2) data',[action,{actorId:activeActor,...p}])).rows[0].data;const deny=async f=>{await assert.rejects(f);n++;};
await set();await c.query('SET ROLE anon');await deny(()=>call('list'));await c.query('RESET ROLE');assert.equal((await call('list')).state,'disabled');n++;await c.query('update private.support_settings set enabled=true');
const payload={requestUuid:rid(),category:'bug',subcategory:'General',subject:'Synthetic report',body:'This fictional issue is used for database isolation testing.'};let made=await call('create',payload);assert.equal(made.state,'saved');n++;const id=made.ticket.id;assert.equal((await call('create',payload)).ticket.id,id);n++;await deny(()=>call('create',{...payload,body:payload.body+'changed'}));
await set(b);assert.equal((await call('list')).tickets.length,0);n++;await deny(()=>call('get',{ticketId:id}));await deny(()=>call('reply',{ticketId:id,requestUuid:rid(),expectedRevision:1,body:'Foreign reply'}));await deny(()=>call('list',{playerId:a}));
for(const role of ['player','moderator','admin','']){await set(b,role);await deny(()=>call('list',{mode:'staff'}));}
await set(owner,'owner');assert.equal((await call('list',{mode:'staff'})).tickets.length,1);n++;let updated=await call('reply',{mode:'staff',ticketId:id,requestUuid:rid(),expectedRevision:1,internal:true,body:'Private staff note',reason:'Synthetic investigation'});assert.equal(updated.ticket.state,'open');assert((await call('get',{mode:'staff',ticketId:id})).events.some(e=>e.reason==='Synthetic investigation'));n++;
await set();let got=await call('get',{ticketId:id});assert.equal(got.messages.length,1);assert(!JSON.stringify(got).includes('Private staff note'));n++;await deny(()=>call('reply',{ticketId:id,requestUuid:rid(),expectedRevision:2,internal:true,body:'Player note'}));
assert.equal((await call('reply',{ticketId:id,requestUuid:rid(),expectedRevision:1,body:'Stale reply'})).state,'conflict');n++;updated=await call('reply',{ticketId:id,requestUuid:rid(),expectedRevision:2,body:'<img src=x onerror=alert(1)>'});assert.equal(updated.ticket.state,'waiting_staff');assert.equal((await call('get',{ticketId:id})).messages[0].body,'<img src=x onerror=alert(1)>');n++;
await set(owner,'owner');await deny(()=>call('triage',{mode:'staff',ticketId:id,requestUuid:rid(),expectedRevision:3,priority:'high'}));updated=await call('transition',{mode:'staff',ticketId:id,requestUuid:rid(),expectedRevision:3,state:'resolved',reason:'Resolved in synthetic check'});n++;
await set();updated=await call('transition',{ticketId:id,requestUuid:rid(),expectedRevision:4,state:'waiting_staff'});assert.equal(updated.ticket.state,'waiting_staff');n++;
await c.query("update private.support_tickets set state='closed',closed_at=now()-interval '8 days' where id=$1",[id]);await deny(()=>call('transition',{ticketId:id,requestUuid:rid(),expectedRevision:5,state:'waiting_staff'}));

await deny(()=>call('list',{actorId:b}));
await deny(()=>call('get',{ticketId:id,cursorId:id}));
await c.query("update private.support_tickets set state='open',closed_at=null where id=$1",[id]);

const c2=db.getPgClient('postgres','127.0.0.1');await c2.connect();try{
 await c2.query("select set_config('fixture.uid',$1,false),set_config('fixture.role','player',false),set_config('fixture.jwt',$2,false)",[a,JSON.stringify({session_id:sid})]);
 const concurrent={...payload,actorId:a,requestUuid:rid(),subject:'Concurrent duplicate create'};
 const [one,two]=await Promise.all([call('create',concurrent),c2.query('select public.support_call($1,$2) data',['create',concurrent]).then(r=>r.rows[0].data)]);assert.equal(one.ticket.id,two.ticket.id);n++;
 await c.query('delete from private.support_tickets where id=$1',[one.ticket.id]);
 const replyOne={actorId:a,ticketId:id,requestUuid:rid(),expectedRevision:5,body:'Concurrent player reply A'},replyTwo={...replyOne,requestUuid:rid(),body:'Concurrent player reply B'};
 const [r1,r2]=await Promise.all([call('reply',replyOne),c2.query('select public.support_call($1,$2) data',['reply',replyTwo]).then(r=>r.rows[0].data)]);assert.deepEqual([r1.state,r2.state].sort(),['conflict','saved']);n++;
}finally{await c2.end();}
for(let i=0;i<2;i++)assert.equal((await call('create',{...payload,requestUuid:rid(),subject:'Another synthetic report '+i})).state,'saved');
assert.equal((await call('create',{...payload,requestUuid:rid()})).state,'limited');n++;
for(let i=0;i<30;i++)await c.query('insert into private.support_messages(ticket_id,author,body) values($1,$2,$3)',[id,a,'Synthetic paginated message '+i]);
const page1=await call('get',{ticketId:id});assert.equal(page1.messages.length,25);assert(page1.nextCursor);const page2=await call('get',{ticketId:id,cursorTime:page1.nextCursor.time,cursorId:page1.nextCursor.id});assert(page2.messages.length>0);assert(!page2.messages.some(x=>page1.messages.some(y=>x.id===y.id)));n++;
for(let i=0;i<27;i++)await c.query("insert into private.support_tickets(player_id,category,subcategory,subject) values($1,'bug','General','Synthetic pagination report')",[a]);
const list1=await call('list');assert.equal(list1.tickets.length,25);assert(list1.nextCursor);const list2=await call('list',{cursorTime:list1.nextCursor.time,cursorId:list1.nextCursor.id});assert(list2.tickets.length>0);assert(!list2.tickets.some(x=>list1.tickets.some(y=>x.id===y.id)));n++;
await c.query('delete from private.support_tickets where id<>$1',[id]);
await c.query('SET ROLE authenticated');await deny(()=>c.query('select * from private.support_messages'));await deny(()=>c.query('select private.prune_support_history()'));await c.query('RESET ROLE');
await c.query("update private.support_tickets set state='open',closed_at=now()-interval '100 days'");assert.equal((await c.query('select private.prune_support_history() n')).rows[0].n,0);n++;await c.query("update private.support_tickets set state='closed'");assert.equal((await c.query('select private.prune_support_history() n')).rows[0].n,1);assert.equal((await c.query('select count(*)::int n from private.support_messages')).rows[0].n,0);n++;
await c.query("update auth.sessions set not_after=now()-interval '1 second'");await deny(()=>call('list'));
console.log(`${n} real local helpdesk checks passed; no hosted calls`);
}finally{if(c)await c.end();await db.stop();}}
main().catch(e=>{console.error(e);process.exitCode=1});
