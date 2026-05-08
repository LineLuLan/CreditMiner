<div align="center">

# 💳 CreditMiner

### Customer Behavior Pattern Mining & Risk Analysis System for Credit Card Customers

[![Java](https://img.shields.io/badge/Java-17-007396?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Weka](https://img.shields.io/badge/Weka-3.8.6-3BA889)](https://www.cs.waikato.ac.nz/ml/weka/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql&logoColor=white)](https://neon.tech/)
[![License](https://img.shields.io/badge/License-Academic-blue)](#license)

**[Demo](#-demo) · [Documentation](#-documentation) · [Quick Start](#-quick-start) · [Architecture](#-architecture) · [Technical Report](#-technical-report)**

---

> **Course Project · Data Mining**
> A complete full-stack system from raw CSV to interactive dashboard,
> implementing the standard 8-phase CRISP-DM methodology with 4 data mining algorithm families.

</div>

---

## 📋 Table of Contents

- [Introduction](#-introduction)
- [Key Features](#-key-features)
- [Demo](#-demo)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Data Mining Pipeline](#-data-mining-pipeline)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Results & Evaluation](#-results--evaluation)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Documentation](#-documentation)
- [Team](#-team)
- [License](#-license)

---

## 🎯 Introduction

**CreditMiner** is a data mining system designed to address four core questions faced by credit card issuers:

| # | Business Question | DM Problem | Algorithms |
|---|---|---|---|
| 1 | Which customers are about to leave? | **Classification** | J48, RandomForest, NaiveBayes |
| 2 | What hidden customer segments exist? | **Clustering** | SimpleKMeans |
| 3 | Which behaviors signal risk? | **Association Rules** | Apriori |
| 4 | Which customers behave abnormally? | **Anomaly Detection** | Z-score + IQR + Cluster distance |

The system goes beyond predictive models to deliver a **7-page interactive dashboard**, **form-based prediction API**, and **5+ business insights** backed by data evidence.

### 🎓 Academic Context

This project was developed as part of the **Data Mining** course, fully applying the **CRISP-DM** methodology (Cross-Industry Standard Process for Data Mining) across 8 phases: Data Understanding → Preprocessing → Feature Engineering → EDA → Classification → Clustering → Association Rules → Insight Extraction.

---

## ✨ Key Features

### 🔬 Data Mining Pipeline
- **Fully automated** from raw CSV to serialized models
- **6 derived features** designed to avoid data leakage
- **3 imbalance handling strategies**: Baseline / SMOTE / Cost-Sensitive
- **10-fold cross-validation** with `random_seed = 42` for reproducibility
- **Multi-metric evaluation**: F1, ROC-AUC, PR-AUC (not Accuracy-dependent)

### 📊 Interactive Dashboard
- **Overview**: Key KPIs (churn rate, avg risk, customer tiers)
- **EDA Explorer**: Dynamic histogram, boxplot, correlation heatmap
- **Customer Browser**: 10K customers with server-side filter/sort/pagination
- **Cluster View**: 2D PCA scatter + persona cards
- **Rules Explorer**: Rules table + support/confidence/lift scatter
- **Predict Tool**: 13-field form → churn probability + recommendation
- **Insights Page**: 5+ insights as Discovery/Evidence/Recommendation

### 🚀 Production-Ready Architecture
- **Train offline / Inference online**: Models serialized once, loaded into RAM at startup
- **REST API**: 12 endpoints documented with OpenAPI
- **Database-backed**: PostgreSQL/Neon with 5 indexed tables
- **Type-safe**: Java DTOs ↔ Zod schemas ↔ TypeScript types
- **Reproducible**: Locked dependency versions, controlled seeds

---

## 🎬 Demo

### Screenshots

> Place screenshots in `docs/screenshots/` and uncomment the lines below once available.

```
📸 docs/screenshots/01-overview.png      → Overview Dashboard
📸 docs/screenshots/02-eda.png           → EDA Explorer
📸 docs/screenshots/03-clusters.png      → Cluster Personas
📸 docs/screenshots/04-rules.png         → Association Rules
📸 docs/screenshots/05-predict.png       → Churn Prediction Form
📸 docs/screenshots/06-insights.png      → Business Insights
```

<!-- ![Overview Dashboard](docs/screenshots/01-overview.png) -->

### Live Demo
- 🌐 Frontend: `https://creditminer-demo.vercel.app` *(coming soon)*
- 🔌 API: `https://creditminer-api.onrender.com/api` *(coming soon)*
- 📺 Video walkthrough: `docs/demo-video.mp4` (5-7 minutes)

---

## 🛠 Tech Stack

### Backend
| Technology | Version | Role |
|---|---|---|
| ☕ Java | 17 LTS | Primary language |
| 📦 Maven | 3.9+ | Dependency management |
| 🧠 Weka | 3.8.6 | Data mining engine |
| 🌱 Spring Boot | 3.2.x | REST framework |
| 🗄 Spring Data JPA | 3.2.x | ORM layer |
| 🐘 PostgreSQL Driver | 42.7+ | DB connector |
| ✨ Lombok | 1.18+ | Boilerplate reduction |

### Frontend
| Technology | Version | Role |
|---|---|---|
| ⚛️ Next.js | 14 | React framework (App Router) |
| 🎨 Tailwind CSS | 3.4+ | Utility-first styling |
| 🧩 shadcn/ui | latest | Component library |
| 📈 Recharts | 2.12+ | Charts (Bar, Line, Pie, Scatter) |
| 🔄 TanStack Query | 5.x | Data fetching + caching |
| 📝 React Hook Form | 7.x | Form state management |
| ✅ Zod | 3.x | Schema validation |
| 🎯 Lucide Icons | latest | Icon library |

### Database & Infrastructure
| Technology | Role |
|---|---|
| 🐘 PostgreSQL 15 (Neon) | Primary database (serverless) |
| ☁️ Vercel | Frontend hosting |
| 🚂 Render / Railway | Backend hosting |
| 🐙 GitHub Actions | CI/CD (optional) |

---

## 🏗 Architecture

### High-Level Diagram

```
┌─────────────────┐       ┌──────────────────────┐       ┌────────────────┐
│   Next.js UI    │ HTTP  │   Spring Boot API    │  JDBC │   PostgreSQL   │
│  Tailwind +     │◄─────►│   + Weka Inference   │◄─────►│     (Neon)     │
│  shadcn/ui +    │ JSON  │   Loaded models      │       │                │
│  Recharts       │       │   in memory          │       │                │
└─────────────────┘       └──────────────────────┘       └────────────────┘
                                     ▲
                                     │ load on startup
                                     │
                            ┌────────┴─────────┐
                            │     models/      │
                            │   rf.model       │
                            │   kmeans.model   │
                            │   rules.json     │
                            └──────────────────┘
                                     ▲
                                     │ written by
                          ┌──────────┴──────────┐
                          │  TrainPipeline.java │  ← runs OFFLINE
                          │   (Java + Weka)     │
                          └─────────────────────┘
```

### Architectural Philosophy

**🔹 Train Offline / Inference Online**
- The mining pipeline (`TrainPipeline.java`) runs manually or via cron — output is serialized `.model` files.
- Spring Boot loads models into RAM once at startup.
- Each `/predict` request takes only a few milliseconds — no retraining.

**🔹 Clean Separation**
- The backend has minimal data mining logic — only inference + data serving.
- The mining pipeline is a separate module that can be re-run independently when new data arrives.

**🔹 Stateless API**
- All state lives in the database or model files.
- The backend can scale horizontally (although this academic project deploys a single instance).

---

## 📁 Project Structure

```
creditminer/
├── 📂 backend/                          # Java + Weka + Spring Boot
│   ├── pom.xml
│   ├── data/
│   │   ├── raw/BankChurners.csv         # Original dataset
│   │   ├── processed/clean.arff         # After preprocessing
│   │   └── processed/clean_assoc.arff   # Discretized for Apriori
│   ├── models/                          # Trained models (gitignored)
│   │   ├── j48.model
│   │   ├── rf.model
│   │   ├── nb.model
│   │   ├── kmeans.model
│   │   └── rules.json
│   ├── src/main/java/com/creditminer/
│   │   ├── CreditMinerApplication.java
│   │   ├── config/
│   │   │   ├── ModelConfig.java         # Load models on startup
│   │   │   └── CorsConfig.java
│   │   ├── controller/                  # REST endpoints
│   │   │   ├── OverviewController.java
│   │   │   ├── EdaController.java
│   │   │   ├── CustomerController.java
│   │   │   ├── ClusterController.java
│   │   │   ├── RuleController.java
│   │   │   ├── PredictController.java
│   │   │   └── InsightController.java
│   │   ├── service/                     # Business logic
│   │   │   ├── DataLoader.java
│   │   │   ├── Preprocessor.java
│   │   │   ├── FeatureEngineer.java
│   │   │   ├── ClassificationService.java
│   │   │   ├── ClusteringService.java
│   │   │   ├── AssociationService.java
│   │   │   ├── AnomalyService.java
│   │   │   ├── InsightService.java
│   │   │   └── ReportService.java
│   │   ├── pipeline/
│   │   │   └── TrainPipeline.java       # main() — runs offline
│   │   ├── repository/                  # JPA repos
│   │   ├── entity/                      # JPA entities
│   │   └── dto/                         # Request/Response DTOs
│   └── src/main/resources/
│       ├── application.yml              # Config: DB, model paths
│       ├── application-dev.yml          # Dev override
│       ├── application-prod.yml         # Prod override
│       └── db/migration/                # Flyway scripts (optional)
│
├── 📂 web/                              # Next.js 14 App Router
│   ├── package.json
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── public/
│   ├── src/
│   │   ├── app/                         # Pages (App Router)
│   │   │   ├── layout.tsx               # Root layout
│   │   │   ├── page.tsx                 # / Overview
│   │   │   ├── eda/page.tsx
│   │   │   ├── customers/page.tsx
│   │   │   ├── clusters/page.tsx
│   │   │   ├── rules/page.tsx
│   │   │   ├── predict/page.tsx
│   │   │   ├── insights/page.tsx
│   │   │   └── api/                     # Next API routes (proxy if needed)
│   │   ├── components/
│   │   │   ├── ui/                      # shadcn/ui primitives
│   │   │   ├── charts/                  # Recharts wrappers
│   │   │   ├── layout/                  # Sidebar, Header
│   │   │   └── features/                # Feature-specific components
│   │   ├── lib/
│   │   │   ├── api.ts                   # API client
│   │   │   ├── schemas.ts               # Zod schemas
│   │   │   ├── utils.ts
│   │   │   └── constants.ts
│   │   ├── hooks/                       # Custom React hooks
│   │   └── types/                       # TS types
│   └── .env.local.example
│
├── 📂 db/                               # Database scripts
│   ├── schema.sql                       # DDL — 5 tables
│   ├── seed.sql                         # Initial insights data
│   └── migrations/                      # Future migrations
│
├── 📂 docs/                             # Documentation
│   ├── blueprint_vi.md                  # Vietnamese blueprint
│   ├── blueprint_en.md                  # English blueprint
│   ├── technical-report.docx            # 30-40 page technical report
│   ├── slides.pptx                      # 15-20 demo slides
│   ├── screenshots/                     # Dashboard screenshots
│   └── api/openapi.yaml                 # API spec (optional)
│
├── 📂 scripts/                          # Utility scripts
│   ├── setup.sh                         # One-shot setup
│   ├── train.sh                         # Run TrainPipeline
│   └── seed-db.sh                       # Seed Postgres
│
├── .gitignore
├── docker-compose.yml                   # Local dev: Postgres
├── LICENSE
└── README.md                            # This file
```

---

## ⚡ Quick Start

### System Requirements

| Tool | Minimum Version |
|---|---|
| Java JDK | 17 |
| Maven | 3.9 |
| Node.js | 20 |
| PostgreSQL | 15 (or free Neon account) |
| Git | latest |

### Clone & Setup

```bash
git clone https://github.com/<your-username>/creditminer.git
cd creditminer
```

### Step 1: Database

**Option A — Local PostgreSQL via Docker (recommended for dev):**

```bash
docker compose up -d postgres
# DB ready at localhost:5432
# user: creditminer, password: creditminer, database: creditminer_db
```

**Option B — Neon (cloud, free tier):**

1. Create an account at [neon.tech](https://neon.tech)
2. Create a new project, copy the connection string
3. Save it in `backend/src/main/resources/application-dev.yml`

**Create schema:**

```bash
psql $DATABASE_URL -f db/schema.sql
psql $DATABASE_URL -f db/seed.sql
```

### Step 2: Download the Dataset

```bash
mkdir -p backend/data/raw

# Download BankChurners.csv from Kaggle
# https://www.kaggle.com/datasets/sakshigoyal7/credit-card-customers
# Place the file at backend/data/raw/BankChurners.csv
```

### Step 3: Train Models (offline)

```bash
cd backend
mvn clean compile

# Run the mining pipeline — takes ~2-5 minutes
mvn exec:java -Dexec.mainClass="com.creditminer.pipeline.TrainPipeline"

# Output:
# data/processed/clean.arff
# data/processed/clean_assoc.arff
# models/j48.model, rf.model, nb.model, kmeans.model
# models/rules.json
# (and inserts enriched data into Postgres)
```

### Step 4: Start the Backend

```bash
cd backend
mvn spring-boot:run

# Backend runs at http://localhost:8080
# Test:
curl http://localhost:8080/api/overview
```

### Step 5: Start the Frontend

```bash
cd web
cp .env.local.example .env.local
# Edit .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:8080/api

npm install
npm run dev

# Frontend runs at http://localhost:3000
```

### ✅ Verify

Open browser → `http://localhost:3000` → you should see the dashboard with:
- 4 KPI cards
- Churn rate donut chart
- Risk distribution
- Customer tier breakdown

---

## 🔬 Data Mining Pipeline

### The 8 Phases

```
┌───────────────────────────────────────────────────────────────┐
│  Phase 1  →  Data Understanding                               │
│  Phase 2  →  Preprocessing (missing, outlier, scaling)        │
│  Phase 3  →  Feature Engineering (6 derived features)         │
│  Phase 4  →  EDA (univariate, bivariate, correlation, PCA)    │
│  Phase 5  →  Classification (J48, RF, NB) + SMOTE comparison  │
│  Phase 6  →  Clustering (KMeans k=2..8 + Elbow + Silhouette)  │
│  Phase 7  →  Association Rules (Apriori on discretized data)  │
│  Phase 8  →  Insight Extraction (Discovery → Evidence → Rec)  │
└───────────────────────────────────────────────────────────────┘
```

### 6 Derived Features

| Feature | Formula | Meaning |
|---|---|---|
| `Utilization_Score` | `Total_Revolving_Bal / Credit_Limit` | Credit utilization rate |
| `Spending_Intensity` | `Total_Trans_Amt / Total_Trans_Ct` | Average spend per transaction |
| `Engagement_Score` | `Total_Trans_Ct / Months_on_book` | Activity normalized by tenure |
| `Customer_Value_Score` | `0.4·z(TransAmt) + 0.3·z(CreditLim) + 0.2·z(Tenure) − 0.1·z(Inactive)` | Composite value score |
| `Risk_Score` | `0.4·Util + 0.3·(Inactive/12) + 0.3·(1 − Engagement_norm)` | Composite risk score |
| `Customer_Tier` | Quartiles of `Customer_Value_Score` | Bronze/Silver/Gold/Platinum |

> ⚠️ Risk_Score and Customer_Value_Score **DO NOT use `Attrition_Flag`** in their formulas → no data leakage.

### Class Imbalance Handling

Dataset has **83.9% Existing** vs **16.1% Attrited** → Accuracy is misleading.

We compare 3 strategies:
- **Baseline**: no resampling
- **SMOTE**: oversample minority class on training set only
- **Cost-Sensitive**: cost matrix `[[0,1],[5,0]]` (FN costs 5× more than FP)

**Primary metrics**: F1 (Attrited class) + ROC-AUC + PR-AUC.

---

## 🔌 API Reference

Base URL: `http://localhost:8080/api`

### Overview & EDA

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/overview` | Dashboard KPIs |
| `GET` | `/eda/distribution?col=Credit_Limit&bins=20` | Distribution of one column |
| `GET` | `/eda/correlation` | Correlation matrix |
| `GET` | `/eda/churn-by?dim=Income_Category` | Churn rate by dimension |

### Customers & Clusters

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/customers?page=1&size=20&filter=...` | Paginated list |
| `GET` | `/customers/{id}` | Single customer detail |
| `GET` | `/clusters` | Cluster summaries |
| `GET` | `/clusters/{id}/customers` | Customers in cluster |

### Mining Results

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/rules?minLift=1.2` | Association rules |
| `GET` | `/anomalies` | Anomalous customers |
| `GET` | `/insights` | Business insights |

### Prediction

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/predict` | Churn prediction |

**Example request:**

```bash
curl -X POST http://localhost:8080/api/predict \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

**Example response:**

```json
{
  "churnProb": 0.124,
  "label": "Existing",
  "riskScore": 0.32,
  "cluster": 1,
  "clusterName": "Premium Loyal",
  "topFeatures": [
    {"name": "Total_Trans_Ct", "contribution": 0.28},
    {"name": "Avg_Utilization_Ratio", "contribution": 0.19},
    {"name": "Months_Inactive_12_mon", "contribution": 0.15}
  ],
  "recommendation": "Stable customer — eligible for premium upsell"
}
```

> 📚 Full API spec: see [`docs/api/openapi.yaml`](docs/api/openapi.yaml)

---

## 🗄 Database Schema

5 main tables:

```
customers       (10,127 rows)  → Raw data + 6 derived features + flags
clusters        (3-4 rows)      → Pre-computed cluster summaries
rules           (~30-50 rows)   → Apriori output
insights        (5+ rows)       → Hand-crafted business insights
predictions     (log)           → Every prediction call is logged
```

See full DDL: [`db/schema.sql`](db/schema.sql)

---

## 📈 Results & Evaluation

### Model Comparison (to be filled after training)

| Model | Strategy | Accuracy | Precision | Recall | F1 (Attr) | ROC-AUC |
|---|---|---|---|---|---|---|
| J48 | Baseline | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| J48 | SMOTE | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| RandomForest | Baseline | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| RandomForest | SMOTE | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| RandomForest | Cost-Sensitive | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| NaiveBayes | Baseline | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

### Cluster Personas (to be updated after training)

| Cluster | Persona | Size | Avg Risk | Churn Rate |
|---|---|---|---|---|
| C1 | Premium Loyal | _TBD_ | _TBD_ | _TBD_ |
| C2 | High-Risk Spenders | _TBD_ | _TBD_ | _TBD_ |
| C3 | Dormant | _TBD_ | _TBD_ | _TBD_ |

### Top 5 Association Rules (sample)

```
{Util=high, Inactive=high}              → Attrited  (sup=0.08, conf=0.78, lift=4.84)
{Trans_Ct=low, Card=Blue}                → Attrited  (sup=0.05, conf=0.72, lift=4.46)
{Tier=Platinum, Util=low}                → Existing  (sup=0.12, conf=0.95, lift=1.13)
...
```

### Business Insights (5+)

Each insight follows the **Discovery → Evidence → Recommendation** structure — see full details in [`docs/technical-report.docx`](docs/technical-report.docx) or the `/insights` page on the dashboard.

---

## 🚀 Deployment

### Production Architecture

```
Vercel (Frontend)  →  Render (Backend)  →  Neon (Database)
   Free tier            Free tier             Free tier
```

### Frontend → Vercel

```bash
cd web
vercel --prod
```

Configure env vars on Vercel dashboard:
- `NEXT_PUBLIC_API_URL=https://creditminer-api.onrender.com/api`

### Backend → Render

1. Push code to GitHub
2. Create a new Web Service on Render
3. Build command: `cd backend && mvn clean package -DskipTests`
4. Start command: `java -jar backend/target/creditminer-1.0.0.jar`
5. Env vars:
   - `SPRING_PROFILES_ACTIVE=prod`
   - `DATABASE_URL=<neon-connection-string>`

### Database → Neon

Create a project on [neon.tech](https://neon.tech), copy the connection string.

> 💡 Models need to be uploaded separately (Render persistent disk or S3) since they are large files.

---

## 🗓 Roadmap

### v1.0 (Course Project) — 8 Weeks

- [x] **Week 1**: Repo setup, preliminary EDA
- [x] **Week 2**: Preprocessing + Feature Engineering
- [ ] **Week 3**: Classification (3 models, tuning)
- [ ] **Week 4**: Clustering + Anomaly Detection
- [ ] **Week 5**: Apriori + Insights
- [ ] **Week 6**: Spring Boot REST API + DB
- [ ] **Week 7**: Next.js dashboard (7 pages)
- [ ] **Week 8**: Deploy + report + slides + video

### v2.0 (Future Extensions)

- [ ] Add XGBoost, LightGBM comparison (via Weka package)
- [ ] SHAP values for explainability
- [ ] Batch prediction (CSV upload → bulk predict)
- [ ] Automated model retraining pipeline
- [ ] A/B testing framework for recommendations
- [ ] Real-time anomaly alerting (WebSocket)

---

## 🤝 Contributing

This is an academic project, but feedback and contributions are always welcome.

### Workflow

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m 'feat: add amazing feature'` (following [Conventional Commits](https://www.conventionalcommits.org/))
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

### Code Style

- **Java**: Google Java Style Guide
- **TypeScript**: ESLint + Prettier (config included)
- **Commits**: Conventional Commits (`feat`, `fix`, `docs`, `refactor`, `test`)

---

## 📚 Documentation

| Document | Description | Link |
|---|---|---|
| 📘 Blueprint (VI) | Detailed design in Vietnamese | [`docs/blueprint_vi.md`](docs/blueprint_vi.md) |
| 📘 Blueprint (EN) | Detailed design in English | [`docs/blueprint_en.md`](docs/blueprint_en.md) |
| 📄 Technical Report | 30-40 page technical report | [`docs/technical-report.docx`](docs/technical-report.docx) |
| 🎤 Demo Slides | Presentation slides | [`docs/slides.pptx`](docs/slides.pptx) |
| 🎬 Demo Video | 5-7 minute walkthrough | [`docs/demo-video.mp4`](docs/demo-video.mp4) |
| 📡 API Spec | OpenAPI 3.0 specification | [`docs/api/openapi.yaml`](docs/api/openapi.yaml) |

### References

- [Weka Documentation](https://www.cs.waikato.ac.nz/ml/weka/documentation.html)
- [Credit Card Customers Dataset (Kaggle)](https://www.kaggle.com/datasets/sakshigoyal7/credit-card-customers)
- [CRISP-DM Methodology](https://www.datascience-pm.com/crisp-dm-2/)
- [Spring Boot Reference](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [Next.js Docs](https://nextjs.org/docs)

---

## 👥 Team

| Role | Name | Contact |
|---|---|---|
| Lead / Backend & Mining | _Member 1_ | _email_ |
| Frontend / UX | _Member 2_ | _email_ |
| Data / Analysis | _Member 3_ | _email_ |
| Documentation / DevOps | _Member 4_ | _email_ |

**Supervisor**: _Instructor's name_
**Course**: Data Mining
**Institution**: _University name_
**Semester**: _Semester / Year_

---

## ❓ FAQ

<details>
<summary><b>Why train in Java instead of Python?</b></summary>

The course requires using **Weka** — a Java-based data mining toolkit. Weka provides all the algorithms needed (J48, RandomForest, NaiveBayes, SimpleKMeans, Apriori) with both a GUI for rapid exploration and a Java API for application integration. Using Java + Weka also showcases the integration between data mining and software engineering, which is a major learning objective.
</details>

<details>
<summary><b>Why not use Accuracy as the primary metric?</b></summary>

The dataset has 83.9% Existing vs 16.1% Attrited customers. A model predicting **everyone as Existing** would achieve 83.9% accuracy yet be completely useless because it fails to detect any churning customer. We therefore use **F1-score on the Attrited class + ROC-AUC + PR-AUC** as primary metrics.
</details>

<details>
<summary><b>Does SMOTE affect the test set?</b></summary>

**NO**. SMOTE is applied **only to the training set**. The test set retains its original distribution to ensure fair evaluation. Applying SMOTE to the test set would inflate metrics and lead to production failure.
</details>

<details>
<summary><b>Does Risk Score have data leakage?</b></summary>

**NO**. Risk_Score is deliberately designed using only features that **do not include `Attrition_Flag`**: utilization, inactive months, and engagement. This is a critical design decision — if Risk_Score relied on the target, all models would "cheat" and achieve artificially perfect accuracy.
</details>

<details>
<summary><b>Can Apriori run directly on the original dataset?</b></summary>

**NO**. Apriori requires **nominal/categorical data**. The original dataset is mostly numerical (Credit_Limit, Total_Trans_Amt, etc.). We must **discretize** numerical features into bins (low/medium/high) before running Apriori. This pipeline is implemented in Phase 7.
</details>

<details>
<summary><b>Can I run this without Docker?</b></summary>

**Yes**. Install PostgreSQL locally, or use Neon (free tier, no local DB needed). Docker is just a convenience for fast dev setup.
</details>

<details>
<summary><b>How long does the full training pipeline take?</b></summary>

On a mid-range laptop (Intel i5, 16GB RAM):
- Preprocessing + Feature Engineering: ~10 seconds
- Train 3 classifiers + tuning: ~1-2 minutes
- KMeans clustering (k=2..8): ~30 seconds
- Apriori: ~10 seconds
- DB seeding: ~30 seconds

**Total**: ~3-5 minutes.
</details>

---

## 🐛 Bug Reports

Found a bug? Please [open an issue](https://github.com/<your-username>/creditminer/issues/new) with:
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Java version, Node version)

---

## 📜 License

This project was developed for **academic purposes** as part of the Data Mining course.

- **Source code**: MIT License (see [`LICENSE`](LICENSE))
- **Dataset**: Subject to [Kaggle Dataset License](https://www.kaggle.com/datasets/sakshigoyal7/credit-card-customers)
- **Report & slides**: © 2025 CreditMiner Team. All rights reserved.

---

## 🙏 Acknowledgments

- **Weka Team** — University of Waikato, for the excellent data mining toolkit
- **Sakshi Goyal** — for the Credit Card Customers dataset on Kaggle
- **shadcn** — for the beautiful and easy-to-use component library
- **Anthropic Claude** — for assistance in blueprint design and documentation
- **Our supervisor** — for the invaluable guidance and feedback throughout this project

---

<div align="center">

### ⭐ If this project is helpful, please leave a star on GitHub!

**Made with ☕ by the CreditMiner Team**

[⬆ Back to top](#-creditminer)

</div>