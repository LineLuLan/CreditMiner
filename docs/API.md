# CreditMiner REST API

The Spring Boot service exposes JSON endpoints under `/api`. Examples in this document are trimmed from the captured responses in `.handoff/wave4/samples/`.

## Conventions

| Item | Value |
|---|---|
| Development base URL | `http://localhost:8080/api` |
| Local-demo base URL | `http://localhost:8091/api` |
| Media type | `application/json` |
| Property style | lower camel case |
| Page numbering | Starts at 1 |
| Maximum page size | 100 |
| Default outcome labels | `No`, `Yes` |

## Endpoint summary

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/overview` | Portfolio totals and means |
| GET | `/api/eda/describe` | Column descriptions |
| GET | `/api/eda/distribution` | Histogram or value counts |
| GET | `/api/eda/correlation` | Numeric correlation matrix |
| GET | `/api/eda/default-by` | Default rate by one dimension |
| GET | `/api/eda/pca-2d` | PCA points and cluster IDs |
| GET | `/api/customers` | Filtered, sorted customer page |
| GET | `/api/customers/{id}` | One customer and engineered features |
| GET | `/api/clusters` | Cluster summaries |
| GET | `/api/clusters/{id}/customers` | Customer page for one cluster |
| GET | `/api/rules` | Apriori rules |
| GET | `/api/anomalies` | Highest-ranked anomalies |
| GET | `/api/insights` | Evidence-based insight cards |
| GET | `/api/insights/visuals` | Chart data for insights |
| POST | `/api/predict` | Predict next-month default |
| GET | `/api/mining-report` | Consolidated mining evidence |
| GET | `/api/sequences` | Complete GSP evidence artifact |

## Overview

### `GET /api/overview`

Returns dataset-level totals, ratios, and the risk-tier distribution.

Query: none.

```json
{
  "totalCustomers": 29965,
  "defaultCount": 6630,
  "defaultRate": 0.2213,
  "avgPayRatio": 0.3903,
  "avgUtilization": 0.3735,
  "riskTierBreakdown": {
    "Low": 13406,
    "Medium": 7846,
    "High": 8713
  }
}
```

## Exploratory data analysis

### `GET /api/eda/describe`

Returns the generated schema and summary statistics.

Query: none.

```json
{
  "totalRows": 29965,
  "totalColumns": 32,
  "classColumn": "Default",
  "leakageColumnsDropped": [],
  "columns": [
    {
      "name": "ID",
      "type": "numeric",
      "count": 29965,
      "missing": 0,
      "mean": 14994.9325,
      "median": 14992.0
    }
  ]
}
```

### `GET /api/eda/distribution`

Returns a numeric histogram or category counts. It can split the result by the target.

| Query parameter | Required | Rule |
|---|---|---|
| `col` | Yes | A column in the EDA dataset |
| `bins` | No | Requested numeric bin count |
| `split` | No | If supplied, it must be `Default` |

Example: `GET /api/eda/distribution?col=LIMIT_BAL&bins=10&split=Default`

```json
{
  "column": "LIMIT_BAL",
  "type": "numeric",
  "binEdges": [10000.0, 109000.0, 208000.0],
  "counts": [12490, 7867],
  "stats": {
    "count": 29965,
    "mean": 167442.005,
    "median": 140000.0,
    "max": 1000000.0
  },
  "series": [
    {"label": "No", "counts": [8807, 6333, 4242]}
  ]
}
```

The arrays are trimmed in this example. The real response contains all bin edges and counts.

### `GET /api/eda/correlation`

Returns Pearson correlations for numeric columns. The identifier is excluded from the matrix.

Query: none.

```json
{
  "columns": ["LIMIT_BAL", "AGE"],
  "matrix": [
    [1.0, 0.1446],
    [0.1446, 1.0]
  ]
}
```

The example shows a two-column slice of the real matrix.

### `GET /api/eda/default-by`

Returns counts and default rates grouped by a permitted dimension.

| Query parameter | Required | Accepted values |
|---|---|---|
| `dim` | Yes | `SEX`, `EDUCATION`, `MARRIAGE`, `RISK_TIER`, `PAY_1` through `PAY_6`, `MONTHS_DELAYED`, or `AGE` |

`AGE` returns the bands `<30`, `30-39`, `40-49`, `50-59`, and `60+`.

Example: `GET /api/eda/default-by?dim=PAY_1`

```json
[
  {"group": "-2", "count": 2750, "defaultCount": 364, "defaultRate": 0.1324},
  {"group": "-1", "count": 5682, "defaultCount": 954, "defaultRate": 0.1679}
]
```

### `GET /api/eda/pca-2d`

Returns every Phase 6 PCA point. The response can be large.

Query: none.

```json
[
  {"clientId": 1, "clusterId": 0, "x": -0.5835, "y": -1.3165}
]
```

## Customers

### `GET /api/customers`

Returns a page of customer summaries.

| Query parameter | Required | Default | Rule |
|---|---|---|---|
| `page` | No | `1` | Values below 1 are treated as page 1 |
| `size` | No | `20` | Capped at 100 |
| `defaultFlag` | No | none | `No` or `Yes` |
| `clusterId` | No | none | Integer cluster ID |
| `sort` | No | `clientId,asc` | JPA field followed by `asc` or `desc` |

If both filters are present, `defaultFlag` takes precedence in the current controller.

Example: `GET /api/customers?page=1&size=10&sort=clientId,asc`

```json
{
  "total": 29965,
  "page": 1,
  "size": 10,
  "items": [
    {
      "clientId": 1,
      "defaultFlag": "Yes",
      "age": 24,
      "sex": "Female",
      "education": "University",
      "riskTier": "High",
      "payRatio": 0.08943,
      "clusterId": 0,
      "isOutlier": true,
      "isAnomaly": false
    }
  ]
}
```

### `GET /api/customers/{id}`

Returns the raw and engineered fields for one customer.

| Path parameter | Required | Rule |
|---|---|---|
| `id` | Yes | Numeric client ID |

```json
{
  "clientId": 1,
  "limitBal": 20000.00,
  "sex": "Female",
  "education": "University",
  "marriage": "Married",
  "age": 24,
  "pay1": 2,
  "pay2": 2,
  "billAmt1": 3913.00,
  "payAmt1": 0.00,
  "defaultFlag": "Yes",
  "utilization1": 0.19565,
  "avgUtilization": 0.06420,
  "payRatio": 0.08943,
  "monthsDelayed": 2,
  "maxDelay": 2,
  "billTrend": 0.19565,
  "riskTier": "High",
  "isOutlier": true,
  "isAnomaly": false,
  "centroidDistance": 0.3703,
  "clusterId": 0
}
```

The real response includes all six repayment-status, bill, and payment fields.

## Clusters

### `GET /api/clusters`

Returns the Phase 6 cluster summaries.

Query: none.

```json
[
  {
    "clusterId": 0,
    "personaName": "High-Default Persistent Delayers",
    "size": 5516,
    "centroid": {
      "AVG_UTILIZATION": 0.5628,
      "PAY_RATIO": 0.1309,
      "MONTHS_DELAYED": 3.6875
    },
    "avgRisk": 1.0,
    "defaultRate": 0.5348
  }
]
```

### `GET /api/clusters/{id}/customers`

Returns a page of customer summaries for one cluster.

| Parameter | Location | Required | Default |
|---|---|---|---|
| `id` | Path | Yes | none |
| `page` | Query | No | `1` |
| `size` | Query | No | `20`, capped at 100 |

Example: `GET /api/clusters/0/customers?page=1&size=10`

```json
{
  "total": 5516,
  "page": 1,
  "size": 10,
  "items": [
    {
      "clientId": 1,
      "defaultFlag": "Yes",
      "age": 24,
      "riskTier": "High",
      "clusterId": 0,
      "isOutlier": true,
      "isAnomaly": false
    }
  ]
}
```

The item is from the captured customer sample. The cluster page uses the same item contract. The shown total is the captured size of cluster 0.

## Rules and anomalies

### `GET /api/rules`

Returns association rules ordered by lift in descending order.

| Query parameter | Required | Default | Rule |
|---|---|---|---|
| `minLift` | No | `1.0` | Minimum lift |
| `category` | No | all | `default` or `non-default` |

```json
[
  {
    "ruleId": 1,
    "lhs": "PAY_1=2, MAX_DELAY=2",
    "rhs": "Default=Yes",
    "support": 0.0557,
    "confidence": 0.6924,
    "lift": 3.1294,
    "category": "default"
  }
]
```

### `GET /api/anomalies`

Returns customers ordered by centroid-distance score in descending order. The reason also reports the Phase 2 IQR/Z signal when it applies.

| Query parameter | Required | Default | Rule |
|---|---|---|---|
| `limit` | No | `50` | Clamped to 1 through 500 |

```json
[
  {
    "clientId": 21349,
    "reason": "cluster distance 1.1313 > strong threshold; IQR/Z outlier",
    "score": 1.1313,
    "clusterId": 0
  }
]
```

## Insights

### `GET /api/insights`

Returns the insight cards. An empty array is a valid response when no insight content is loaded.

| Query parameter | Required | Rule |
|---|---|---|
| `category` | No | Filters by the stored category string |

```json
[
  {
    "insightId": 1,
    "title": "Two months late now predicts default",
    "discovery": "Clients two months late on the latest statement defaulted at 69.1%. The portfolio rate is 22.1%.",
    "recommendation": "Flag every account that is two or more months late on the latest statement. Open a collections case the same week.",
    "category": "driver",
    "priority": 1
  }
]
```

### `GET /api/insights/visuals`

Returns chart-ready evidence for the insight cards. An empty array is valid.

Query: none.

```json
[
  {
    "title": "Two months late now predicts default",
    "headline": {
      "value": "69.1%",
      "label": "default when two months late on the latest statement"
    },
    "lift": "3.1x",
    "unit": "% default",
    "baseline": {"value": 22.1, "label": "Portfolio 22.1%"},
    "axis": "Repayment status on the latest statement (PAY_1)",
    "bars": [
      {"label": "2 months late", "value": 69.1, "n": 2666, "highlight": true}
    ]
  }
]
```

The bar list is trimmed.

## Prediction

### `POST /api/predict`

Predicts whether one client will default in the next month.

Query: none.

Request rules:

- `limitBal` must be at least 1.
- `sex` is `Male` or `Female`.
- `education` is `Graduate`, `University`, `HighSchool`, or `Other`.
- `marriage` is `Married`, `Single`, or `Other`.
- `age` is from 18 through 100.
- Each `pay1` through `pay6` value is an integer from -2 through 9.
- Bill amounts can be negative.
- Payment amounts must be non-negative.
- Every field is required.

```json
{
  "limitBal": 200000,
  "sex": "Female",
  "education": "University",
  "marriage": "Single",
  "age": 35,
  "pay1": 0,
  "pay2": 0,
  "pay3": 0,
  "pay4": 0,
  "pay5": 0,
  "pay6": 0,
  "billAmt1": 50000,
  "billAmt2": 48000,
  "billAmt3": 46000,
  "billAmt4": 44000,
  "billAmt5": 42000,
  "billAmt6": 40000,
  "payAmt1": 5000,
  "payAmt2": 5000,
  "payAmt3": 5000,
  "payAmt4": 5000,
  "payAmt5": 5000,
  "payAmt6": 5000
}
```

Response:

```json
{
  "defaultProb": 0.63,
  "label": "Yes",
  "riskTier": "High",
  "cluster": 0,
  "clusterName": "High-Default Persistent Delayers",
  "topFeatures": [
    {"name": "AGE", "contribution": 0.3848},
    {"name": "LIMIT_BAL", "contribution": 0.3497},
    {"name": "BILL_AMT1", "contribution": 0.2654}
  ],
  "recommendation": "Elevated default risk - add the account to the payment-risk monitoring queue.",
  "modelUsed": "RANDOMFOREST_COST"
}
```

## Reports and sequence evidence

### `GET /api/mining-report`

Returns one nested document for the STE web report. It contains dataset, classification, clustering, rules, anomalies, sequences, methodology, insights, and warnings.

Query: none.

```json
{
  "generatedAt": "2026-09-26T13:35:00.873600900Z",
  "dataset": {
    "totalRows": 29965,
    "classColumn": "Default",
    "defaultCustomers": 6630,
    "defaultRate": 0.2213
  },
  "classification": {
    "bestModel": "RandomForest"
  },
  "sequences": {
    "minSupport": 0.1
  },
  "warnings": []
}
```

The real response includes the complete evidence sections. Model variants include `buildTimeMs`, `cvTimeMs`, `testPredictTimeMs`, `testRows`, and `predictMicrosPerRecord`.

### `GET /api/sequences`

Returns the complete generated Phase 10 artifact. The service caches it after the first successful read.

Query: none.

```json
{
  "generatedAt": "2026-09-26T11:48:49.764516Z",
  "minSupport": 0.1,
  "topDefaultPatterns": [
    {
      "pattern": "<{PARTIAL}{LATE_2}>",
      "length": 2,
      "supportDefault": 0.4822,
      "supportNonDefault": 0.14116,
      "supportDiff": 0.34104,
      "ratio": 3.41598
    }
  ],
  "runtime": {
    "buildSequencesMs": 196,
    "gspDefaultMs": 10214,
    "gspNonDefaultMs": 5363
  }
}
```

The example is trimmed from the captured API response. The current processed artifact can have newer counts and timings after regeneration.

If `phase10_sequences.json` is absent, the endpoint returns HTTP 404. Configure a non-default path with `creditminer.data.phase10-sequences-json` or `CM_PHASE10_SEQUENCES`.

## Error envelope

Errors use one envelope. `details` is present only when more information is available.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "fields": {
        "age": "must be greater than or equal to 18"
      }
    },
    "timestamp": "<generated ISO-8601 timestamp>",
    "path": "/api/predict"
  }
}
```

The timestamp is generated for each error.

| HTTP status | Typical code | Meaning |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Invalid parameter, request field, or JSON body |
| 404 | `NOT_FOUND` | Customer, endpoint, or required artifact was not found |
| 405 | `METHOD_NOT_ALLOWED` | The path does not accept the HTTP method |
| 503 | `REPORT_NOT_GENERATED` | Required generated EDA evidence is unavailable |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
