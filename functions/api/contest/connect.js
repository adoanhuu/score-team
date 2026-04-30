import { jsonResponse } from "../../_lib/auth.js";

function normalizeParam(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeContestCode(value) {
  return normalizeParam(value).replace(/[-\s]/g, "");
}

async function findContest(env, uuid, ruleset) {
  const normalizedUuid = normalizeContestCode(uuid);
  const parsedId = Number.parseInt(String(uuid), 10);
  const maybeId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;

  // First pass: strict on ruleset, flexible on contest code formatting.
  const strictRow = await env.DB.prepare(
    `SELECT id, uuid, name, ruleset, start_date, end_date
     FROM contests
     WHERE (
       lower(trim(uuid)) = lower(trim(?))
       OR lower(replace(replace(trim(uuid), '-', ''), ' ', '')) = lower(?)
       OR (? IS NOT NULL AND id = ?)
     )
       AND lower(trim(ruleset)) = lower(trim(?))
     LIMIT 1`
  )
    .bind(uuid, normalizedUuid, maybeId, maybeId, ruleset)
    .first();

  if (strictRow) {
    return strictRow;
  }

  // Fallback: if code matches but ruleset differs, still return the contest.
  const fallbackRow = await env.DB.prepare(
    `SELECT id, uuid, name, ruleset, start_date, end_date
     FROM contests
     WHERE
       lower(trim(uuid)) = lower(trim(?))
       OR lower(replace(replace(trim(uuid), '-', ''), ' ', '')) = lower(?)
       OR (? IS NOT NULL AND id = ?)
     LIMIT 1`
  )
    .bind(uuid, normalizedUuid, maybeId, maybeId)
    .first();

  return fallbackRow || null;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const uuid = normalizeParam(url.searchParams.get("uuid"));
  const ruleset = normalizeParam(url.searchParams.get("ruleset"));

  if (!uuid || !ruleset) {
    return jsonResponse(400, { error: "uuid and ruleset are required" });
  }

  try {
    const contest = await findContest(env, uuid, ruleset);
    if (!contest) {
      return jsonResponse(200, { exists: false });
    }
    return jsonResponse(200, {
      exists: true,
      contest: {
        id: contest.id,
        uuid: contest.uuid,
        name: contest.name,
        ruleset: contest.ruleset,
        start_date: contest.start_date,
        end_date: contest.end_date,
      },
    });
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
    const contest = await findContest(env, uuid, ruleset);
    if (!contest) {
      return jsonResponse(200, { exists: false });
    }
    return jsonResponse(200, {
      exists: true,
      contest: {
        id: contest.id,
        uuid: contest.uuid,
        name: contest.name,
        ruleset: contest.ruleset,
        start_date: contest.start_date,
        end_date: contest.end_date,
      },
    });
  } catch {
    return jsonResponse(500, { error: "Failed to verify contest" });
  }
}

export async function onRequest({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
