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
  const { data: config, error: configError } = await admin
    .from("site_config")
    .select("broadcaster_twitch_login, twitch_client_id, twitch_broadcaster_id")
    .eq("id", 1)
    .maybeSingle();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("twitch_login, starlight_pass, pass_source")
    .eq("id", userData.user.id)
    .maybeSingle();
  const { data: connection, error: connectionError } = await admin
    .from("twitch_connections")
    .select("twitch_user_id, twitch_login, is_primary, gameplay_enabled")
    .eq("user_id", userData.user.id)
    .eq("confirmed", true)
    .eq("gameplay_enabled", true)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();
  const clientId = (config?.twitch_client_id || "").trim();
  const twitchUserId = String(connection?.twitch_user_id || "").trim();
  let broadcasterId = (config?.twitch_broadcaster_id || "").trim();
  if (configError || profileError || connectionError || !profile) {
    return json({ active: Boolean(profile?.starlight_pass), message: "Could not load the subscription check. Try again." }, 503);
  }
  if (!/^[1-9][0-9]*$/.test(twitchUserId)) {
    return json({ active: Boolean(profile.starlight_pass), message: "Confirm a Twitch connection in account settings before checking Starlight Pass." }, 403);
  }

  async function saveSubscription(active: boolean, source: string | null, message: string) {
    const { data: saved, error: saveError } = await admin.from("profiles").update({
      starlight_pass: active,
      pass_source: source,
      pass_checked_at: new Date().toISOString()
    }).eq("id", userData.user.id).select("starlight_pass, pass_source").single();
    if (saveError || !saved) {
      return json({ active: Boolean(profile?.starlight_pass), message: "Could not save the subscription check. Try again." }, 500);
    }
    const effective = Boolean(saved.starlight_pass);
    return json({ active: effective, message: effective === active ? message :
      `Subscription checked. Starlight Pass remains ${effective ? "active" : "off"} under staff control.` });
  }

  async function grantOwner() {
    return saveSubscription(true, "broadcaster", "Starlight Pass is active because this is the channel account. Twitch does not list the broadcaster as a subscriber.");
  }

  if (broadcasterId === twitchUserId) {
    return await grantOwner();
  }

  if (!accessToken) {
    return json({
      active: Boolean(profile?.starlight_pass),
      message: "Twitch did not keep a session token. Sign out, sign in with Twitch again, then check immediately."
    });
  }

  if (!clientId) {
    return json({
      active: Boolean(profile?.starlight_pass),
      needsStaffSetup: true,
      message: "Staff still needs to save the Play Twitch Client ID on the staff hub. Until then, staff can grant Starlight Pass by login."
    });
  }

  try {
    const validationRes = await fetch("https://id.twitch.tv/oauth2/validate", {
      headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10000)
    });
    const validation = await validationRes.json();
    if (!validationRes.ok || validation.client_id !== clientId || validation.user_id !== twitchUserId) {
      return json({ active: Boolean(profile.starlight_pass), message: "Reconnect the confirmed Twitch account, then try again." }, 403);
    }

  if (!broadcasterId && accessToken) {
    const login = (config?.broadcaster_twitch_login || "").trim();
    const usersRes = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`, {
      headers: { "Client-Id": clientId, Authorization: `Bearer ${accessToken}` }
    });
    if (!usersRes.ok) return json({ active: Boolean(profile.starlight_pass), message: "Twitch could not check the channel. Try again." }, 503);
    const usersJson = await usersRes.json();
    broadcasterId = usersJson.data?.[0]?.id || "";
  }
  if (broadcasterId && twitchUserId && broadcasterId === twitchUserId) {
    return await grantOwner();
  }
  if (!broadcasterId || !twitchUserId) {
    return json({ active: Boolean(profile?.starlight_pass), message: "Could not match Twitch user IDs. Sign in again, or save the broadcaster ID in the staff hub." });
  }

  const subRes = await fetch(
    `https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${encodeURIComponent(broadcasterId)}&user_id=${encodeURIComponent(twitchUserId)}`,
    { headers: { "Client-Id": clientId, Authorization: `Bearer ${accessToken}` } }
  );
  if (subRes.status === 404) {
    return saveSubscription(false, null, "Twitch says you are not subscribed right now.");
  }
  if (!subRes.ok) {
    return json({ active: Boolean(profile?.starlight_pass), message: "Twitch could not check the subscription. Try signing in again." });
  }

  const subscription = await subRes.json();
  if (!Array.isArray(subscription.data) || subscription.data.length !== 1 || subscription.data[0]?.broadcaster_id !== broadcasterId) {
    return json({ active: Boolean(profile.starlight_pass), message: "Twitch returned an incomplete subscription check. Try again." }, 503);
  }
  return saveSubscription(true, "twitch-sub", "Starlight Pass is active from your Twitch subscription.");
  } catch (_) {
    return json({ active: Boolean(profile.starlight_pass), message: "Twitch could not check the subscription. Try again." }, 503);
  }
});
