/* Generate a pinned security-only packet from the read-only catalog. No connection. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const rows=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/launch-security-catalog-20261020.json')));
const folder=path.join(root,'supabase/unapplied/launch-security');fs.mkdirSync(folder,{recursive:true});
const admins=rows.filter(r=>r.schema==='public'&&r.proname.startsWith('admin_'));
const changed=['admin_overview','admin_set_pass','admin_grant_bits_pack','admin_oak_qa','admin_qa_grant_pass_reward'];
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const signature=r=>r.identity;
const defs=changed.map(name=>{
 const r=admins.find(r=>r.proname===name);assert(r);let after;
 if(name==='admin_overview')after=r.definition.replace('  perform private.settle_due_rounds();','  perform private.require_hub();\n  perform private.settle_due_rounds();');
 else after=r.definition.replace(/(\nbegin\n)/,'$1  perform private.require_staff_edit();\n');
 assert.notEqual(after,r.definition);return {signature:signature(r),before:r.definition,after};
});
const pins=rows.filter(r=>r.proname!=='play_sync').map(r=>`  if (select md5(prosrc) from pg_proc where oid=to_regprocedure(${quote(signature(r))})) is distinct from ${quote(r.body_md5)} then raise exception 'Security source drift: ${r.proname}'; end if;`);
const aclPins=admins.map(r=>`  if (select proacl::text from pg_proc where oid=to_regprocedure(${quote(signature(r))})) is distinct from ${r.acl===null?'null':quote(r.acl)} then raise exception 'Security ACL drift: ${r.proname}'; end if;`);
const exposed=admins.filter(r=>r.anon_execute);
const install=`-- Security-only packet. Generated from 2026-10-20 catalog; no gameplay calls.\nbegin;\nset local lock_timeout='5s';\ndo $guard$ begin\n${pins.join('\n')}\n${aclPins.join('\n')}\nend $guard$;\n${defs.map(d=>d.after+';').join('\n')}\n${exposed.map(r=>`revoke execute on function ${signature(r)} from public, anon;`).join('\n')}\ndo $verify$ begin\n if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and left(p.proname,6)='admin_' and has_function_privilege('anon',p.oid,'execute')) then raise exception 'Anonymous admin execution remains'; end if;\nend $verify$;\ncommit;\n`;
const rollback=`-- Restores original bodies and anonymous/PUBLIC permissions, including known risks.\n-- Emergency review only; never automatically execute.\nbegin;\n${defs.map(d=>d.before+';').join('\n')}\n${exposed.map(r=>`revoke execute on function ${signature(r)} from public, anon;\n`+(r.acl===null||r.acl.includes('{=X')||r.acl.includes(',=X')?`grant execute on function ${signature(r)} to public;\n`:'')+(r.acl&&r.acl.includes('anon=X/')?`grant execute on function ${signature(r)} to anon;`:'' )).join('\n')}\ncommit;\n`;
fs.writeFileSync(path.join(folder,'INSTALL.sql'),install);fs.writeFileSync(path.join(folder,'ROLLBACK.sql'),rollback);
fs.writeFileSync(path.join(folder,'changes.json'),JSON.stringify(defs,null,2)+'\n');
console.log(`Prepared ${defs.length} wrapper changes and ${exposed.length} anonymous ACL removals; no database connected.`);
