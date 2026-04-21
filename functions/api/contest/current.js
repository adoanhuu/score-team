import { jsonResponse, parseBearerToken } from "../../_lib/auth.js";

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

export async function onRequestGet({ request, env }) {
  const user = await getAuthenticatedUser(request, env);
  if (!user) {
    return jsonResponse(401, { error: "Invalid or missing token" });
  }

  const hasOwnerId = await contestsHasOwnerId(env);
  const contestQuery = hasOwnerId
    ? `SELECT c.uuid, c.name, c.ruleset, c.start_date, c.end_date, c.max_users,
              (
                SELECT COUNT(*)
                FROM contests_users cu
                WHERE lower(cu.contest_uuid) = lower(c.uuid)
              ) AS total_users
       FROM contests c
       WHERE c.owner_id = ?
       LIMIT 1`
    : `SELECT c.uuid, c.name, c.ruleset, c.start_date, c.end_date, c.max_users,
              (
                SELECT COUNT(*)
                FROM contests_users cu_count
                WHERE lower(cu_count.contest_uuid) = lower(c.uuid)
              ) AS total_users
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

  const contest = await env.DB.prepare(contestQuery)
    .bind(user.id)
    .first();

  if (contest) {
    const participants = await getContestParticipants(env, contest.uuid);
    return jsonResponse(200, {
      found: true,
      contest: {
        uuid: contest.uuid,
        name: contest.name,
        ruleset: contest.ruleset,
        startDate: contest.start_date,
        endDate: contest.end_date,
        maxUsers: contest.max_users,
        totalUsers: Number(contest.total_users || 0),
        participants,
      },
    });
  }

  return jsonResponse(200, { found: false });
}
