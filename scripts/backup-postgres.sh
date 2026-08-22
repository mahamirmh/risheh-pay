#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/postgres}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="$BACKUP_DIR/risheh-pay-${stamp}.sql.gz"

echo "Creating PostgreSQL backup: $out"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges \
  | gzip -9 > "$out"

if [[ ! -s "$out" ]]; then
  echo "ERROR: backup file is empty." >&2
  rm -f "$out"
  exit 1
fi

retention="${BACKUP_RETENTION_DAYS:-14}"
find "$BACKUP_DIR" -type f -name 'risheh-pay-*.sql.gz' -mtime "+$retention" -delete

sha256sum "$out" > "$out.sha256"
echo "Backup completed successfully."
