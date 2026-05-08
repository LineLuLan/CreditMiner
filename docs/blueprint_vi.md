# BLUEPRINT — Hệ thống Khai phá Hành vi Tài chính & Phát hiện Rủi ro Khách hàng

> **Đồ án môn học · Data Mining**
> **Backend:** Java + Weka + Spring Boot
> **Frontend:** Next.js + Tailwind CSS + shadcn/ui + Recharts
> **Database:** PostgreSQL (Neon)

---

## MỤC LỤC

1. Tổng quan dự án
2. Dataset
3. Mục tiêu Data Mining
4. Pipeline 8 phase
5. Kiến trúc hệ thống & luồng dữ liệu
6. Thiết kế cơ sở dữ liệu
7. Backend (Java + Weka + Spring Boot)
8. Frontend (Next.js)
9. Reproducibility & Quality Controls
10. Deliverables
11. Tiêu chí tự chấm
12. Roadmap 8 tuần
13. Quản lý rủi ro
14. Phụ lục: snippet Java mẫu

---

## 1. Tổng quan dự án

### 1.1. Tên đề tài
**Hệ thống Khai phá Dữ liệu Hành vi Tài chính và Phát hiện Rủi ro Khách hàng Thẻ tín dụng**

### 1.2. Bài toán nghiệp vụ
Ngân hàng phát hành thẻ tín dụng phải đối mặt với 4 câu hỏi quan trọng:

1. **Ai là khách hàng sắp rời bỏ?** → bài toán **Classification** (dự đoán churn)
2. **Khách hàng có thể được phân thành những nhóm tiềm ẩn nào?** → bài toán **Clustering**
3. **Hành vi tài chính nào dẫn đến rủi ro?** → bài toán **Association Rule Mining**
4. **Khách hàng nào có hành vi bất thường?** → bài toán **Anomaly Detection**

Hệ thống không chỉ trả lời 4 câu hỏi trên mà còn cung cấp một **dashboard tương tác** giúp phân tích viên khám phá dữ liệu, tra cứu phân khúc, duyệt rule, và **dự đoán churn cho từng khách hàng** thông qua form input.

### 1.3. Giá trị tạo ra
- **Giảm tỷ lệ churn** thông qua cảnh báo sớm và chiến dịch giữ chân.
- **Tăng doanh thu** bằng cách upsell đúng phân khúc cao cấp.
- **Giảm rủi ro tín dụng** thông qua phát hiện hành vi bất thường.
- **Cá nhân hóa trải nghiệm** dựa trên cluster persona.

### 1.4. Đầu ra cuối cùng
Một hệ thống full-stack hoàn chỉnh gồm:
- Pipeline data mining tự động (Java)
- REST API phục vụ inference (Spring Boot)
- Dashboard 7 trang tương tác (Next.js)
- Cơ sở dữ liệu lưu trữ KH, cluster, rule, insight (PostgreSQL/Neon)
- Báo cáo kỹ thuật + slide demo + video walkthrough

---

## 2. Dataset

### 2.1. Nguồn
**Credit Card Customers Dataset** — Sakshi Goyal (Kaggle).
URL: `https://www.kaggle.com/datasets/sakshigoyal7/credit-card-customers`

### 2.2. Đặc điểm
- **10,127 dòng × 23 cột**
- **Mục tiêu**: cột `Attrition_Flag` — nhị phân (Existing Customer / Attrited Customer)
- **Phân phối lớp**:
  - Existing Customer: ~83.93% (8,500 dòng)
  - Attrited Customer: ~16.07% (1,627 dòng)
- **Mất cân bằng**: ratio ~5:1 → bắt buộc xử lý imbalance
- **Định dạng gốc**: CSV

### 2.3. Schema chi tiết các cột sẽ sử dụng

