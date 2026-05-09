-- =============================================================================
-- CreditMiner — PostgreSQL DDL
-- Apply with: psql $DATABASE_URL -f db/schema.sql
-- (Docker compose maps this file to /docker-entrypoint-initdb.d/01-schema.sql)
-- =============================================================================

-- =====================================================
-- CUSTOMERS — raw + derived features + flags
-- =====================================================
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS rules CASCADE;
DROP TABLE IF EXISTS insights CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS clusters CASCADE;

CREATE TABLE customers (
  client_num                BIGINT PRIMARY KEY,
  attrition_flag            VARCHAR(20),

  -- Demographics
  customer_age              INT,
  gender                    VARCHAR(1),
  dependent_count           INT,
  education_level           VARCHAR(30),
  marital_status            VARCHAR(20),
  income_category           VARCHAR(30),

  -- Account
  card_category             VARCHAR(20),
  months_on_book            INT,
  total_relationship_count  INT,
  months_inactive_12_mon    INT,
  contacts_count_12_mon     INT,

  -- Financial
  credit_limit              NUMERIC(12,2),
  total_revolving_bal       NUMERIC(12,2),
  avg_open_to_buy           NUMERIC(12,2),
  avg_utilization_ratio     NUMERIC(6,3),

  -- Transactional
  total_amt_chng_q4_q1      NUMERIC(8,3),
  total_trans_amt           NUMERIC(12,2),
  total_trans_ct            INT,
  total_ct_chng_q4_q1       NUMERIC(8,3),

  -- Derived (Phase 3)
  utilization_score         NUMERIC(6,3),
  spending_intensity        NUMERIC(10,2),
  engagement_score          NUMERIC(8,3),
  customer_value_score      NUMERIC(8,3),
  risk_score                NUMERIC(6,3),
  customer_tier             VARCHAR(15),

  -- Flags
  is_outlier                BOOLEAN DEFAULT FALSE,
  is_anomaly                BOOLEAN DEFAULT FALSE,
  cluster_id                INT
);

CREATE INDEX idx_customers_cluster   ON customers(cluster_id);
CREATE INDEX idx_customers_attrition ON customers(attrition_flag);
CREATE INDEX idx_customers_risk      ON customers(risk_score DESC);
CREATE INDEX idx_customers_tier      ON customers(customer_tier);
CREATE INDEX idx_customers_anomaly   ON customers(is_anomaly) WHERE is_anomaly = TRUE;

-- =====================================================
-- CLUSTERS — pre-computed
-- =====================================================
CREATE TABLE clusters (
  cluster_id     INT PRIMARY KEY,
  persona_name   VARCHAR(50),
  size           INT,
  centroid_json  JSONB,
  avg_risk       NUMERIC(6,3),
  churn_rate     NUMERIC(6,3),
  description    TEXT
);

-- =====================================================
-- ASSOCIATION RULES — pre-computed (Apriori output)
-- =====================================================
CREATE TABLE rules (
  rule_id        BIGSERIAL PRIMARY KEY,
  lhs            TEXT,
  rhs            TEXT,
  support        NUMERIC(6,4),
  confidence     NUMERIC(6,4),
  lift           NUMERIC(8,4),
  category       VARCHAR(30) -- 'churn' / 'retention'
);

CREATE INDEX idx_rules_lift     ON rules(lift DESC);
CREATE INDEX idx_rules_category ON rules(category);

-- =====================================================
-- INSIGHTS — hand-curated (Discovery / Evidence / Recommendation)
-- =====================================================
CREATE TABLE insights (
  insight_id     BIGSERIAL PRIMARY KEY,
  title          VARCHAR(200),
  discovery      TEXT,
  evidence       TEXT,
  recommendation TEXT,
  category       VARCHAR(30), -- 'churn' / 'cluster' / 'risk' / 'opportunity'
  priority       INT DEFAULT 1
);

CREATE INDEX idx_insights_priority ON insights(priority);
CREATE INDEX idx_insights_category ON insights(category);

-- =====================================================
-- PREDICTIONS — log every prediction call
-- =====================================================
CREATE TABLE predictions (
  prediction_id   BIGSERIAL PRIMARY KEY,
  ts              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  input_json      JSONB,
  predicted_label VARCHAR(20),
  churn_prob      NUMERIC(6,4),
  cluster_id      INT,
  model_used      VARCHAR(30)
);

CREATE INDEX idx_predictions_ts ON predictions(ts DESC);

-- =====================================================
-- Sanity: confirm tables exist
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Schema applied: customers, clusters, rules, insights, predictions';
END $$;
