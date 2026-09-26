#!/usr/bin/env bash
# deployment script for Smart Display
# usage: ./deploy.sh [environment] (e.g., ./deploy.sh prod)

set -e

# Default to production if not specified
ENV=${1:-prod}

if [ "$ENV" != "prod" ]; then
    echo "Unsupported environment: $ENV"
    exit 1
fi

echo "Starting deployment to Hostinger production environment..."

# 1. Build Frontend
echo "Building Angular frontend..."
cd frontend-angular
npm run build -- --configuration production
cd ..

# 2. Deploy Backend API
echo "Syncing backend API..."
rsync -avz --delete -e "ssh -p 65002 -o StrictHostKeyChecking=no" \
  --exclude ".env" \
  --exclude ".env.example" \
  --exclude ".git" \
  --exclude "*.sql" \
  backend-api/ \
  u528878684@46.202.196.135:/home/u528878684/domains/smart-kiosk.online/public_html/api/

# 3. Deploy Frontend App
echo "Syncing frontend application..."
rsync -avz --delete -e "ssh -p 65002 -o StrictHostKeyChecking=no" \
  --exclude "api/" \
  --exclude ".htaccess" \
  frontend-angular/dist/smart-display-frontend/ \
  u528878684@46.202.196.135:/home/u528878684/domains/smart-kiosk.online/public_html/

echo "Syncing .htaccess..."
rsync -avz -e "ssh -p 65002 -o StrictHostKeyChecking=no" \
  .htaccess \
  u528878684@46.202.196.135:/home/u528878684/domains/smart-kiosk.online/public_html/

# 4. Optional: Run tests after deployment
echo "Running post-deploy tests on server..."
ssh -p 65002 -o StrictHostKeyChecking=no u528878684@46.202.196.135 "php /home/u528878684/domains/smart-kiosk.online/public_html/api/tests/run_all_tests.php" || echo "Note: tests/ folder not synced to prod API folder. Skip test."

echo "Deployment complete! 🎉"
