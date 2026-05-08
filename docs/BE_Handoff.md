# BE → FE Handoff: API Contract

> **Source of truth for the REST API.** When you change a contract, update this file in the same commit.
> Frontend mirrors these schemas in `web/src/lib/schemas.ts` (Zod) and `web/src/types/api.types.ts`.

---

## 0. Implementation Status

> **Last updated**: 2026-05-08 (Phase 5 Classification complete on `backend`; BE-43 PCA-2D still deferred to Phase 6).
> Granular per-task status lives in `docs/BE_Tracker.md`. This section is the cross-team summary.

### Phases

| Phase | Status | What works today |
|---|---|---|
| **0. Infra** | ✅ DONE | Spring Boot 3.2 boots clean against Neon (PG 17, ap-southeast-1). Profiles dev/prod, CORS, OpenAPI/Swagger, structured logback, error envelope handler. `/actuator/health` UP. |
| **1. Data Understanding** | ✅ DONE | `DataLoader.loadCsv()` reads Kaggle BankChurners.csv, drops the 2 trailing `Naive_Bayes_Classifier_*` leakage columns via Weka `Remove` filter, sets `Attrition_Flag` as class index. `Phase1Report` (mvn exec:java) saves cleaned ARFF to `data/processed/phase1_raw.arff`, prints describe table to console, writes `data/processed/phase1_describe.json`. `GET /api/eda/describe` serves the describe table with lazy in-memory cache. Verified: 10127 rows × 21 cols (23 raw - 2 leakage), `Customer_Age` mean=46.33 std=8.02 min=26 max=73, `Attrition_Flag` topValue=Existing Customer count=8500. |
| **2. Preprocessing** | ✅ DONE | `Preprocessor.run()` chains: rewrite "Unknown" → missing in 3 categorical cols (Education_Level/Marital_Status/Income_Category), mode-impute via `ReplaceMissingValues`, dedup by CLIENTNUM (none in this dataset), flag outliers via Z-score \|z\|>3 OR IQR-fence on 4 financial cols. Scaling/encoding (`normalize`/`standardize`/`encodeNominal`) are on-demand wrappers — caller decides per algorithm. `Phase2Report` produces `data/processed/clean.arff`, `phase2_report.json`, and `phase2_outliers.json` (CLIENTNUM list, consumed by Phase 8 seeder for `customers.is_outlier`). Verified: 1519 + 749 + 1112 Unknown rewrites, 0 duplicates, 1684 outliers (16.63%) — Credit_Limit 984, Total_Trans_Amt 896. No new endpoint (Phase 4 EDA endpoints will read clean.arff). |
| **3. Feature Engineering** | ✅ DONE | `FeatureEngineer.run()` appends 6 derived columns to `clean.arff` → `enriched.arff` (10127 rows × 27 cols): `Utilization_Score` (Bal/Limit, cross-checks Avg_Utilization_Ratio), `Spending_Intensity` (Amt/Ct), `Engagement_Score` (Ct/Months), `Customer_Value_Score` (composite z-score, **NO Attrition_Flag input**), `Risk_Score` (0.4·Util + 0.3·(Inactive/12) + 0.3·(1−Engagement_norm), **NO Attrition_Flag**), `Customer_Tier` (quartile bins → Bronze/Silver/Gold/Platinum). `DescribeCacheService` now prefers enriched.arff > clean.arff > phase1_raw.arff > raw CSV, so `/api/eda/describe` shows all 27 columns. Verified: tier counts 2532/2531/2532/2532, Utilization_Score mean=0.2749 matches Avg_Utilization_Ratio. |
| **4. EDA endpoints** | 🟡 PARTIAL | `/api/eda/distribution`, `/correlation`, `/churn-by` are live (BE-40/41/42), backed by `EdaDataCache` (lazy-loads enriched.arff once, shared across all 3 endpoints) + `EdaService`. Distribution supports both numeric (histogram with bins 5..50, default 20) and nominal (value counts). Correlation = Pearson over 26 numeric cols (CLIENTNUM excluded), cached in-memory. Churn-by validates `dim` against whitelist incl. new `Customer_Tier`. **BE-43 PCA-2D coords deferred to Phase 6** — depends on the cluster feature subset which isn't fixed yet. |
| **5. Classification** | ✅ DONE | `Phase5Pipeline` trains 10 model variants (J48 / RF / NaiveBayes / Logistic — each with baseline + SMOTE-on-train; J48 + RF also wrapped in CostSensitiveClassifier with cost matrix [[0,1],[5,0]]). Stratified 80/20 split (seed 42), SMOTE applied to TRAIN only, NB/Logistic standardized, Logistic also one-hot-encoded. 10-fold CV on train + held-out test eval recorded as F1-Attrited / ROC-AUC / PR-AUC / accuracy / precision / recall in `data/processed/phase5_comparison.csv`. **Best**: RandomForest+SMOTE — CV F1=0.9315, Test F1=0.8758, Test ROC-AUC=0.9888, Test PR-AUC=0.9429. RandomForest+CostSensitive close behind (Test F1=0.8775). NaiveBayes worst (Test F1≈0.55). Top-5 RF feature importance (Mean Decrease Impurity): Total_Trans_Amt, Customer_Age, Total_Trans_Ct, Total_Amt_Chng_Q4_Q1, Spending_Intensity (Phase 3 derived feature). Persisted: `models/{j48,rf,nb,logistic}.model` (best variant per algo). `models/rf.model` (6.1MB) is the production classifier loaded by `ModelConfig` at startup. |
| **6. Clustering & Anomaly** | ⏳ BACKLOG | KMeans + silhouette + cluster-distance anomaly. |
| **7. Association Rules** | ⏳ BACKLOG | Discretize + Apriori → `rules.json`. |
| **8. Insights & API** | 🟡 PARTIAL | All controllers in §3 are scaffolded; only `GET /api/insights` returns real data (5 seeded rows from Neon). Everything else returns mock/stub responses today. |

