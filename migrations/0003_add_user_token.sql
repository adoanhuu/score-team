ALTER TABLE users ADD COLUMN token TEXT;
ALTER TABLE users ADD COLUMN token_created_at TEXT;
CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
