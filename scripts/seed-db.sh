#!/usr/bin/env bash
# Seed the database (schema + insights). Linux/macOS.
set -euo pipefail

DB_URL="${DATABASE_URL:-postgresql://creditminer:creditminer@localhost:5432/creditminer_db}"

echo "==> Applying db/schema.sql..."
psql "$DB_URL" -f db/schema.sql

echo "==> Applying db/seed.sql..."
psql "$DB_URL" -f db/seed.sql

echo "Done."