### Endpoints — current behavior

| Endpoint | Today | Becomes real in |
|---|---|---|
| `GET /actuator/health` | ✅ UP, hits Neon | (already real) |
| `GET /swagger-ui.html`, `/v3/api-docs` | ✅ Live | (already real) |
| `GET /api/insights` | ✅ Returns 5 real rows from Neon | (already real) |
| `GET /api/overview` | 🟡 Mock JSON | Phase 8 (BE-82) |
| `GET /api/customers`, `/api/customers/{id}` | 🟡 Mock | Phase 8 (BE-83/84) — needs Phase 2-5 first |
| `GET /api/clusters`, `/api/clusters/{id}/customers` | 🟡 Mock | Phase 8 (BE-85/86) — needs Phase 6 |
| `GET /api/rules` | 🟡 Mock | Phase 8 (BE-87) — needs Phase 7 |
| `GET /api/anomalies` | 🟡 Mock | Phase 8 (BE-89) — needs Phase 6 |
| `POST /api/predict` | 🟡 Mock | Phase 8 (BE-90) — needs Phase 5 |
| `GET /api/eda/distribution\|correlation\|churn-by` | ✅ Live | (already real) — see §3.2 / §3.3 / §3.4 |
| `GET /api/eda/describe` | ✅ Live | (already real) — see §3.13 |

### Error envelope status

Working today (verified by smoke test on `3ac1d37`):
- 400 `VALIDATION_ERROR` for malformed JSON, bean-validation failures, type mismatches, constraint violations
- 404 `NOT_FOUND` for unknown routes (`NoResourceFoundException`)
- 500 `INTERNAL_ERROR` fallback

Caveat: `405 Method Not Allowed` still uses Spring's default `{timestamp,status,error,path}` shape, not our envelope. FE only sends GET/POST so low-impact. Tracked in BE-05.

### Database

