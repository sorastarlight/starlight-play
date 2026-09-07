import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVENT_TYPE = "channel.custom_power_up_redemption.add";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" }
  });
}

function twitchMessage(body: Record<string, unknown>, fallback: string) {
  if (typeof body.message === "string" && body.message.trim()) return body.message;
  return fallback;
}

async function helix(
  path: string,
  accessToken: string,
  clientId: string,
  init: RequestInit = {}
) {
  const headers = new Headers(init.headers);
  headers.set("Client-Id", clientId);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`https://api.twitch.tv/helix/${path}`, { ...init, headers });
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? JSON.parse(text) as Record<string, unknown> : {};
  } catch {
    body = { message: text };
  }
  return { res, body };
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
    return json({ ok: false, message: "Sign in first." }, 401);
  }
  const { data: isAdmin } = await userClient.rpc("is_play_admin");
  if (!isAdmin) {
    return json({ ok: false, message: "Staff only." }, 403);
  }

  const reqBody = await req.json().catch(() => ({}));
  const accessToken = typeof reqBody.accessToken === "string" ? reqBody.accessToken.trim() : "";
  if (!accessToken) {
    return json({
      ok: false,
      needsScope: true,
      message: "Twitch Bits permission is missing. Click Turn on Bits auto-credit again."
    }, 400);
  }

  const validateRes = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const validate = await validateRes.json().catch(() => ({}));
  if (!validateRes.ok) {
    return json({
      ok: false,
      needsScope: true,
      message: "That Twitch session expired. Click Turn on Bits auto-credit again."
    }, 401);
  }
  const clientId = String(validate.client_id || "").trim();
  const tokenLogin = String(validate.login || "").trim().toLowerCase();
  const tokenUserId = String(validate.user_id || "").trim();
  const scopes = Array.isArray(validate.scopes) ? validate.scopes.map((scope: string) => String(scope)) : [];
  if (!clientId || !tokenUserId) {
    return json({ ok: false, message: "Twitch did not recognize that Bits session. Click the button again." }, 400);
  }
  if (!scopes.includes("bits:read")) {
    return json({
      ok: false,
      needsScope: true,
      message: "Twitch did not grant Bits permission. Click Turn on Bits auto-credit and approve Bits on the next screen."
    }, 403);
  }

  const admin = createClient(supabaseUrl, service);
  const { data: config } = await admin
    .from("site_config")
    .select("broadcaster_twitch_login, twitch_client_id, twitch_broadcaster_id")
    .eq("id", 1)
    .maybeSingle();
  const channelLogin = (config?.broadcaster_twitch_login || "").trim().toLowerCase();
  if (channelLogin && tokenLogin && channelLogin !== tokenLogin) {
    return json({
      ok: false,
      message: `Sign in with the stream account (${channelLogin}). This Twitch login is ${tokenLogin}.`
    }, 403);
  }

  let broadcasterId = (config?.twitch_broadcaster_id || "").trim() || tokenUserId;
  const patch: Record<string, string> = {};
  if (!(config?.twitch_client_id || "").trim()) patch.twitch_client_id = clientId;
  if (!(config?.twitch_broadcaster_id || "").trim() && broadcasterId) patch.twitch_broadcaster_id = broadcasterId;
  if (Object.keys(patch).length) {
    await admin.from("site_config").update(patch).eq("id", 1);
  }

  const { data: prepared, error: prepError } = await admin.rpc("bits_eventsub_prepare");
  const secret = typeof prepared?.secret === "string" ? prepared.secret : "";
  if (prepError || !secret) {
    return json({ ok: false, message: "Could not create the Twitch webhook secret." }, 500);
  }

  const callback = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/twitch-eventsub`;
  const existing = await helix("eventsub/subscriptions", accessToken, clientId);
  if (existing.res.status === 401 || existing.res.status === 403) {
    return json({
      ok: false,
      needsScope: true,
      message: twitchMessage(existing.body, "Twitch needs Bits permission from the channel account. Click the button and approve it.")
    }, 403);
  }
  if (!existing.res.ok) {
    return json({
      ok: false,
      message: twitchMessage(existing.body, "Twitch would not list EventSub subscriptions.")
    }, 400);
  }

  const rows = Array.isArray(existing.body.data) ? existing.body.data as {
    id?: string;
    type?: string;
    transport?: { callback?: string };
  }[] : [];
  for (const row of rows) {
    if (row.type === EVENT_TYPE && row.transport?.callback === callback && row.id) {
      await helix(`eventsub/subscriptions?id=${encodeURIComponent(row.id)}`, accessToken, clientId, {
        method: "DELETE"
      });
    }
  }

  const created = await helix("eventsub/subscriptions", accessToken, clientId, {
    method: "POST",
    body: JSON.stringify({
      type: EVENT_TYPE,
      version: "1",
      condition: { broadcaster_user_id: broadcasterId },
      transport: {
        method: "webhook",
        callback,
        secret
      }
    })
  });
  if (created.res.status === 401 || created.res.status === 403) {
    return json({
      ok: false,
      needsScope: true,
      message: twitchMessage(created.body, "Twitch needs Bits permission from the channel account. Click the button and approve it.")
    }, 403);
  }
  if (!created.res.ok) {
    const message = twitchMessage(created.body, "Twitch would not enable Bits auto-credit.");
    await admin.rpc("bits_eventsub_mark", {
      p_subscription_id: "",
      p_status: "error",
      p_error: message
    });
    return json({ ok: false, message }, 400);
  }

  const createdRows = Array.isArray(created.body.data) ? created.body.data as {
    id?: string;
    status?: string;
  }[] : [];
  const sub = createdRows[0] || {};
  await admin.rpc("bits_eventsub_mark", {
    p_subscription_id: sub.id || "",
    p_status: sub.status || "enabled",
    p_error: ""
  });
  const enabled = (sub.status || "enabled") === "enabled";
  return json({
    ok: true,
    connected: enabled,
    status: sub.status || "enabled",
    message: enabled
      ? "Bits Power-Ups will credit Play bags automatically while you are live."
      : `Twitch accepted the webhook (${sub.status || "pending"}). Click again if it stays pending.`
  });
});
