# BLUEPRINT — Financial Customer Behavior Mining & Risk Detection System

> **Course Project · Data Mining**
> **Backend:** Java + Weka + Spring Boot
> **Frontend:** Next.js + Tailwind CSS + shadcn/ui + Recharts
> **Database:** PostgreSQL (Neon)

---

## TABLE OF CONTENTS

1. Project Overview
2. Dataset
3. Data Mining Objectives
4. The 8-Phase Pipeline
5. System Architecture & Data Flow
6. Database Design
7. Backend (Java + Weka + Spring Boot)
8. Frontend (Next.js)
9. Reproducibility & Quality Controls
10. Deliverables
11. Self-Assessment Criteria
12. 8-Week Roadmap
13. Risk Management
14. Appendix: Java code samples

---

## 1. Project Overview

### 1.1. Title
**Credit Card Customer Behavior Mining and Risk Detection System**

### 1.2. Business Problem
Credit card issuers face four critical questions:

1. **Who is about to leave?** → **Classification** (churn prediction)
2. **What hidden customer segments exist?** → **Clustering**
3. **Which behaviors lead to risk?** → **Association Rule Mining**
4. **Who behaves abnormally?** → **Anomaly Detection**

The system not only answers these four questions but also delivers an **interactive dashboard** that lets analysts explore the data, browse segments, query rules, and **predict churn for individual customers** through a form.

### 1.3. Value Delivered
- **Reduce churn rate** through early warning and targeted retention.
- **Increase revenue** by upselling the right premium segments.
- **Mitigate credit risk** by detecting abnormal behavior.
- **Personalize customer experience** based on cluster personas.

### 1.4. Final Output
A complete full-stack system consisting of:
- Automated data mining pipeline (Java)
- REST API for inference (Spring Boot)
- 7-page interactive dashboard (Next.js)
- Database storing customers, clusters, rules, and insights (PostgreSQL/Neon)
- Technical report + demo slides + walkthrough video

---

## 2. Dataset

### 2.1. Source
**Credit Card Customers Dataset** — Sakshi Goyal (Kaggle).
URL: `https://www.kaggle.com/datasets/sakshigoyal7/credit-card-customers`

### 2.2. Characteristics
- **10,127 rows × 23 columns**
- **Target**: `Attrition_Flag` — binary (Existing Customer / Attrited Customer)
- **Class distribution**:
  - Existing Customer: ~83.93% (8,500 rows)
  - Attrited Customer: ~16.07% (1,627 rows)
- **Imbalanced**: ~5:1 ratio → imbalance handling is mandatory
- **Original format**: CSV

### 2.3. Schema of columns to be used

| Group | Column | Type | Description |
|---|---|---|---|
| ID | `CLIENTNUM` | int | Customer ID (drop during training, use as DB primary key) |
| Target | `Attrition_Flag` | nominal | Existing / Attrited |
| Demographics | `Customer_Age` | int | Customer age |
| | `Gender` | nominal | M / F |
| | `Dependent_count` | int | Number of dependents |
| | `Education_Level` | nominal | Uneducated, High School, College, Graduate, Post-Graduate, Doctorate, Unknown |
| | `Marital_Status` | nominal | Single, Married, Divorced, Unknown |
| | `Income_Category` | nominal | Less than $40K → $120K+, Unknown |
| Account | `Card_Category` | nominal | Blue, Silver, Gold, Platinum |
| | `Months_on_book` | int | Months as customer |
| | `Total_Relationship_Count` | int | Number of products held |
| | `Months_Inactive_12_mon` | int | Inactive months in last 12 |
| | `Contacts_Count_12_mon` | int | Bank contacts in last 12 months |
| Financial | `Credit_Limit` | numeric | Credit limit |
| | `Total_Revolving_Bal` | numeric | Revolving balance |
| | `Avg_Open_To_Buy` | numeric | Available credit |
| | `Avg_Utilization_Ratio` | numeric (0-1) | Credit utilization |
| Transactional | `Total_Amt_Chng_Q4_Q1` | numeric | Q4 vs Q1 transaction amount change |
| | `Total_Trans_Amt` | numeric | Total transaction amount |
| | `Total_Trans_Ct` | int | Total transaction count |
| | `Total_Ct_Chng_Q4_Q1` | numeric | Q4 vs Q1 transaction count change |