Neon Postgres (project `ep-purple-smoke-aosu7szo`, region `ap-southeast-1`, PG 17). Schema applied via `db/schema.sql` + `db/seed.sql`. Connection via `DATABASE_URL` + `DB_USER` + `DB_PASSWORD` env vars (see `backend/.env.example`). Hibernate runs in `validate` mode — schema tweaks must land in `db/schema.sql` AND match JPA entity types.

### Pick-up notes for the next session

When user says **"start Phase 6"** or **"làm phase 6"**:
1. Phase 6 scope = Clustering & Anomaly (BE-60..BE-65 in `docs/BE_Tracker.md`): KMeans elbow over k=2..8 picking optimal k, silhouette scoring, train final SimpleKMeans (seed 42, save `models/kmeans.model`), centroid-distance anomaly flagging (distance > μ+3σ), combine Z+IQR+cluster-distance into `is_anomaly`, optional EM bonus. **Also pick up BE-43 (PCA-2D)** here since the cluster feature subset will now be fixed.
2. Pre-reqs satisfied: `enriched.arff` is input. Drop `Attrition_Flag` and `CLIENTNUM` before clustering (unsupervised), then `Preprocessor.normalize()` (min-max for distance-based KMeans). Phase 5 already produced the SMOTE/feature-importance work; clustering is independent.
3. Output target: `models/kmeans.model` + `data/processed/phase6_clusters.json` (per-cluster centroid + persona name + size + avg_risk + churn_rate) + `data/processed/phase6_anomalies.json` (CLIENTNUM list combining is_outlier from Phase 2 with cluster-distance anomalies).
4. PCA-2D: use `weka.filters.unsupervised.attribute.PrincipalComponents` on the same normalized feature matrix used for KMeans; keep first 2 PCs; export per-CLIENTNUM (x, y) to `data/processed/phase6_pca_2d.json`. New endpoint `GET /api/eda/pca-2d` (or attach to `/api/clusters`) — confirm shape with FE.
5. Persona names (Premium Loyal / Heavy Spender / At-Risk Mid / Dormant Light etc.) — manually assigned by inspecting centroids; map cluster id → name in `phase6_clusters.json`.
6. Phase 5 deliverables ready: 4 .model files, comparison CSV, RF feature importance JSON. `ModelConfig` loads `models/rf.model` + (Phase 6) `models/kmeans.model` at startup; `/predict` endpoint will go live in Phase 8 once seeder lands.
7. Source of truth: this section + `docs/BE_Tracker.md`.

---

## 1. Base URL & Conventions

| Env | Base URL |
|---|---|
| Local dev | `http://localhost:8080/api` |
| Prod | `https://creditminer-api.onrender.com/api` (TBD) |

- All bodies are JSON. `Content-Type: application/json`.
- Auth: **none** (academic project; do not deploy publicly without a layer).
- Encoding: UTF-8.
- Dates: ISO 8601 UTC.
- Pagination: `?page=1&size=20` (1-indexed pages).

---

## 2. Error Envelope

