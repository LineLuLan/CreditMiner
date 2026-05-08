#!/usr/bin/env bash
# =============================================================================
# CreditMiner — one-shot setup (Linux/macOS)
# Usage:  ./scripts/setup.sh
# =============================================================================
set -euo pipefail

echo "==> Checking prerequisites..."
require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "MISSING: $1 — install it before continuing."
    exit 1
  fi
  echo "  OK  $1"
}
require java
require mvn
require node
require pnpm
require git
require docker

echo
echo "==> Starting Postgres via docker compose..."
docker compose up -d postgres

echo
echo "==> Building backend (mvn compile, no tests)..."
( cd backend && mvn -q clean compile -DskipTests )

echo
echo "==> Installing frontend dependencies..."
( cd web && [[ -f .env.local ]] || cp .env.local.example .env.local && pnpm install --silent )

echo
echo "==> Setup complete."
echo "    Next steps:"
echo "      1. Place BankChurners.csv at backend/data/raw/"
echo "      2. Run training:  ./scripts/train.sh"
echo "      3. Start backend: cd backend && mvn spring-boot:run"
echo "      4. Start frontend: cd web && pnpm dev"