### 2.4. Columns to drop
The original dataset has two trailing "Naive Bayes Classifier..." columns — these are predictions from another model and **cause leakage** → drop immediately at load time.

### 2.5. The `Unknown` value
Several categorical columns contain `"Unknown"` → treated as missing and handled via mode imputation.

---

## 3. Data Mining Objectives (4 problems)

| # | Problem | Algorithms | Expected Outcome |
|---|---|---|---|
| 1 | **Classification** — Churn prediction | J48, RandomForest, NaiveBayes, Logistic | `.model` file with F1 ≥ 0.75 on Attrited class |
| 2 | **Clustering** — Segmentation | SimpleKMeans (k=3..6), optionally EM | 3-4 business-meaningful personas |
| 3 | **Association Rules** | Apriori (after discretization) | 30+ rules with lift > 1.2 |
| 4 | **Anomaly Detection** | Z-score + IQR + Cluster distance | ~3-5% of customers flagged |

---

## 4. The 8-Phase Data Mining Pipeline

### Phase 1 — Data Understanding

**Goal**: Understand the data before any processing.

**Steps**:
- Count rows/columns, verify schema.
- Descriptive statistics: mean, median, std, min, max, missing count, unique count for every column.
- Classify variables: numerical / categorical / ordinal / binary (document in report).
- Analyze target distribution → Attrited/Existing ratio chart.
- Spot early anomalies: `Unknown` values, obvious outliers.

**Output**: Phase 1 report + describe table.

---

### Phase 2 — Data Preprocessing

**2.1. Missing Value Handling**
- Count nulls per column.
- Treat `Unknown` in `Education_Level`, `Marital_Status`, `Income_Category` as missing.
- **Strategy**:
  - Categorical → mode imputation
  - Numerical → median imputation
- Weka filter: `weka.filters.unsupervised.attribute.ReplaceMissingValues`.

**2.2. Duplicate Handling**
- Check duplicates by `CLIENTNUM`.
- Drop if any (this dataset typically has none).

**2.3. Outlier Detection**
- Apply to key financial columns: `Credit_Limit`, `Total_Trans_Amt`, `Avg_Utilization_Ratio`, `Total_Revolving_Bal`.
- **Methods**:
  - Z-score: |z| > 3
  - IQR: outside [Q1 − 1.5×IQR, Q3 + 1.5×IQR]
- **Important**: do NOT delete outliers blindly — financial outliers may be genuine risk signals. Mark `is_outlier` flag in DB, reuse in Anomaly Detection phase.

**2.4. Scaling & Normalization**
- **Min-max Normalize** (`Normalize` filter): for Clustering and distance-based algorithms.
- **Z-score Standardize** (`Standardize` filter): for NaiveBayes (Gaussian assumption), Logistic.
- **Tree-based models** (J48, RandomForest): scaling NOT needed — explicitly mention in report to demonstrate understanding.

**2.5. Categorical Encoding**
- In ARFF files, Weka handles nominal attributes natively.
- For Java code receiving form input from frontend → use `NominalToBinary` (one-hot) for Logistic.

**2.6. Class Imbalance Handling** ⚠️ **critical**

Three strategies, **compare all three** in the report:
- **Baseline**: no resampling
- **SMOTE**: `weka.filters.supervised.instance.SMOTE` — apply to TRAINING set only, **NEVER on test set** (it would inflate metrics)
- **Cost-Sensitive**: wrap classifier in `CostSensitiveClassifier` with cost matrix [[0,1],[5,0]] (FN costs 5× more than FP)

**Primary metrics**: **F1-score on Attrited class + ROC-AUC + PR-AUC**.
**DO NOT use Accuracy as the primary metric** — with 84:16 baseline, predicting all "Existing" yields 84% accuracy but is useless.

---

### Phase 3 — Feature Engineering ⭐

Create 6 derived features added to the dataset:

| # | Feature | Formula | Meaning |
|---|---|---|---|
| 1 | `Utilization_Score` | `Total_Revolving_Bal / Credit_Limit` | Recompute to cross-check `Avg_Utilization_Ratio` |
| 2 | `Spending_Intensity` | `Total_Trans_Amt / Total_Trans_Ct` | Average spend per transaction |
| 3 | `Engagement_Score` | `Total_Trans_Ct / Months_on_book` | Activity normalized by tenure |
| 4 | `Customer_Value_Score` | `0.4·z(Trans_Amt) + 0.3·z(Credit_Limit) + 0.2·z(Tenure) − 0.1·z(Inactive_Months)` | Composite value score |
| 5 | `Risk_Score` | `0.4·Utilization + 0.3·(Inactive/12) + 0.3·(1 − Engagement_norm)` | Composite risk score |
| 6 | `Customer_Tier` | Discretize `Customer_Value_Score` into Bronze/Silver/Gold/Platinum (4 quartiles) | Used as Apriori input |

