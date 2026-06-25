#!/bin/bash
# FunBreak SEO — Database & Files Backup Script
# Usage: ./backup.sh
# Cron: 0 3 * * * /home/funbreak/funbreakseo/backup.sh >> /var/log/funbreakseo-backup.log 2>&1

set -e

# Config
APP_DIR="/home/funbreak/funbreakseo"
BACKUP_DIR="/home/funbreak/backups"
DATE=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=14

# Load env
source "${APP_DIR}/.env" 2>/dev/null || true

# PostgreSQL connection
DB_URL="${DATABASE_URL:-postgresql://funbreak:secret@localhost:5432/funbreakseo}"
DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
DB_PORT=$(echo "$DB_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo "$DB_URL" | sed -n 's/.*\/\/\([^:]*\).*/\1/p')

mkdir -p "${BACKUP_DIR}/db" "${BACKUP_DIR}/uploads" "${BACKUP_DIR}/logs"

echo "[${DATE}] Starting backup..."

# 1. PostgreSQL dump
DUMP_FILE="${BACKUP_DIR}/db/funbreakseo_${DATE}.sql.gz"
PGPASSWORD=$(echo "$DB_URL" | sed -n 's/.*:\([^@]*\)@.*/\1/p') \
  pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}" | \
  gzip > "${DUMP_FILE}"
echo "[${DATE}] DB dump: ${DUMP_FILE}"

# 2. Uploads/assets (if any)
if [ -d "${APP_DIR}/uploads" ]; then
  UPLOADS_FILE="${BACKUP_DIR}/uploads/uploads_${DATE}.tar.gz"
  tar -czf "${UPLOADS_FILE}" -C "${APP_DIR}" uploads/
  echo "[${DATE}] Uploads backup: ${UPLOADS_FILE}"
fi

# 3. Cleanup old backups
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${KEEP_DAYS} -delete
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +${KEEP_DAYS} -delete
echo "[${DATE}] Cleaned up backups older than ${KEEP_DAYS} days"

# 4. Optional: rsync to remote (set BACKUP_REMOTE in .env)
if [ -n "${BACKUP_REMOTE}" ]; then
  rsync -az "${BACKUP_DIR}/" "${BACKUP_REMOTE}/"
  echo "[${DATE}] Synced to remote: ${BACKUP_REMOTE}"
fi

echo "[${DATE}] Backup completed successfully."
