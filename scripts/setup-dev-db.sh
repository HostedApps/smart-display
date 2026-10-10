#!/usr/bin/env bash
# Build a local/CI database from scratch: base schema, legacy upgrade scripts, then
# database/migrations via migrate.php. Every step is idempotent, so re-running is safe.
#
# Usage: DB_HOST=127.0.0.1 DB_USER=root DB_PASS=root scripts/setup-dev-db.sh
# The database name is fixed by schema.sql (smart_display_db).
# Creates a local superadmin: DEV_ADMIN_EMAIL (default admin@localhost.test) with DEV_ADMIN_PASSWORD,
# or a random password that is printed once. Refuses to run against non-local hosts.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-}"
DB_NAME="smart_display_db"

case "$DB_HOST" in
  127.0.0.1|localhost|mariadb|db) ;;
  *) echo "Refusing to run against non-local DB_HOST=$DB_HOST" >&2; exit 1 ;;
esac

MYSQL=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER")
[ -n "$DB_PASS" ] && MYSQL+=("-p$DB_PASS")

echo "Applying schema.sql..."
"${MYSQL[@]}" < "$ROOT/database/schema.sql"
for f in "$ROOT"/database/migration_v*.sql; do
  echo "Applying $(basename "$f")..."
  "${MYSQL[@]}" "$DB_NAME" < "$f"
done

echo "Running migrate.php..."
php "$ROOT/database/migrate.php"

# Local superadmin (skipped if that email already exists)
ADMIN_EMAIL="${DEV_ADMIN_EMAIL:-admin@localhost.test}"
ADMIN_PASSWORD="${DEV_ADMIN_PASSWORD:-$(php -r 'echo bin2hex(random_bytes(8));')}"
ADMIN_HASH=$(ADMIN_PASSWORD="$ADMIN_PASSWORD" php -r 'echo password_hash(getenv("ADMIN_PASSWORD"), PASSWORD_BCRYPT);')
CREATED=$("${MYSQL[@]}" -N "$DB_NAME" -e "
  INSERT IGNORE INTO users (name, email, password_hash, role, is_active, email_verified)
  VALUES ('Dev Admin', '$ADMIN_EMAIL', '$ADMIN_HASH', 'superadmin', 1, 1);
  SELECT ROW_COUNT();")
if [ "$CREATED" = "1" ]; then
  echo "Created superadmin $ADMIN_EMAIL"
  [ -z "${DEV_ADMIN_PASSWORD:-}" ] && echo "  password: $ADMIN_PASSWORD (shown once)"
else
  echo "Superadmin $ADMIN_EMAIL already exists; password unchanged."
fi
