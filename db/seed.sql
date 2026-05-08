-- =============================================================================
-- CreditMiner — initial seed
-- Apply AFTER schema.sql:  psql $DATABASE_URL -f db/seed.sql
-- =============================================================================

-- Insights (mirrors backend/src/main/resources/insights.json — keep in sync)
INSERT INTO insights (title, discovery, evidence, recommendation, category, priority) VALUES
('High utilization signals imminent churn',
 'Customers with Avg_Utilization_Ratio > 0.7 churn at 2.4x the average rate.',
 'Apriori rule {Util=high, Inactive=high} -> Attrited (sup=0.08, conf=0.78, lift=4.84). Confirmed by RandomForest feature importance (utilization ranks top 3).',
 'Trigger an alert when utilization exceeds 70% for 2 consecutive months; offer credit-limit increase or financial counseling.',
 'churn', 1),
('Premium Loyal cluster is under-monetized',
 'The Premium Loyal cluster has the highest credit limits but the lowest utilization rate.',
 'Premium centroid: Credit_Limit ~ $20K, Utilization ~ 0.15. Cluster size ~30%, churn rate <6%.',
 'Push premium credit products, travel rewards, and investment offerings to this cohort.',
 'opportunity', 2),
('Inactive months strongly correlates with churn',
 'Customers with Months_Inactive_12_mon >= 4 churn 3.1x more often.',
 'Pearson r(inactive, attrited)=0.21; Apriori rule {Inactive=high, Trans_Ct=low} -> Attrited (lift=3.6).',
 'Send re-engagement campaigns at 2-month inactivity; escalate at 3 months.',
 'churn', 1),
('Low transaction count is the strongest single predictor',
 'Total_Trans_Ct ranks #1 in RandomForest feature importance.',
 'RF importance: Total_Trans_Ct = 0.28 (top), followed by Total_Trans_Amt (0.19) and Avg_Utilization_Ratio (0.17).',
 'Surface a "transactions this month vs last" KPI in customer-facing app to drive activity.',
 'risk', 2),
('Blue card holders churn 1.6x more than Silver/Gold',
 'Card_Category=Blue customers have a 17.2% churn rate vs 11% for higher tiers.',
 'Apriori rule {Card=Blue, Trans_Ct=low} -> Attrited (sup=0.05, conf=0.72, lift=4.46).',
 'Promote tier upgrade with first-year fee waiver to active Blue customers.',
 'opportunity', 3);

-- Stub clusters (real values overwritten by TrainPipeline)
INSERT INTO clusters (cluster_id, persona_name, size, centroid_json, avg_risk, churn_rate, description) VALUES
(0, 'Premium Loyal',       3210, '{"Credit_Limit": 18420, "Avg_Utilization_Ratio": 0.15, "Total_Trans_Ct": 78}'::jsonb,
   0.21, 0.06, 'High credit, low utilization, high transactions — under-monetized.'),
(1, 'High-Risk Spenders',  2511, '{"Credit_Limit":  6840, "Avg_Utilization_Ratio": 0.74, "Total_Trans_Ct": 42}'::jsonb,
   0.62, 0.31, 'High utilization with declining transaction count. Proactive retention needed.'),
(2, 'Dormant',             1820, '{"Credit_Limit":  5280, "Avg_Utilization_Ratio": 0.18, "Total_Trans_Ct": 21}'::jsonb,
   0.51, 0.28, 'Low transactions, high inactive months. Reactivation campaign target.'),
(3, 'Average Active',      2586, '{"Credit_Limit":  9170, "Avg_Utilization_Ratio": 0.34, "Total_Trans_Ct": 55}'::jsonb,
   0.29, 0.10, 'Mid-range across all metrics. Nurture and monitor.');

-- (customers + rules tables intentionally left empty — populated by TrainPipeline)

DO $$
BEGIN
  RAISE NOTICE 'Seed applied: 5 insights + 4 cluster stubs.';
END $$;
