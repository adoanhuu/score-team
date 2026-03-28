import { jsonResponse, parseBearerToken } from "../../_lib/auth.js";

async function getAuthenticatedUser(request, env) {
  const token = parseBearerToken(request.headers.get("authorization") || "");
  if (!token) return null;
  return env.DB.prepare("SELECT id FROM users WHERE token = ? LIMIT 1").bind(token).first();
}

export async function onRequestGet({ request, env }) {
  const user = await getAuthenticatedUser(request, env);
  if (!user) return jsonResponse(401, { error: "Invalid or missing token" });

  const row = await env.DB.prepare("SELECT configuration FROM users WHERE id = ? LIMIT 1")
    .bind(user.id)
    .first();

  let configuration = {};
  try {
    configuration = JSON.parse(row?.configuration || "{}");
  } catch { /* ignore */ }

  return jsonResponse(200, { configuration });
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

  const configuration = payload?.configuration;
  if (typeof configuration !== "object" || configuration === null || Array.isArray(configuration)) {
    return jsonResponse(400, { error: "configuration must be a JSON object" });
  }

  const serialized = JSON.stringify(configuration);

  try {
    await env.DB.prepare("UPDATE users SET configuration = ? WHERE id = ?")
      .bind(serialized, user.id)
      .run();
    return jsonResponse(200, { success: true });
  } catch {
    return jsonResponse(500, { error: "Failed to save configuration" });
  }
}

export async function onRequest({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
