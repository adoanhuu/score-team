#!/usr/bin/env node
"use strict";

const fs = require("fs");

const userId = process.env.USER_ID;
const inputFile = process.env.INPUT_FILE;

if (!userId || !/^\d+$/.test(userId)) {
  console.error("USER_ID env var must be set to a numeric user id.");
  process.exit(1);
}

if (!inputFile) {
  console.error("INPUT_FILE env var must be set to the JSON export path.");
  process.exit(1);
}

let raw;
try {
  raw = fs.readFileSync(inputFile, "utf8");
} catch (err) {
  console.error(`Unable to read ${inputFile}: ${err.message}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  console.error(`Invalid JSON in ${inputFile}: ${err.message}`);
  process.exit(1);
}

const entries = Array.isArray(data) ? data : [data];

function sqlStr(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

const statements = [];
let count = 0;

for (const entry of entries) {
  if (!entry || typeof entry !== "object") continue;
  if (!entry.generatedAt && !entry.archivedAt) continue;

  const date =
    typeof entry.sessionDate === "string"
      ? entry.sessionDate
      : (entry.generatedAt || "").slice(0, 10);
  const time =
    typeof entry.sessionTime === "string"
      ? entry.sessionTime
      : (entry.generatedAt || "").slice(11, 16);
  const ruleset = typeof entry.ruleset === "string" ? entry.ruleset : "";

  statements.push(
    "INSERT INTO sessions (user_id, data_json, date, time) " +
      "SELECT " +
      [userId, sqlStr(JSON.stringify(entry)), sqlStr(date || ""), sqlStr(time || "")].join(", ") +
      " WHERE NOT EXISTS (" +
      "SELECT 1 FROM sessions WHERE user_id = " +
      userId +
      " AND date = " +
      sqlStr(date || "") +
      " AND time = " +
      sqlStr(time || "") +
      " AND json_extract(data_json, '$.ruleset') = " +
      sqlStr(ruleset) +
      ");"
  );
  count += 1;
}

process.stdout.write(statements.join("\n") + "\n");
process.stderr.write(`Generated ${count} session(s).\n`);
