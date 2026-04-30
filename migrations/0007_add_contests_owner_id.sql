ALTER TABLE contests ADD COLUMN owner_id INTEGER REFERENCES users(id);

UPDATE contests
SET owner_id = (
  SELECT cu.user_id
  FROM contests_users cu
  WHERE lower(cu.contest_uuid) = lower(contests.uuid)
  ORDER BY cu.id ASC
  LIMIT 1
)
WHERE owner_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contests_owner_id_unique
ON contests(owner_id)
WHERE owner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contests_owner_id
ON contests(owner_id);