| Loại | Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|---|
| ID | `CLIENTNUM` | int | Mã khách hàng (drop khi train, dùng làm primary key) |
| Target | `Attrition_Flag` | nominal | Existing / Attrited |
| Demographics | `Customer_Age` | int | Tuổi khách hàng |
| | `Gender` | nominal | M / F |
| | `Dependent_count` | int | Số người phụ thuộc |
| | `Education_Level` | nominal | Uneducated, High School, College, Graduate, Post-Graduate, Doctorate, Unknown |
| | `Marital_Status` | nominal | Single, Married, Divorced, Unknown |
| | `Income_Category` | nominal | Less than $40K → $120K+, Unknown |
| Account | `Card_Category` | nominal | Blue, Silver, Gold, Platinum |
| | `Months_on_book` | int | Tháng làm khách hàng |
| | `Total_Relationship_Count` | int | Số sản phẩm đang dùng |
| | `Months_Inactive_12_mon` | int | Số tháng không hoạt động trong 12 tháng |
| | `Contacts_Count_12_mon` | int | Số lần liên hệ ngân hàng |
| Financial | `Credit_Limit` | numeric | Hạn mức tín dụng |
| | `Total_Revolving_Bal` | numeric | Dư nợ quay vòng |
| | `Avg_Open_To_Buy` | numeric | Tín dụng còn lại |
| | `Avg_Utilization_Ratio` | numeric (0-1) | Tỷ lệ sử dụng tín dụng |
| Transactional | `Total_Amt_Chng_Q4_Q1` | numeric | Tỷ lệ thay đổi số tiền giao dịch Q4 vs Q1 |
| | `Total_Trans_Amt` | numeric | Tổng số tiền giao dịch |
| | `Total_Trans_Ct` | int | Tổng số giao dịch |
| | `Total_Ct_Chng_Q4_Q1` | numeric | Tỷ lệ thay đổi số lượng giao dịch Q4 vs Q1 |

### 2.4. Cột cần loại bỏ
Dataset gốc có 2 cột "Naive Bayes Classifier..." ở cuối — đây là kết quả dự đoán từ một mô hình khác, **gây leakage** → drop ngay từ bước load.

### 2.5. Giá trị `Unknown`
Các cột categorical chứa giá trị `Unknown` → coi như missing value, xử lý bằng mode imputation.

---

## 3. Mục tiêu Data Mining (4 bài toán)

| # | Bài toán | Thuật toán dùng | Kết quả mong đợi |
|---|---|---|---|
| 1 | **Classification** — Dự đoán churn | J48, RandomForest, NaiveBayes, Logistic | Mô hình `.model` đạt F1 ≥ 0.75 trên lớp Attrited |
| 2 | **Clustering** — Phân khúc | SimpleKMeans (k=3..6), so sánh EM | 3-4 persona có nghĩa kinh doanh |
| 3 | **Association Rules** | Apriori (sau discretize) | 30+ rule với lift > 1.2 |
| 4 | **Anomaly Detection** | Z-score + IQR + Cluster distance | Flag ~3-5% khách hàng bất thường |

---

## 4. Pipeline Data Mining 8 phase

### Phase 1 — Data Understanding

**Mục tiêu**: Hiểu rõ dữ liệu trước khi xử lý.

**Các bước**:
- Đếm số dòng, số cột, kiểm tra schema.
- Thống kê mô tả: mean, median, std, min, max, missing count, unique count cho mỗi cột.
- Phân loại biến: numerical / categorical / ordinal / binary (ghi rõ trong báo cáo).
- Phân tích phân phối target → biểu đồ tỷ lệ Attrited/Existing.
- Phát hiện sớm các bất thường: giá trị `Unknown`, outlier rõ rệt.

**Output**: Báo cáo Phase 1 + bảng describe.

---

### Phase 2 — Data Preprocessing

**2.1. Xử lý Missing Values**
- Đếm null cho mỗi cột.
- Coi `Unknown` ở `Education_Level`, `Marital_Status`, `Income_Category` là missing.
- **Chiến lược**:
  - Categorical → mode imputation
  - Numerical → median imputation