**Important note**: Risk_Score and Customer_Value_Score **MUST NOT use `Attrition_Flag`** in their formulas → avoid data leakage. Document this explicitly in the report.

---

### Phase 4 — Exploratory Data Analysis (EDA)

**4.1. Univariate Analysis**
- Histogram + density plot for: `Customer_Age`, `Credit_Limit`, `Total_Trans_Amt`, `Avg_Utilization_Ratio`.
- Bar chart for: `Income_Category`, `Card_Category`, `Education_Level`.

**4.2. Bivariate Analysis**
- Boxplot of each numeric feature split by `Attrition_Flag`.
- Churn rate by: `Income_Category`, `Card_Category`, `Customer_Tier`, `Gender`.

**4.3. Correlation Analysis**
- Pearson correlation heatmap for numeric features.
- Identify pairs with |r| > 0.7 → consider dropping one (multicollinearity).

**4.4. PCA Visualization**
- Reduce to 2D via PCA.
- Scatter plot colored by `Attrition_Flag` → visualize separability.

---

### Phase 5 — Classification

**5.1. Data Split**
- Stratified 80/20 train/test.
- `random_seed = 42` for reproducibility.
- 10-fold cross-validation on training set for hyperparameter tuning.

**5.2. Models & Hyperparameters**

| Model | Hyperparameters to tune |
|---|---|
| **J48** (C4.5) | `confidenceFactor ∈ {0.1, 0.25, 0.5}`, `minNumObj ∈ {2, 5, 10}` |
| **RandomForest** | `numIterations ∈ {100, 200, 500}`, `maxDepth ∈ {unlimited, 10, 20}` |
| **NaiveBayes** | `useKernelEstimator ∈ {true, false}` |
| **Logistic** (baseline) | `ridge ∈ {1e-8, 1e-4, 1e-2}` |

**5.3. Evaluation Metrics**
- Accuracy (reference only)
- **Precision, Recall, F1 on Attrited class** (primary)
- **ROC-AUC, PR-AUC** (primary)
- Confusion matrix
- Feature importance (RandomForest) — for interpretability

**5.4. Model Comparison Table** (template to fill in the report)

| Model | Imbalance Strategy | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|---|
| J48 | Baseline | | | | | |
| J48 | SMOTE | | | | | |
| RandomForest | Baseline | | | | | |
| RandomForest | SMOTE | | | | | |
| RandomForest | Cost-Sensitive | | | | | |
| NaiveBayes | Baseline | | | | | |
| NaiveBayes | SMOTE | | | | | |

**5.5. Final Model Selection**
- Based on F1 + ROC-AUC on test set.
- Evaluate interpretability vs performance trade-off.
- Save model with `weka.core.SerializationHelper.write()` → `.model` file.

---

### Phase 6 — Clustering

**6.1. Pre-clustering**
- Remove `Attrition_Flag`, `CLIENTNUM`.
- Apply `Normalize` (min-max).
- Optional: PCA to 8-10 components for speedup with large dataset.

**6.2. Algorithm: SimpleKMeans**
- Run `k = 2..8`.
- Determine optimal k via:
  - **Elbow method** (WCSS — Within-Cluster Sum of Squares)
  - **Silhouette score**
- Expected k = 3 or 4.
- `seed = 42`, `numIterations = 500`, `distanceFunction = EuclideanDistance`.

**6.3. EM Comparison** (optional, bonus)
- EM yields probabilistic membership → "customer X belongs to cluster A with probability 0.87".

**6.4. Cluster Interpretation**

After obtaining centroids, write personas:

| Cluster | Suggested Name | Characteristics | Recommendation |
|---|---|---|---|
| C1 | Premium Loyal | High credit, low utilization, high transactions | Loyalty rewards, upsell |
| C2 | High-Risk Spenders | High utilization, declining transactions | Proactive retention, financial counseling |
| C3 | Dormant | Low transactions, high inactive months | Reactivation campaign |
| C4 (if applicable) | Average Active | Mid-range across all metrics | Nurture, monitor |

