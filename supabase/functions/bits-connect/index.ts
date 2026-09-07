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

type SubRow = {
  id?: string;
  type?: string;
  status?: string;
  condition?: { broadcaster_user_id?: string };
  transport?: { callback?: string };
};

function subRows(body: Record<string, unknown>): SubRow[] {
  return Array.isArray(body.data) ? body.data as SubRow[] : [];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMatch(row: SubRow, callback: string, broadcasterId: string) {
  if (row.type !== EVENT_TYPE || row.transport?.callback !== callback || !row.id) return false;
  const owner = row.condition?.broadcaster_user_id || "";
  return !owner || owner === broadcasterId;
}

async function listSubs(appToken: string, clientId: string, status: string) {
  return helix(`eventsub/subscriptions?status=${encodeURIComponent(status)}`, appToken, clientId);
}

async function loadKnownSubs(appToken: string, clientId: string) {
  const [enabled, pending, failed] = await Promise.all([
    listSubs(appToken, clientId, "enabled"),
    listSubs(appToken, clientId, "webhook_callback_verification_pending"),
    listSubs(appToken, clientId, "webhook_callback_verification_failed")
  ]);
  const firstFail = [enabled, pending, failed].find((item) => !item.res.ok);
  return {
    ok: !firstFail || [enabled, pending, failed].some((item) => item.res.ok),
    unauthorized: [enabled, pending, failed].some((item) => item.res.status === 401 || item.res.status === 403),
    body: firstFail && ![enabled, pending, failed].some((item) => item.res.ok) ? firstFail.body : {},
    rows: [
      ...subRows(enabled.body),
      ...subRows(pending.body),
      ...subRows(failed.body)
    ]
  };
}

async function pollStatus(id: string, appToken: string, clientId: string) {
  let found: SubRow | null = null;
  for (let i = 0; i < 12; i++) {
    await sleep(1000);
    const listed = await loadKnownSubs(appToken, clientId);
    found = listed.rows.find((row) => row.id === id) || null;
    const status = found?.status || "";
    if (
      status === "enabled"
      || status.includes("failed")
      || status === "authorization_revoked"
      || status === "user_removed"
    ) {
      return found;
    }
  }
  return found;
}

async function markBits(
  admin: ReturnType<typeof createClient>,
  sub: { id?: string; status?: string }
) {
  const status = sub.status || "webhook_callback_verification_pending";
  const failed = status.includes("failed") || status === "authorization_revoked" || status === "user_removed";
  await admin.rpc("bits_eventsub_mark", {
    p_subscription_id: sub.id || "",
    p_status: status,
    p_error: failed ? status : ""
  });
  const enabled = status === "enabled";
  return json({
    ok: !failed,
    connected: enabled,
    status,
    message: enabled
      ? "Bits Power-Ups will credit Play bags automatically while you are live."
      : failed
        ? `Twitch could not confirm the webhook (${status}). Click Turn on Bits auto-credit again.`
        : "Twitch is confirming the webhook. Wait a few seconds; you do not need to click again yet."
  }, failed ? 400 : 200);
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

  const { data: storedAppSecret } = await admin.rpc("bits_twitch_client_secret");
  const appSecret = (Deno.env.get("TWITCH_CLIENT_SECRET") || storedAppSecret || "").trim();
  if (!appSecret) {
    return json({
      ok: false,
      message: "Save the Play Twitch Client Secret under Stream channel first. Use the Starlight Play app secret already used for Play login. If you generate a new secret, update Supabase Auth → Twitch too."
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
    return json({
      ok: false,
      message: typeof appTokenJson.message === "string" && appTokenJson.message
        ? appTokenJson.message
        : "Twitch rejected the Client Secret. Paste the Starlight Play Client Secret under Stream channel. If you made a new secret, also put it in Supabase Auth → Twitch."
    }, 400);
  }

  const callback = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/twitch-eventsub`;
  const existing = await loadKnownSubs(appToken, clientId);
  if (existing.unauthorized) {
    return json({
      ok: false,
      message: twitchMessage(existing.body, "Twitch would not list EventSub subscriptions with the app token.")
    }, 400);
  }
  if (!existing.ok) {
    return json({
      ok: false,
      message: twitchMessage(existing.body, "Twitch would not list EventSub subscriptions.")
    }, 400);
  }

  const matches = existing.rows.filter((row) => isMatch(row, callback, broadcasterId));
  const enabledSub = matches.find((row) => row.status === "enabled");
  if (enabledSub) {
    return await markBits(admin, enabledSub);
  }
  const pendingSub = matches.find((row) => (row.status || "").includes("pending"));
  if (pendingSub?.id) {
    const polled = await pollStatus(pendingSub.id, appToken, clientId);
    return await markBits(admin, polled || pendingSub);
  }
  for (const row of matches) {
    if (row.id) {
      await helix(`eventsub/subscriptions?id=${encodeURIComponent(row.id)}`, appToken, clientId, {
        method: "DELETE"
      });
    }
  }

  const created = await helix("eventsub/subscriptions", appToken, clientId, {
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

  const createdRows = subRows(created.body);
  const sub = createdRows[0] || {};
  if (sub.id) {
    const polled = await pollStatus(sub.id, appToken, clientId);
    return await markBits(admin, polled || sub);
  }
  return await markBits(admin, sub);
});
