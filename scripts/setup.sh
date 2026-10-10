#!/usr/bin/env bash
# Prepare the CreditMiner development environment on Linux or macOS.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RAW="$ROOT/backend/data/raw/default_credit_card_clients.csv"

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "MISSING: $1 is required." >&2
    exit 1
  fi
  echo "  OK  $1"
}

echo "==> Checking prerequisites"
for command in java mvn node corepack docker; do
  require "$command"
done

echo "==> Starting local PostgreSQL for the dev profile"
(cd "$ROOT" && docker compose up -d postgres)

echo "==> Installing frontend dependencies"
(
  cd "$ROOT/web"
  if [[ ! -f .env.local ]]; then
    cp .env.local.example .env.local
    echo "  Created web/.env.local from the example."
  fi
  corepack pnpm install --frozen-lockfile
)

if [[ ! -f "$RAW" ]]; then
  echo "MISSING DATASET: $RAW" >&2
fi

echo "Setup complete."
echo "  Artifacts: ./scripts/train.sh"
echo "  Dev API:   SPRING_PROFILES_ACTIVE=dev SERVER_PORT=8080 mvn -f backend/pom.xml spring-boot:run"
echo "  Demo API:  SPRING_PROFILES_ACTIVE=demo SERVER_PORT=8091 mvn -f backend/pom.xml spring-boot:run"
echo "  Web:       cd web && corepack pnpm dev  # http://localhost:3000"
