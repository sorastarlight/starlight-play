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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: userData, error } = await userClient.auth.getUser();
  if (error || !userData.user) {
    return json({ active: false, message: "Sign in first." }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";

  const admin = createClient(supabaseUrl, service);
  const { data: config } = await admin
    .from("site_config")
    .select("broadcaster_twitch_login, twitch_client_id, twitch_broadcaster_id")
    .eq("id", 1)
    .maybeSingle();
  const { data: profile } = await admin
    .from("profiles")
    .select("twitch_login")
    .eq("id", userData.user.id)
    .maybeSingle();
  const clientId = (config?.twitch_client_id || "").trim();
  const twitchUserId =
    userData.user.identities?.find((identity) => identity.provider === "twitch")?.id ||
    userData.user.user_metadata?.provider_id ||
    userData.user.user_metadata?.sub;
  const userLogin = String(
    profile?.twitch_login ||
    userData.user.user_metadata?.preferred_username ||
    userData.user.user_metadata?.login ||
    ""
  ).trim().toLowerCase();
  const channelLogin = (config?.broadcaster_twitch_login || "").trim().toLowerCase();
  let broadcasterId = (config?.twitch_broadcaster_id || "").trim();

  async function grantOwner() {
    await admin.from("profiles").update({
      starlight_pass: true,
      pass_source: "broadcaster",
      pass_checked_at: new Date().toISOString()
    }).eq("id", userData.user.id);
    return json({
      active: true,
      message: "Starlight Pass is active because this is the channel account. Twitch does not list the broadcaster as a subscriber."
    });
  }

  if (channelLogin && userLogin && channelLogin === userLogin) {
    return await grantOwner();
  }

  if (!accessToken) {
    return json({
      active: false,
      message: "Twitch did not keep a session token. Sign out, sign in with Twitch again, then check immediately."
    });
  }

  if (!clientId) {
    return json({
      active: false,
      needsStaffSetup: true,
      message: "Staff still needs to save the Play Twitch Client ID on the staff hub. Until then, staff can grant Starlight Pass by login."
    });
  }

  if (!broadcasterId && accessToken) {
    const login = (config?.broadcaster_twitch_login || "").trim();
    const usersRes = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`, {
      headers: { "Client-Id": clientId, Authorization: `Bearer ${accessToken}` }
    });
    const usersJson = await usersRes.json();
    broadcasterId = usersJson.data?.[0]?.id || "";
  }
  if (broadcasterId && twitchUserId && broadcasterId === twitchUserId) {
    return await grantOwner();
  }
  if (!broadcasterId || !twitchUserId) {
    return json({ active: false, message: "Could not match Twitch user IDs. Sign in again, or save the broadcaster ID in the staff hub." });
  }

  const subRes = await fetch(
    `https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${encodeURIComponent(broadcasterId)}&user_id=${encodeURIComponent(twitchUserId)}`,
    { headers: { "Client-Id": clientId, Authorization: `Bearer ${accessToken}` } }
  );
  if (subRes.status === 404) {
    await admin.from("profiles").update({
      starlight_pass: false,
      pass_source: null,
      pass_checked_at: new Date().toISOString()
    }).eq("id", userData.user.id);
    return json({ active: false, message: "Twitch says you are not subscribed right now." });
  }
  if (!subRes.ok) {
    return json({ active: false, message: "Twitch could not check the subscription. Try signing in again." });
  }

  await admin.from("profiles").update({
    starlight_pass: true,
    pass_source: "twitch-sub",
    pass_checked_at: new Date().toISOString()
  }).eq("id", userData.user.id);
  return json({ active: true, message: "Starlight Pass is active from your Twitch subscription." });
});
