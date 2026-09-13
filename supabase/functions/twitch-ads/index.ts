import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AD_EVENT = "channel.ad_break.begin";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" }
  });
}

async function helix(path: string, accessToken: string, clientId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Client-Id", clientId);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(`https://api.twitch.tv/helix/${path}`, { ...init, headers });
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try { body = text ? JSON.parse(text) as Record<string, unknown> : {}; } catch { body = { message: text }; }
  return { res, body };
}

function firstRow(body: Record<string, unknown>) {
  return Array.isArray(body.data) ? (body.data[0] as Record<string, unknown> | undefined) : undefined;
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
  if (error || !userData.user) return json({ ok: false, message: "Sign in first." }, 401);
  const { data: isAdmin } = await userClient.rpc("is_play_admin");
  if (!isAdmin) return json({ ok: false, message: "Staff only." }, 403);

  const reqBody = await req.json().catch(() => ({}));
  const action = typeof reqBody.action === "string" ? reqBody.action : "refresh";
  const admin = createClient(supabaseUrl, service);

  const { data: config } = await admin
    .from("site_config")
    .select("broadcaster_twitch_login, twitch_client_id, twitch_broadcaster_id")
    .eq("id", 1)
    .maybeSingle();

  let accessToken = typeof reqBody.accessToken === "string" ? reqBody.accessToken.trim() : "";
  if (!accessToken) {
    const { data: stored } = await admin.rpc("service_director_ads_token");
    accessToken = typeof stored === "string" ? stored : "";
  }
  if (!accessToken) {
    return json({
      ok: false,
      authorizationNeeded: true,
      message: "Twitch ad authorization still needs to be connected."
    }, 400);
  }

  const validateRes = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const validate = await validateRes.json().catch(() => ({}));
  if (!validateRes.ok) {
    return json({
      ok: false,
      authorizationNeeded: true,
      message: "Twitch ad authorization still needs to be connected."
    }, 401);
  }

  const clientId = String(validate.client_id || config?.twitch_client_id || "").trim();
  const tokenLogin = String(validate.login || "").trim().toLowerCase();
  const tokenUserId = String(validate.user_id || "").trim();
  const scopes = Array.isArray(validate.scopes) ? validate.scopes.map((scope: string) => String(scope)) : [];
  const canRead = scopes.includes("channel:read:ads");
  const canManage = scopes.includes("channel:manage:ads");
  if (!canRead) {
    return json({
      ok: false,
      needsScope: true,
      message: "Twitch did not grant channel:read:ads. Connect Twitch Ads and approve the ads permission."
    }, 403);
  }

  const channelLogin = (config?.broadcaster_twitch_login || "").trim().toLowerCase();
  if (channelLogin && tokenLogin && channelLogin !== tokenLogin) {
    return json({
      ok: false,
      message: `Sign in with the stream account (${channelLogin}). This Twitch login is ${tokenLogin}.`
    }, 403);
  }

  const broadcasterId = (config?.twitch_broadcaster_id || "").trim() || tokenUserId;
  await admin.rpc("service_director_save_ads_auth", {
    p_token: accessToken,
    p_scopes: scopes.join(" "),
    p_manage: canManage
  });

  if (action === "snooze") {
    if (!canManage) {
      return json({
        ok: false,
        needsManage: true,
        message: "Snooze needs channel:manage:ads. Reconnect Twitch Ads and approve ad management."
      }, 403);
    }
    const snoozed = await helix(`channels/ads/schedule/snooze?broadcaster_id=${encodeURIComponent(broadcasterId)}`, accessToken, clientId, {
      method: "POST"
    });
    if (!snoozed.res.ok) {
      return json({
        ok: false,
        message: typeof snoozed.body.message === "string" ? snoozed.body.message : "Unable to snooze the ad."
      }, 400);
    }
  }

  const schedule = await helix(`channels/ads?broadcaster_id=${encodeURIComponent(broadcasterId)}`, accessToken, clientId);
  if (!schedule.res.ok) {
    return json({
      ok: false,
      message: typeof schedule.body.message === "string" ? schedule.body.message : "Twitch ad schedule unavailable."
    }, 400);
  }

  const row = firstRow(schedule.body) || {};
  await admin.rpc("service_director_ingest_ad_schedule", {
    p_schedule: {
      next_ad_at: row.next_ad_at || null,
      duration: row.duration ?? null,
      last_ad_at: row.last_ad_at || null,
      preroll_free_time: row.preroll_free_time ?? null,
      snooze_count: row.snooze_count ?? 0,
      snooze_refresh_at: row.snooze_refresh_at || null
    }
  });

  if (action === "connect" || action === "subscribe") {
    const { data: prepared } = await admin.rpc("bits_eventsub_prepare");
    const secret = typeof prepared?.secret === "string" ? prepared.secret : "";
    const { data: storedAppSecret } = await admin.rpc("bits_twitch_client_secret");
    const appSecret = (Deno.env.get("TWITCH_CLIENT_SECRET") || storedAppSecret || "").trim();
    if (secret && appSecret && clientId) {
      const appTokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: appSecret,
          grant_type: "client_credentials"
        })
      });
      const appTokenJson = await appTokenRes.json().catch(() => ({}));
      const appToken = typeof appTokenJson.access_token === "string" ? appTokenJson.access_token : "";
      if (appToken) {
        const callback = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/twitch-eventsub`;
        const listed = await helix("eventsub/subscriptions?type=channel.ad_break.begin", appToken, clientId);
        const rows = Array.isArray(listed.body.data) ? listed.body.data as { id?: string; type?: string; transport?: { callback?: string } }[] : [];
        const exists = rows.some((item) => item.type === AD_EVENT && item.transport?.callback === callback);
        if (!exists) {
          await helix("eventsub/subscriptions", appToken, clientId, {
            method: "POST",
            body: JSON.stringify({
              type: AD_EVENT,
              version: "1",
              condition: { broadcaster_user_id: broadcasterId },
              transport: { method: "webhook", callback, secret }
            })
          });
        }
      }
    }
  }

  return json({
    ok: true,
    connected: true,
    manageAvailable: canManage,
    message: action === "snooze" ? "Next ad snoozed." : "Twitch ad schedule updated."
  });
});
