CREATE TABLE IF NOT EXISTS contests_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contest_uuid TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  weapon TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (contest_uuid) REFERENCES contests(uuid),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (contest_uuid, user_id)
);

CREATE INDEX IF NOT EXISTS idx_contests_users_contest_uuid ON contests_users(contest_uuid);
CREATE INDEX IF NOT EXISTS idx_contests_users_user_id ON contests_users(user_id);
