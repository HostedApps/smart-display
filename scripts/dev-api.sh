#!/usr/bin/env bash
# Serve backend-api/*.php under http://localhost:8000/api/ with PHP's built-in server,
# matching production's /api/ path (and environment.ts in the Angular app).
# Needs backend-api/.env pointing at a local database (see scripts/setup-dev-db.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCROOT="${TMPDIR:-/tmp}/smart-display-www"
PORT="${PORT:-8000}"

mkdir -p "$DOCROOT"
ln -sfn "$ROOT/backend-api" "$DOCROOT/api"
echo "Serving $ROOT/backend-api at http://localhost:$PORT/api/"
# Several workers, so an endpoint can call another one on this server (the test suite's mock LLM)
export PHP_CLI_SERVER_WORKERS="${PHP_CLI_SERVER_WORKERS:-4}"
exec php -S "localhost:$PORT" -t "$DOCROOT"
