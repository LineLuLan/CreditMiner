# Backend Task Tracker

> **Branch**: `backend`  ·  **Owner**: BE team  ·  **Last sync**: Phase 4 EDA endpoints close-out (2026-05-08)
> Update this file in the **same commit** that closes a task. After updating, sync `docs/` folder to `develop` → `frontend`.

---

## Status Legend

| Symbol | Meaning |
|---|---|
| `BACKLOG` | Not started |
| `WIP` | In progress (claim before starting) |
| `REVIEW` | Code complete, awaiting review/test |
| `DONE` | Merged into `develop` |
| `BLOCKED` | Waiting on dependency or manual user action |

---

## Quick Stats (auto-update by hand on commit)

| Metric | Value |
|---|---|
| Total tasks | 64 |
| Done | 3 (BE-00, BE-M2, BE-M3) |
| REVIEW | 25 (BE-01..BE-05, BE-10..BE-13, BE-20..BE-26, BE-30..BE-35, BE-40..BE-42) |
| WIP | 0 |
| Blocked | 1 (manual user step BE-M1) |
| Deferred | 1 (BE-43 PCA-2D — needs Phase 6 cluster feature subset) |
| % complete | 4.7% (43.8% incl REVIEW) |

---

## Phase 0 — Skeleton & Infrastructure

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-00 | Repo + Maven scaffold + branch policy | DONE | claude | b492427 | Tag v0.1.0-skeleton, mvn compile OK |
| BE-01 | Configure `application.yml` profiles (dev/prod) | REVIEW | claude | _pending_ | dev/prod yml + `backend/.env.example`; prod reads `DB_USER`/`DB_PASSWORD` |
| BE-02 | Wire CORS for `localhost:3000` | REVIEW | claude | _pending_ | `CorsConfig.java` reads `creditminer.cors.allowed-origins`. YAML changed to comma-separated string (Spring `@Value` cannot bind YAML list to `List<String>`). |
| BE-03 | Setup OpenAPI / Swagger UI | REVIEW | claude | _pending_ | `OpenApiConfig.java` + springdoc 2.5.0 → `/swagger-ui.html` |
| BE-04 | Setup logback structured logging | REVIEW | claude | _pending_ | `logback-spring.xml` dev colored / prod JSON pattern |
| BE-05 | Setup global exception handler + error envelope | REVIEW | claude | _pending_ | `GlobalExceptionHandler` covers 7 exception types: Business, MethodArgumentNotValid, MalformedJSON, ConstraintViolation, TypeMismatch, MethodNotSupported, NoResourceFound. Smoke test verified: bad JSON → `VALIDATION_ERROR` 400, unknown route → `NOT_FOUND` 404. CAVEAT: `MethodNotSupported` 405 still returns Spring's default error format (handler not invoked for protocol-level exceptions thrown pre-dispatch). FE never sends DELETE/PUT so low-impact; fix later by extending `ResponseEntityExceptionHandler`. |

## Phase 1 — Data Understanding

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-10 | `DataLoader.loadCsv()` — read BankChurners.csv | REVIEW | claude | _pending_ | Weka `CSVLoader`; verified against real Kaggle CSV (10127 rows × 23 raw cols → 21 after drop). |
| BE-11 | `DataLoader.saveArff()` / `loadArff()` | REVIEW | claude | _pending_ | Both methods working; `saveArff` auto-creates parent dir. Output verified at `data/processed/phase1_raw.arff`. |
| BE-12 | Drop trailing 2 Naive-Bayes leakage columns at load time | REVIEW | claude | _pending_ | Match by prefix `Naive_Bayes_Classifier`; uses `weka.filters.unsupervised.attribute.Remove`. Sets `Attrition_Flag` as class index post-removal. `lastDroppedColumns` getter exposes dropped names to caller. |
| BE-13 | Print describe table (mean/std/min/max/null) — `Phase1Report.java` | REVIEW | claude | _pending_ | `com.creditminer.pipeline.Phase1Report` standalone main; runs via `mvn exec:java -Dexec.mainClass=com.creditminer.pipeline.Phase1Report` (pom now parameterizes mainClass via `${exec.mainClass}` property). Output: console table + `data/processed/phase1_describe.json`. New `DescribeService` + `DescribeCacheService`; new endpoint `GET /api/eda/describe` (lazy in-memory cache, falls back to CSV if ARFF missing, throws `REPORT_NOT_GENERATED` 503 if both missing). DTOs: `DescribeResponse` + `ColumnStats` (`@JsonInclude(NON_NULL)`). |

