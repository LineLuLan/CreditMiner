# CreditMiner Training Log

## Run Summary

- Run date: 2026-06-02 12:07-12:10 +07:00
- Runner: `scripts/train-artifacts.bat`
- Dataset: `backend/data/raw/BankChurners.csv`
- Scope: artifact-only training; no database seed/reset, no SQL, no deploy, no `.env` reads.
- Status: completed successfully through Phases 1, 2, 3, 5, 6, and 7.

## Pipeline Results

| Phase | Output | Key result |
|---|---|---|
| 1. Data understanding | `data/processed/phase1_raw.arff`, `phase1_describe.json` | 10,127 rows, 21 columns after dropping 2 leakage columns |
| 2. Preprocessing | `clean.arff`, `phase2_report.json`, `phase2_outliers.json` | 0 duplicates; 1,684 outliers, 16.63% |
| 3. Feature engineering | `enriched.arff`, `phase3_report.json` | 6 derived features; 27 columns total |
| 5. Classification | `models/*.model`, `phase5_comparison.csv`, `phase5_feature_importance.json` | Best F1 by test set: RandomForest cost, F1 0.8775; RandomForest SMOTE F1 0.8758 |
| 6. Clustering/anomaly | `kmeans*.model`, `phase6_*.json` | Best k=3 by silhouette 0.2180; combined anomalies 349, 3.45% |
| 7. Association rules | `clean_assoc.arff`, `models/rules.json` | 50 retention rules, 0 churn rules |

## Classification Metrics

| Algorithm | Variant | Test F1 | Test ROC-AUC | Test PR-AUC |
|---|---:|---:|---:|---:|
| J48 | baseline | 0.7839 | 0.9112 | 0.7445 |
| J48 | SMOTE | 0.8111 | 0.9059 | 0.7368 |
| RandomForest | baseline | 0.8691 | 0.9887 | 0.9481 |
| RandomForest | SMOTE | 0.8758 | 0.9888 | 0.9429 |
| NaiveBayes | baseline | 0.5749 | 0.8437 | 0.6520 |
| NaiveBayes | SMOTE | 0.5320 | 0.8415 | 0.6410 |
| Logistic | baseline | 0.6701 | 0.9272 | 0.7635 |
| Logistic | SMOTE | 0.6821 | 0.9218 | 0.7481 |
| J48 | cost | 0.8239 | 0.9260 | 0.7832 |
| RandomForest | cost | 0.8775 | 0.9893 | 0.9464 |

## Top RandomForest Features

1. `Total_Trans_Amt`
2. `Customer_Age`
3. `Total_Trans_Ct`
4. `Total_Amt_Chng_Q4_Q1`
5. `Spending_Intensity`

## Clustering Results

| Cluster | Size | Avg risk | Churn rate | Description |
|---:|---:|---:|---:|---|
| 0 | 1,920 | 0.3214 | 11.67% | high credit, low utilization, mid spender |
| 1 | 3,981 | 0.3390 | 26.07% | mid credit, low utilization, mid spender |
| 2 | 4,226 | 0.5271 | 8.64% | low credit, high utilization, mid spender |

## Anomaly Results

- Phase 2 outliers: 1,684
- Cluster strong outliers: 400
- Cluster mild outliers: 1,560
- Combined anomalies: 349
- Combined anomaly rate: 3.45%
- Rule: `clusterStrongOutlier AND phase2Outlier`

## Association Rules

- Total rules: 50
- Retention rules: 50
- Churn rules: 0
- Top rule: `Credit_Limit='(-inf-2962.5]', Total_Trans_Ct='(76.5-inf)' => Attrition_Flag=Existing Customer`
- Top rule support: 0.1060
- Top rule confidence: 1.0000
- Top rule lift: 1.1900

## Artifact Inventory

- `backend/data/processed/phase1_raw.arff`
- `backend/data/processed/phase1_describe.json`
- `backend/data/processed/clean.arff`
- `backend/data/processed/phase2_report.json`
- `backend/data/processed/phase2_outliers.json`
- `backend/data/processed/enriched.arff`
- `backend/data/processed/phase3_report.json`
- `backend/data/processed/phase5_comparison.csv`
- `backend/data/processed/phase5_feature_importance.json`
- `backend/data/processed/phase6_elbow.json`
- `backend/data/processed/phase6_clusters.json`
- `backend/data/processed/phase6_anomalies.json`
- `backend/data/processed/phase6_pca_2d.json`
- `backend/data/processed/clean_assoc.arff`
- `backend/models/j48.model`
- `backend/models/rf.model`
- `backend/models/nb.model`
- `backend/models/logistic.model`
- `backend/models/kmeans.model`
- `backend/models/kmeans-normalizer.model`
- `backend/models/kmeans-input-header.model`
- `backend/models/rules.json`

## FE Readiness

- The `/mining-report` frontend can show classification, clustering, anomaly, rules, and insight evidence from these local artifacts through `GET /api/mining-report`.
- Database-backed customer, overview, cluster-detail, and prediction logging pages still need a reachable database with schema/data.
- Database seeding is intentionally separate because it deletes and rewrites `customers`, `clusters`, and `rules`.
