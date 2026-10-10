#!/usr/bin/env bash
# Build a local/CI database from scratch: base schema, legacy upgrade scripts, then
# database/migrations via migrate.php. Every step is idempotent, so re-running is safe.
#
# Usage: DB_HOST=127.0.0.1 DB_USER=root DB_PASS=root scripts/setup-dev-db.sh
# The database name is fixed by schema.sql (smart_display_db).
# NEVER point this at production: it seeds a default admin with a published password.
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
