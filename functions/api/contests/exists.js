import { jsonResponse } from "../../_lib/auth.js";

function normalizeParam(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function checkContestExists(env, uuid, ruleset) {
  const row = await env.DB.prepare(
    "SELECT id FROM contests WHERE uuid = ? AND ruleset = ? LIMIT 1"
  )
    .bind(uuid, ruleset)
    .first();

  return Boolean(row?.id);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const uuid = normalizeParam(url.searchParams.get("uuid"));
  const ruleset = normalizeParam(url.searchParams.get("ruleset"));

  if (!uuid || !ruleset) {
    return jsonResponse(400, { error: "uuid and ruleset are required" });
  }

  try {
    const exists = await checkContestExists(env, uuid, ruleset);
    return jsonResponse(200, { exists });
  } catch {
    return jsonResponse(500, { error: "Failed to verify contest" });
  }
}

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON payload" });
  }

  const uuid = normalizeParam(payload?.uuid);
  const ruleset = normalizeParam(payload?.ruleset);

  if (!uuid || !ruleset) {
    return jsonResponse(400, { error: "uuid and ruleset are required" });
  }

  try {
    const exists = await checkContestExists(env, uuid, ruleset);
    return jsonResponse(200, { exists });
  } catch {
    return jsonResponse(500, { error: "Failed to verify contest" });
  }
}

export async function onRequest({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
