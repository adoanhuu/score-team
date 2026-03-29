.PHONY: dev dev-down deploy db-migrate remote-db-migrate remote select-users select-user insert-user delete-user hash-password set-user-password remote-select-users remote-select-user remote-update-user-token remote-delete-user remote-insert-user remote-delete-session remote-update-password remote-set-user-password remote-exec select-sessions remote-select-sessions select-contests select-contest insert-contest delete-contest remote-select-contests remote-select-contest remote-insert-contest remote-delete-contest select-contests-users select-contests-user insert-contests-user delete-contests-user remote-select-contests-users remote-select-contests-user remote-insert-contests-user remote-delete-contests-user

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

db-migrate:
	npx wrangler d1 migrations apply score-team --local --config wrangler.local.toml

remote-db-migrate:
	npx wrangler d1 migrations apply $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG)

remote: remote-db-migrate

select-users:
	@db_path="$$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name '*.sqlite' | head -n 1)"; \
	if [ -z "$$db_path" ]; then \
		echo "Local D1 database not found. Run 'make db-migrate-local' first."; \
		exit 1; \
	fi; \
	sqlite3 -header -column "$$db_path" "SELECT id, first_name, last_name, email, configuration FROM users;"

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

select-sessions:
	@db_path="$$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name '*.sqlite' | head -n 1)"; \
	if [ -z "$$db_path" ]; then \
		echo "Local D1 database not found. Run 'make db-migrate-local' first."; \
		exit 1; \
	fi; \
	user_filter=''; \
	if [ -n "$(EMAIL)" ]; then \
		email_escaped="$$(printf '%s' "$(EMAIL)" | sed "s/'/''/g")"; \
		user_filter=" WHERE u.email = '$$email_escaped'"; \
	fi; \
	sqlite3 -header -column "$$db_path" \
		"SELECT s.id, u.email, s.date, s.time, json_extract(s.data_json, '$$.ruleset') AS ruleset, json_extract(s.data_json, '$$.weapon') AS weapon, json_extract(s.data_json, '$$.total') AS total, s.created_at FROM sessions s JOIN users u ON s.user_id = u.id$$user_filter ORDER BY s.date DESC, s.time DESC;"

remote-select-sessions:
	@user_filter=''; \
	if [ -n "$(EMAIL)" ]; then \
		email_escaped="$$(printf '%s' "$(EMAIL)" | sed "s/'/''/g")"; \
		user_filter=" WHERE u.email = '$$email_escaped'"; \
	fi; \
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) \
		--command "SELECT s.id, u.email, s.date, s.time, json_extract(s.data_json, '$$.ruleset') AS ruleset, json_extract(s.data_json, '$$.weapon') AS weapon, json_extract(s.data_json, '$$.total') AS total, s.created_at FROM sessions s JOIN users u ON s.user_id = u.id$$user_filter ORDER BY s.date DESC, s.time DESC;"

select-contests:
	@db_path="$$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name '*.sqlite' | head -n 1)"; \
	if [ -z "$$db_path" ]; then \
		echo "Local D1 database not found. Run 'make db-migrate-local' first."; \
		exit 1; \
	fi; \
	sqlite3 -header -column "$$db_path" "SELECT id, uuid, name, start_date, end_date, max_users, ruleset, created_at FROM contests ORDER BY start_date DESC;"

select-contest:
	@if [ -z "$(UUID)" ]; then \
		echo "Usage: make select-contest UUID=..."; \
		exit 1; \
	fi
	@db_path="$$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name '*.sqlite' | head -n 1)"; \
	if [ -z "$$db_path" ]; then \
		echo "Local D1 database not found. Run 'make db-migrate-local' first."; \
		exit 1; \
	fi; \
	uuid_escaped="$$(printf '%s' "$(UUID)" | sed "s/'/''/g")"; \
	sqlite3 -header -column "$$db_path" "SELECT id, uuid, name, start_date, end_date, max_users, ruleset, created_at FROM contests WHERE uuid = '$$uuid_escaped';"

