# Architecture - CreditMiner

## System Overview

CreditMiner follows a train-offline, infer-online architecture.

- Offline pipeline: raw BankChurners CSV is loaded, cleaned, feature engineered, evaluated, clustered, mined for rules, and exported to model/data artifacts.
- Backend API: Spring Boot serves database-backed dashboard endpoints and Weka-backed prediction. Models are loaded from local artifact paths at startup; missing models degrade prediction endpoints with model-not-loaded behavior.
- Frontend: Next.js dashboard uses a typed API client, Zod schemas/types, React Query hooks, and chart/table components to render all demo views.
- Database: PostgreSQL stores customers, clusters, rules, insights, and prediction logs. Hibernate runs in `validate` mode.

## Data Flow

1. Place `BankChurners.csv` under `backend/data/raw/` locally.
2. Run offline phase pipelines to produce processed ARFF/JSON/CSV outputs and Weka models under gitignored data/model paths.
3. Seed a development or hosted database only after explicit DB confirmation.
4. Start the Spring Boot API with `DATABASE_URL`, `DB_USER`, `DB_PASSWORD`, and optional model/data path overrides.
5. Start the Next.js app with `NEXT_PUBLIC_API_URL` pointing at the backend.

## Module Boundaries

- `backend/src/main/java/com/creditminer/controller`: REST endpoints.
- `backend/src/main/java/com/creditminer/service`: inference, EDA, preprocessing, feature engineering, seeding, and business services.
- `backend/src/main/java/com/creditminer/pipeline`: standalone offline phase runners and DB maintenance entry points.
- `backend/src/main/java/com/creditminer/entity` and `repository`: JPA persistence.
- `web/src/app`: App Router pages and route-level UI.
- `web/src/components`: layout, charts, UI primitives, and feature components.
- `web/src/hooks`, `web/src/lib`, `web/src/types`: typed API access and shared frontend contracts.
- `db`: schema, seed, reset, and migrations. Treat DB scripts as write/destructive unless proven otherwise.
- `docs`: trackers, handoffs, roadmap, audits, and blueprint documents.

## Durable Decisions

- Branch workflow uses `main`, `develop`, `backend`, and `frontend`; no rebase or force push on shared branches.
- `develop` is the current integration source of truth for re-onboarding.
- Generated model/data artifacts are not committed.
- The hosted Neon database is production-like; local safe init must not seed, reset, or migrate it.
- CodeGraph is not initialized in this checkout; if installed later, `.codegraph/` must remain ignored.

## Current Architecture Risks

- `scripts/train.*` call `TrainPipeline`, but `TrainPipeline` still contains placeholder step comments. The phase-specific pipelines appear to hold the real implementation.
- `db/schema.sql` drops existing tables before creating them despite being documented as "apply once"; this is unsafe for non-empty databases.
- `db/reset.sql`, the insights migration, `Phase8Seeder`, and `SqlMigrationRunner` are DB-mutating and require explicit confirmation plus backup/rollback planning.
- `ReportService` export methods are placeholders for W8 deliverables.
- Backend context boot test is disabled until a test datasource is configured.
