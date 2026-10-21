const fs=require('fs'),path=require('path'),crypto=require('crypto');
const dir=path.resolve(__dirname,'../supabase/unapplied/distinct-generated-moves');
const old=fs.readFileSync(path.join(dir,'BASELINE.sql'),'utf8');
const next=fs.readFileSync(path.join(dir,'FUNCTION.sql'),'utf8');
const hash=sql=>crypto.createHash('md5').update(sql.split('$function$')[1]).digest('hex');
if(hash(old)!=='dda453431a59560c46fa9cb8fecfd159')throw Error('Baseline fingerprint mismatch');
const guard=expected=>`DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid='private.streamlink_level_up_slice(text,integer,integer)'::regprocedure
 AND md5(p.prosrc)='${expected}' AND p.proacl::text='{postgres=X/postgres}'
 AND p.proconfig=ARRAY['search_path=pg_catalog'] AND NOT p.prosecdef AND p.provolatile='s'
 AND pg_get_userbyid(p.proowner)='postgres') THEN
 RAISE EXCEPTION 'Move-slice source or privilege drift'; END IF;
END $guard$;\n`;
fs.writeFileSync(path.join(dir,'INSTALL.sql'),'BEGIN;\n'+guard(hash(old))+next+';\n'+guard(hash(next))+'COMMIT;\n');
fs.writeFileSync(path.join(dir,'ROLLBACK.sql'),'BEGIN;\n'+guard(hash(next))+old+';\n'+guard(hash(old))+'COMMIT;\n');
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({signature:'private.streamlink_level_up_slice(text,integer,integer)',before:hash(old),after:hash(next),acl:'{postgres=X/postgres}',owner:'postgres',securityDefiner:false,volatility:'stable',searchPath:'pg_catalog'},null,2)+'\n');