insert-contest:
	@if [ -z "$(NAME)" ] || [ -z "$(START_DATE)" ] || [ -z "$(END_DATE)" ] || [ -z "$(MAX_USERS)" ] || [ -z "$(RULESET)" ]; then \
		echo "Usage: make insert-contest NAME=... START_DATE=YYYY-MM-DD END_DATE=YYYY-MM-DD MAX_USERS=... RULESET=..."; \
		exit 1; \
	fi
	@db_path="$$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name '*.sqlite' | head -n 1)"; \
	if [ -z "$$db_path" ]; then \
		echo "Local D1 database not found. Run 'make db-migrate-local' first."; \
		exit 1; \
	fi; \
	contest_uuid="$$(node -e "process.stdout.write(require('crypto').randomUUID())")"; \
	name_escaped="$$(printf '%s' "$(NAME)" | sed "s/'/''/g")"; \
	ruleset_escaped="$$(printf '%s' "$(RULESET)" | sed "s/'/''/g")"; \
	sqlite3 "$$db_path" "INSERT INTO contests (uuid, name, start_date, end_date, max_users, ruleset) VALUES ('$$contest_uuid', '$$name_escaped', '$(START_DATE)', '$(END_DATE)', $(MAX_USERS), '$$ruleset_escaped');"; \
	sqlite3 -header -column "$$db_path" "SELECT id, uuid, name, start_date, end_date, max_users, ruleset FROM contests WHERE uuid = '$$contest_uuid';"

delete-contest:
	@if [ -z "$(ID)" ]; then \
		echo "Usage: make delete-contest ID=..."; \
		exit 1; \
	fi
	@db_path="$$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name '*.sqlite' | head -n 1)"; \
	if [ -z "$$db_path" ]; then \
		echo "Local D1 database not found. Run 'make db-migrate-local' first."; \
		exit 1; \
	fi; \
	sqlite3 "$$db_path" "DELETE FROM contests WHERE id = $(ID);"; \
	echo "Deleted contest $(ID) if it existed."

remote-select-contests:
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) --command "SELECT id, uuid, name, start_date, end_date, max_users, ruleset, created_at FROM contests ORDER BY start_date DESC;"

remote-select-contest:
	@if [ -z "$(UUID)" ]; then \
		echo "Usage: make remote-select-contest UUID=... [REMOTE_WRANGLER_CONFIG=wrangler.local.toml] [REMOTE_D1_DATABASE=score-team]"; \
		exit 1; \
	fi
	@uuid_escaped="$$(printf '%s' "$(UUID)" | sed "s/'/''/g")"; \
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) --command "SELECT id, uuid, name, start_date, end_date, max_users, ruleset, created_at FROM contests WHERE uuid = '$$uuid_escaped';"

remote-insert-contest:
	@if [ -z "$(NAME)" ] || [ -z "$(START_DATE)" ] || [ -z "$(END_DATE)" ] || [ -z "$(MAX_USERS)" ] || [ -z "$(RULESET)" ]; then \
		echo "Usage: make remote-insert-contest NAME=... START_DATE='YYYY-MM-DD HH:MM' END_DATE='YYYY-MM-DD HH:MM' MAX_USERS=... RULESET=[nature|campagne|3d|3d2|3dh|ar|field]... [REMOTE_WRANGLER_CONFIG=wrangler.local.toml] [REMOTE_D1_DATABASE=score-team]"; \
		exit 1; \
	fi
	@case "$(RULESET)" in \
		nature|campagne|3d|3d2|3dh|ar|field) ;; \
		*) echo "Invalid RULESET: $(RULESET). Must be one of: nature, campagne, 3d, 3d2, 3dh, ar, field"; exit 1;; \
	esac
	@contest_uuid="$$(node -e "process.stdout.write(require('crypto').randomUUID())")";\
	name_escaped="$$(printf '%s' "$(NAME)" | sed "s/'/''/g")"; \
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) --command "INSERT INTO contests (uuid, name, start_date, end_date, max_users, ruleset) VALUES ('$$contest_uuid', '$$name_escaped', '$(START_DATE)', '$(END_DATE)', $(MAX_USERS), '$(RULESET)'); SELECT id, uuid, name, start_date, end_date, max_users, ruleset FROM contests WHERE uuid = '$$contest_uuid';"

