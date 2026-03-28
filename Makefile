.PHONY: dev dev-down deploy db-migrate-local db-migrate-remote remote select-users select-user insert-user delete-user hash-password set-user-password remote-select-users remote-select-user remote-update-user-token remote-delete-user remote-insert-user remote-delete-session remote-update-password remote-set-user-password remote-exec

REMOTE_WRANGLER_CONFIG ?= wrangler.local.toml
REMOTE_D1_DATABASE ?= score-team

dev:
	@if [ -z "$$D1_DATABASE_ID" ] && [ ! -f .env.local ]; then \
		echo "Set D1_DATABASE_ID (env) or create .env.local"; \
		exit 1; \
	fi
	docker compose --env-file .env.local up

dev-down:
	docker compose --env-file .env.local down

deploy:
	./deploy.sh

db-migrate-local:
	npx wrangler d1 migrations apply score-team --local --config wrangler.local.toml

db-migrate-remote:
	npx wrangler d1 migrations apply $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG)

remote: db-migrate-remote

select-users:
	@db_path="$$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name '*.sqlite' | head -n 1)"; \
	if [ -z "$$db_path" ]; then \
		echo "Local D1 database not found. Run 'make db-migrate-local' first."; \
		exit 1; \
	fi; \
	sqlite3 -header -column "$$db_path" "SELECT id, first_name, last_name, email FROM users;"

select-user:
	@if [ -z "$(EMAIL)" ]; then \
		echo "Usage: make select-user EMAIL=user@example.com"; \
		exit 1; \
	fi
	@db_path="$$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name '*.sqlite' | head -n 1)"; \
	if [ -z "$$db_path" ]; then \
		echo "Local D1 database not found. Run 'make db-migrate-local' first."; \
		exit 1; \
	fi; \
	email_escaped="$$(printf '%s' "$(EMAIL)" | sed "s/'/''/g")"; \
	sqlite3 -header -column "$$db_path" "SELECT id, first_name, last_name, email, created_at, token, token_created_at FROM users WHERE email = '$$email_escaped';"

insert-user:
	@if [ -z "$(FIRST_NAME)" ] || [ -z "$(LAST_NAME)" ] || [ -z "$(EMAIL)" ] || { [ -z "$(PASSWORD_HASH)" ] && [ -z "$(PASSWORD_HASH_FILE)" ]; }; then \
		echo "Usage: make insert-user FIRST_NAME=... LAST_NAME=... EMAIL=... PASSWORD_HASH=..."; \
		echo "   or: make insert-user FIRST_NAME=... LAST_NAME=... EMAIL=... PASSWORD_HASH_FILE=./hash.txt"; \
		exit 1; \
	fi
	@db_path="$$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name '*.sqlite' | head -n 1)"; \
	if [ -z "$$db_path" ]; then \
		echo "Local D1 database not found. Run 'make db-migrate-local' first."; \
		exit 1; \
	fi; \
	first_name_escaped="$$(printf '%s' "$(FIRST_NAME)" | sed "s/'/''/g")"; \
	last_name_escaped="$$(printf '%s' "$(LAST_NAME)" | sed "s/'/''/g")"; \
	email_escaped="$$(printf '%s' "$(EMAIL)" | sed "s/'/''/g")"; \
	password_hash_input='$(PASSWORD_HASH)'; \
	if [ -n "$(PASSWORD_HASH_FILE)" ]; then \
		password_hash_input="$$(cat "$(PASSWORD_HASH_FILE)")"; \
	fi; \
	password_hash_escaped="$$(printf '%s' "$$password_hash_input" | sed "s/'/''/g")"; \
	sqlite3 "$$db_path" "INSERT INTO users (first_name, last_name, email, password_hash) VALUES ('$$first_name_escaped', '$$last_name_escaped', '$$email_escaped', '$$password_hash_escaped');"; \
	sqlite3 -header -column "$$db_path" "SELECT id, first_name, last_name, email FROM users WHERE email = '$$email_escaped';"

delete-user:
	@if [ -z "$(ID)" ]; then \
		echo "Usage: make delete-user ID=..."; \
		exit 1; \
	fi
	@db_path="$$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name '*.sqlite' | head -n 1)"; \
	if [ -z "$$db_path" ]; then \
		echo "Local D1 database not found. Run 'make db-migrate-local' first."; \
		exit 1; \
	fi; \
	sqlite3 "$$db_path" "DELETE FROM sessions WHERE user_id = $(ID); DELETE FROM users WHERE id = $(ID);"; \
	echo "Deleted user $(ID) and related sessions if they existed."

