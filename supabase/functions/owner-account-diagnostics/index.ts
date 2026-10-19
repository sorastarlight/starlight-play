import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { createHandler } from "./handler.mjs";
const url = Deno.env.get('SUPABASE_URL')!;
const options = {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
Deno.serve(createHandler({
  caller: (authorization: string) => createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{
    ...options,global:{headers:{Authorization:authorization}}
  }),
  adminUser: (target: string) => createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,options)
    .auth.admin.getUserById(target)
}));
