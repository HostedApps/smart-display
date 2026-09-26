#!/usr/bin/env bash
# Database backup script for Smart Display (DEP-H4)

set -e

BACKUP_DIR="/home/u528878684/backups/db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="smart_display_db_${TIMESTAMP}.sql.gz"

echo "Starting database backup..."

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Source the .env file to get credentials securely
ENV_FILE="/home/u528878684/domains/smart-kiosk.online/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE"
    exit 1
fi

DB_USER=$(grep "^DB_USER=" "$ENV_FILE" | cut -d '=' -f2)
DB_PASS=$(grep "^DB_PASS=" "$ENV_FILE" | cut -d '=' -f2)
DB_NAME=$(grep "^DB_NAME=" "$ENV_FILE" | cut -d '=' -f2)
DB_HOST=$(grep "^DB_HOST=" "$ENV_FILE" | cut -d '=' -f2 || echo "localhost")

# Dump and compress
mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" | gzip > "$BACKUP_DIR/$FILENAME"

echo "Backup successful: $BACKUP_DIR/$FILENAME"

# Optional: keep only last 30 backups
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -exec rm {} \;
echo "Old backups cleaned up."
