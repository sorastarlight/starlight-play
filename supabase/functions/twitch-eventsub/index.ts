import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_AGE_MS = 10 * 60 * 1000;

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return hex(sig);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const messageId = req.headers.get("twitch-eventsub-message-id") ?? "";
  const timestamp = req.headers.get("twitch-eventsub-message-timestamp") ?? "";
  const signature = req.headers.get("twitch-eventsub-message-signature") ?? "";
  const messageType = req.headers.get("twitch-eventsub-message-type") ?? "";
  const body = await req.text();
  const sentAt = Date.parse(timestamp);
  if (!messageId || !timestamp || !signature || !Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > MAX_AGE_MS) {
    return new Response("stale", { status: 403 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, service);
  const { data: prepared, error: prepError } = await admin.rpc("bits_eventsub_prepare");
  const secret = typeof prepared?.secret === "string" ? prepared.secret : "";
  if (prepError || !secret) {
    return new Response("not ready", { status: 500 });
  }

  const expected = `sha256=${await hmacHex(secret, messageId + timestamp + body)}`;
  if (!timingSafeEqual(expected, signature)) {
    return new Response("forbidden", { status: 403 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  if (messageType === "webhook_callback_verification") {
    const challenge = typeof payload.challenge === "string" ? payload.challenge : "";
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  if (messageType === "revocation") {
    const sub = payload.subscription as { id?: string; status?: string } | undefined;
    await admin.rpc("bits_eventsub_mark", {
      p_subscription_id: sub?.id || "",
      p_status: sub?.status || "revoked",
      p_error: sub?.status || "revoked"
    });
    return new Response(null, { status: 204 });
  }

  if (messageType !== "notification") {
    return new Response(null, { status: 204 });
  }

  const subscription = payload.subscription as { type?: string } | undefined;
  if (subscription?.type && subscription.type !== "channel.custom_power_up_redemption.add") {
    return new Response(null, { status: 204 });
  }

  const event = (payload.event || {}) as {
    id?: string;
    user_login?: string;
    custom_power_up?: { title?: string; bits?: number };
  };
  const { error } = await admin.rpc("credit_bits_from_twitch", {
    p_event_id: event.id || messageId,
    p_login: event.user_login || "",
    p_title: event.custom_power_up?.title || "",
    p_bits: Number(event.custom_power_up?.bits || 0)
  });
  if (error) {
    console.error("credit_bits_from_twitch", error);
    return new Response("credit failed", { status: 500 });
  }
  return new Response(null, { status: 204 });
});