**6.5. Cluster-based Anomaly Detection**
- Compute Euclidean distance from each point to its cluster's centroid.
- Points with distance > μ + 3σ → flagged as **anomalies**.
- Combine with Z-score and IQR results from Phase 2.

---

### Phase 7 — Association Rule Mining

**7.1. Pipeline (critical — Apriori needs nominal data)**

**Step 1**: Discretize numerical features
- Filter: `weka.filters.unsupervised.attribute.Discretize`
- Strategy: equal-frequency, **3 bins** (low / medium / high)
- Apply to: `Credit_Limit`, `Avg_Utilization_Ratio`, `Total_Trans_Amt`, `Total_Trans_Ct`, `Risk_Score`, `Months_Inactive_12_mon`

**Step 2**: Keep existing nominals
- `Income_Category`, `Card_Category`, `Customer_Tier`, `Gender`, `Education_Level`, `Marital_Status`, `Attrition_Flag`

**Step 3**: Save as `clean_assoc.arff`

**7.2. Run Apriori**
- `minSupport = 0.05` (5%)
- `minConfidence = 0.7` (70%)
- `numRules = 50`
- Sort by `lift` (keep rules with lift > 1.2)

**7.3. Rule Filtering**
- Keep only rules with `Attrition_Flag` on RHS → business-meaningful.
- Categorize: churn-leading rules vs retention-leading rules.

**7.4. Visualization**
- Sortable rules table: LHS, RHS, Support, Confidence, Lift.
- Scatter plot: x = support, y = confidence, color = lift.
- Optional: rule dependency graph.

---

### Phase 8 — Insight Extraction & Recommendations

Each insight has a 3-part structure: **Discovery → Evidence → Recommendation**.

**Example Insight 1**:
- **Discovery**: Customers with `Avg_Utilization_Ratio > 0.7` churn at 2.4× the average rate.
- **Evidence**: Apriori rule `{Util=high, Inactive=high} → Attrited` (support 8%, confidence 78%, lift 4.8). Confirmed by RandomForest feature importance (utilization ranks top 3).
- **Recommendation**: Trigger alert when utilization > 70% for 2 consecutive months → offer credit limit increase or financial counseling.

**Example Insight 2**:
- **Discovery**: The Premium Loyal cluster has the highest credit limits but the lowest utilization.
- **Evidence**: Premium centroid: Credit_Limit ≈ $20K, Utilization ≈ 0.15.
- **Recommendation**: This is an under-monetized high-spending cohort → push premium credit products, travel rewards, investment offerings.

**Report requirement**: minimum **5 insights** in this format.

---

## 5. System Architecture & Data Flow

### 5.1. High-level diagram

```
┌─────────────────┐       ┌──────────────────────┐       ┌────────────────┐
│  Next.js (UI)   │ HTTP  │ Java REST Backend    │  JDBC │  PostgreSQL    │
│  Tailwind +     │◄─────►│ Spring Boot + Weka   │◄─────►│  (Neon)        │
│  shadcn/ui +    │ JSON  │  - Loaded models     │       │                │
│  Recharts       │       │  - Cached results    │       │                │
└─────────────────┘       └──────────────────────┘       └────────────────┘
                                    ▲
                                    │ load on startup
                                    │
                            ┌───────┴────────┐
                            │ models/        │
                            │  rf.model      │
                            │  kmeans.model  │
                            │  rules.json    │
                            └────────────────┘
                                    ▲
                                    │ written by
                                    │
                          ┌─────────┴──────────┐
                          │ TrainPipeline.java │  ← runs offline
                          │ (Java + Weka)      │
                          └────────────────────┘
```

### 5.2. Architectural Philosophy

**Train offline / Inference online**:
- A single Java script `TrainPipeline.java` reads CSV → preprocesses → trains → serializes models to `models/*.model` + `rules.json` + inserts enriched data into Postgres.
- On Spring Boot startup, the app loads `.model` files into RAM via `SerializationHelper.read()`.
- Each `/predict` request takes only a few milliseconds (no retraining).

**Clean separation**:
- The backend has minimal data-mining logic — only **inference + data serving**.
- The mining pipeline is a separate module, run on a schedule (cron) or manually when new data arrives.

### 5.3. REST API Endpoints