remote-delete-contest:
	@if [ -z "$(ID)" ]; then \
		echo "Usage: make remote-delete-contest ID=... [REMOTE_WRANGLER_CONFIG=wrangler.local.toml] [REMOTE_D1_DATABASE=score-team]"; \
		exit 1; \
	fi
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) --command "DELETE FROM contests WHERE id = $(ID);"

select-contests-users:
	@db_path="$$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name '*.sqlite' | head -n 1)"; \
	if [ -z "$$db_path" ]; then \
		echo "Local D1 database not found. Run 'make db-migrate' first."; \
		exit 1; \
	fi; \
	filter=''; \
	if [ -n "$(CONTEST_ID)" ]; then \
		filter="$$filter AND cu.contest_id = $(CONTEST_ID)"; \
	fi; \
	if [ -n "$(USER_ID)" ]; then \
		filter="$$filter AND cu.user_id = $(USER_ID)"; \
	fi; \
	sqlite3 -header -column "$$db_path" "SELECT cu.id, cu.contest_id, c.uuid AS contest_uuid, cu.user_id, cu.first_name, cu.last_name, cu.weapon, cu.data, cu.created_at FROM contests_users cu LEFT JOIN contests c ON c.id = cu.contest_id WHERE 1=1$$filter ORDER BY cu.id DESC;"

select-contests-user:
	@if [ -z "$(ID)" ]; then \
		echo "Usage: make select-contests-user ID=..."; \
		exit 1; \
	fi
	@db_path="$$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name '*.sqlite' | head -n 1)"; \
	if [ -z "$$db_path" ]; then \
		echo "Local D1 database not found. Run 'make db-migrate' first."; \
		exit 1; \
	fi; \
	sqlite3 -header -column "$$db_path" "SELECT id, contest_id, user_id, first_name, last_name, weapon, data, created_at FROM contests_users WHERE id = $(ID);"

insert-contests-user:
	@if [ -z "$(CONTEST_ID)" ] || [ -z "$(USER_ID)" ] || [ -z "$(FIRST_NAME)" ] || [ -z "$(LAST_NAME)" ] || [ -z "$(WEAPON)" ]; then \
		echo "Usage: make insert-contests-user CONTEST_ID=... USER_ID=... FIRST_NAME=... LAST_NAME=... WEAPON=... [DATA_JSON='{}']"; \
		exit 1; \
	fi
	@db_path="$$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name '*.sqlite' | head -n 1)"; \
	if [ -z "$$db_path" ]; then \
		echo "Local D1 database not found. Run 'make db-migrate' first."; \
		exit 1; \
	fi; \
	first_name_escaped="$$(printf '%s' "$(FIRST_NAME)" | sed "s/'/''/g")"; \
	last_name_escaped="$$(printf '%s' "$(LAST_NAME)" | sed "s/'/''/g")"; \
	weapon_escaped="$$(printf '%s' "$(WEAPON)" | sed "s/'/''/g")"; \
	data_input='$(DATA_JSON)'; \
	if [ -z "$$data_input" ]; then data_input='{}'; fi; \
	data_escaped="$$(printf '%s' "$$data_input" | sed "s/'/''/g")"; \
	sqlite3 "$$db_path" "INSERT INTO contests_users (contest_id, user_id, first_name, last_name, weapon, data) VALUES ($(CONTEST_ID), $(USER_ID), '$$first_name_escaped', '$$last_name_escaped', '$$weapon_escaped', '$$data_escaped');"; \
	sqlite3 -header -column "$$db_path" "SELECT id, contest_id, user_id, first_name, last_name, weapon, data FROM contests_users WHERE rowid = last_insert_rowid();"