## Phase 2 — Preprocessing

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-20 | `Preprocessor.imputeMissing()` (mode/median, treat "Unknown") | REVIEW | claude | _pending_ | "Unknown"→missing rewrite for Education_Level (1519) / Marital_Status (749) / Income_Category (1112), then `ReplaceMissingValues` (mode for nominal). Manual median path for numeric (no-op on this dataset — 0 missing). |
| BE-21 | `Preprocessor.dropDuplicates()` (by CLIENTNUM) | REVIEW | claude | _pending_ | HashSet on CLIENTNUM. 0 duplicates in Kaggle dataset (verified). |
| BE-22 | `Preprocessor.flagOutliers()` Z-score | REVIEW | claude | _pending_ | \|z\|>3 on Credit_Limit/Total_Trans_Amt/Avg_Utilization_Ratio/Total_Revolving_Bal. Z-score cols: 0/391/0/0. |
| BE-23 | `Preprocessor.flagOutliers()` IQR | REVIEW | claude | _pending_ | Q1−1.5·IQR / Q3+1.5·IQR. Combined with Z via OR. IQR cols: 984/896/0/0. Total combined: 1684 (16.63%). Sidecar `phase2_outliers.json` lists CLIENTNUMs for Phase 8 seeder. |
| BE-24 | `Preprocessor.normalize()` min-max for clustering | REVIEW | claude | _pending_ | Wrapper over Weka `Normalize`. On-demand (caller invokes before KMeans). |
| BE-25 | `Preprocessor.standardize()` Z-score for NaiveBayes/Logistic | REVIEW | claude | _pending_ | Wrapper over Weka `Standardize`. |
| BE-26 | `Preprocessor.encodeNominal()` one-hot for Logistic | REVIEW | claude | _pending_ | Wrapper over Weka `NominalToBinary`. |

## Phase 3 — Feature Engineering

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-30 | `FeatureEngineer.utilizationScore()` | REVIEW | claude | _pending_ | `Total_Revolving_Bal/Credit_Limit`, safeDivide. Mean=0.2749 cross-checks `Avg_Utilization_Ratio`. |
| BE-31 | `FeatureEngineer.spendingIntensity()` | REVIEW | claude | _pending_ | `Total_Trans_Amt/Total_Trans_Ct`. Mean=$62.61/tx, max=$190.19. |
| BE-32 | `FeatureEngineer.engagementScore()` | REVIEW | claude | _pending_ | `Total_Trans_Ct/Months_on_book`. Mean=1.92 tx/month. |
| BE-33 | `FeatureEngineer.customerValueScore()` (composite z-score) | REVIEW | claude | _pending_ | `0.4·z(Trans_Amt) + 0.3·z(Credit_Limit) + 0.2·z(Months_on_book) − 0.1·z(Months_Inactive)`. NO Attrition_Flag (verified by reading source). |
| BE-34 | `FeatureEngineer.riskScore()` | REVIEW | claude | _pending_ | `0.4·Utilization_Score + 0.3·(Inactive/12) + 0.3·(1 − Engagement_norm)` where Engagement_norm = min-max scaled. NO Attrition_Flag. Mean=0.41. |
| BE-35 | `FeatureEngineer.customerTier()` (quartiles) | REVIEW | claude | _pending_ | Linear-interpolated percentile cutoffs on Customer_Value_Score. Counts: Bronze=2532, Silver=2531, Gold=2532, Platinum=2532. Added as nominal attribute. |

## Phase 4 — EDA endpoints

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-40 | `GET /api/eda/distribution?col=&bins=` | REVIEW | claude | _pending_ | New `EdaDataCache` lazy-loads enriched.arff (or fallback). `EdaService.distribution()` handles numeric (histogram, bins clamped 5..50, default 20) AND nominal (value counts) — DTO has `type` discriminator. Validates col against dataset; throws VALIDATION_ERROR 400 for unknown col. |
| BE-41 | `GET /api/eda/correlation` | REVIEW | claude | _pending_ | Pearson over all numeric cols on `enriched.arff` minus CLIENTNUM (~26 cols → 26×26 matrix). Cached in-memory after first call. Values rounded to 4 dp. |
| BE-42 | `GET /api/eda/churn-by?dim=` | REVIEW | claude | _pending_ | Whitelisted dim (Income_Category / Card_Category / Customer_Tier / Gender / Education_Level / Marital_Status). Single linear scan — not cached, ~ms per call. Group order matches nominal level order on input. |
| BE-43 | PCA-2D coords export for `/clusters` page | DEFERRED | | | **Deferred to Phase 6** — depends on the cluster feature subset which isn't fixed yet. Pick up alongside BE-60..62 when Phase 6 starts. |

## Phase 5 — Classification

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-50 | `Splitter.stratified(80/20, seed=42)` | BACKLOG | | | |
| BE-51 | Train J48 (3 hyperparam combos) | BACKLOG | | | save j48.model |
| BE-52 | Train RandomForest (3 hyperparam combos) | BACKLOG | | | save rf.model |
| BE-53 | Train NaiveBayes (2 variants) | BACKLOG | | | save nb.model |
| BE-54 | Train Logistic baseline | BACKLOG | | | save logistic.model |
| BE-55 | Apply SMOTE on train only — re-train all | BACKLOG | | | save *_smote.model |
| BE-56 | Cost-sensitive wrapper (matrix [[0,1],[5,0]]) | BACKLOG | | | |
| BE-57 | 10-fold CV on train; record F1/AUC | BACKLOG | | | |
| BE-58 | Final evaluation on test set; export comparison table | BACKLOG | | | results/comparison.csv |
| BE-59 | Feature importance from RF | BACKLOG | | | save to JSON |