| Method | Endpoint | Purpose | Response |
|---|---|---|---|
| GET | `/api/overview` | Dashboard KPIs | `{totalCustomers, churnRate, avgRisk, attritedCount}` |
| GET | `/api/eda/distribution?col=Credit_Limit&bins=20` | Single column distribution | `{bins:[], counts:[]}` |
| GET | `/api/eda/correlation` | Correlation matrix | `{cols:[], matrix:[][]}` |
| GET | `/api/eda/churn-by?dim=Income_Category` | Churn rate by dimension | `[{group, churnRate, count}]` |
| GET | `/api/customers?page=1&size=20&filter=...` | Paginated list | `{total, items:[]}` |
| GET | `/api/customers/{id}` | Single customer detail | Full row + cluster + risk |
| GET | `/api/clusters` | Cluster summaries | `[{id, size, centroid, persona}]` |
| GET | `/api/clusters/{id}/customers` | Customers in cluster | `[...]` |
| GET | `/api/rules?minLift=1.2` | Association rules | `[{lhs, rhs, sup, conf, lift}]` |
| POST | `/api/predict` | Churn prediction | body: customer features → `{churnProb, label, riskScore, similarCluster, topFeatures}` |
| GET | `/api/insights` | Saved insights | `[{title, discovery, evidence, recommendation}]` |
| GET | `/api/anomalies` | Abnormal customers | `[{client_num, reason, score}]` |

---

## 6. Database Design (PostgreSQL)

```sql
-- =====================================================
-- CUSTOMERS TABLE (raw + derived features)
-- =====================================================
CREATE TABLE customers (
  client_num                BIGINT PRIMARY KEY,
  attrition_flag            VARCHAR(20),

  -- Demographics
  customer_age              INT,
  gender                    CHAR(1),
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

  -- Derived features
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

-- =====================================================
-- CLUSTERS TABLE (pre-computed)
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
-- ASSOCIATION RULES TABLE (pre-computed)
-- =====================================================
CREATE TABLE rules (
  rule_id        SERIAL PRIMARY KEY,
  lhs            TEXT,
  rhs            TEXT,
  support        NUMERIC(6,4),
  confidence     NUMERIC(6,4),
  lift           NUMERIC(8,4),
  category       VARCHAR(30)  -- 'churn' / 'retention'
);

CREATE INDEX idx_rules_lift ON rules(lift DESC);

-- =====================================================
-- INSIGHTS TABLE (hand-written by the team)
-- =====================================================
CREATE TABLE insights (
  insight_id     SERIAL PRIMARY KEY,
  title          VARCHAR(200),
  discovery      TEXT,
  evidence       TEXT,
  recommendation TEXT,
  category       VARCHAR(30),  -- 'churn' / 'cluster' / 'risk' / 'opportunity'
  priority       INT DEFAULT 1
);

-- =====================================================
-- PREDICTIONS LOG (logs every prediction call)
-- =====================================================
CREATE TABLE predictions (
  prediction_id   SERIAL PRIMARY KEY,
  ts              TIMESTAMPTZ DEFAULT NOW(),
  input_json      JSONB,
  predicted_label VARCHAR(20),
  churn_prob      NUMERIC(6,4),
  cluster_id      INT,
  model_used      VARCHAR(30)
);
```

---

## 7. Backend (Java + Weka + Spring Boot)

### 7.1. Stack
- **Java 17** (LTS)
- **Maven** (dependency management)
- **Weka 3.8.6** (data mining)
- **Spring Boot 3.x** (REST framework)
- **PostgreSQL JDBC driver**
- **Spring Data JPA** (ORM)
- **Lombok** (reduce boilerplate)

### 7.2. Project structure

```
backend/
├── pom.xml
├── data/
│   ├── raw/BankChurners.csv
│   ├── processed/clean.arff
│   └── processed/clean_assoc.arff
├── models/
│   ├── j48.model
│   ├── rf.model
│   ├── nb.model
│   ├── kmeans.model
│   └── rules.json
├── src/main/java/com/dm/
│   ├── DmApplication.java               # @SpringBootApplication
│   ├── config/
│   │   └── ModelConfig.java             # load models on startup
│   ├── controller/
│   │   ├── OverviewController.java
│   │   ├── EdaController.java
│   │   ├── CustomerController.java
│   │   ├── ClusterController.java
│   │   ├── RuleController.java
│   │   ├── PredictController.java
│   │   └── InsightController.java
│   ├── service/
│   │   ├── DataLoader.java              # CSV/ARFF loading
│   │   ├── Preprocessor.java            # missing, outlier, scaling
│   │   ├── FeatureEngineer.java         # 6 derived features
│   │   ├── ClassificationService.java
│   │   ├── ClusteringService.java
│   │   ├── AssociationService.java
│   │   ├── AnomalyService.java
│   │   ├── InsightService.java
│   │   └── ReportService.java
│   ├── pipeline/
│   │   └── TrainPipeline.java           # main() — runs offline
│   ├── repository/                      # JPA repos
│   ├── entity/                          # JPA entities
│   └── dto/                             # request/response DTOs
└── src/main/resources/
    ├── application.yml                  # DB config, model paths
    └── insights.json                    # initial insights
```

