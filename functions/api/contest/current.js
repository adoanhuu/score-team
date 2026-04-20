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
      },
    });
  }

  return jsonResponse(200, { found: false });
}
