import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIVE_EVENTS = [
  { type: "stream.online", version: "1" },
  { type: "stream.offline", version: "1" }
];

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

async function ensureLiveSubs(
  appToken: string,
  clientId: string,
  broadcasterId: string,
  callback: string,
  secret: string
) {
  let online = false;
  let offline = false;
  for (const event of LIVE_EVENTS) {
    const listed = await helix(`eventsub/subscriptions?type=${encodeURIComponent(event.type)}`, appToken, clientId);
    const rows = Array.isArray(listed.body.data)
      ? listed.body.data as { type?: string; status?: string; transport?: { callback?: string } }[]
      : [];
    const exists = rows.some((row) =>
      row.type === event.type && row.transport?.callback === callback && row.status === "enabled"
    );
    if (exists) {
      if (event.type === "stream.online") online = true;
      if (event.type === "stream.offline") offline = true;
      continue;
    }
    const created = await helix("eventsub/subscriptions", appToken, clientId, {
      method: "POST",
      body: JSON.stringify({
        type: event.type,
        version: event.version,
        condition: { broadcaster_user_id: broadcasterId },
        transport: { method: "webhook", callback, secret }
      })
    });
    const ok = created.res.ok || created.res.status === 409;
    if (event.type === "stream.online") online = ok;
    if (event.type === "stream.offline") offline = ok;
  }
  return { online, offline };
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

  const admin = createClient(supabaseUrl, service);
  const { data: config } = await admin
    .from("site_config")
    .select("twitch_client_id, twitch_broadcaster_id")
    .eq("id", 1)
    .maybeSingle();

  const clientId = String(config?.twitch_client_id || "").trim();
  const broadcasterId = String(config?.twitch_broadcaster_id || "").trim();
  if (!clientId || !broadcasterId) {
    return json({
      ok: false,
      helixAvailable: false,
      message: "Stream channel Twitch IDs are not saved yet."
    }, 400);
  }

  const { data: storedAppSecret } = await admin.rpc("bits_twitch_client_secret");
  const appSecret = (Deno.env.get("TWITCH_CLIENT_SECRET") || storedAppSecret || "").trim();
  if (!appSecret) {
    return json({
      ok: false,
      helixAvailable: false,
      message: "Play Twitch Client Secret is not saved. Live status cannot be checked yet."
    }, 400);
  }

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
  if (!appTokenRes.ok || !appToken) {
    await admin.rpc("service_set_stream_status", {
      p_event: { error: "Twitch rejected the app token used to check live status.", source: "helix" }
    });
    return json({
      ok: false,
      helixAvailable: false,
      message: "Twitch would not issue an app token for live status."
    }, 400);
  }

  const streams = await helix(
    `streams?user_id=${encodeURIComponent(broadcasterId)}`,
    appToken,
    clientId
  );
  if (!streams.res.ok) {
    const message = typeof streams.body.message === "string" && streams.body.message
      ? streams.body.message
      : "Twitch live status unavailable.";
    await admin.rpc("service_set_stream_status", {
      p_event: { error: message, source: "helix" }
    });
    return json({ ok: false, helixAvailable: false, message }, 400);
  }

  const row = firstRow(streams.body);
  const live = Boolean(row);
  let eventsubOnline = false;
  let eventsubOffline = false;
  const { data: prepared } = await admin.rpc("bits_eventsub_prepare");
  const secret = typeof prepared?.secret === "string" ? prepared.secret : "";
  if (secret) {
    const callback = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/twitch-eventsub`;
    const subs = await ensureLiveSubs(appToken, clientId, broadcasterId, callback, secret);
    eventsubOnline = subs.online;
    eventsubOffline = subs.offline;
  }

  const saved = await admin.rpc("service_set_stream_status", {
    p_event: {
      is_live: live,
      title: typeof row?.title === "string" ? row.title : null,
      viewer_count: typeof row?.viewer_count === "number" ? row.viewer_count : null,
      started_at: typeof row?.started_at === "string" ? row.started_at : null,
      source: "helix",
      eventsub_online: eventsubOnline,
      eventsub_offline: eventsubOffline
    }
  });

  return json({
    ok: true,
    helixAvailable: true,
    live,
    eventSubLive: eventsubOnline && eventsubOffline,
    state: saved.data,
    message: live ? "Twitch reports the channel is live." : "Twitch reports the channel is offline."
  });
});