hash-password:
	@if [ -z "$(PASSWORD)" ] && [ -z "$(PASSWORD_FILE)" ]; then \
		echo "Usage: make hash-password PASSWORD=..."; \
		echo "   or: make hash-password PASSWORD_FILE=./password.txt"; \
		exit 1; \
	fi
	@password_input='$(PASSWORD)'; \
	if [ -n "$(PASSWORD_FILE)" ]; then \
		password_input="$$(cat "$(PASSWORD_FILE)")"; \
	fi; \
	PW="$$password_input" node -e 'const crypto = require("crypto"); const pw = process.env.PW || ""; const it = 100000; const salt = crypto.randomBytes(16); const hash = crypto.pbkdf2Sync(pw, salt, it, 32, "sha256"); process.stdout.write("pbkdf2_sha-256" + "$$" + it + "$$" + salt.toString("base64") + "$$" + hash.toString("base64") + "\n");'

set-user-password:
	@if [ -z "$(EMAIL)" ] || { [ -z "$(PASSWORD)" ] && [ -z "$(PASSWORD_FILE)" ]; }; then \
		echo "Usage: make set-user-password EMAIL=user@example.com PASSWORD=..."; \
		echo "   or: make set-user-password EMAIL=user@example.com PASSWORD_FILE=./password.txt"; \
		exit 1; \
	fi
	@db_path="$$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name '*.sqlite' | head -n 1)"; \
	if [ -z "$$db_path" ]; then \
		echo "Local D1 database not found. Run 'make db-migrate-local' first."; \
		exit 1; \
	fi; \
	password_input='$(PASSWORD)'; \
	if [ -n "$(PASSWORD_FILE)" ]; then \
		password_input="$$(cat "$(PASSWORD_FILE)")"; \
	fi; \
	password_hash="$$(PW="$$password_input" node -e 'const crypto = require("crypto"); const pw = process.env.PW || ""; const it = 100000; const salt = crypto.randomBytes(16); const hash = crypto.pbkdf2Sync(pw, salt, it, 32, "sha256"); process.stdout.write("pbkdf2_sha-256" + "$$" + it + "$$" + salt.toString("base64") + "$$" + hash.toString("base64"));')"; \
	email_escaped="$$(printf '%s' "$(EMAIL)" | sed "s/'/''/g")"; \
	password_hash_escaped="$$(printf '%s' "$$password_hash" | sed "s/'/''/g")"; \
	sqlite3 "$$db_path" "UPDATE users SET password_hash = '$$password_hash_escaped' WHERE email = '$$email_escaped';"; \
	sqlite3 -header -column "$$db_path" "SELECT id, first_name, last_name, email FROM users WHERE email = '$$email_escaped';"

remote-select-users:
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) --command "SELECT id, first_name, last_name, email, created_at FROM users ORDER BY id;"

remote-select-user:
	@if [ -z "$(EMAIL)" ]; then \
		echo "Usage: make remote-select-user EMAIL=user@example.com [REMOTE_WRANGLER_CONFIG=wrangler.local.toml] [REMOTE_D1_DATABASE=score-team]"; \
		exit 1; \
	fi
	@email_escaped="$$(printf '%s' "$(EMAIL)" | sed "s/'/''/g")"; \
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) --command "SELECT id, first_name, last_name, email, created_at, token, token_created_at FROM users WHERE email = '$$email_escaped';"

remote-update-user-token:
	@if [ -z "$(EMAIL)" ] || [ -z "$(TOKEN)" ]; then \
		echo "Usage: make remote-update-user-token EMAIL=user@example.com TOKEN=... [REMOTE_WRANGLER_CONFIG=wrangler.local.toml] [REMOTE_D1_DATABASE=score-team]"; \
		exit 1; \
	fi
	@email_escaped="$$(printf '%s' "$(EMAIL)" | sed "s/'/''/g")"; \
	token_escaped="$$(printf '%s' "$(TOKEN)" | sed "s/'/''/g")"; \
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) --command "UPDATE users SET token = '$$token_escaped', token_created_at = datetime('now') WHERE email = '$$email_escaped'; SELECT id, first_name, last_name, email, token, token_created_at FROM users WHERE email = '$$email_escaped';"

remote-delete-user:
	@if [ -z "$(ID)" ]; then \
		echo "Usage: make remote-delete-user ID=... [REMOTE_WRANGLER_CONFIG=wrangler.local.toml] [REMOTE_D1_DATABASE=score-team]"; \
		exit 1; \
	fi
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) --command "DELETE FROM sessions WHERE user_id = $(ID); DELETE FROM users WHERE id = $(ID);"

