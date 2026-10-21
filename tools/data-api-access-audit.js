/* Prints a read-only catalog query; never connects or changes grants. */
const contract=require('../supabase/table-access-contract.json');
const values=Object.entries(contract.roles).flatMap(([role,tables])=>Object.entries(tables).flatMap(([table,privileges])=>privileges.map(privilege=>`('${role}','${table}','${privilege}')`))).join(',\n');
const query=`begin read only;
with required(role,relation,privilege) as (values ${values}), checks as (
 select *,coalesce(has_table_privilege(role,to_regclass('public.'||relation),privilege),false) allowed from required
)
select jsonb_build_object('checked',count(*),'missing',coalesce(jsonb_agg(jsonb_build_object('role',role,'relation',relation,'privilege',privilege)) filter(where not allowed),'[]'::jsonb),
 'public_schema_usage',(select jsonb_object_agg(r,has_schema_privilege(r,'public','USAGE')) from unnest(array['anon','authenticated','service_role'])r),
 'required_tables_without_rls',(select coalesce(jsonb_agg(c.relname),'[]'::jsonb) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p') and not c.relrowsecurity and c.relname in(select relation from required)),
 'familiarity_view_security_invoker',(select coalesce('security_invoker=true'=any(reloptions),false) from pg_class where oid=to_regclass('public.species_mastery_progress'))
) verification from checks;rollback;`;
if(require.main===module)process.stdout.write(query);
module.exports={query};
