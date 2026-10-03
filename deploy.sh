#!/usr/bin/env bash
# deployment script for Smart Display
# usage: ./deploy.sh [environment] (e.g., ./deploy.sh prod)
#
# Order matters: back up the database, ship the backend, apply database migrations,
# and only then ship the frontend. With `set -e`, a failed backup or migration stops
# the deploy before the new frontend goes live.

set -e

# Default to production if not specified
ENV=${1:-prod}

if [ "$ENV" != "prod" ]; then
    echo "Unsupported environment: $ENV"
    exit 1
fi

SSH_HOST="u528878684@46.202.196.135"
SSH="ssh -p 65002 -o StrictHostKeyChecking=no"
SITE_DIR="/home/u528878684/domains/smart-kiosk.online"
WEB_ROOT="$SITE_DIR/public_html"

echo "Starting deployment to Hostinger production environment..."

# 1. Build Frontend (before touching the server, so a broken build changes nothing)
echo "Building Angular frontend..."
cd frontend-angular
npm ci --no-audit --no-fund
npm run build -- --configuration production
cd ..

# 2. Back up the production database
echo "Backing up production database..."
rsync -avz -e "$SSH" database/backup.sh "$SSH_HOST:$SITE_DIR/database/"
$SSH "$SSH_HOST" "bash $SITE_DIR/database/backup.sh"

# 3. Deploy Backend API
#    tests/ is excluded: the suite creates and deletes users and must never be reachable
#    on the public site or run against the production database.
echo "Syncing backend API..."
rsync -avz --delete -e "$SSH" \
  --exclude ".env" \
  --exclude ".env.example" \
  --exclude ".git" \
  --exclude "*.sql" \
  --exclude "tests/" \
  backend-api/ \
  "$SSH_HOST:$WEB_ROOT/api/"
# Remove the test suite left on the public site by earlier deploys
$SSH "$SSH_HOST" "rm -rf $WEB_ROOT/api/tests"

# 4. Apply database migrations (kept outside public_html)
echo "Applying database migrations..."
rsync -avz -e "$SSH" \
  database/migrate.php database/migrations \
  "$SSH_HOST:$SITE_DIR/database/"
$SSH "$SSH_HOST" "SD_DB_PHP=$WEB_ROOT/api/db.php php $SITE_DIR/database/migrate.php"

# 5. Deploy Frontend App
echo "Syncing frontend application..."
rsync -avz --delete -e "$SSH" \
  --exclude "api/" \
  --exclude ".htaccess" \
  frontend-angular/dist/smart-display-frontend/ \
  "$SSH_HOST:$WEB_ROOT/"

echo "Syncing .htaccess..."
rsync -avz -e "$SSH" \
  .htaccess \
  "$SSH_HOST:$WEB_ROOT/"

# 6. Smoke test: the public API answers with JSON
echo "Running post-deploy smoke test..."
if curl -fsS "https://smart-kiosk.online/api/emergency.php?token=deploy-smoke-test" | grep -q '"active"'; then
  echo "API smoke test passed."
else
  echo "WARNING: API smoke test failed — check https://smart-kiosk.online/api/emergency.php"
  exit 1
fi

echo "Deployment complete! 🎉"