All non-2xx responses use this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'creditLimit' must be >= 0",
    "details": { "field": "creditLimit", "value": -100 },
    "timestamp": "2026-05-08T10:30:00Z",
    "path": "/api/predict"
  }
}
```

### Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Body or query failed validation |
| `NOT_FOUND` | 404 | Resource missing |
| `MODEL_NOT_LOADED` | 503 | Models not loaded yet (cold start) |
| `INFERENCE_ERROR` | 500 | Weka prediction failed |
| `DB_ERROR` | 500 | Postgres unreachable / query failed |
| `INTERNAL_ERROR` | 500 | Unhandled |

---

## 3. Endpoint Reference

### 3.1 `GET /api/overview`

Dashboard KPIs.

**Response 200**:
```json
{
  "totalCustomers": 10127,
  "attritedCount": 1627,
  "churnRate": 0.1607,
  "avgRiskScore": 0.412,
  "avgUtilization": 0.275,
  "tierBreakdown": {
    "Bronze": 2531, "Silver": 2532, "Gold": 2532, "Platinum": 2532
  }
}
```

### 3.2 `GET /api/eda/distribution?col={name}&bins={int}`

Distribution for one column. Numeric → histogram. Nominal → value counts.

**Query**:
- `col` (required): any attribute name on `enriched.arff` (Phase 3 output, 27 cols). Common: `Customer_Age | Credit_Limit | Total_Trans_Amt | Avg_Utilization_Ratio | Risk_Score | Customer_Value_Score | Customer_Tier | Card_Category | ...`
- `bins` (optional, default 20): 5..50 (clamped). Numeric only.

**Response 200 — numeric**:
```json
{
  "column": "Credit_Limit",
  "type": "numeric",
  "binEdges": [1438.3, 3092.4, 4746.5, ..., 34516.0],
  "counts": [3211, 2104, 1850, 1230, 980, 752]
}
```
- `binEdges` length = `n+1`, `counts` length = `n`. Bin `i` covers `[binEdges[i], binEdges[i+1])` except the last is closed.

**Response 200 — nominal**:
```json
{
  "column": "Customer_Tier",
  "type": "nominal",
  "categories": ["Bronze", "Silver", "Gold", "Platinum"],
  "counts": [2532, 2531, 2532, 2532]
}
```

**Response 400**: `VALIDATION_ERROR` if `col` does not exist on the dataset.

### 3.3 `GET /api/eda/correlation`

Pearson correlation matrix for numeric features in `enriched.arff` (CLIENTNUM excluded).

**Response 200**:
```json
{
  "columns": ["Customer_Age", "Dependent_count", "Months_on_book", "...", "Risk_Score"],
  "matrix": [[1.0, 0.0123, ...], [0.0123, 1.0, ...], ...]
}
```
- `matrix` is square, `length(columns) × length(columns)`. Diagonal is always `1.0`. Cached in-memory (computed once on first call). Values rounded to 4 decimals.

### 3.4 `GET /api/eda/churn-by?dim={name}`

Churn rate grouped by a categorical dimension. Computed live from `enriched.arff` per request (cheap — single linear scan).

**Query**: `dim` ∈ `{Income_Category, Card_Category, Customer_Tier, Gender, Education_Level, Marital_Status}`

**Response 200**:
```json
[
  { "group": "Less than $40K", "count": 3561, "attritedCount": 612, "churnRate": 0.1718 },
  { "group": "$40K - $60K",    "count": 1790, "attritedCount": 271, "churnRate": 0.1514 }
]
```
- `churnRate = attritedCount / count`, rounded to 4 decimals.
- Group order matches the nominal value order on the ARFF attribute (preserved from input CSV).
- "Attrited" is identified by exact match on `Attrition_Flag = "Attrited Customer"`.

**Response 400**: `VALIDATION_ERROR` if `dim` is not in the whitelist or is not a nominal attribute.

### 3.5 `GET /api/customers?page={int}&size={int}&filter={json}&sort={field,asc|desc}`

Paginated customer list.

**Query**:
- `page`, `size`
- `filter` URL-encoded JSON: `{"attritionFlag":"Attrited","clusterId":2}`
- `sort` e.g. `riskScore,desc`

**Response 200**:
```json
{
  "total": 1627,
  "page": 1,
  "size": 20,
  "items": [ /* CustomerSummary[] (see §4) */ ]
}
```

### 3.6 `GET /api/customers/{clientNum}`

Single customer detail.

**Response 200**: full `CustomerDetail` (see §4)
**Response 404**: NOT_FOUND error envelope

### 3.7 `GET /api/clusters`

Cluster summaries.

**Response 200**:
```json
[
  {
    "clusterId": 0,
    "personaName": "Premium Loyal",
    "size": 3210,
    "centroid": { "Credit_Limit": 18420, "Avg_Utilization_Ratio": 0.15, "...": 0 },
    "avgRisk": 0.21,
    "churnRate": 0.06,
    "description": "High credit, low utilization, high transactions"
  }
]
```

### 3.8 `GET /api/clusters/{id}/customers?page=&size=`

Paginated customers in a cluster. Same response shape as §3.5.

### 3.9 `GET /api/rules?minLift={float}&category={churn|retention}`

Association rules.

**Response 200**:
```json
[
  {
    "ruleId": 1,
    "lhs": "Util=high, Inactive=high",
    "rhs": "Attrition_Flag=Attrited",
    "support": 0.08,
    "confidence": 0.78,
    "lift": 4.84,
    "category": "churn"
  }
]
```

### 3.10 `POST /api/predict`

Single-customer churn prediction. **The most demo-critical endpoint.**

**Request body** (see §4 `PredictRequest`):
```json
{
  "customerAge": 45,
  "gender": "M",
  "dependentCount": 3,
  "educationLevel": "Graduate",
  "maritalStatus": "Married",
  "incomeCategory": "$60K - $80K",
  "cardCategory": "Blue",
  "monthsOnBook": 36,
  "totalRelationshipCount": 5,
  "monthsInactive12Mon": 2,
  "contactsCount12Mon": 3,
  "creditLimit": 12500,
  "totalRevolvingBal": 800,
  "totalTransAmt": 4500,
  "totalTransCt": 45,
  "avgUtilizationRatio": 0.064
}
```

**Response 200** (`PredictResponse`):
```json
{
  "churnProb": 0.124,
  "label": "Existing",
  "riskScore": 0.32,
  "cluster": 1,
  "clusterName": "Premium Loyal",
  "topFeatures": [
    { "name": "Total_Trans_Ct",        "contribution": 0.28 },
    { "name": "Avg_Utilization_Ratio", "contribution": 0.19 },
    { "name": "Months_Inactive_12_mon", "contribution": 0.15 }
  ],
  "recommendation": "Stable customer — eligible for premium upsell",
  "modelUsed": "RandomForest_v1"
}
```

### 3.11 `GET /api/insights`

Hand-curated business insights.

**Response 200**:
```json
[
  {
    "insightId": 1,
    "title": "High utilization signals churn",
    "discovery": "Customers with Avg_Utilization_Ratio > 0.7 churn 2.4x average",
    "evidence": "Apriori rule {Util=high, Inactive=high} -> Attrited (sup=0.08, conf=0.78, lift=4.84). Confirmed by RF feature importance.",
    "recommendation": "Trigger alert when utilization > 70% for 2 consecutive months",
    "category": "churn",
    "priority": 1
  }
]
```

### 3.12 `GET /api/anomalies?limit={int}`

Customers flagged as anomalous.

**Response 200**:
```json
[
  { "clientNum": 715234108, "reason": "z-score, cluster-distance", "score": 4.21, "clusterId": 2 }
]
```

### 3.13 `GET /api/eda/describe`

Phase 1 describe table — column-by-column stats for the post-leakage-drop dataset (23 raw cols → 21).

**Behavior**: Lazy cache. First call computes from `data/processed/phase1_raw.arff` (preferred — already leakage-free) or falls back to `data/raw/BankChurners.csv` if ARFF missing. Subsequent calls served from in-memory cache. If neither file exists, returns 503 `REPORT_NOT_GENERATED`.

**Response 200**:
```json
{
  "totalRows": 10127,
  "totalColumns": 21,
  "classColumn": "Attrition_Flag",
  "leakageColumnsDropped": [
    "Naive_Bayes_Classifier_Attrition_Flag_..._Months_Inactive_12_mon_1",
    "Naive_Bayes_Classifier_Attrition_Flag_..._Months_Inactive_12_mon_2"
  ],
  "columns": [
    {
      "name": "Customer_Age",
      "type": "numeric",
      "count": 10127,
      "missing": 0,
      "missingPct": 0.0,
      "mean": 46.326,
      "std": 8.0168,
      "min": 26.0,
      "max": 73.0,
      "median": 46.0
    },
    {
      "name": "Attrition_Flag",
      "type": "nominal",
      "count": 10127,
      "missing": 0,
      "missingPct": 0.0,
      "distinctCount": 2,
      "topValue": "Existing Customer",
      "topCount": 8500
    }
  ],
  "generatedAt": "2026-05-08T19:49:51Z"
}
```

**Notes for FE**:
- Numeric-only fields (`mean`, `std`, `min`, `max`, `median`) and nominal-only fields (`distinctCount`, `topValue`, `topCount`) are omitted when not applicable (`@JsonInclude(NON_NULL)`). Type-discriminate on `type ∈ {"numeric", "nominal", "string", "date", "other"}` before reading those fields.
- `leakageColumnsDropped` will be `[]` when the report is computed from a pre-cleaned ARFF (the names are not recoverable post-removal).
- All numeric stats rounded to 4 decimals.

**Response 503**: `REPORT_NOT_GENERATED` when neither raw CSV nor processed ARFF is present.

---

## 4. Schema Definitions (TypeScript-style)

```ts
// ---- Enums ----
type Gender = "M" | "F";
type AttritionFlag = "Existing Customer" | "Attrited Customer";
type CardCategory = "Blue" | "Silver" | "Gold" | "Platinum";
type IncomeCategory = "Less than $40K" | "$40K - $60K" | "$60K - $80K" | "$80K - $120K" | "$120K +" | "Unknown";
type EducationLevel = "Uneducated" | "High School" | "College" | "Graduate" | "Post-Graduate" | "Doctorate" | "Unknown";
type MaritalStatus = "Single" | "Married" | "Divorced" | "Unknown";
type CustomerTier = "Bronze" | "Silver" | "Gold" | "Platinum";

