import {
  generatePassword,
  hashPassword,
  isValidEmail,
  jsonResponse,
  parseBearerToken,
  validatePasswordStrength,
} from "../_lib/auth.js";

async function getAuthenticatedUser(request, env) {
  const token = parseBearerToken(request.headers.get("authorization") || "");
  if (!token) return null;

  return env.DB.prepare(
    "SELECT id, first_name, last_name, email, created_at FROM users WHERE token = ? LIMIT 1"
  )
    .bind(token)
    .first();
}

export async function onRequestGet({ request, env }) {
  const user = await getAuthenticatedUser(request, env);
  if (!user) {
    return jsonResponse(401, { error: "Invalid or missing token" });
  }

  return jsonResponse(200, { user });
}

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return jsonResponse(400, { error: "Invalid JSON payload" });
  }

  const firstName = typeof payload.first_name === "string" ? payload.first_name.trim() : "";
  const lastName = typeof payload.last_name === "string" ? payload.last_name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const requestedPassword = typeof payload.password === "string" ? payload.password : "";

  if (!firstName || !lastName || !isValidEmail(email)) {
    return jsonResponse(400, { error: "first_name, last_name and valid email are required" });
  }

  const usingProvidedPassword = Boolean(requestedPassword);
  const passwordPlain = usingProvidedPassword ? requestedPassword : generatePassword();
  if (usingProvidedPassword && !validatePasswordStrength(passwordPlain)) {
    return jsonResponse(400, {
      error: "Le mot de passe doit faire au moins 8 caractères et inclure des majuscules, des minuscules, des chiffres et des symboles",
    });
  }
  const passwordHash = await hashPassword(passwordPlain);

  try {
    const result = await env.DB.prepare(
      "INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)"
    )
      .bind(firstName, lastName, email, passwordHash)
      .run();

    const responseBody = {
      id: result?.meta?.last_row_id ?? null,
      email,
    };
    if (!usingProvidedPassword) {
      responseBody.password = passwordPlain;
    }
    return jsonResponse(201, responseBody);
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) {
      return jsonResponse(409, { error: "email already exists" });
    }
    return jsonResponse(500, { error: "Failed to create user" });
  }
}

export async function onRequest({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