- Weka filter: `weka.filters.unsupervised.attribute.ReplaceMissingValues`.

**2.2. Xử lý Duplicates**
- Kiểm tra trùng lặp theo `CLIENTNUM`.
- Drop nếu có (dataset này hầu như không có duplicate).

**2.3. Outlier Detection**
- Áp dụng cho các cột tài chính quan trọng: `Credit_Limit`, `Total_Trans_Amt`, `Avg_Utilization_Ratio`, `Total_Revolving_Bal`.
- **Phương pháp**:
  - Z-score: |z| > 3
  - IQR: ngoài khoảng [Q1 − 1.5×IQR, Q3 + 1.5×IQR]
- **Quan trọng**: KHÔNG xóa outlier ngay — outlier tài chính có thể là tín hiệu rủi ro thật. Đánh dấu cờ `is_outlier` lưu DB để dùng lại ở Anomaly Detection.

**2.4. Scaling & Normalization**
- **Min-max Normalize** (`Normalize` filter): cho Clustering và các thuật toán dựa trên khoảng cách.
- **Z-score Standardize** (`Standardize` filter): cho NaiveBayes (Gaussian assumption), Logistic.
- **Tree-based** (J48, RandomForest): KHÔNG cần scale — ghi rõ trong báo cáo để thể hiện hiểu biết.

**2.5. Encoding Categorical**
- Trong file ARFF, Weka tự xử lý nominal.
- Khi gọi từ Java code (form input từ frontend) → dùng `NominalToBinary` (one-hot) cho Logistic.

**2.6. Class Imbalance Handling** ⚠️ **rất quan trọng**

Có 3 chiến lược, **so sánh cả 3** trong báo cáo:
- **Baseline**: không xử lý gì
- **SMOTE**: `weka.filters.supervised.instance.SMOTE` — chỉ áp dụng trên TRAINING set, **KHÔNG SMOTE test set** (sẽ làm sai metric)
- **Cost-Sensitive**: bọc classifier bằng `CostSensitiveClassifier` với cost matrix [[0,1],[5,0]] (FN tốn gấp 5 FP)

**Metric chính**: **F1-score của lớp Attrited + ROC-AUC + PR-AUC**.
**KHÔNG dùng Accuracy làm metric chính** vì với baseline 84:16, model dự đoán toàn "Existing" cũng đạt 84% accuracy nhưng vô dụng.

---

### Phase 3 — Feature Engineering ⭐

Tạo 6 derived features bổ sung vào dataset:

| # | Feature | Công thức | Ý nghĩa |
|---|---|---|---|
| 1 | `Utilization_Score` | `Total_Revolving_Bal / Credit_Limit` | Tự tính lại để đối chiếu với `Avg_Utilization_Ratio` |
| 2 | `Spending_Intensity` | `Total_Trans_Amt / Total_Trans_Ct` | Trung bình chi tiêu mỗi giao dịch |
| 3 | `Engagement_Score` | `Total_Trans_Ct / Months_on_book` | Mức độ hoạt động chuẩn hóa theo tenure |
| 4 | `Customer_Value_Score` | `0.4·z(Trans_Amt) + 0.3·z(Credit_Limit) + 0.2·z(Tenure) − 0.1·z(Inactive_Months)` | Điểm giá trị tổng hợp |
| 5 | `Risk_Score` | `0.4·Utilization + 0.3·(Inactive/12) + 0.3·(1 − Engagement_norm)` | Điểm rủi ro tổng hợp |
| 6 | `Customer_Tier` | Discretize `Customer_Value_Score` thành Bronze/Silver/Gold/Platinum (4 quartile) | Dùng làm input cho Apriori |

**Lưu ý quan trọng**: Risk_Score và Customer_Value_Score **KHÔNG sử dụng `Attrition_Flag`** trong công thức → tránh data leakage. Phải ghi rõ trong báo cáo.