### 7.3. Module responsibilities

| Module | Responsibility |
|---|---|
| `DataLoader` | CSV → `Instances`, save ARFF, load ARFF |
| `Preprocessor` | Missing imputation, outlier detection, scaling, encoding |
| `FeatureEngineer` | Build the 6 derived features |
| `ClassificationService` | Train/load J48, RF, NB; predict; evaluate |
| `ClusteringService` | Train/load KMeans; assign cluster; compute centroid |
| `AssociationService` | Discretize, run Apriori, export rules JSON |
| `AnomalyService` | Z-score, IQR, cluster-distance flags |
| `InsightService` | Generate insight metadata, query DB |
| `ReportService` | Export reports as CSV/PDF |

---

## 8. Frontend (Next.js)

### 8.1. Stack
- **Next.js 14** (App Router)
- **Tailwind CSS** (styling)
- **shadcn/ui** (component library: Card, Table, Tabs, Sheet, Form, Dialog)
- **Recharts** (Bar, Line, Pie, Scatter, custom Heatmap)
- **TanStack Query** (data fetching + caching)
- **React Hook Form + Zod** (form validation)
- **Lucide Icons**

### 8.2. Pages

| Path | Purpose | Key components |
|---|---|---|
| `/` | Overview Dashboard | 4 KPI cards + churn donut + risk distribution + tier breakdown |
| `/eda` | Exploratory Analysis | Column dropdown → histogram + boxplot + correlation heatmap |
| `/customers` | Customer table | DataTable filter/sort/paginate, click row → detail drawer |
| `/clusters` | Segments | 2D PCA scatter colored by cluster + persona cards + comparison table |
| `/rules` | Association Rules | Sortable rules table + sup/conf/lift scatter + min-lift filter |
| `/predict` | Churn prediction | 13-field form → POST `/api/predict` → result + explanation |
| `/insights` | Business Insights | Accordion of 5+ insights as Discovery/Evidence/Recommendation |

### 8.3. UX for `/predict` (the most important demo page)
- Form split into 3 sections: **Demographics / Account / Transactional**.
- **"Load sample customer"** button → quick fill from DB for demos.
- Result display:
  - **Churn probability gauge** (0-100%)
  - **Label badge** (Existing / Attrited)
  - **Top 3 contributing features** (from feature importance or SHAP if time permits)
  - **Nearest cluster** + persona
  - **Recommendation** based on rules + cluster

### 8.4. Design Principles
- **Minimal & professional**: grayscale + 1 accent color (blue or emerald).
- **Dark mode** from day one (use shadcn CSS variables).
- **Responsive**: desktop-first, tablet-usable.
- **Loading skeletons** for every data fetch.
- **Clear empty states**.

---

## 9. Reproducibility & Quality Controls

| Item | Setting |
|---|---|
| Random seed | `42` across the entire codebase |
| Train/Test split | Stratified 80/20 |
| Cross-validation | 10-fold on training set |
| Class imbalance | SMOTE on train only + cost-sensitive comparison |
| Primary metric | F1 (Attrited class) + ROC-AUC |
| Model versioning | `models/<algo>_v<YYYYMMDD>.model` + log in `MODELS.md` |
| Determinism | Lock Weka 3.8.6 in `pom.xml`, lock npm package versions |
| Code style | Google Java Style + ESLint/Prettier for frontend |
| Testing | JUnit 5 for service layer; Playwright for E2E (optional) |

---

## 10. Deliverables

