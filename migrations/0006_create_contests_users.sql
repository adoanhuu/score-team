CREATE TABLE IF NOT EXISTS contests_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contest_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  weapon TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (contest_id) REFERENCES contests(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (contest_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_contests_users_contest_id ON contests_users(contest_id);
CREATE INDEX IF NOT EXISTS idx_contests_users_user_id ON contests_users(user_id);
