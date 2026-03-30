var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/pages-RuvNZj/functionsWorker-0.15793442663744228.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var PASSWORD_LENGTH = 20;
var PBKDF2_ITERATIONS = 1e5;
var PBKDF2_HASH = "SHA-256";
var HASH_PREFIX = "pbkdf2_sha-256";
var TOKEN_BYTES = 32;
function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}
__name(jsonResponse, "jsonResponse");
__name2(jsonResponse, "jsonResponse");
function isValidEmail(value) {
  if (typeof value !== "string") return false;
  const email = value.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
__name(isValidEmail, "isValidEmail");
__name2(isValidEmail, "isValidEmail");
function generatePassword(length = PASSWORD_LENGTH) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?-_";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += charset[bytes[i] % charset.length];
  }
  return out;
}
__name(generatePassword, "generatePassword");
__name2(generatePassword, "generatePassword");
function validatePasswordStrength(password) {
  if (typeof password !== "string") return false;
  if (password.length < 12) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}
__name(validatePasswordStrength, "validatePasswordStrength");
__name2(validatePasswordStrength, "validatePasswordStrength");
function generateToken() {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}
__name(generateToken, "generateToken");
__name2(generateToken, "generateToken");
function parseBearerToken(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) return "";
  return trimmed.slice(7).trim();
}
__name(parseBearerToken, "parseBearerToken");
__name2(parseBearerToken, "parseBearerToken");
function base64Encode(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
__name(base64Encode, "base64Encode");
__name2(base64Encode, "base64Encode");
function base64UrlEncode(bytes) {
  return base64Encode(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(base64UrlEncode, "base64UrlEncode");
__name2(base64UrlEncode, "base64UrlEncode");
function base64DecodeToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
__name(base64DecodeToBytes, "base64DecodeToBytes");
__name2(base64DecodeToBytes, "base64DecodeToBytes");
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH
    },
    keyMaterial,
    256
  );
  const hashBytes = new Uint8Array(derivedBits);
  const saltB64 = base64Encode(salt);
  const hashB64 = base64Encode(hashBytes);
  return `${HASH_PREFIX}$${PBKDF2_ITERATIONS}$${saltB64}$${hashB64}`;
}
__name(hashPassword, "hashPassword");
__name2(hashPassword, "hashPassword");
async function verifyPassword(password, stored) {
  if (typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 4) return false;
  const [prefix, iterationsStr, saltB64, hashB64] = parts;
  if (prefix !== HASH_PREFIX) return false;
  const iterations = Number(iterationsStr);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const salt = base64DecodeToBytes(saltB64);
  const expectedHash = base64DecodeToBytes(hashB64);
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: PBKDF2_HASH
    },
    keyMaterial,
    expectedHash.length * 8
  );
  const actualHash = new Uint8Array(derivedBits);
  if (actualHash.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actualHash.length; i += 1) {
    diff |= actualHash[i] ^ expectedHash[i];
  }
  return diff === 0;
}
__name(verifyPassword, "verifyPassword");
__name2(verifyPassword, "verifyPassword");
function normalizeParam(value) {
  return typeof value === "string" ? value.trim() : "";
}
__name(normalizeParam, "normalizeParam");
__name2(normalizeParam, "normalizeParam");
async function findContest(env, uuid, ruleset) {
  const row = await env.DB.prepare(
    "SELECT id, uuid, name, ruleset, start_date, end_date FROM contests WHERE uuid = ? AND ruleset = ? LIMIT 1"
  ).bind(uuid, ruleset).first();
  return row || null;
}
__name(findContest, "findContest");
__name2(findContest, "findContest");
async function onRequestGet({ request, env }) {
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
        end_date: contest.end_date
      }
    });
  } catch {
    return jsonResponse(500, { error: "Failed to verify contest" });
  }
}
__name(onRequestGet, "onRequestGet");
__name2(onRequestGet, "onRequestGet");
async function onRequestPost({ request, env }) {
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
        end_date: contest.end_date
      }
    });
  } catch {
    return jsonResponse(500, { error: "Failed to verify contest" });
  }
}
__name(onRequestPost, "onRequestPost");
__name2(onRequestPost, "onRequestPost");
async function onRequest({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
__name(onRequest, "onRequest");
__name2(onRequest, "onRequest");
function normalizeParam2(value) {
  return typeof value === "string" ? value.trim() : "";
}
__name(normalizeParam2, "normalizeParam2");
__name2(normalizeParam2, "normalizeParam");
async function getAuthenticatedUser(request, env) {
  const token = parseBearerToken(request.headers.get("authorization") || "");
  if (!token) return null;
  const row = await env.DB.prepare(
    "SELECT id, first_name, last_name FROM users WHERE token = ? LIMIT 1"
  ).bind(token).first();
  return row || null;
}
__name(getAuthenticatedUser, "getAuthenticatedUser");
__name2(getAuthenticatedUser, "getAuthenticatedUser");
async function contestExists(env, contestUuid) {
  const row = await env.DB.prepare("SELECT uuid FROM contests WHERE uuid = ? LIMIT 1").bind(contestUuid).first();
  return Boolean(row?.uuid);
}
__name(contestExists, "contestExists");
__name2(contestExists, "contestExists");
async function onRequestPost2({ request, env }) {
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
  const contestUuid = normalizeParam2(payload?.contest_uuid);
  if (!contestUuid) {
    return jsonResponse(400, { error: "contest_uuid is required" });
  }
  const firstName = normalizeParam2(payload?.first_name) || normalizeParam2(user.first_name) || "Archer";
  const lastName = normalizeParam2(payload?.last_name) || normalizeParam2(user.last_name) || "Inconnu";
  const weapon = normalizeParam2(payload?.weapon) || "-";
  const rawData = payload?.data;
  const data = rawData && typeof rawData === "object" && !Array.isArray(rawData) ? JSON.stringify(rawData) : "{}";
  try {
    const exists = await contestExists(env, contestUuid);
    if (!exists) {
      return jsonResponse(404, { error: "Contest not found" });
    }
    await env.DB.prepare(
      `INSERT INTO contests_users (contest_uuid, user_id, first_name, last_name, weapon, data)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(contest_uuid, user_id)
       DO UPDATE SET
         first_name = excluded.first_name,
         last_name = excluded.last_name,
         weapon = excluded.weapon,
         data = CASE
           WHEN json_extract(excluded.data, '$.updatedAt') IS NULL THEN contests_users.data
           WHEN json_extract(contests_users.data, '$.updatedAt') IS NULL THEN excluded.data
           WHEN json_extract(excluded.data, '$.updatedAt') >= json_extract(contests_users.data, '$.updatedAt') THEN excluded.data
           ELSE contests_users.data
         END`
    ).bind(contestUuid, user.id, firstName, lastName, weapon, data).run();
    return jsonResponse(200, {
      success: true,
      contest_uuid: contestUuid,
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      weapon
    });
  } catch {
    return jsonResponse(500, { error: "Failed to upsert contest user" });
  }
}
__name(onRequestPost2, "onRequestPost2");
__name2(onRequestPost2, "onRequestPost");
async function onRequest2({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
__name(onRequest2, "onRequest2");
__name2(onRequest2, "onRequest");
async function getAuthenticatedUser2(request, env) {
  const token = parseBearerToken(request.headers.get("authorization") || "");
  if (!token) return null;
  return env.DB.prepare("SELECT id FROM users WHERE token = ? LIMIT 1").bind(token).first();
}
__name(getAuthenticatedUser2, "getAuthenticatedUser2");
__name2(getAuthenticatedUser2, "getAuthenticatedUser");
async function onRequestGet2({ request, env }) {
  const user = await getAuthenticatedUser2(request, env);
  if (!user) return jsonResponse(401, { error: "Invalid or missing token" });
  const row = await env.DB.prepare("SELECT configuration FROM users WHERE id = ? LIMIT 1").bind(user.id).first();
  let configuration = {};
  try {
    configuration = JSON.parse(row?.configuration || "{}");
  } catch {
  }
  return jsonResponse(200, { configuration });
}
__name(onRequestGet2, "onRequestGet2");
__name2(onRequestGet2, "onRequestGet");
async function onRequestPut({ request, env }) {
  const user = await getAuthenticatedUser2(request, env);
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
    await env.DB.prepare("UPDATE users SET configuration = ? WHERE id = ?").bind(serialized, user.id).run();
    return jsonResponse(200, { success: true });
  } catch {
    return jsonResponse(500, { error: "Failed to save configuration" });
  }
}
__name(onRequestPut, "onRequestPut");
__name2(onRequestPut, "onRequestPut");
async function onRequest3({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
__name(onRequest3, "onRequest3");
__name2(onRequest3, "onRequest");
async function onRequestPost3({ request, env }) {
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
      error: "new_password must be at least 12 chars and include upper, lower, number and symbol"
    });
  }
  try {
    const user = await env.DB.prepare(
      "SELECT id, password_hash FROM users WHERE token = ? LIMIT 1"
    ).bind(token).first();
    if (!user) {
      return jsonResponse(401, { error: "Invalid token" });
    }
    const ok = await verifyPassword(currentPassword, user.password_hash);
    if (!ok) {
      return jsonResponse(401, { error: "Invalid credentials" });
    }
    const newHash = await hashPassword(newPassword);
    await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(newHash, user.id).run();
    return jsonResponse(200, { success: true });
  } catch (error) {
    return jsonResponse(500, { error: "Password update failed" });
  }
}
__name(onRequestPost3, "onRequestPost3");
__name2(onRequestPost3, "onRequestPost");
async function onRequest4({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
__name(onRequest4, "onRequest4");
__name2(onRequest4, "onRequest");
async function getAuthenticatedUser3(request, env) {
  const token = parseBearerToken(request.headers.get("authorization") || "");
  if (!token) return null;
  return env.DB.prepare("SELECT id FROM users WHERE token = ? LIMIT 1").bind(token).first();
}
__name(getAuthenticatedUser3, "getAuthenticatedUser3");
__name2(getAuthenticatedUser3, "getAuthenticatedUser");
async function onRequestGet3({ request, env }) {
  const user = await getAuthenticatedUser3(request, env);
  if (!user) return jsonResponse(401, { error: "Invalid or missing token" });
  const rows = await env.DB.prepare(
    "SELECT data_json FROM sessions WHERE user_id = ? ORDER BY date DESC, time DESC"
  ).bind(user.id).all();
  const entries = (rows?.results ?? []).map((row) => {
    try {
      return JSON.parse(row.data_json);
    } catch {
      return null;
    }
  }).filter(Boolean);
  return jsonResponse(200, { entries });
}
__name(onRequestGet3, "onRequestGet3");
__name2(onRequestGet3, "onRequestGet");
async function onRequestPut2({ request, env }) {
  const user = await getAuthenticatedUser3(request, env);
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
      const date = typeof entry.sessionDate === "string" ? entry.sessionDate : (entry.generatedAt || "").slice(0, 10);
      const time = typeof entry.sessionTime === "string" ? entry.sessionTime : (entry.generatedAt || "").slice(11, 16);
      await env.DB.prepare(
        "INSERT INTO sessions (user_id, data_json, date, time) VALUES (?, ?, ?, ?)"
      ).bind(user.id, JSON.stringify(entry), date || "", time || "").run();
    }
    return jsonResponse(200, { count: valid.length });
  } catch (err) {
    return jsonResponse(500, { error: "Failed to save sessions", detail: String(err) });
  }
}
__name(onRequestPut2, "onRequestPut2");
__name2(onRequestPut2, "onRequestPut");
async function onRequest5({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
__name(onRequest5, "onRequest5");
__name2(onRequest5, "onRequest");
async function onRequestPost4({ request, env }) {
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
      "SELECT id, first_name, last_name, email, password_hash FROM users WHERE email = ? LIMIT 1"
    ).bind(email).first();
    if (!record) {
      return jsonResponse(401, { error: "Invalid credentials" });
    }
    const ok = await verifyPassword(password, record.password_hash);
    if (!ok) {
      return jsonResponse(401, { error: "Invalid credentials" });
    }
    const token = generateToken();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await env.DB.prepare("UPDATE users SET token = ?, token_created_at = ? WHERE id = ?").bind(token, now, record.id).run();
    return jsonResponse(200, {
      id: record.id,
      first_name: record.first_name,
      last_name: record.last_name,
      email: record.email,
      token
    });
  } catch (error) {
    return jsonResponse(500, { error: "Login failed" });
  }
}
__name(onRequestPost4, "onRequestPost4");
__name2(onRequestPost4, "onRequestPost");
async function onRequest6({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
__name(onRequest6, "onRequest6");
__name2(onRequest6, "onRequest");
async function getAuthenticatedUser4(request, env) {
  const token = parseBearerToken(request.headers.get("authorization") || "");
  if (!token) return null;
  return env.DB.prepare(
    "SELECT id, first_name, last_name, email, created_at FROM users WHERE token = ? LIMIT 1"
  ).bind(token).first();
}
__name(getAuthenticatedUser4, "getAuthenticatedUser4");
__name2(getAuthenticatedUser4, "getAuthenticatedUser");
async function onRequestGet4({ request, env }) {
  const user = await getAuthenticatedUser4(request, env);
  if (!user) {
    return jsonResponse(401, { error: "Invalid or missing token" });
  }
  return jsonResponse(200, { user });
}
__name(onRequestGet4, "onRequestGet4");
__name2(onRequestGet4, "onRequestGet");
async function onRequestPost5({ request, env }) {
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
      error: "password must be at least 12 chars and include upper, lower, number and symbol"
    });
  }
  const passwordHash = await hashPassword(passwordPlain);
  try {
    const result = await env.DB.prepare(
      "INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)"
    ).bind(firstName, lastName, email, passwordHash).run();
    const responseBody = {
      id: result?.meta?.last_row_id ?? null,
      email
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
__name(onRequestPost5, "onRequestPost5");
__name2(onRequestPost5, "onRequestPost");
async function onRequest7({ request }) {
  return jsonResponse(405, { error: `Method ${request.method} not allowed` });
}
__name(onRequest7, "onRequest7");
__name2(onRequest7, "onRequest");
var routes = [
  {
    routePath: "/api/contest/connect",
    mountPath: "/api/contest",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/contest/connect",
    mountPath: "/api/contest",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/contest/users",
    mountPath: "/api/contest",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/users/configuration",
    mountPath: "/api/users",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/users/configuration",
    mountPath: "/api/users",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut]
  },
  {
    routePath: "/api/users/password",
    mountPath: "/api/users",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/users/sessions",
    mountPath: "/api/users",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/users/sessions",
    mountPath: "/api/users",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut2]
  },
  {
    routePath: "/api/contest/connect",
    mountPath: "/api/contest",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/contest/users",
    mountPath: "/api/contest",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/api/users/configuration",
    mountPath: "/api/users",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  },
  {
    routePath: "/api/users/password",
    mountPath: "/api/users",
    method: "",
    middlewares: [],
    modules: [onRequest4]
  },
  {
    routePath: "/api/users/sessions",
    mountPath: "/api/users",
    method: "",
    middlewares: [],
    modules: [onRequest5]
  },
  {
    routePath: "/api/login",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/users",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/users",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/login",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest6]
  },
  {
    routePath: "/api/users",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest7]
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// ../root/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// ../root/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-qv7akL/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// ../root/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-qv7akL/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.15793442663744228.js.map