## Phase 6 — Clustering & Anomaly

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-60 | KMeans elbow (k=2..8) — pick optimal k | BACKLOG | | | save WCSS curve |
| BE-61 | KMeans + silhouette score | BACKLOG | | | |
| BE-62 | Train final SimpleKMeans (k chosen, seed=42) | BACKLOG | | | save kmeans.model |
| BE-63 | Compute centroid distances → flag anomalies | BACKLOG | | | distance > μ+3σ |
| BE-64 | Combine Z/IQR/cluster-distance into `is_anomaly` | BACKLOG | | | |
| BE-65 | EM clusterer (bonus, optional) | BACKLOG | | | |

## Phase 7 — Association Rules

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-70 | Discretize numeric → 3 equal-frequency bins | BACKLOG | | | Discretize filter |
| BE-71 | Save `clean_assoc.arff` | BACKLOG | | | |
| BE-72 | Run Apriori (sup=0.05, conf=0.7, n=50) | BACKLOG | | | |
| BE-73 | Filter rules with Attrition_Flag on RHS | BACKLOG | | | category=churn/retention |
| BE-74 | Export `rules.json` | BACKLOG | | | RuleExporter util |

## Phase 8 — Insights & API

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-80 | Seed `insights.json` with 5+ Discovery/Evidence/Recommendation | BACKLOG | | | Manual content |
| BE-81 | DB seeder: insert customers/clusters/rules/insights | BACKLOG | | | DatabaseSeeder service |
| BE-82 | `GET /api/overview` | BACKLOG | | | Implements stub |
| BE-83 | `GET /api/customers` (paginated) | BACKLOG | | | filter+sort |
| BE-84 | `GET /api/customers/{id}` | BACKLOG | | | |
| BE-85 | `GET /api/clusters` | BACKLOG | | | |
| BE-86 | `GET /api/clusters/{id}/customers` | BACKLOG | | | |
| BE-87 | `GET /api/rules?minLift=` | BACKLOG | | | |
| BE-88 | `GET /api/insights` | BACKLOG | | | |
| BE-89 | `GET /api/anomalies` | BACKLOG | | | |
| BE-90 | `POST /api/predict` (full flow with cluster + recommendation) | BACKLOG | | | Replace stub |
| BE-91 | Predictions logging to `predictions` table | BACKLOG | | | |

## Testing & QA

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-T1 | JUnit: `PreprocessorTest` | BACKLOG | | | |
| BE-T2 | JUnit: `FeatureEngineerTest` | BACKLOG | | | edge cases |
| BE-T3 | JUnit: `ClassificationServiceTest` | BACKLOG | | | mock model load |
| BE-T4 | JUnit: `ClusteringServiceTest` | BACKLOG | | | |
| BE-T5 | Postman/Bruno collection for all 12 endpoints | BACKLOG | | | docs/api/ |
| BE-T6 | Load test `/predict` (k6 / hey) | BACKLOG | | | p95 < 100ms |

## Manual user steps (BE-side)

| ID | Title | Status | Notes |
|---|---|---|---|
| BE-M1 | Install JDK 17 + Maven 3.9 | BLOCKED | User must verify locally; flag if missing |
| BE-M2 | Download `BankChurners.csv` from Kaggle | DONE | User unzipped CSV into `backend/data/raw/BankChurners.csv` (10127 rows). Phase1Report verified read OK on 2026-05-08. |
| BE-M3 | Provision Neon DB & apply `db/schema.sql` + `db/seed.sql` | DONE | Neon project ep-purple-smoke-aosu7szo (ap-southeast-1, PG 17). Schema fixed: `gender CHAR(1)` → `VARCHAR(1)` and `SERIAL` → `BIGSERIAL` (3 places) to match JPA entity types. 5 tables + 13 indexes + 5 insights + 4 cluster stubs seeded. Smoke test prod profile boot: PASS (Hibernate validate ok, /actuator/health UP, /api/insights returns 5 records). URL goes in env var, NOT yml. |

---

## Update Protocol

1. Claim a task: change `Owner` to your name + `Status` to `WIP`
2. Work on it in `backend` branch
3. On completion: set `Status` to `REVIEW` and `Commit` to short SHA
4. After merge to `develop`: set `Status` to `DONE`
5. Bump **Quick Stats** counts at top
6. In the same commit, run the docs sync: `develop` → `backend` → `frontend`
