-- =============================================================================
-- 2026-05-09 — Refresh insights with real Phase 5/6/7 numbers (BE-80)
-- Replaces the 5 pre-Phase-7 stub insights from db/seed.sql.
-- Apply via:  psql "$DATABASE_URL" -f db/migrations/2026-05-09_refresh_insights.sql
-- Idempotent: TRUNCATE + RESTART IDENTITY before insert.
-- =============================================================================

BEGIN;

TRUNCATE TABLE insights RESTART IDENTITY;

INSERT INTO insights (title, discovery, evidence, recommendation, category, priority) VALUES
('At-Risk Mid-Tier cluster drives churn',
 'Cluster 1 (At-Risk Mid-Tier, 3981 customers / 39% of base) churns at 26.07% — 3x the safest cluster (Low-Income Stable, 8.64%) and 2.2x Premium Loyal (11.67%).',
 'KMeans (k=3, silhouette 0.218) on 19 normalized numeric features. C1 centroid: Credit_Limit ~$8K, Util ~0.31, Total_Trans_Ct ~57. avgRisk=0.34. C0 churn=0.117, C1 churn=0.261, C2 churn=0.086. (phase6_clusters.json)',
 'Route the 3981 At-Risk Mid-Tier members to a retention queue; pair with the top Apriori retention signal (Total_Trans_Ct ≥ 77) to gate the offer — cardholders below the threshold need a transaction-driving incentive (cashback bump, statement credit), those above qualify for tier upgrade.',
 'churn', 1),
('Transaction amount is the #1 churn predictor',
 'RandomForest ranks Total_Trans_Amt as the top feature, ahead of Customer_Age and Total_Trans_Ct. The Phase-3 derived Spending_Intensity (Amt/Ct) is the 5th most important — confirming derived features added signal.',
 'Mean Decrease Impurity (RF, 100 trees, SMOTE on train): Total_Trans_Amt=3242, Customer_Age=2677, Total_Trans_Ct=2532, Total_Amt_Chng_Q4_Q1=2475, Spending_Intensity=2339. (phase5_feature_importance.json) Test F1-Attrited=0.876, ROC-AUC=0.989.',
 'Surface a "spend this quarter vs last" delta on customer profiles; alert relationship managers when Total_Amt_Chng_Q4_Q1 < 0.6.',
 'risk', 1),
('High transaction frequency predicts retention with certainty',
 'Customers with Total_Trans_Ct > 76 are 100% Existing (no Attrited cases at conf=1.0) — a hard retention signal.',
 'Apriori (sup=0.05, conf=0.7, top 50 rules by lift) on 13 attributes. Rule #1: Total_Trans_Ct=(76.5-inf) AND Credit_Limit=(-inf-2962.5) → Existing Customer (sup=0.106, conf=1.0, lift=1.19). Lift caps at 1/0.84=1.19 because Existing is 84% of base. (rules.json)',
 'Use Total_Trans_Ct ≥ 77 as a "safe customer" filter to exclude from retention spend; redirect those resources to the At-Risk Mid-Tier cluster.',
 'opportunity', 2),
('Premium Loyal is the under-monetized cohort',
 'Premium Loyal (1920 customers, 19% of base) holds $24K mean Credit_Limit but uses only 6.8% of it (Utilization_Score=0.068) — highest spend headroom, lowest churn (11.67%).',
 'KMeans cluster 0 centroid (original units): Credit_Limit=$24,287, Total_Revolving_Bal=~$1.6K, Avg_Open_To_Buy=$22,953, Total_Trans_Ct=75, Total_Trans_Amt=$6,737. (phase6_clusters.json)',
 'Pitch travel/rewards card upgrades and balance-transfer offers; this cohort has both willingness (high tenure, low utilization) and ability (large open-to-buy) to absorb premium products.',
 'opportunity', 2),
('Multi-signal anomaly screen flagged 349 customers (3.45%)',
 'Combining cluster-distance outliers (>μ+2σ) with Phase-2 univariate outliers (|Z|>3 OR IQR fence) catches customers extreme on both fronts — actionable risk targets without flooding the team.',
 'Phase 6 anomaly rule: isAnomaly = (centroidDistance > 1.087) AND (Z-score>3 OR IQR violation on Credit_Limit/Total_Trans_Amt/Avg_Util/Total_Revolving_Bal). 400 strong cluster outliers ∩ 1684 Phase-2 outliers = 349. Blueprint §3 target: 3-5%. (phase6_anomalies.json)',
 'Pull the 349 anomalies into a manual-review queue; cross-check transaction logs for fraud patterns before any automated action.',
 'risk', 2);

COMMIT;

DO $$
DECLARE c INT;
BEGIN
  SELECT count(*) INTO c FROM insights;
  RAISE NOTICE 'Insights refreshed: % rows', c;
END $$;
