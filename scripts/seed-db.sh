#!/usr/bin/env bash
# Apply SQL files to an explicitly selected PostgreSQL database.
# Spring's prod profile can load DATABASE_URL, DB_USER, and DB_PASSWORD from the
# git-ignored backend/.env file. This script does not read that file or print secrets.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v psql >/dev/null 2>&1; then
  echo "MISSING: psql is required." >&2
  exit 1
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Export it in this shell; do not pass a secret on the command line." >&2
  exit 1
fi

echo "==> Applying db/schema.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/db/schema.sql"

echo "==> Applying db/seed.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/db/seed.sql"

echo "Database seed complete."
