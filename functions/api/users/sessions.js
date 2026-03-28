import { jsonResponse, parseBearerToken } from "../../_lib/auth.js";

async function getAuthenticatedUser(request, env) {
  const token = parseBearerToken(request.headers.get("authorization") || "");
  if (!token) return null;
  return env.DB.prepare("SELECT id FROM users WHERE token = ? LIMIT 1").bind(token).first();
}

export async function onRequestGet({ request, env }) {
  const user = await getAuthenticatedUser(request, env);
  if (!user) return jsonResponse(401, { error: "Invalid or missing token" });

  const rows = await env.DB.prepare(
    "SELECT data_json FROM sessions WHERE user_id = ? ORDER BY date DESC, time DESC"
  )
    .bind(user.id)
    .all();

  const entries = (rows?.results ?? [])
    .map((row) => {
      try {
        return JSON.parse(row.data_json);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return jsonResponse(200, { entries });
}

export async function onRequestPut({ request, env }) {
  const user = await getAuthenticatedUser(request, env);
  if (!user) return jsonResponse(401, { error: "Invalid or missing token" });

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON payload" });
  }

  const entries = payload?.entries;
  if (!Array.isArray(entries)) {
    return jsonResponse(400, { error: "entries must be an array" });
  }

  const valid = entries.filter(
    (e) => e && typeof e === "object" && (e.generatedAt || e.archivedAt)
  );

  try {
    await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id).run();

    for (const entry of valid) {
      const date =
        typeof entry.sessionDate === "string"
          ? entry.sessionDate
          : (entry.generatedAt || "").slice(0, 10);
      const time =
        typeof entry.sessionTime === "string"
          ? entry.sessionTime
          : (entry.generatedAt || "").slice(11, 16);
      await env.DB.prepare(
        "INSERT INTO sessions (user_id, data_json, date, time) VALUES (?, ?, ?, ?)"
      )
        .bind(user.id, JSON.stringify(entry), date || "", time || "")
        .run();
    }

    return jsonResponse(200, { count: valid.length });
  } catch (err) {
    return jsonResponse(500, { error: "Failed to save sessions", detail: String(err) });
  }
}

export async function onRequest({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