---

### Phase 4 — Exploratory Data Analysis (EDA)

**4.1. Univariate Analysis**
- Histogram + density plot cho: `Customer_Age`, `Credit_Limit`, `Total_Trans_Amt`, `Avg_Utilization_Ratio`.
- Bar chart cho: `Income_Category`, `Card_Category`, `Education_Level`.

**4.2. Bivariate Analysis**
- Boxplot từng feature numeric chia theo `Attrition_Flag`.
- Tỷ lệ churn theo: `Income_Category`, `Card_Category`, `Customer_Tier`, `Gender`.

**4.3. Correlation Analysis**
- Pearson correlation heatmap cho các feature numeric.
- Xác định cặp feature có |r| > 0.7 để cân nhắc loại 1 (multicollinearity).

**4.4. PCA Visualization**
- Giảm chiều xuống 2D bằng PCA.
- Scatter plot, màu theo `Attrition_Flag` → trực quan hóa khả năng phân lớp.

---

### Phase 5 — Classification

**5.1. Data Split**
- Stratified 80/20 train/test.
- `random_seed = 42` để tái tạo được.
- 10-fold cross-validation trên train set để tune hyperparameter.

**5.2. Models & Hyperparameters**

| Model | Hyperparameter cần tune |
|---|---|
| **J48** (C4.5) | `confidenceFactor ∈ {0.1, 0.25, 0.5}`, `minNumObj ∈ {2, 5, 10}` |
| **RandomForest** | `numIterations ∈ {100, 200, 500}`, `maxDepth ∈ {unlimited, 10, 20}` |
| **NaiveBayes** | `useKernelEstimator ∈ {true, false}` |
| **Logistic** (baseline) | `ridge ∈ {1e-8, 1e-4, 1e-2}` |

**5.3. Evaluation Metrics**
- Accuracy (chỉ tham khảo)
- **Precision, Recall, F1 cho lớp Attrited** (chính)
- **ROC-AUC, PR-AUC** (chính)
- Confusion matrix
- Feature importance (RandomForest) — dùng để giải thích model

**5.4. Model Comparison Table** (mẫu để điền vào báo cáo)

| Model | Imbalance Strategy | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|---|
| J48 | Baseline | | | | | |
| J48 | SMOTE | | | | | |
| RandomForest | Baseline | | | | | |
| RandomForest | SMOTE | | | | | |
| RandomForest | Cost-Sensitive | | | | | |
| NaiveBayes | Baseline | | | | | |
| NaiveBayes | SMOTE | | | | | |

**5.5. Lựa chọn Final Model**
- Dựa trên F1 + ROC-AUC trên test set.
- Đánh giá trade-off interpretability vs performance.
- Save model bằng `weka.core.SerializationHelper.write()` → file `.model`.

---

### Phase 6 — Clustering

**6.1. Pre-clustering**
- Loại bỏ `Attrition_Flag`, `CLIENTNUM`.
- Áp dụng `Normalize` (min-max).
- Tùy chọn: PCA giảm còn 8-10 components để tăng tốc với dataset lớn.

**6.2. Algorithm: SimpleKMeans**
- Chạy với `k = 2..8`.
- Xác định k tối ưu bằng:
  - **Elbow method** (WCSS — Within-Cluster Sum of Squares)
  - **Silhouette score**
- Kỳ vọng k = 3 hoặc 4.
- `seed = 42`, `numIterations = 500`, `distanceFunction = EuclideanDistance`.

**6.3. So sánh với EM** (optional, để gia tăng điểm)
- EM đưa ra phân phối xác suất → cho biết khách hàng "thuộc cluster nào với xác suất bao nhiêu".

**6.4. Cluster Interpretation**

Sau khi có centroid, viết persona cho từng cluster:

