# Active state — CreditMiner

## Snapshot

| Field | Current value |
| --- | --- |
| Date | 2026-09-28 |
| Course | IT160IU Data Mining |
| Scope | UCI credit-card default prediction and GSP repayment-sequence mining |
| Delivery stage | Wave 4 integration and documentation complete; submission preparation remains |
| Safe local demo | Spring `demo` profile, H2 in memory, backend port 8091 |
| Development API | Spring `dev` profile, PostgreSQL, backend port 8080 |
| Web | Next.js on port 3000 by default; port 3001 requires adding its origin to `creditminer.cors.allowed-origins` |

## Current product

CreditMiner now presents one consistent data story from the UCI Default of Credit Card Clients dataset. The raw source contains 30,000 clients. Cleaning leaves 29,965 rows, and the seed-42 stratified split contains 23,972 training rows and 5,993 test rows.

The offline workflow covers data description, cleaning, feature engineering, classification, clustering, PCA, anomaly evidence, Apriori rules, insight facts, and GSP sequence mining. The online workflow serves the artifacts through a Spring Boot API and a Next.js dashboard.

## Wave 4 completed

### Dataset and pipeline

- Replaced the earlier dataset contract with UCI dataset 350 fields and labels.
- Standardized the source path as `backend/data/raw/default_credit_card_clients.csv`.
- Updated Phases 1–3 for the new schema, category remaps, duplicate removal, outlier flags, negative bill retention, and engineered features.
- Phase 5 generated a stratified 80/20 split with seed 42.
- Updated Phase 5 to compare ten Weka classifier variants with 10-fold cross-validation and holdout evaluation.
- Added build, cross-validation, holdout prediction, and per-record prediction timings.
- Selected cost-sensitive RandomForest from the generated evidence.
- Updated Phase 6 for `k=2`, PCA, cluster summaries, and centroid-distance anomaly evidence.
- Updated Phase 7 for separate default and non-default Apriori rule passes.
- Updated insight-fact generation for the current artifact set.
- Added Phase 10 GSP mining over six-month repayment histories.
- Added exact pattern supports and a fold-local sequence-feature experiment.

### Backend and CLI

- Updated the API contract to current customer, overview, EDA, cluster, rule, anomaly, and prediction fields.
- Added `GET /api/sequences` and the sequence section in `GET /api/mining-report`.
- Kept all application routes under `/api`.
- Added the shaded `backend/target/creditminer-cli.jar` deliverable.
- Added CLI commands for `preprocess`, `train`, `predict`, `evaluate`, and `sequence`.
- Kept relative and absolute path handling in the CLI.
- Added the `demo` profile with H2 in-memory data seeded from local artifacts.
- Kept `dev` and `prod` on PostgreSQL with Hibernate schema validation.
- Kept the optional, git-ignored `backend/.env` properties import for production-style local configuration.
- Expanded backend coverage to 75 tests.

### Web and reports

- Updated the web data contracts to the current API fields.
- Added or updated overview, EDA, clusters, customers, rules, insights, prediction, and pipeline views.
- Added the `/sequences` page for GSP results.
- Updated `/mining-report` as the STE-style evidence report.
- Added `/report/paper` as the print-first academic report source.
- Added sequence and runtime content to the report components.
- Kept the frontend stack on Next.js 14.2, TypeScript, Tailwind, shadcn, Recharts, TanStack Query, and zod.

### Documentation and delivery support

- Rewrote the root project documents for the current scope.
- Added a technical architecture document with component and data-flow diagrams.
- Added API, pipeline, documentation-index, and submission guides.
- Archived the earlier iteration documents instead of presenting them as current guidance.
- Refreshed helper scripts for the eight artifact phases, current profiles, and current source filename.
- Refreshed checked-in API samples from the Wave 4 backend responses.
- Documented the planned submission-build script and the expected folder structure.

## Checked artifact results

| Measure | Result |
| --- | ---: |
| Rows after cleaning | 29,965 |
| Default rate | 22.1% |
| Selected model | RandomForest, cost-sensitive |
| 10-fold CV F1, `Default=Yes` | 0.5263 |
| Holdout F1, `Default=Yes` | 0.5333 |
| Holdout ROC AUC | 0.777 |
| Frequent GSP patterns at support 0.10 | 2,037 default / 1,729 non-default |
| Strongest reported default pattern | `<{PARTIAL}{LATE_2}>`: 48.2% vs 14.1% |

## Quality gates

The documented backend gate is `mvn -B test` from `backend`; the suite contains 75 tests. The frontend gates are install with a frozen lockfile, typecheck, lint, build, Playwright E2E, accessibility checks, and optional Lighthouse CI.

This documentation update did not run builds, tests, training, database work, or servers. Use the latest command output, not this file, to claim a passing gate.

## Open items

Only submission coordination remains open:

1. Replace all team placeholders with confirmed full names and student IDs.
2. Confirm the final submission format and naming rules with the instructor.
3. Build the final `yourMemberIDs_Names` submission folder and ZIP, then inspect `report.pdf` and `code/` before delivery.

## Operating boundaries

- Do not commit secrets or a populated `.env` file.
- Do not point write-capable database tools at an unconfirmed environment.
- Do not regenerate only part of the artifact chain when schema or feature order changes.
- Do not claim a gate passed unless that command ran and its result was recorded.
- Do not replace unknown team details with guesses.

## Next action

Confirm the team roster and instructor requirements. Then follow [docs/SUBMISSION.md](docs/SUBMISSION.md) to build and inspect the final archive.

For project operation, see [README.md](README.md). For system boundaries, see [Architecture.md](Architecture.md). For the course scope, see [ProjectBrief.md](ProjectBrief.md).
