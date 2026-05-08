# BE → FE Handoff: API Contract

> **Source of truth for the REST API.** When you change a contract, update this file in the same commit.
> Frontend mirrors these schemas in `web/src/lib/schemas.ts` (Zod) and `web/src/types/api.types.ts`.

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

Histogram for one column.

**Query**:
- `col` (required): one of `Customer_Age | Credit_Limit | Total_Trans_Amt | Avg_Utilization_Ratio | Risk_Score | Customer_Value_Score`
- `bins` (optional, default 20): 5..50

**Response 200**:
```json
{
  "column": "Credit_Limit",
  "binEdges": [1438, 5000, 10000, 15000, 20000, 25000, 34516],
  "counts": [3211, 2104, 1850, 1230, 980, 752]
}
```

### 3.3 `GET /api/eda/correlation`

Pearson correlation matrix for numeric features.

**Response 200**:
```json
{
  "columns": ["Customer_Age", "Credit_Limit", "Total_Trans_Amt", "..."],
  "matrix": [[1.0, 0.05, -0.02, ...], [0.05, 1.0, ...], ...]
}
```

### 3.4 `GET /api/eda/churn-by?dim={name}`

Churn rate grouped by a categorical dimension.

**Query**: `dim` ∈ `{Income_Category, Card_Category, Customer_Tier, Gender, Education_Level, Marital_Status}`

**Response 200**:
```json
[
  { "group": "Less than $40K", "count": 3561, "attritedCount": 612, "churnRate": 0.1718 },
  { "group": "$40K - $60K",    "count": 1790, "attritedCount": 271, "churnRate": 0.1514 }
]
```

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
