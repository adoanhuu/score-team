const PASSWORD_LENGTH = 20;
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = "SHA-256";
const HASH_PREFIX = "pbkdf2_sha-256";
const TOKEN_BYTES = 32;

export function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export function isValidEmail(value) {
  if (typeof value !== "string") return false;
  const email = value.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generatePassword(length = PASSWORD_LENGTH) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?-_";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += charset[bytes[i] % charset.length];
  }
  return out;
}

export function validatePasswordStrength(password) {
  if (typeof password !== "string") return false;
  if (password.length < 12) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

export function generateToken() {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export function parseBearerToken(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) return "";
  return trimmed.slice(7).trim();
}

function base64Encode(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64UrlEncode(bytes) {
  return base64Encode(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64DecodeToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function hashPassword(password) {
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
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    256
  );
  const hashBytes = new Uint8Array(derivedBits);
  const saltB64 = base64Encode(salt);
  const hashB64 = base64Encode(hashBytes);
  return `${HASH_PREFIX}$${PBKDF2_ITERATIONS}$${saltB64}$${hashB64}`;
}

export async function verifyPassword(password, stored) {
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
      hash: PBKDF2_HASH,
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
