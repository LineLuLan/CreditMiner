# Database Migrations

> Naming convention: `V<NNN>__<description>.sql` (Flyway-style — sortable).

## Policy

- Migrations are **append-only**: never edit a merged migration.
- `schema.sql` is the **initial state** for a fresh DB. Use migrations
  for changes after `v0.1.0` ships.
- Each migration must:
  1. Be idempotent (use `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE IF EXISTS …`, etc.)
  2. Include a rollback comment block at the bottom (manual rollback —
     no auto-revert).
  3. Be peer-reviewed before merging to `develop`.

## Filename examples

```
V001__add_predictions_index_on_cluster.sql
V002__rename_avg_open_to_buy_to_avg_open_credit.sql
V003__add_customer_segments_view.sql
```

## Running migrations

For now (academic project), run each new migration manually:

```bash
psql $DATABASE_URL -f db/migrations/V001__add_predictions_index_on_cluster.sql
```

If/when migration count exceeds 5, install **Flyway** or **Liquibase**:

- Flyway CLI: `flyway -url=$DATABASE_URL -locations=filesystem:db/migrations migrate`
- Or add Spring Boot's `flyway-core` dependency and the YAML config — auto-runs on startup.

## Tracker

Keep a record of applied migrations:

| ID | File | Applied at | By |
|---|---|---|---|
| _(none yet)_ | | | |