remote-insert-user:
	@if [ -z "$(FIRST_NAME)" ] || [ -z "$(LAST_NAME)" ] || [ -z "$(EMAIL)" ] || { [ -z "$(PASSWORD_HASH)" ] && [ -z "$(PASSWORD_HASH_FILE)" ]; }; then \
		echo "Usage: make remote-insert-user FIRST_NAME=... LAST_NAME=... EMAIL=... PASSWORD_HASH=... [REMOTE_WRANGLER_CONFIG=wrangler.local.toml] [REMOTE_D1_DATABASE=score-team]"; \
		echo "   or: make remote-insert-user FIRST_NAME=... LAST_NAME=... EMAIL=... PASSWORD_HASH_FILE=./hash.txt [REMOTE_WRANGLER_CONFIG=wrangler.local.toml] [REMOTE_D1_DATABASE=score-team]"; \
		exit 1; \
	fi
	@first_name_escaped="$$(printf '%s' "$(FIRST_NAME)" | sed "s/'/''/g")"; \
	last_name_escaped="$$(printf '%s' "$(LAST_NAME)" | sed "s/'/''/g")"; \
	email_escaped="$$(printf '%s' "$(EMAIL)" | sed "s/'/''/g")"; \
	password_hash_input='$(PASSWORD_HASH)'; \
	if [ -n "$(PASSWORD_HASH_FILE)" ]; then \
		password_hash_input="$$(cat "$(PASSWORD_HASH_FILE)")"; \
	fi; \
	password_hash_escaped="$$(printf '%s' "$$password_hash_input" | sed "s/'/''/g")"; \
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) --command "INSERT INTO users (first_name, last_name, email, password_hash) VALUES ('$$first_name_escaped', '$$last_name_escaped', '$$email_escaped', '$$password_hash_escaped'); SELECT id, first_name, last_name, email FROM users WHERE email = '$$email_escaped';"

remote-delete-session:
	@if [ -z "$(ID)" ]; then \
		echo "Usage: make remote-delete-session ID=... [REMOTE_WRANGLER_CONFIG=wrangler.local.toml] [REMOTE_D1_DATABASE=score-team]"; \
		exit 1; \
	fi
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) --command "DELETE FROM sessions WHERE id = $(ID);"

remote-update-password:
	@if [ -z "$(EMAIL)" ] || { [ -z "$(PASSWORD_HASH)" ] && [ -z "$(PASSWORD_HASH_FILE)" ]; }; then \
		echo "Usage: make remote-update-password EMAIL=user@example.com PASSWORD_HASH=... [REMOTE_WRANGLER_CONFIG=wrangler.local.toml] [REMOTE_D1_DATABASE=score-team]"; \
		echo "   or: make remote-update-password EMAIL=user@example.com PASSWORD_HASH_FILE=./hash.txt [REMOTE_WRANGLER_CONFIG=wrangler.local.toml] [REMOTE_D1_DATABASE=score-team]"; \
		exit 1; \
	fi
	@email_escaped="$$(printf '%s' "$(EMAIL)" | sed "s/'/''/g")"; \
	password_hash_input='$(PASSWORD_HASH)'; \
	if [ -n "$(PASSWORD_HASH_FILE)" ]; then \
		password_hash_input="$$(cat "$(PASSWORD_HASH_FILE)")"; \
	fi; \
	password_hash_escaped="$$(printf '%s' "$$password_hash_input" | sed "s/'/''/g")"; \
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) --command "UPDATE users SET password_hash = '$$password_hash_escaped' WHERE email = '$$email_escaped'; SELECT id, first_name, last_name, email FROM users WHERE email = '$$email_escaped';"

remote-set-user-password:
	@if [ -z "$(EMAIL)" ] || { [ -z "$(PASSWORD)" ] && [ -z "$(PASSWORD_FILE)" ]; }; then \
		echo "Usage: make remote-set-user-password EMAIL=user@example.com PASSWORD=... [REMOTE_WRANGLER_CONFIG=wrangler.local.toml] [REMOTE_D1_DATABASE=score-team]"; \
		echo "   or: make remote-set-user-password EMAIL=user@example.com PASSWORD_FILE=./password.txt [REMOTE_WRANGLER_CONFIG=wrangler.local.toml] [REMOTE_D1_DATABASE=score-team]"; \
		exit 1; \
	fi
	@password_input='$(PASSWORD)'; \
	if [ -n "$(PASSWORD_FILE)" ]; then \
		password_input="$$(cat "$(PASSWORD_FILE)")"; \
	fi; \
	password_hash="$$(PW="$$password_input" node -e 'const crypto = require("crypto"); const pw = process.env.PW || ""; const it = 100000; const salt = crypto.randomBytes(16); const hash = crypto.pbkdf2Sync(pw, salt, it, 32, "sha256"); process.stdout.write("pbkdf2_sha-256" + "$$" + it + "$$" + salt.toString("base64") + "$$" + hash.toString("base64"));')"; \
	email_escaped="$$(printf '%s' "$(EMAIL)" | sed "s/'/''/g")"; \
	password_hash_escaped="$$(printf '%s' "$$password_hash" | sed "s/'/''/g")"; \
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) --command "UPDATE users SET password_hash = '$$password_hash_escaped' WHERE email = '$$email_escaped'; SELECT id, first_name, last_name, email FROM users WHERE email = '$$email_escaped';"

remote-exec:
	@if [ -z "$(SQL)" ]; then \
		echo "Usage: make remote-exec SQL=\"SELECT * FROM users LIMIT 10;\" [REMOTE_WRANGLER_CONFIG=wrangler.local.toml] [REMOTE_D1_DATABASE=score-team]"; \
		exit 1; \
	fi
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) --command "$(SQL)"
