import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" }
  });
}

const FAIL = { ok: false, message: "That trainer login did not work." };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(FAIL, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const body = await req.json().catch(() => ({}));
  const identifier = String(body.identifier || "").trim();
  const password = String(body.password || "");
  if (!identifier || !password) return json(FAIL, 400);

  const anonClient = createClient(supabaseUrl, anon);
  if (identifier.includes("@")) {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: identifier,
      password
    });
    if (error || !data?.session) return json(FAIL, 401);
    return json({
      ok: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      }
    });
  }

  const admin = createClient(supabaseUrl, service);
  const username = identifier.toLowerCase();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (!profile?.id) return json(FAIL, 401);
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.id);
  const email = userData?.user?.email || "";
  if (userError || !email) return json(FAIL, 401);
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error || !data?.session) return json(FAIL, 401);
  return json({
    ok: true,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    }
  });
});
