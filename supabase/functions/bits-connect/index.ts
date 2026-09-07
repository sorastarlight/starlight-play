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

  const body = await req.json().catch(() => ({}));
  const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
  if (!accessToken) {
    return json({
      ok: false,
      needsScope: true,
      message: "Twitch Bits permission is missing. Approve it on the next screen."
    }, 400);
  }

  const admin = createClient(supabaseUrl, service);
  const { data: config } = await admin
    .from("site_config")
    .select("broadcaster_twitch_login, twitch_client_id, twitch_broadcaster_id")
    .eq("id", 1)
    .maybeSingle();
  const clientId = (config?.twitch_client_id || "").trim();
  const channelLogin = (config?.broadcaster_twitch_login || "").trim();
  if (!clientId) {
    return json({
      ok: false,
      message: "Save the Play Twitch Client ID on the staff hub first."
    }, 400);
  }

  let broadcasterId = (config?.twitch_broadcaster_id || "").trim();
  if (!broadcasterId && channelLogin) {
    const users = await helix(`users?login=${encodeURIComponent(channelLogin)}`, accessToken, clientId);
    if (users.res.status === 401 || users.res.status === 403) {
      return json({
        ok: false,
        needsScope: true,
        message: "Twitch needs Bits permission from the channel account. Approve it on the next screen — this is not added to viewer logins."
      }, 403);
    }
    const rows = Array.isArray(users.body.data) ? users.body.data as { id?: string }[] : [];
    broadcasterId = rows[0]?.id || "";
    if (broadcasterId) {
      await admin.from("site_config").update({ twitch_broadcaster_id: broadcasterId }).eq("id", 1);
    }
  }
  if (!broadcasterId) {
    return json({
      ok: false,
      message: "Could not find the channel Twitch ID. Save it on the staff hub, then try again."
    }, 400);
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
      message: "Twitch needs Bits permission from the channel account. Approve it on the next screen — this is not added to viewer logins."
    }, 403);
  }
  if (!existing.res.ok) {
    const message = typeof existing.body.message === "string"
      ? existing.body.message
      : "Twitch would not list EventSub subscriptions.";
    return json({ ok: false, message }, 400);
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
      message: "Twitch needs Bits permission from the channel account. Approve it on the next screen — this is not added to viewer logins."
    }, 403);
  }
  if (!created.res.ok) {
    const message = typeof created.body.message === "string"
      ? created.body.message
      : "Twitch would not enable Bits auto-credit.";
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
      : `Twitch accepted the webhook (${sub.status || "pending"}). Try a Power-Up while live, or click again if it stays pending.`
  });
});
