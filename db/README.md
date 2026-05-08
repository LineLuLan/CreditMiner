# Database — CreditMiner

PostgreSQL 15 schema, seed data, and migration policy.

## Files

| File | Purpose |
|---|---|
| `schema.sql` | DDL for the 5 tables. Apply once on fresh DB. |
| `seed.sql` | Initial data (insights + cluster stubs). Apply after schema. |
| `reset.sql` | Drop everything (dev only). |
| `migrations/` | Future schema changes (post-skeleton). |

## Local setup (Docker)

```bash
# From repo root
docker compose up -d postgres
# Schema + seed are auto-applied via /docker-entrypoint-initdb.d/
```

## Manual setup (any Postgres)

```bash
export DATABASE_URL=postgresql://creditminer:creditminer@localhost:5432/creditminer_db

psql $DATABASE_URL -f db/schema.sql
psql $DATABASE_URL -f db/seed.sql

# To reset:
psql $DATABASE_URL -f db/reset.sql
```

## Neon (production)

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string from the dashboard
3. Set `DATABASE_URL` env var in backend deployment
4. Apply schema + seed via `psql $NEON_URL -f db/schema.sql && psql $NEON_URL -f db/seed.sql`

## Tables overview

| Table | Rows (target) | Source |
|---|---|---|
| `customers` | 10,127 | TrainPipeline seeds from BankChurners.csv |
| `clusters` | 3-4 | Pre-seeded stubs; refined by TrainPipeline |
| `rules` | 30-50 | Apriori output via TrainPipeline |
| `insights` | 5+ | Hand-curated (in `seed.sql`) |
| `predictions` | (grows) | Logged on every `POST /api/predict` |

See `docs/blueprint_en.md §6` for full DDL rationale.
