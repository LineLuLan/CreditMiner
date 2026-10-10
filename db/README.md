# CreditMiner database

The PostgreSQL schema mirrors UCI dataset id 350 and stores generated Phase 3, 6, and 7 outputs.

| File | Purpose |
|---|---|
| `schema.sql` | Create the five tables in a fresh database. |
| `seed.sql` | Documents artifact-driven seeding; contains no authored rows. |
| `reset.sql` | Destructive local-development reset. |
| `migrations/2026-09-26_uci_credit_default.sql` | Destructive replacement migration for an existing installation. |

For a local database, apply `schema.sql`, run the offline phases, and then run `Phase8Seeder`.
The demo profile instead creates and seeds an in-memory H2 database.

The dated replacement migration is intentionally not automatic. Before applying it to any hosted
database, obtain Line's written approval, make a backup, and prove the restore procedure.

Expected generated row counts are approximately 30,000 clients before duplicate removal, a
pipeline-selected number of clusters, two categories of association rules, zero authored insights,
and one prediction row per successful prediction request.