delete-contests-user:
	@if [ -z "$(ID)" ]; then \
		echo "Usage: make delete-contests-user ID=..."; \
		exit 1; \
	fi
	@db_path="$$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name '*.sqlite' | head -n 1)"; \
	if [ -z "$$db_path" ]; then \
		echo "Local D1 database not found. Run 'make db-migrate' first."; \
		exit 1; \
	fi; \
	sqlite3 "$$db_path" "DELETE FROM contests_users WHERE id = $(ID);"; \
	echo "Deleted contests_users row $(ID) if it existed."

remote-select-contests-users:
	@filter=''; \
	if [ -n "$(CONTEST_ID)" ]; then \
		filter="$$filter AND cu.contest_id = $(CONTEST_ID)"; \
	fi; \
	if [ -n "$(USER_ID)" ]; then \
		filter="$$filter AND cu.user_id = $(USER_ID)"; \
	fi; \
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) --command "SELECT cu.id, cu.contest_id, c.uuid AS contest_uuid, cu.user_id, cu.first_name, cu.last_name, cu.weapon, cu.data, cu.created_at FROM contests_users cu LEFT JOIN contests c ON c.id = cu.contest_id WHERE 1=1$$filter ORDER BY cu.id DESC;"

remote-select-contests-user:
	@if [ -z "$(ID)" ]; then \
		echo "Usage: make remote-select-contests-user ID=... [REMOTE_WRANGLER_CONFIG=wrangler.local.toml] [REMOTE_D1_DATABASE=score-team]"; \
		exit 1; \
	fi
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) --command "SELECT id, contest_id, user_id, first_name, last_name, weapon, data, created_at FROM contests_users WHERE id = $(ID);"

remote-insert-contests-user:
	@if [ -z "$(CONTEST_ID)" ] || [ -z "$(USER_ID)" ] || [ -z "$(FIRST_NAME)" ] || [ -z "$(LAST_NAME)" ] || [ -z "$(WEAPON)" ]; then \
		echo "Usage: make remote-insert-contests-user CONTEST_ID=... USER_ID=... FIRST_NAME=... LAST_NAME=... WEAPON=... [DATA_JSON='{}'] [REMOTE_WRANGLER_CONFIG=wrangler.local.toml] [REMOTE_D1_DATABASE=score-team]"; \
		exit 1; \
	fi
	@first_name_escaped="$$(printf '%s' "$(FIRST_NAME)" | sed "s/'/''/g")"; \
	last_name_escaped="$$(printf '%s' "$(LAST_NAME)" | sed "s/'/''/g")"; \
	weapon_escaped="$$(printf '%s' "$(WEAPON)" | sed "s/'/''/g")"; \
	data_input='$(DATA_JSON)'; \
	if [ -z "$$data_input" ]; then data_input='{}'; fi; \
	data_escaped="$$(printf '%s' "$$data_input" | sed "s/'/''/g")"; \
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) --command "INSERT INTO contests_users (contest_id, user_id, first_name, last_name, weapon, data) VALUES ($(CONTEST_ID), $(USER_ID), '$$first_name_escaped', '$$last_name_escaped', '$$weapon_escaped', '$$data_escaped'); SELECT id, contest_id, user_id, first_name, last_name, weapon, data FROM contests_users WHERE id = last_insert_rowid();"

remote-delete-contests-user:
	@if [ -z "$(ID)" ]; then \
		echo "Usage: make remote-delete-contests-user ID=... [REMOTE_WRANGLER_CONFIG=wrangler.local.toml] [REMOTE_D1_DATABASE=score-team]"; \
		exit 1; \
	fi
	npx wrangler d1 execute $(REMOTE_D1_DATABASE) --remote --config $(REMOTE_WRANGLER_CONFIG) --command "DELETE FROM contests_users WHERE id = $(ID);"
