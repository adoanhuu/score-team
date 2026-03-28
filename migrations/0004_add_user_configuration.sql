ALTER TABLE users
ADD COLUMN configuration TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(configuration));
