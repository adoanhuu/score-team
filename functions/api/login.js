import {
  generateToken,
  isValidEmail,
  jsonResponse,
  verifyPassword,
} from "../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return jsonResponse(400, { error: "Invalid JSON payload" });
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!isValidEmail(email) || !password) {
    return jsonResponse(400, { error: "email and password are required" });
  }

  try {
    const record = await env.DB.prepare(
      "SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1"
    )
      .bind(email)
      .first();

    if (!record) {
      return jsonResponse(401, { error: "Invalid credentials" });
    }

    const ok = await verifyPassword(password, record.password_hash);
    if (!ok) {
      return jsonResponse(401, { error: "Invalid credentials" });
    }

    const token = generateToken();
    const now = new Date().toISOString();
    await env.DB.prepare("UPDATE users SET token = ?, token_created_at = ? WHERE id = ?")
      .bind(token, now, record.id)
      .run();

    return jsonResponse(200, { id: record.id, email: record.email, token });
  } catch (error) {
    return jsonResponse(500, { error: "Login failed" });
  }
}

export async function onRequest({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
