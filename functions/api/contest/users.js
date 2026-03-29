import { jsonResponse, parseBearerToken } from "../../_lib/auth.js";

function normalizeParam(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function getAuthenticatedUser(request, env) {
  const token = parseBearerToken(request.headers.get("authorization") || "");
  if (!token) return null;

  const row = await env.DB.prepare(
    "SELECT id, first_name, last_name FROM users WHERE token = ? LIMIT 1"
  )
    .bind(token)
    .first();

  return row || null;
}

async function contestExists(env, contestUuid) {
  const row = await env.DB.prepare("SELECT uuid FROM contests WHERE uuid = ? LIMIT 1")
    .bind(contestUuid)
    .first();
  return Boolean(row?.uuid);
}

export async function onRequestPost({ request, env }) {
  const user = await getAuthenticatedUser(request, env);
  if (!user) {
    return jsonResponse(401, { error: "Invalid or missing token" });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON payload" });
  }

  const contestUuid = normalizeParam(payload?.contest_uuid);
  if (!contestUuid) {
    return jsonResponse(400, { error: "contest_uuid is required" });
  }

  const firstName = normalizeParam(payload?.first_name) || normalizeParam(user.first_name) || "Archer";
  const lastName = normalizeParam(payload?.last_name) || normalizeParam(user.last_name) || "Inconnu";
  const weapon = normalizeParam(payload?.weapon) || "-";

  const rawData = payload?.data;
  const data = rawData && typeof rawData === "object" && !Array.isArray(rawData)
    ? JSON.stringify(rawData)
    : "{}";

  try {
    const exists = await contestExists(env, contestUuid);
    if (!exists) {
      return jsonResponse(404, { error: "Contest not found" });
    }

    await env.DB.prepare(
      `INSERT INTO contests_users (contest_uuid, user_id, first_name, last_name, weapon, data)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(contest_uuid, user_id)
       DO UPDATE SET
         first_name = excluded.first_name,
         last_name = excluded.last_name,
         weapon = excluded.weapon,
         data = CASE
           WHEN json_extract(excluded.data, '$.updatedAt') IS NULL THEN contests_users.data
           WHEN json_extract(contests_users.data, '$.updatedAt') IS NULL THEN excluded.data
           WHEN json_extract(excluded.data, '$.updatedAt') >= json_extract(contests_users.data, '$.updatedAt') THEN excluded.data
           ELSE contests_users.data
         END`
    )
      .bind(contestUuid, user.id, firstName, lastName, weapon, data)
      .run();

    return jsonResponse(200, {
      success: true,
      contest_uuid: contestUuid,
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      weapon,
    });
  } catch {
    return jsonResponse(500, { error: "Failed to upsert contest user" });
  }
}

export async function onRequest({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
