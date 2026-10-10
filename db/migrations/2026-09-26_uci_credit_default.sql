-- DESTRUCTIVE MIGRATION: apply only after explicit approval, backup, and restore test.
BEGIN;

DROP TABLE IF EXISTS predictions;
DROP TABLE IF EXISTS rules;
DROP TABLE IF EXISTS insights;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS clusters;

CREATE TABLE clusters (
  cluster_id INT PRIMARY KEY,
  persona_name VARCHAR(50),
  size INT,
  centroid_json JSONB,
  avg_risk NUMERIC(6,4),
  default_rate NUMERIC(6,4),
  description TEXT
);

CREATE TABLE customers (
  client_id BIGINT PRIMARY KEY,
  limit_bal NUMERIC(14,2),
  sex VARCHAR(10),
  education VARCHAR(20),
  marriage VARCHAR(12),
  age INT,
  pay_1 INT,
  pay_2 INT,
  pay_3 INT,
  pay_4 INT,
  pay_5 INT,
  pay_6 INT,
  bill_amt1 NUMERIC(14,2),
  bill_amt2 NUMERIC(14,2),
  bill_amt3 NUMERIC(14,2),
  bill_amt4 NUMERIC(14,2),
  bill_amt5 NUMERIC(14,2),
  bill_amt6 NUMERIC(14,2),
  pay_amt1 NUMERIC(14,2),
  pay_amt2 NUMERIC(14,2),
  pay_amt3 NUMERIC(14,2),
  pay_amt4 NUMERIC(14,2),
  pay_amt5 NUMERIC(14,2),
  pay_amt6 NUMERIC(14,2),
  default_flag VARCHAR(3),
  utilization_1 NUMERIC(9,5),
  avg_utilization NUMERIC(9,5),
  pay_ratio NUMERIC(9,5),
  months_delayed INT,
  max_delay INT,
  bill_trend NUMERIC(9,5),
  risk_tier VARCHAR(10),
  is_outlier BOOLEAN DEFAULT FALSE,
  is_anomaly BOOLEAN DEFAULT FALSE,
  centroid_distance NUMERIC(8,4),
  cluster_id INT REFERENCES clusters(cluster_id)
);

CREATE TABLE rules (
  rule_id BIGSERIAL PRIMARY KEY,
  lhs TEXT,
  rhs TEXT,
  support NUMERIC(6,4),
  confidence NUMERIC(6,4),
  lift NUMERIC(8,4),
  category VARCHAR(30)
);

CREATE TABLE insights (
  insight_id BIGSERIAL PRIMARY KEY,
  title VARCHAR(200),
  discovery TEXT,
  evidence TEXT,
  recommendation TEXT,
  category VARCHAR(30),
  priority INT DEFAULT 1
);

CREATE TABLE predictions (
  prediction_id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  input_json JSONB,
  predicted_label VARCHAR(20),
  default_prob NUMERIC(6,4),
  cluster_id INT,
  model_used VARCHAR(30)
);

CREATE INDEX idx_customers_cluster ON customers(cluster_id);
CREATE INDEX idx_customers_default ON customers(default_flag);
CREATE INDEX idx_customers_risk_tier ON customers(risk_tier);
CREATE INDEX idx_customers_anomaly ON customers(is_anomaly) WHERE is_anomaly = TRUE;
CREATE INDEX idx_rules_lift ON rules(lift DESC);
CREATE INDEX idx_rules_category ON rules(category);
CREATE INDEX idx_insights_priority ON insights(priority);
CREATE INDEX idx_insights_category ON insights(category);
CREATE INDEX idx_predictions_ts ON predictions(ts DESC);

COMMIT;

-- Rollback: restore the pre-migration database backup. This migration replaces data.
