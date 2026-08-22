#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.production.example and fill real values." >&2
  exit 1
fi

required_vars=(
  POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD DATABASE_URL
  REDIS_PASSWORD REDIS_URL NEXT_PUBLIC_API_URL
  APP_SECRET_KEY DELIVERY_ENCRYPTION_KEY ADMIN_API_KEY
  DIGITAL_GOODS_PROVIDER PAYMENT_PROVIDER PAYMENT_CALLBACK_URL
)

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

for var in "${required_vars[@]}"; do
  value="${!var:-}"
  if [[ -z "$value" || "$value" == CHANGE_ME* ]]; then
    echo "ERROR: $var is missing or still uses a CHANGE_ME placeholder." >&2
    exit 1
  fi
done

if [[ "${APP_ENV:-}" != "production" ]]; then
  echo "ERROR: APP_ENV must be production." >&2
  exit 1
fi

if [[ "${SEED_DEMO_CATALOG:-false}" != "false" ]]; then
  echo "ERROR: SEED_DEMO_CATALOG must be false in production." >&2
  exit 1
fi

if [[ "${NEXT_PUBLIC_ENABLE_DEMO_MODE:-false}" != "false" ]]; then
  echo "ERROR: NEXT_PUBLIC_ENABLE_DEMO_MODE must be false in production." >&2
  exit 1
fi

if [[ "${DIGITAL_GOODS_PROVIDER}" == "mock" || "${PAYMENT_PROVIDER}" == "mock" ]]; then
  echo "ERROR: mock providers are forbidden for production deploys." >&2
  exit 1
fi

echo "Validating Docker Compose configuration..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null

echo "Building production images..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build --pull

echo "Starting production stack..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans

echo "Waiting for service health..."
for _ in {1..30}; do
  unhealthy="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --format json | grep -E '"Health":"(unhealthy|starting)"' || true)"
  if [[ -z "$unhealthy" ]]; then
    break
  fi
  sleep 2
done

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

if ! curl -fsS http://127.0.0.1:8080/healthz >/dev/null; then
  echo "ERROR: reverse proxy health check failed." >&2
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=100
  exit 1
fi

echo "Production stack is healthy on http://127.0.0.1:8080"