// ---- PredictRequest (form input) ----
interface PredictRequest {
  customerAge: number;            // int 18-80
  gender: Gender;
  dependentCount: number;         // int 0-10
  educationLevel: EducationLevel;
  maritalStatus: MaritalStatus;
  incomeCategory: IncomeCategory;
  cardCategory: CardCategory;
  monthsOnBook: number;           // int >= 0
  totalRelationshipCount: number; // int 1-10
  monthsInactive12Mon: number;    // int 0-12
  contactsCount12Mon: number;     // int 0-20
  creditLimit: number;            // >= 0
  totalRevolvingBal: number;      // >= 0
  totalTransAmt: number;          // >= 0
  totalTransCt: number;           // int >= 0
  avgUtilizationRatio: number;    // 0..1
}

// ---- PredictResponse ----
interface PredictResponse {
  churnProb: number;              // 0..1
  label: "Existing" | "Attrited";
  riskScore: number;              // 0..1
  cluster: number;                // 0..k-1
  clusterName: string;
  topFeatures: { name: string; contribution: number }[];
  recommendation: string;
  modelUsed: string;
}

// ---- CustomerSummary (table row) ----
interface CustomerSummary {
  clientNum: number;
  attritionFlag: AttritionFlag;
  customerAge: number;
  gender: Gender;
  cardCategory: CardCategory;
  customerTier: CustomerTier;
  riskScore: number;
  clusterId: number | null;
  isOutlier: boolean;
  isAnomaly: boolean;
}

// ---- CustomerDetail (drawer view) ----
interface CustomerDetail extends CustomerSummary {
  // ... all 23 raw cols + 6 derived features
  // (see backend Customer entity)
  dependentCount: number;
  educationLevel: EducationLevel;
  // ...
}
```

---

## 5. Versioning Policy

- This contract is **v1**. Breaking changes bump to `v2` and live behind `/api/v2/...`.
- Additive changes (new optional fields) do **not** require a version bump but must be added to this doc + Zod schema in the same commit.
- Removing a field requires a deprecation cycle: mark `@deprecated` for 2 weeks before deletion.

---

## 6. Open Questions for FE

(Move resolved items to a Closed section below.)

- [ ] FE: do you want `bins` config for distribution endpoint client-side or server-side?
- [ ] FE: should `/api/customers` return all derived features or summary only? (perf vs detail trade-off)
- [ ] FE: PCA-2D coords — separate endpoint `/api/clusters/pca` or embed in `/api/clusters`?
- [ ] FE: WebSocket for real-time anomalies (v2)?

### Closed
_(none yet)_
