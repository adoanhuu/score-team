import { jsonResponse, parseBearerToken } from "../../_lib/auth.js";

function normalizeParam(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUserId(value) {
  return normalizeParam(value);
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
  const row = await env.DB.prepare("SELECT uuid FROM contests WHERE lower(uuid) = lower(?) LIMIT 1")
    .bind(contestUuid)
    .first();
  return Boolean(row?.uuid);
}

async function getContestUser(env, contestUuid, userId) {
  const row = await env.DB.prepare(
    `SELECT contest_uuid, user_id, first_name, last_name, weapon, data
     FROM contests_users
     WHERE lower(contest_uuid) = lower(?) AND trim(CAST(user_id AS TEXT)) = trim(?)
     LIMIT 1`
  )
    .bind(contestUuid, userId)
    .first();

  if (!row) {
    return null;
  }

  let parsedData = {};
  try {
    parsedData = row.data ? JSON.parse(row.data) : {};
  } catch {
    parsedData = {};
  }

  return {
    contest_uuid: row.contest_uuid,
    user_id: normalizeUserId(row.user_id),
    first_name: row.first_name,
    last_name: row.last_name,
    weapon: row.weapon,
    data: parsedData && typeof parsedData === "object" && !Array.isArray(parsedData) ? parsedData : {},
  };
}

function getResolvedIdentity({ user, userId, firstName = "", lastName = "" }) {
  if (user) {
    return {
      userId: String(user.id),
      firstName: normalizeParam(firstName) || normalizeParam(user.first_name) || "Archer",
      lastName: normalizeParam(lastName) || normalizeParam(user.last_name) || "Inconnu",
    };
  }

  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) {
    return null;
  }

  return {
    userId: normalizedUserId,
    firstName: normalizeParam(firstName),
    lastName: normalizeParam(lastName),
  };
}

export async function onRequestGet({ request, env }) {
  const user = await getAuthenticatedUser(request, env);
  const url = new URL(request.url);
  const contestUuid = normalizeParam(url.searchParams.get("contest_uuid"));
  const requestedUserId = normalizeUserId(url.searchParams.get("user_id"));

  if (!contestUuid) {
    return jsonResponse(400, { error: "contest_uuid is required" });
  }

  const identity = getResolvedIdentity({
    user,
    userId: requestedUserId,
  });

  if (!identity?.userId) {
    return jsonResponse(400, { error: "user_id is required" });
  }

  try {
    const entry = await getContestUser(env, contestUuid, identity.userId);
    if (!entry) {
      return jsonResponse(200, { found: false });
    }

    return jsonResponse(200, {
      found: true,
      entry,
    });
  } catch {
    return jsonResponse(500, { error: "Failed to load contest user" });
  }
}

export async function onRequestPost({ request, env }) {
  const user = await getAuthenticatedUser(request, env);

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

  const identity = getResolvedIdentity({
    user,
    userId: payload?.user_id,
    firstName: payload?.first_name,
    lastName: payload?.last_name,
  });

  if (!identity?.userId) {
    return jsonResponse(400, { error: "user_id is required" });
  }

  if (!identity.firstName || !identity.lastName) {
    return jsonResponse(400, { error: "first_name and last_name are required" });
  }

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
      .bind(contestUuid, identity.userId, identity.firstName, identity.lastName, weapon, data)
      .run();

    return jsonResponse(200, {
      success: true,
      contest_uuid: contestUuid,
      user_id: identity.userId,
      first_name: identity.firstName,
      last_name: identity.lastName,
      weapon,
    });
  } catch {
    return jsonResponse(500, { error: "Failed to upsert contest user" });
  }
}

export async function onRequest({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
