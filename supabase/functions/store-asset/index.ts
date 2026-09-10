import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const REPO = "sorastarlight/starlight-play";
const BRANCH = "main";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" }
  });
}

function sanitizeFilename(name: string, mime: string) {
  let base = String(name || "sprite").toLowerCase().replace(/\\/g, "/").split("/").pop() || "sprite";
  base = base.replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  if (!/\.(png|webp|gif|jpe?g)$/.test(base)) {
    const ext = mime.includes("webp") ? ".webp" : mime.includes("gif") ? ".gif" : mime.includes("jpeg") || mime.includes("jpg") ? ".jpg" : ".png";
    base = `${base.replace(/\.[^.]+$/, "") || "sprite"}${ext}`;
  }
  return base.slice(0, 80);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return json({ ok: false, message: "Sign in first." });
    }

    const { data: catalog, error: staffError } = await userClient.rpc("admin_store_get");
    if (staffError || !catalog) {
      return json({ ok: false, message: "Only staff can upload store sprites." });
    }

    const body = await req.json().catch(() => ({}));
    const mime = String(body.mime || body.contentType || "image/png");
    const filename = sanitizeFilename(String(body.filename || "sprite.png"), mime);
    const contentBase64 = String(body.contentBase64 || "").replace(/\s+/g, "");
    const label = String(body.label || filename.replace(/\.[^.]+$/, ""));
    const kind = String(body.kind || "item");
    if (!contentBase64) {
      return json({ ok: false, message: "Choose an image to upload." });
    }
    if (contentBase64.length > 1_200_000) {
      return json({ ok: false, message: "Keep sprites under 900 KB." });
    }

    const admin = createClient(supabaseUrl, service);
    const { data: token, error: tokenError } = await admin.rpc("store_github_token");
    if (tokenError || !String(token || "").trim()) {
      return json({
        ok: false,
        message: "Save a GitHub token on Staff tools (Store image hosting) first. It needs Contents write on sorastarlight/starlight-play."
      });
    }

    const path = `images/items/${filename}`;
    const api = `https://api.github.com/repos/${REPO}/contents/${path}`;
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${String(token).trim()}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "starlight-play-store-asset"
    };

    let sha = "";
    const existing = await fetch(`${api}?ref=${BRANCH}`, { headers });
    if (existing.ok) {
      const info = await existing.json();
      sha = typeof info?.sha === "string" ? info.sha : "";
    }

    const payload: Record<string, string> = {
      message: sha ? `Update store sprite ${filename}` : `Add store sprite ${filename}`,
      content: contentBase64,
      branch: BRANCH
    };
    if (sha) payload.sha = sha;

    const put = await fetch(api, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const putBody = await put.json().catch(() => ({}));
    if (!put.ok) {
      const detail = putBody?.message || `GitHub returned ${put.status}.`;
      return json({ ok: false, message: `GitHub upload failed: ${detail}` });
    }

    const { data: registered, error: registerError } = await userClient.rpc("admin_store_register_asset", {
      p_filename: filename,
      p_kind: kind,
      p_label: label
    });
    const downloadUrl = typeof putBody?.content?.download_url === "string" ? putBody.content.download_url : "";
    if (registerError) {
      return json({
        ok: true,
        filename,
        path,
        downloadUrl,
        message: "Uploaded to GitHub, but the picker list did not update. Save the item with this filename anyway."
      });
    }

    const assets = registered && typeof registered === "object" && Array.isArray((registered as { assets?: unknown }).assets)
      ? (registered as { assets: unknown[] }).assets
      : undefined;

    return json({
      ok: true,
      filename,
      path,
      downloadUrl,
      assets,
      message: "Uploaded. The editor preview is live; the public mart may take a minute."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return json({ ok: false, message });
  }
});
