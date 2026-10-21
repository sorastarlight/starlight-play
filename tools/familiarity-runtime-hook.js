/* Used only by the disposable current runtime harness. No hosted connection. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
exports.install=async({db,root,pass})=>{
 assert.equal((await db.query('select host(inet_server_addr()) h')).rows[0].h,'127.0.0.1');
 const shape=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/familiarity-launch-race-baseline.json'))),baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/familiarity-capture-identity-baseline.json')));
 const type=c=>c.type==='ARRAY'?c.udt.slice(1)+'[]':c.type==='USER-DEFINED'?c.udt:c.type;
 for(const c of shape.tables.filter(c=>c.name==='species_mastery_activation'&&!['singleton','lifecycle'].includes(c.column)))await db.query('alter table private.species_mastery_activation add column '+c.column+' '+type(c));
 await db.query("update private.species_mastery_activation set activated_at=clock_timestamp()-interval '1 hour'");
 for(const name of ['private.species_mastery_outbox','public.species_mastery_events']){const cols=shape.tables.filter(c=>c.schema+'.'+c.name===name);await db.query('create table '+name+'('+cols.map(c=>c.column+' '+type(c)).join(',')+')');}
 for(const c of shape.constraints.filter(c=>!c.definition.startsWith('FOREIGN KEY')))await db.query('alter table '+c.table+' add constraint '+c.name+' '+c.definition);
 await db.query("drop function private.note_species_mastery_catch(uuid);drop table private.fixture_outbox;create view private.fixture_outbox as select catch_id from private.species_mastery_outbox;alter table private.species_mastery_outbox alter status set default 'pending';alter table private.species_mastery_outbox alter attempts set default 0;alter table private.species_mastery_outbox alter enqueued_at set default clock_timestamp();alter table private.species_mastery_outbox add column capture_identity jsonb;alter table private.species_mastery_outbox add constraint familiarity_capture_identity_required check(capture_identity is not null or status='delivered')");
 for(const f of baseline.functions)await db.query(f.definition);
 await db.query(fs.readFileSync(path.join(root,'supabase/unapplied/familiarity-capture-identity/FUNCTIONS.sql'),'utf8'));
 await db.query('create trigger species_mastery_outbox_admit before insert on private.species_mastery_outbox for each row execute function private.species_mastery_outbox_admit();create trigger freeze_familiarity_capture_identity before update on private.species_mastery_outbox for each row execute function private.freeze_familiarity_capture_identity();create trigger species_mastery_events_guard before insert or update on public.species_mastery_events for each row execute function private.species_mastery_events_guard()');
 pass('Actual current settlement harness uses real snapshot admission and event guards instead of admission stub');
};
exports.verify=async({db,user,rid,pass})=>{
 const c=(await db.query('select id from public.catches where round_id=$1',[rid])).rows[0];
 const snapshot=(await db.query('select capture_identity from private.species_mastery_outbox where catch_id=$1',[c.id])).rows[0].capture_identity;
 assert.equal(snapshot.trainer_id,user);assert.equal(snapshot.dex,10);assert.equal(snapshot.round_id,rid);
 await db.query("select private.evolve_catch($1,$2,'fixture-evo','identity-runtime')",[user,c.id]);assert.equal((await db.query('select dex from public.catches where id=$1',[c.id])).rows[0].dex,11);
 assert.equal((await db.query('select private.deliver_species_mastery_outbox(1) n')).rows[0].n,1);
 assert.deepEqual((await db.query('select trainer_id,dex from public.species_mastery_events where catch_id=$1',[c.id])).rows[0],{trainer_id:user,dex:10});
 pass('Actual generator→settlement→snapshot→WIRE evolution→delayed delivery preserves original Caterpie credit');
};
