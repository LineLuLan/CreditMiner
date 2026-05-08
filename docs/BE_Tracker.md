# Backend Task Tracker

> **Branch**: `backend`  ·  **Owner**: BE team  ·  **Last sync**: Phase 8 code complete (2026-05-09); seed run pending
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
| REVIEW | 58 (BE-01..BE-05, BE-10..BE-13, BE-20..BE-26, BE-30..BE-35, BE-40..BE-43, BE-50..BE-59, BE-60..BE-64, BE-70..BE-74, BE-80..BE-91) |
| WIP | 0 |
| Blocked | 1 (manual user step BE-M1) |
| Skipped | 1 (BE-65 EM bonus — optional, deprioritized) |
| % complete | 4.7% (95.3% incl REVIEW) |
| Pending | 1 (Phase 8 seed run against Neon — needs user authorization) |

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
| BE-43 | PCA-2D coords export for `/clusters` page | REVIEW | claude | _pending_ | Weka `PrincipalComponents` filter on the same normalized matrix used for KMeans (19 numeric features). First 2 PCs exported to `data/processed/phase6_pca_2d.json` (10127 points × {clientNum, clusterId, x, y}). HTTP endpoint deferred to Phase 8 alongside `/api/clusters` (BE-85) so they can share cache infra. |

## Phase 5 — Classification

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-50 | `Splitter.stratified(80/20, seed=42)` | REVIEW | claude | _pending_ | New `Splitter` service uses `Instances.stratify(10)` + `randomize(seed)`. Verified split: 8102 train + 2025 test. |
| BE-51 | Train J48 | REVIEW | claude | _pending_ | Single canonical config (`-C 0.25 -M 2`). Variants compared = baseline + SMOTE + CostSensitive. (3 hyperparam combos in original spec collapsed into 3 imbalance variants — cleaner comparison.) |
| BE-52 | Train RandomForest | REVIEW | claude | _pending_ | 100 trees, seed 42, `setComputeAttributeImportance(true)`. Variants: baseline + SMOTE + CostSensitive. RF+SMOTE wins overall. |
| BE-53 | Train NaiveBayes | REVIEW | claude | _pending_ | Default Gaussian; standardized input. Variants: baseline + SMOTE. Test F1 weak (~0.55) due to feature non-Gaussianity. |
| BE-54 | Train Logistic baseline | REVIEW | claude | _pending_ | Standardized + one-hot encoded. Variants: baseline + SMOTE. |
| BE-55 | Apply SMOTE on train only — re-train all | REVIEW | claude | _pending_ | `weka.filters.supervised.instance.SMOTE` seed=42 applied to TRAIN ONLY before each variant trains. Train rows 8102 → 9404. |
| BE-56 | Cost-sensitive wrapper (matrix [[0,1],[5,0]]) | REVIEW | claude | _pending_ | `CostSensitiveClassifier` wrapping J48 + RF only. `cost(actual=1, predicted=0)=5` (FN penalty). |
| BE-57 | 10-fold CV on train; record F1/AUC | REVIEW | claude | _pending_ | Per-variant CV via `Evaluation.crossValidateModel(..., 10, Random(42))`. Headline: F1-Attrited / ROC-AUC / PR-AUC / accuracy / precision / recall in CSV. |
| BE-58 | Final evaluation on test set; export comparison table | REVIEW | claude | _pending_ | `data/processed/phase5_comparison.csv` — 10 rows (algo × variant), 14 cols (cv_* + test_* metrics). Note: CSV is gitignored — regenerable via `mvn exec:java Phase5Pipeline`. |
| BE-59 | Feature importance from RF | REVIEW | claude | _pending_ | `RandomForest.computeAverageImpurityDecreasePerAttribute(double[])` → `data/processed/phase5_feature_importance.json` ranked desc. Top-5: Total_Trans_Amt, Customer_Age, Total_Trans_Ct, Total_Amt_Chng_Q4_Q1, Spending_Intensity (Phase 3 derived). |

## Phase 6 — Clustering & Anomaly

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-60 | KMeans elbow (k=2..8) — pick optimal k | REVIEW | claude | _pending_ | Sweep k=2..8 in `ClusteringService.elbow()`. WCSS drops 6496 → 4014 (smooth, no sharp elbow). Curve in `data/processed/phase6_elbow.json`. |
| BE-61 | KMeans + silhouette score | REVIEW | claude | _pending_ | Sampled silhouette (1000 random points × all 10127, seed 42). Best by argmax: **k=3** (0.2180). k=2 (0.2172) close behind. |
| BE-62 | Train final SimpleKMeans (k chosen, seed=42) | REVIEW | claude | _pending_ | k=3, seed=42, 500 iter, EuclideanDistance, preserveInstancesOrder=true. Saved to `models/kmeans.model` (50KB, gitignored). |
| BE-63 | Compute centroid distances → flag anomalies | REVIEW | claude | _pending_ | Distance per row from assigned centroid; threshold = μ+3σ = 0.71+3·0.19 = 1.27. Flagged: 50 customers. |
| BE-64 | Combine Z/IQR/cluster-distance into `is_anomaly` | REVIEW | claude | _pending_ | `isAnomaly = phase2_outlier AND cluster_distance_outlier` (strict: both must fire). 47 customers combined. Sidecar `data/processed/phase6_anomalies.json` per-row records (clientNum, clusterId, centroidDistance, phase2Outlier, clusterDistanceOutlier, isAnomaly) for Phase 8 seeder. |
| BE-65 | EM clusterer (bonus, optional) | SKIPPED | | | Optional bonus — deprioritized. Probabilistic membership not on demo critical path. Add later if report needs comparison vs KMeans. |