| # | Deliverable | Format |
|---|---|---|
| 1 | Cleaned dataset | `clean.csv` + `clean.arff` + `clean_assoc.arff` |
| 2 | Trained models | `models/*.model` + `rules.json` |
| 3 | Backend code | Java/Maven repository |
| 4 | Frontend code | Next.js repository |
| 5 | Database | `schema.sql` + `seed.sql` |
| 6 | Technical report | DOCX/PDF — 30-40 pages following the 8 phases |
| 7 | Demo slides | 15-20 PPTX slides |
| 8 | Demo video | 5-7 minute walkthrough |
| 9 | README | Full setup steps + screenshots |
| 10 | Live demo (optional) | Vercel + Render + Neon deployment |

---

## 11. Self-Assessment Criteria

| Criterion | Suggested weight | How to demonstrate |
|---|---|---|
| Complete 8-phase pipeline | 20% | All sections in report, no skips |
| Preprocessing quality | 10% | Correct SMOTE, scaling, outlier handling |
| Feature Engineering | 15% | 6 meaningful derived features, no leakage |
| Algorithm diversity + comparison | 15% | 3+ classifiers, multi-metric evaluation |
| Business insights | 15% | 5+ Discovery/Evidence/Recommendation insights |
| Visualization | 10% | Smooth interactive dashboard, polished charts |
| System integration | 10% | Java ↔ Next.js ↔ DB working end-to-end |
| Presentation & demo | 5% | Clear slides + video, coherent narrative |

---

## 12. 8-Week Roadmap

| Week | Tasks | Output |
|---|---|---|
| **1** | Repo setup (mono-repo or split), data exploration, preliminary EDA in Weka Explorer | EDA notebook + Phase 1 report |
| **2** | Preprocessing + Feature Engineering in Java | `clean.arff`, `clean_assoc.arff` |
| **3** | Classification: train 3 models, tune, evaluate | Comparison table + `*.model` files |
| **4** | Clustering + Anomaly Detection | `kmeans.model` + persona descriptions |
| **5** | Apriori + Insight Extraction | `rules.json` + 5 insights |
| **6** | Spring Boot REST API + DB seed | Backend on `localhost:8080`, tested via Postman |
| **7** | Next.js dashboard (7 pages) | Frontend on `localhost:3000`, wired to backend |
| **8** | Deploy (Neon DB + Vercel + Render), write report, slides, video | Submit |

---

## 13. Risk Management

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Apriori produces no meaningful rules | Medium | High | Increase discretization bins, lower minSupport to 0.03, try FP-Growth |
| KMeans clusters don't separate well | Medium | High | PCA before clustering, try EM or HierarchicalClusterer |
| RandomForest overfits | Low | Medium | Cap `maxDepth`, monitor OOB error |
| Java + Weka deployment is hard | Medium | Medium | Build a fat JAR (Maven Shade), deploy on Render/Railway |
| Frontend slow when rendering 10K rows | Medium | Low | Server-side pagination, virtual scrolling |
| Time pressure | High | High | Cut scope: drop Logistic, EM, video → keep core pipeline + dashboard |
| Team out-of-sync on code | Medium | High | Clear Git workflow, code review, short daily standups |

---

## 14. Appendix — Java Code Samples

### 14.1. TrainPipeline.java (runs offline)

