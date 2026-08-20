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
    "SELECT id, first_name, last_name, email, created_at FROM users ORDER BY created_at DESC"
  ).all();

  return jsonResponse(200, { users: rows?.results ?? [] });
}

export async function onRequest({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
