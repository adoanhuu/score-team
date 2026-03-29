import { jsonResponse } from "../../_lib/auth.js";

function normalizeParam(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function findContest(env, uuid, ruleset) {
  const row = await env.DB.prepare(
    "SELECT id, uuid, name, ruleset, start_date, end_date FROM contests WHERE uuid = ? AND ruleset = ? LIMIT 1"
  )
    .bind(uuid, ruleset)
    .first();

  return row || null;
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