```java
package com.dm.pipeline;

import weka.core.Instances;
import weka.core.SerializationHelper;
import weka.classifiers.Evaluation;
import weka.classifiers.trees.J48;
import weka.classifiers.trees.RandomForest;
import weka.classifiers.bayes.NaiveBayes;
import weka.clusterers.SimpleKMeans;
import weka.associations.Apriori;
import weka.filters.Filter;
import weka.filters.unsupervised.attribute.Normalize;
import weka.filters.supervised.instance.SMOTE;
import java.util.Random;

public class TrainPipeline {

  public static void main(String[] args) throws Exception {
    System.out.println("=== Step 1: Load & preprocess ===");
    Instances raw = DataLoader.loadCsv("data/raw/BankChurners.csv");
    Instances cleaned = Preprocessor.run(raw);
    Instances enriched = FeatureEngineer.run(cleaned);
    DataLoader.saveArff(enriched, "data/processed/clean.arff");

    System.out.println("=== Step 2: Train classifiers ===");
    Instances[] split = Splitter.stratified(enriched, 0.8, 42);
    Instances train = split[0], test = split[1];

    SMOTE smote = new SMOTE();
    smote.setInputFormat(train);
    Instances trainSmote = Filter.useFilter(train, smote);

    // J48
    J48 j48 = new J48();
    j48.setOptions(new String[]{"-C", "0.25", "-M", "2"});
    j48.buildClassifier(trainSmote);
    SerializationHelper.write("models/j48.model", j48);

    // RandomForest
    RandomForest rf = new RandomForest();
    rf.setNumIterations(200);
    rf.buildClassifier(trainSmote);
    SerializationHelper.write("models/rf.model", rf);

    // NaiveBayes
    NaiveBayes nb = new NaiveBayes();
    nb.buildClassifier(trainSmote);
    SerializationHelper.write("models/nb.model", nb);

    // Evaluate on test set
    Evaluation eval = new Evaluation(train);
    eval.evaluateModel(rf, test);
    System.out.println("RF F1 (Attrited): " + eval.fMeasure(1));
    System.out.println("RF AUC: " + eval.areaUnderROC(1));

    // 10-fold CV
    Evaluation cv = new Evaluation(train);
    cv.crossValidateModel(rf, train, 10, new Random(42));
    System.out.println("RF 10-fold CV F1: " + cv.fMeasure(1));

    System.out.println("=== Step 3: Clustering ===");
    Instances forCluster = AttributeRemover.remove(enriched,
        "Attrition_Flag", "CLIENTNUM");

    Normalize norm = new Normalize();
    norm.setInputFormat(forCluster);
    Instances scaled = Filter.useFilter(forCluster, norm);

    SimpleKMeans km = new SimpleKMeans();
    km.setNumClusters(3);
    km.setSeed(42);
    km.setMaxIterations(500);
    km.buildClusterer(scaled);
    SerializationHelper.write("models/kmeans.model", km);

    System.out.println("=== Step 4: Apriori ===");
    Instances forAssoc = DiscretizeAndKeepNominal.run(enriched);
    DataLoader.saveArff(forAssoc, "data/processed/clean_assoc.arff");

    Apriori ap = new Apriori();
    ap.setLowerBoundMinSupport(0.05);
    ap.setMinMetric(0.7);
    ap.setNumRules(50);
    ap.buildAssociations(forAssoc);
    RuleExporter.toJson(ap, "models/rules.json");

    System.out.println("=== Step 5: Seed Postgres ===");
    DatabaseSeeder.seed(enriched, km);

    System.out.println("=== DONE ===");
  }
}
```

### 14.2. PredictController.java

```java
package com.dm.controller;

import com.dm.dto.CustomerDTO;
import com.dm.dto.PredictResponse;
import org.springframework.web.bind.annotation.*;
import weka.classifiers.trees.RandomForest;
import weka.clusterers.SimpleKMeans;
import weka.core.Instance;
import weka.core.SerializationHelper;
import jakarta.annotation.PostConstruct;

@RestController
@RequestMapping("/api")
public class PredictController {

  private RandomForest rf;
  private SimpleKMeans km;

  @PostConstruct
  public void loadModels() throws Exception {
    this.rf = (RandomForest) SerializationHelper.read("models/rf.model");
    this.km = (SimpleKMeans) SerializationHelper.read("models/kmeans.model");
  }

  @PostMapping("/predict")
  public PredictResponse predict(@RequestBody CustomerDTO dto) throws Exception {
    Instance inst = DtoMapper.toInstance(dto);
    double[] probs = rf.distributionForInstance(inst);
    int cluster = km.clusterInstance(inst);

    return PredictResponse.builder()
        .churnProb(probs[1])
        .label(probs[1] > 0.5 ? "Attrited" : "Existing")
        .cluster(cluster)
        .recommendation(buildRecommendation(probs[1], cluster))
        .build();
  }

  private String buildRecommendation(double prob, int cluster) {
    if (prob > 0.7) return "Escalate to retention team immediately";
    if (prob > 0.4) return "Add to monitoring watchlist";
    return "Stable customer — eligible for upsell";
  }
}
```

---

## SUMMARY

The system is a complete data mining pipeline taking raw CSV all the way to an interactive dashboard, walking through the standard 8 phases of CRISP-DM, applying 4 algorithm families (classification, clustering, association rules, anomaly detection) on a credit card dataset, integrated end-to-end through a **train-offline / inference-online** architecture with Java + Weka as the core mining engine, Spring Boot as the REST API, and Next.js as the UI. The final output is not just a model but **a demonstrable product** with a 7-page dashboard, form-based churn prediction, and 5+ data-grounded business insights.
