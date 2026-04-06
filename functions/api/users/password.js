import {
  hashPassword,
  jsonResponse,
  parseBearerToken,
  validatePasswordStrength,
  verifyPassword,
} from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const authHeader = request.headers.get("authorization") || "";
  const token = parseBearerToken(authHeader);
  if (!token) {
    return jsonResponse(401, { error: "Missing bearer token" });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return jsonResponse(400, { error: "Invalid JSON payload" });
  }

  const currentPassword = typeof payload.current_password === "string" ? payload.current_password : "";
  const newPassword = typeof payload.new_password === "string" ? payload.new_password : "";

  if (!currentPassword || !newPassword) {
    return jsonResponse(400, { error: "current_password and new_password are required" });
  }

  if (!validatePasswordStrength(newPassword)) {
    return jsonResponse(400, {
      error: "Le nouveau mot de passe doit faire au moins 8 caractères et inclure des majuscules, des minuscules, des chiffres et des symboles",
    });
  }

  try {
    const user = await env.DB.prepare(
      "SELECT id, password_hash FROM users WHERE token = ? LIMIT 1"
    )
      .bind(token)
      .first();

    if (!user) {
      return jsonResponse(401, { error: "Invalid token" });
    }

    const ok = await verifyPassword(currentPassword, user.password_hash);
    if (!ok) {
      return jsonResponse(401, { error: "Invalid credentials" });
    }

    const newHash = await hashPassword(newPassword);
    await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .bind(newHash, user.id)
      .run();

    return jsonResponse(200, { success: true });
  } catch (error) {
    return jsonResponse(500, { error: "Password update failed" });
  }
}

export async function onRequest({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
