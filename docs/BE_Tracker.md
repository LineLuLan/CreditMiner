# Backend Task Tracker

> **Branch**: `backend`  ·  **Owner**: BE team  ·  **Last sync**: skeleton bootstrap
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
| Done | 1 |
| WIP | 0 |
| Blocked | 3 (manual user steps BE-M1..M3) |
| % complete | 1.6% |

---

## Phase 0 — Skeleton & Infrastructure

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-00 | Repo + Maven scaffold + branch policy | DONE | claude | b492427 | Tag v0.1.0-skeleton, mvn compile OK |
| BE-01 | Configure `application.yml` profiles (dev/prod) | BACKLOG | | | Neon URL goes in prod |
| BE-02 | Wire CORS for `localhost:3000` | BACKLOG | | | See `CorsConfig.java` |
| BE-03 | Setup OpenAPI / Swagger UI | BACKLOG | | | springdoc-openapi |
| BE-04 | Setup logback structured logging | BACKLOG | | | JSON in prod, pretty in dev |
| BE-05 | Setup global exception handler + error envelope | BACKLOG | | | `{error: {code, message}}` |

## Phase 1 — Data Understanding

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-10 | `DataLoader.loadCsv()` — read BankChurners.csv | BACKLOG | | | Use Weka CSVLoader |
| BE-11 | `DataLoader.saveArff()` / `loadArff()` | BACKLOG | | | |
| BE-12 | Drop trailing 2 Naive-Bayes leakage columns at load time | BACKLOG | | | Hardcode column index check |
| BE-13 | Print describe table (mean/std/min/max/null) — `Phase1Report.java` | BACKLOG | | | Output to console + JSON |

## Phase 2 — Preprocessing

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-20 | `Preprocessor.imputeMissing()` (mode/median, treat "Unknown") | BACKLOG | | | ReplaceMissingValues filter |
| BE-21 | `Preprocessor.dropDuplicates()` (by CLIENTNUM) | BACKLOG | | | |
| BE-22 | `Preprocessor.flagOutliers()` Z-score | BACKLOG | | | Set `is_outlier` flag |
| BE-23 | `Preprocessor.flagOutliers()` IQR | BACKLOG | | | OR with Z-score |
| BE-24 | `Preprocessor.normalize()` min-max for clustering | BACKLOG | | | Normalize filter |
| BE-25 | `Preprocessor.standardize()` Z-score for NaiveBayes/Logistic | BACKLOG | | | Standardize filter |
| BE-26 | `Preprocessor.encodeNominal()` one-hot for Logistic | BACKLOG | | | NominalToBinary filter |

## Phase 3 — Feature Engineering

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-30 | `FeatureEngineer.utilizationScore()` | BACKLOG | | | Bal/Limit |
| BE-31 | `FeatureEngineer.spendingIntensity()` | BACKLOG | | | Amt/Ct |
| BE-32 | `FeatureEngineer.engagementScore()` | BACKLOG | | | Ct/Months |
| BE-33 | `FeatureEngineer.customerValueScore()` (composite z-score) | BACKLOG | | | NO Attrition_Flag |
| BE-34 | `FeatureEngineer.riskScore()` | BACKLOG | | | NO Attrition_Flag |
| BE-35 | `FeatureEngineer.customerTier()` (quartiles) | BACKLOG | | | Bronze/Silver/Gold/Platinum |

## Phase 4 — EDA endpoints

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-40 | `GET /api/eda/distribution?col=&bins=` | BACKLOG | | | bins as int |
| BE-41 | `GET /api/eda/correlation` | BACKLOG | | | Pearson matrix |
| BE-42 | `GET /api/eda/churn-by?dim=` | BACKLOG | | | Group rate |
| BE-43 | PCA-2D coords export for `/clusters` page | BACKLOG | | | Cache result |

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
| BE-M2 | Download `BankChurners.csv` from Kaggle | BLOCKED | Place at `backend/data/raw/` |
| BE-M3 | Provision Neon DB & paste connection string into `application-prod.yml` | BLOCKED | For deploy phase only |

---

## Update Protocol

1. Claim a task: change `Owner` to your name + `Status` to `WIP`
2. Work on it in `backend` branch
3. On completion: set `Status` to `REVIEW` and `Commit` to short SHA
4. After merge to `develop`: set `Status` to `DONE`
5. Bump **Quick Stats** counts at top
6. In the same commit, run the docs sync: `develop` → `backend` → `frontend`