| Cluster | Tên gợi ý | Đặc điểm | Khuyến nghị |
|---|---|---|---|
| C1 | Premium Loyal | Credit cao, utilization thấp, trans cao | Loyalty rewards, upsell |
| C2 | High-Risk Spenders | Utilization cao, trans giảm | Proactive retention, tư vấn tài chính |
| C3 | Dormant | Trans thấp, inactive cao | Reactivation campaign |
| C4 (nếu có) | Average Active | Mid mọi chỉ số | Nurture, monitoring |

**6.5. Anomaly Detection từ Cluster**
- Tính khoảng cách Euclidean từ mỗi điểm đến centroid của cluster nó thuộc.
- Điểm có distance > μ + 3σ → đánh dấu là **anomaly**.
- Kết hợp với Z-score và IQR đã tính ở Phase 2.

---

### Phase 7 — Association Rule Mining

**7.1. Pipeline (rất quan trọng — Apriori cần dữ liệu nominal)**

**Bước 1**: Discretize numerical features
- Filter: `weka.filters.unsupervised.attribute.Discretize`
- Strategy: equal-frequency, **3 bins** (low / medium / high)
- Áp dụng cho: `Credit_Limit`, `Avg_Utilization_Ratio`, `Total_Trans_Amt`, `Total_Trans_Ct`, `Risk_Score`, `Months_Inactive_12_mon`

**Bước 2**: Giữ nominal sẵn có
- `Income_Category`, `Card_Category`, `Customer_Tier`, `Gender`, `Education_Level`, `Marital_Status`, `Attrition_Flag`

**Bước 3**: Save thành `clean_assoc.arff`

**7.2. Chạy Apriori**
- `minSupport = 0.05` (5%)
- `minConfidence = 0.7` (70%)
- `numRules = 50`
- Sort by `lift` (giữ rule có lift > 1.2)

**7.3. Rule Filtering**
- Chỉ giữ rule có `Attrition_Flag` ở vế phải (RHS) → rule có nghĩa kinh doanh.
- Phân loại: rule dẫn đến churn vs rule dẫn đến retention.

**7.4. Visualization**
- Bảng rules sortable: LHS, RHS, Support, Confidence, Lift.
- Scatter plot: x = support, y = confidence, color = lift.
- Optional: rule dependency graph.

---

### Phase 8 — Insight Extraction & Recommendations

Mỗi insight có cấu trúc 3 phần: **Discovery → Evidence → Recommendation**.

**Ví dụ insight 1**:
- **Discovery**: Khách hàng có `Avg_Utilization_Ratio > 0.7` có tỷ lệ churn cao gấp 2.4 lần trung bình.
- **Evidence**: Apriori rule `{Util=high, Inactive=high} → Attrited` (support 8%, confidence 78%, lift 4.8). Cũng được xác nhận bởi RandomForest feature importance (utilization xếp top 3).
- **Recommendation**: Trigger cảnh báo khi utilization > 70% kéo dài 2 tháng → đề xuất tăng credit limit hoặc tư vấn tài chính cá nhân.

**Ví dụ insight 2**:
- **Discovery**: Khách hàng Cluster Premium Loyal có Credit_Limit cao nhưng utilization thấp nhất.
- **Evidence**: Centroid cluster Premium: Credit_Limit ≈ $20K, Utilization ≈ 0.15.
- **Recommendation**: Đây là cohort có khả năng chi tiêu cao mà chưa được khai thác → push các sản phẩm tín dụng cao cấp, du lịch, đầu tư.

**Yêu cầu báo cáo**: tối thiểu **5 insight** dạng trên.

---

## 5. Kiến trúc hệ thống & luồng dữ liệu

### 5.1. Sơ đồ tổng quan

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
                          │ TrainPipeline.java │  ← chạy offline
                          │ (Java + Weka)      │
                          └────────────────────┘