## Phase 7 — Association Rules

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-70 | Discretize numeric → 3 equal-frequency bins | REVIEW | claude | _pending_ | Weka `Discretize -B 3 -F` on Credit_Limit / Avg_Utilization_Ratio / Total_Trans_Amt / Total_Trans_Ct / Risk_Score / Months_Inactive_12_mon. |
| BE-71 | Save `clean_assoc.arff` | REVIEW | claude | _pending_ | 10127 rows × 13 attrs (6 discretized + 7 native nominals). Path from `creditminer.data.assoc-arff`. |
| BE-72 | Run Apriori (sup=0.05, conf=0.7, n=50) | REVIEW | claude | _pending_ | sup=0.05, conf=0.7 (blueprint), `numRules=10000` internally + delta=0.01 so support actually descends to 5% (Weka stops early once N rules found at current floor); post-filter to top 50 by lift. |
| BE-73 | Filter rules with Attrition_Flag on RHS | REVIEW | claude | _pending_ | Single-attribute `Attrition_Flag=...` RHS only (multi-attr inflates lift artificially). Categorize: `Attrited` → churn, `Existing` → retention. Result: 50 retention, 0 churn (math: Attrited 16% prevalence cannot reach conf ≥ 0.7 at single-attr granularity). minLift relaxed to 1.0 (theoretical max for retention is 1/0.84 ≈ 1.19). |
| BE-74 | Export `rules.json` | REVIEW | claude | _pending_ | `models/rules.json` (consumed by `GET /api/rules` Phase 8). Schema: ruleId, lhs, rhs, support, confidence, lift, category. Wrapping doc has `totalRows`, `config{minSupport, minConfidence, numRules, minLift}`, `ruleCount`, `churnRuleCount`, `retentionRuleCount`. |

## Phase 8 — Insights & API

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| BE-80 | Seed `insights.json` with 5+ Discovery/Evidence/Recommendation | REVIEW | claude | _pending_ | Existing 5 in `db/seed.sql` (pre-Phase-7 baseline, hand-curated). DatabaseSeeder intentionally skips insights to avoid clobbering. Refresh as a follow-up using actual Phase 5/7 data. |
| BE-81 | DB seeder: insert customers/clusters/rules/insights | REVIEW | claude | _pending_ | `DatabaseSeeder` service + `Phase8Seeder` Spring CLI main. Reads enriched.arff (10127 customers), phase6_pca_2d.json (cluster_id per CLIENTNUM), phase6_anomalies.json (outlier/anomaly flags), phase6_clusters.json (3 cluster summaries renamed: C0→Premium Loyal, C1→At-Risk Mid-Tier, C2→Low-Income Stable), models/rules.json (50 rules). Truncates + re-populates customers/clusters/rules. **Live run pending user authorization.** |
| BE-82 | `GET /api/overview` | REVIEW | claude | _pending_ | Already wired via `CustomerRepository` (count, countByAttritionFlag, avgRiskScore, avgUtilization, tierBreakdown queries); fallback stubs only fire if DB empty. Goes live after seed. |
| BE-83 | `GET /api/customers` (paginated) | REVIEW | claude | _pending_ | JPA `Page<Customer>`; filter by attritionFlag OR clusterId, sort `field,asc\|desc`. Defaults: page=1 size=20 sort=clientNum,asc. Already wired pre-Phase-8. |
| BE-84 | `GET /api/customers/{id}` | REVIEW | claude | _pending_ | `CustomerRepository.findById()`; throws `BusinessException.notFound("Customer", id)` → 404 envelope. |
| BE-85 | `GET /api/clusters` | REVIEW | claude | _pending_ | Replaced mock with `clusterRepo.findAll()`; centroid_json JSONB parsed into Map<String, Double> via Jackson. |
| BE-86 | `GET /api/clusters/{id}/customers` | REVIEW | claude | _pending_ | Already wired via `customerRepo.findByClusterId(id, pageable)`. |
| BE-87 | `GET /api/rules?minLift=` | REVIEW | claude | _pending_ | Already wired via `RuleRepository.findByMinLift` / `findByMinLiftAndCategory`; sorted by lift desc. Note: post-seed, lift threshold 1.2 returns 0 rules (max retention lift is 1.19); use minLift=1.0 to see all 50. |
| BE-88 | `GET /api/insights` | DONE | claude | b492427 | Already live since Phase 0; 5 rows from `db/seed.sql`. |
| BE-89 | `GET /api/anomalies` | REVIEW | claude | _pending_ | Already wired via `customerRepo.findTopAnomalies(limit)` (native query, ORDER BY risk_score DESC). After seed: 47 customers with `is_anomaly=true` (Phase 2 ∩ cluster-distance). |
| BE-90 | `POST /api/predict` (full flow with cluster + recommendation) | REVIEW | claude | _pending_ | New `PredictInputBuilder` builds 26-attr Instance from `PredictRequest`: re-derives Phase 3 features at request time, bins Customer_Tier from training quartile cutoffs cached at startup. `ClassificationService.predict()` runs RF→churnProb, KMeans→cluster, looks up persona name from `clusters` table, derives top-3 features from `phase5_feature_importance.json`, builds rule-based recommendation. Note: PredictRequest lacks `Total_Amt_Chng_Q4_Q1` / `Total_Ct_Chng_Q4_Q1` fields so those default to 1.0 at inference. |
| BE-91 | Predictions logging to `predictions` table | REVIEW | claude | _pending_ | Every `/api/predict` call writes a `PredictionLog` row (input as JSONB, predicted_label, churn_prob, cluster_id, model_used, ts). Failures logged but don't break the response. |

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
