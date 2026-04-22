import { jsonResponse, parseBearerToken } from "../../_lib/auth.js";

function normalizeParam(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRuleset(value) {
  return normalizeParam(value).toLowerCase();
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

function generateContestUuid() {
  return crypto.randomUUID();
}

async function contestsHasOwnerId(env) {
  const columns = await env.DB.prepare("PRAGMA table_info(contests)").all();
  const rows = Array.isArray(columns?.results) ? columns.results : [];
  return rows.some((column) => String(column?.name || "").toLowerCase() === "owner_id");
}

function buildParticipantMetrics(rawData) {
  let data = {};
  try {
    data = rawData ? JSON.parse(rawData) : {};
  } catch {
    data = {};
  }

  const safeData = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const volleys = Array.isArray(safeData.volleys)
    ? safeData.volleys
    : Array.isArray(safeData.shoots)
      ? safeData.shoots
      : [];

  const targetNumber = Number.isInteger(safeData.completedTargets) && safeData.completedTargets >= 0
    ? safeData.completedTargets
    : volleys.length;

  const totalScore = Number.isFinite(safeData.total)
    ? Number(safeData.total)
    : volleys.reduce((sum, volley) => {
        if (Number.isFinite(volley?.total)) {
          return sum + Number(volley.total);
        }
        const arrows = Array.isArray(volley?.arrows) ? volley.arrows : (Array.isArray(volley) ? volley : []);
        return sum + arrows.reduce((arrowSum, value) => arrowSum + (Number.isFinite(value) ? Number(value) : 0), 0);
      }, 0);

  return {
    targetNumber,
    totalScore,
  };
}

async function getContestParticipants(env, contestUuid) {
  const rows = await env.DB.prepare(
    `SELECT user_id, first_name, last_name, weapon, data
     FROM contests_users
     WHERE lower(contest_uuid) = lower(?)
     ORDER BY lower(trim(last_name)), lower(trim(first_name)), id`
  )
    .bind(contestUuid)
    .all();

  const results = Array.isArray(rows?.results) ? rows.results : [];
  return results.map((row) => {
    const metrics = buildParticipantMetrics(row.data);
    return {
      user_id: row.user_id,
      first_name: row.first_name || "",
      last_name: row.last_name || "",
      weapon: row.weapon || "",
      target_number: metrics.targetNumber,
      total_score: metrics.totalScore,
    };
  });
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

  const name = normalizeParam(payload?.name);
  const ruleset = normalizeRuleset(payload?.ruleset);
  const startDate = normalizeParam(payload?.start_date);
  const endDate = normalizeParam(payload?.end_date);
  const maxUsers = Number.parseInt(String(payload?.max_users ?? "0"), 10);

  if (!name) {
    return jsonResponse(400, { error: "name is required" });
  }
  if (!ruleset) {
    return jsonResponse(400, { error: "ruleset is required" });
  }
  if (!startDate || !endDate) {
    return jsonResponse(400, { error: "start_date and end_date are required" });
  }
  if (!Number.isInteger(maxUsers) || maxUsers <= 0) {
    return jsonResponse(400, { error: "max_users must be a positive integer" });
  }

  try {
    const hasOwnerId = await contestsHasOwnerId(env);
    const existingQuery = hasOwnerId
      ? `SELECT id, uuid, name, ruleset, start_date, end_date, max_users
         FROM contests
         WHERE owner_id = ?
         LIMIT 1`
      : `SELECT c.id, c.uuid, c.name, c.ruleset, c.start_date, c.end_date, c.max_users
         FROM contests c
         INNER JOIN contests_users cu ON lower(cu.contest_uuid) = lower(c.uuid)
         WHERE cu.user_id = ?
           AND cu.id = (
             SELECT MIN(cu_owner.id)
             FROM contests_users cu_owner
             WHERE lower(cu_owner.contest_uuid) = lower(c.uuid)
           )
         ORDER BY cu.id ASC
         LIMIT 1`;

    const existing = await env.DB.prepare(existingQuery)
      .bind(user.id)
      .first();

    if (existing) {
      const totalUsersRow = await env.DB.prepare(
        "SELECT COUNT(*) AS total_users FROM contests_users WHERE lower(contest_uuid) = lower(?)"
      )
        .bind(existing.uuid)
        .first();
      const participants = await getContestParticipants(env, existing.uuid);

      return jsonResponse(409, {
        error: "User already owns a contest",
        contest: {
          uuid: existing.uuid,
          name: existing.name,
          ruleset: existing.ruleset,
          startDate: existing.start_date,
          endDate: existing.end_date,
          maxUsers: existing.max_users,
          totalUsers: Number(totalUsersRow?.total_users || 0),
          participants,
        },
      });
    }

    const contestUuid = generateContestUuid();

    if (hasOwnerId) {
      await env.DB.prepare(
        `INSERT INTO contests (uuid, name, start_date, end_date, max_users, ruleset, owner_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(contestUuid, name, startDate, endDate, maxUsers, ruleset, user.id)
        .run();
    } else {
      await env.DB.prepare(
        `INSERT INTO contests (uuid, name, start_date, end_date, max_users, ruleset)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(contestUuid, name, startDate, endDate, maxUsers, ruleset)
        .run();
    }

    const firstName = normalizeParam(user.first_name) || "Archer";
    const lastName = normalizeParam(user.last_name) || "Inconnu";

    await env.DB.prepare(
      `INSERT INTO contests_users (contest_uuid, user_id, first_name, last_name, weapon, data)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(contest_uuid, user_id) DO NOTHING`
    )
      .bind(contestUuid, user.id, firstName, lastName, "-", "{}")
      .run();
    const participants = await getContestParticipants(env, contestUuid);

    return jsonResponse(201, {
      success: true,
      contest: {
        uuid: contestUuid,
        name,
        ruleset,
        startDate,
        endDate,
        maxUsers,
        totalUsers: 1,
        participants,
      },
    });
  } catch {
    return jsonResponse(500, { error: "Failed to create contest" });
  }
}

export async function onRequest({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
