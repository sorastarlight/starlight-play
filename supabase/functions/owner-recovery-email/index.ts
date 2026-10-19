import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { createRecoveryHandler } from './handler.mjs';
const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=createClient(url,secret,options);
const sender=createClient(url,anon,{...options,auth:{...options.auth,flowType:'implicit'},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}});
const hmac=crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
Deno.serve(createRecoveryHandler({
 caller:(authorization:string)=>createClient(url,anon,{...options,global:{headers:{Authorization:authorization}}}),
 adminUser:(id:string)=>admin.auth.admin.getUserById(id),
 revision:async(user)=>Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',await hmac,new TextEncoder().encode(
  JSON.stringify([user.id,user.email,user.email_confirmed_at,user.updated_at,user.banned_until,user.deleted_at])
 )))).map(b=>b.toString(16).padStart(2,'0')).join(''),
 send:(email:string,redirectTo:string)=>sender.auth.resetPasswordForEmail(email,{redirectTo}),
 finish:(id:string,state:string)=>admin.rpc('owner_recovery_email_finish',{p_request:id,p_state:state})
}));