```

### 5.2. Triết lý kiến trúc

**Train offline / Inference online**:
- Một script Java duy nhất `TrainPipeline.java` đọc CSV → preprocess → train → serialize models ra `models/*.model` + `rules.json` + insert dữ liệu đã enrich vào Postgres.
- Khi Spring Boot khởi động, nó load các file `.model` vào RAM bằng `SerializationHelper.read()`.
- Mỗi request `/predict` chỉ tốn vài millisecond (không train lại).

**Tách biệt rõ ràng**:
- Backend không có business logic phức tạp về data mining — chỉ **inference + serve data**.
- Pipeline mining tách thành module riêng, chạy theo lịch (cron) hoặc thủ công khi có dữ liệu mới.

### 5.3. REST API Endpoints

| Method | Endpoint | Mục đích | Response |
|---|---|---|---|
| GET | `/api/overview` | KPI dashboard | `{totalCustomers, churnRate, avgRisk, attritedCount}` |
| GET | `/api/eda/distribution?col=Credit_Limit&bins=20` | Phân phối 1 cột | `{bins:[], counts:[]}` |
| GET | `/api/eda/correlation` | Ma trận tương quan | `{cols:[], matrix:[][]}` |
| GET | `/api/eda/churn-by?dim=Income_Category` | Churn rate theo dimension | `[{group, churnRate, count}]` |
| GET | `/api/customers?page=1&size=20&filter=...` | List paginated | `{total, items:[]}` |
| GET | `/api/customers/{id}` | Chi tiết 1 khách | Full row + cluster + risk |
| GET | `/api/clusters` | Summary các cluster | `[{id, size, centroid, persona}]` |
| GET | `/api/clusters/{id}/customers` | Khách trong cluster | `[...]` |
| GET | `/api/rules?minLift=1.2` | Association rules | `[{lhs, rhs, sup, conf, lift}]` |
| POST | `/api/predict` | Dự đoán churn | body: customer features → `{churnProb, label, riskScore, similarCluster, topFeatures}` |
| GET | `/api/insights` | Insights đã lưu | `[{title, discovery, evidence, recommendation}]` |
| GET | `/api/anomalies` | Khách hàng bất thường | `[{client_num, reason, score}]` |

---

## 6. Thiết kế cơ sở dữ liệu (PostgreSQL)

```sql
-- =====================================================
-- BẢNG KHÁCH HÀNG (raw + derived features)
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
-- BẢNG CLUSTER (pre-computed)
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
-- BẢNG ASSOCIATION RULES (pre-computed)
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
-- BẢNG INSIGHTS (do team viết tay)
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
-- BẢNG PREDICTIONS LOG (lưu mỗi lần dự đoán)
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
- **Lombok** (giảm boilerplate)

### 7.2. Cấu trúc thư mục

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
│   │   └── TrainPipeline.java           # main() — chạy offline
│   ├── repository/                      # JPA repos
│   ├── entity/                          # JPA entities
│   └── dto/                             # request/response DTOs
└── src/main/resources/
    ├── application.yml                  # DB config, model paths
    └── insights.json                    # initial insights
```

### 7.3. Module trách nhiệm

| Module | Trách nhiệm |
|---|---|
| `DataLoader` | Đọc CSV → `Instances`, save ARFF, đọc ARFF |
| `Preprocessor` | Missing imputation, outlier detection, scaling, encoding |
| `FeatureEngineer` | Tạo 6 derived features |
| `ClassificationService` | Train/load J48, RF, NB; predict; evaluate |
| `ClusteringService` | Train/load KMeans; assign cluster; compute centroid |
| `AssociationService` | Discretize, run Apriori, export rules JSON |
| `AnomalyService` | Z-score, IQR, cluster distance flag |
| `InsightService` | Generate insight metadata, query DB |
| `ReportService` | Export báo cáo CSV/PDF |

---

## 8. Frontend (Next.js)

### 8.1. Stack
- **Next.js 14** (App Router)
- **Tailwind CSS** (styling)
- **shadcn/ui** (component library: Card, Table, Tabs, Sheet, Form, Dialog)
- **Recharts** (charts: Bar, Line, Pie, Scatter, Heatmap custom)
- **TanStack Query** (data fetching + caching)
- **React Hook Form + Zod** (form validation)
- **Lucide Icons**

### 8.2. Pages

| Path | Mục đích | Components chính |
|---|---|---|
| `/` | Overview Dashboard | 4 KPI cards + churn donut + risk distribution + tier breakdown |
| `/eda` | Exploratory Analysis | Dropdown column → histogram + boxplot + correlation heatmap |
| `/customers` | Bảng KH | DataTable filter/sort/paginate, click row → drawer chi tiết |
| `/clusters` | Phân khúc | Scatter PCA 2D màu theo cluster + cards mô tả persona + bảng so sánh |
| `/rules` | Association Rules | Bảng rules sortable + scatter sup/conf/lift + filter min lift |
| `/predict` | Dự đoán churn | Form 13 fields → POST `/api/predict` → kết quả + giải thích |
| `/insights` | Business Insights | Accordion 5+ insights dạng Discovery/Evidence/Recommendation |

### 8.3. UX cho `/predict` (page demo quan trọng nhất)
- Form chia 3 section: **Demographics / Account / Transactional**.
- Có nút **"Load sample customer"** → fill nhanh từ DB để demo.
- Kết quả hiển thị:
  - **Gauge xác suất churn** (0-100%)
  - **Badge label** (Existing / Attrited)
  - **Top 3 features đóng góp** (từ feature importance hoặc SHAP nếu có)
  - **Cluster gần nhất** + persona
  - **Recommendation** dựa trên rule + cluster

### 8.4. Design Principles
- **Minimal & professional**: dùng grayscale + 1 accent color (blue hoặc emerald).
- **Dark mode** từ đầu (sử dụng CSS variables shadcn).
- **Responsive**: ưu tiên desktop nhưng vẫn xài được trên tablet.
- **Loading skeletons** cho mọi data fetch.
- **Empty states** rõ ràng.

---

## 9. Reproducibility & Quality Controls

| Item | Setting |
|---|---|
| Random seed | `42` toàn bộ codebase |
| Train/Test split | Stratified 80/20 |
| Cross-validation | 10-fold trên train set |
| Class imbalance | SMOTE on train only + cost-sensitive comparison |
| Primary metric | F1 (Attrited class) + ROC-AUC |
| Model versioning | `models/<algo>_v<YYYYMMDD>.model` + log vào `MODELS.md` |
| Determinism | Lock Weka 3.8.6 trong `pom.xml`, lock npm package versions |
| Code style | Google Java Style + ESLint/Prettier cho frontend |
| Testing | JUnit 5 cho service layer; Playwright cho E2E (optional) |

---

## 10. Deliverables

| # | Deliverable | Định dạng |
|---|---|---|
| 1 | Cleaned dataset | `clean.csv` + `clean.arff` + `clean_assoc.arff` |
| 2 | Trained models | `models/*.model` + `rules.json` |
| 3 | Backend code | Java/Maven repository |
| 4 | Frontend code | Next.js repository |
| 5 | Database | `schema.sql` + `seed.sql` |
| 6 | Technical report | DOCX/PDF — 30-40 trang theo 8 phase |
| 7 | Slide demo | 15-20 slides PPTX |
| 8 | Demo video | 5-7 phút walkthrough |
| 9 | README | Setup steps đầy đủ + screenshots |
| 10 | Live demo (optional) | Deploy Vercel + Render + Neon |

---

## 11. Tiêu chí tự chấm

| Tiêu chí | Trọng số gợi ý | Cách thể hiện |
|---|---|---|
| Đầy đủ pipeline 8 phase | 20% | Báo cáo có đủ section, không skip |
| Preprocessing chất lượng | 10% | SMOTE, scaling, outlier handling đúng |
| Feature Engineering | 15% | 6 derived features có ý nghĩa, không leak target |
| Đa dạng thuật toán + so sánh | 15% | 3+ classifier, đánh giá đa metric |
| Insights nghiệp vụ | 15% | 5+ insight dạng Discovery/Evidence/Recommendation |
| Visualization | 10% | Dashboard tương tác mượt, biểu đồ đẹp |
| Tích hợp hệ thống | 10% | Java ↔ Next.js ↔ DB chạy thật end-to-end |
| Trình bày & demo | 5% | Slide + video rõ ràng, kể được câu chuyện |

---

## 12. Roadmap 8 tuần

| Tuần | Hạng mục | Output |
|---|---|---|
| **1** | Setup repo (mono-repo hoặc 2 repo), đọc dataset, EDA sơ bộ trên Weka Explorer | Notebook EDA + báo cáo Phase 1 |
| **2** | Preprocessing + Feature Engineering bằng Java code | `clean.arff`, `clean_assoc.arff` |
| **3** | Classification: train 3 models, tune, đánh giá | Bảng so sánh + `*.model` files |
| **4** | Clustering + Anomaly Detection | `kmeans.model` + persona descriptions |
| **5** | Apriori + Insight Extraction | `rules.json` + 5 insights |
| **6** | Spring Boot REST API + DB seed | Backend chạy ở `localhost:8080`, test bằng Postman |
| **7** | Next.js dashboard 7 page | Frontend chạy ở `localhost:3000`, kết nối backend |
| **8** | Deploy (Neon DB + Vercel + Render), viết báo cáo, slide, video | Submit |

---

## 13. Quản lý rủi ro

| Rủi ro | Khả năng | Tác động | Giảm thiểu |
|---|---|---|---|
| Apriori không ra rule có ý nghĩa | Trung bình | Cao | Tăng số bin discretize, lower minSupport xuống 0.03, thử FP-Growth |
| KMeans cluster không tách rõ | Trung bình | Cao | PCA trước khi cluster, thử EM, thử HierarchicalClusterer |
| RandomForest overfit | Thấp | Trung bình | Giới hạn `maxDepth`, monitor OOB error |
| Java + Weka deploy khó | Trung bình | Trung bình | Đóng gói JAR fat (Maven shade), deploy Render/Railway |
| Frontend chậm khi render bảng 10K dòng | Trung bình | Thấp | Pagination server-side, virtual scrolling |
| Thời gian gấp | Cao | Cao | Cắt scope: bỏ Logistic, EM, video → giữ pipeline + dashboard core |
| Team mất đồng bộ code | Trung bình | Cao | Git workflow rõ ràng, code review, daily standup ngắn |

---

## 14. Phụ lục — Snippet Java mẫu

### 14.1. TrainPipeline.java (chạy offline)

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

    // Evaluate trên test set
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

    System.out.println("=== Step 5: Insert vào Postgres ===");
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
    if (prob > 0.7) return "Liên hệ ngay với đội retention";
    if (prob > 0.4) return "Đưa vào danh sách giám sát";
    return "Khách hàng ổn định, có thể upsell";
  }
}
```

---

## TÓM TẮT

Hệ thống là một pipeline data mining hoàn chỉnh từ raw CSV đến dashboard tương tác, đi qua 8 phase chuẩn của CRISP-DM, áp dụng 4 nhóm thuật toán (classification, clustering, association rule, anomaly detection) trên dataset thẻ tín dụng, được tích hợp end-to-end qua kiến trúc **train offline / inference online** với Java + Weka làm core mining engine, Spring Boot làm REST API, và Next.js làm UI. Đầu ra cuối cùng không chỉ là một mô hình mà là **một sản phẩm có thể demo được** với 7 trang dashboard, dự đoán churn theo form, và 5+ business insight có cơ sở dữ liệu.
