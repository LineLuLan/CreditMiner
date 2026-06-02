# Project Brief - CreditMiner

## Product Scope

CreditMiner is an academic full-stack data mining system for credit card customer behavior analysis. It turns the BankChurners dataset into a dashboard and prediction workflow for churn risk, customer segments, association rules, anomaly review, and insight recommendations.

## Target Users

- Course evaluators reviewing CRISP-DM execution, technical quality, and demo readiness.
- Student team members coordinating backend, frontend, database, and report work.
- Demo operators who need a reproducible local or hosted walkthrough.

## Success Criteria

- The backend exposes the documented REST API for overview, EDA, customers, clusters, rules, insights, anomalies, and prediction.
- The frontend provides the 7-page dashboard: overview, EDA, customers, clusters, rules, predict, and insights.
- Data mining outputs are reproducible from source data and documented with evaluation metrics.
- Demo-critical `/api/predict` returns churn probability, label, top features, cluster/persona, recommendation, and logs predictions.
- Repo state is safe to resume after a long break: branch policy, setup steps, toolchain gaps, known risks, and validation status are clear.

## Tech Stack

- Backend: Java 17, Spring Boot 3.2, Maven, Weka 3.8.6, Spring Data JPA, PostgreSQL.
- Frontend: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, shadcn/ui, Recharts, TanStack Query/Table, React Hook Form, Zod.
- Database: PostgreSQL local via Docker for development; Neon for hosted production-like data.
- Verification: Maven tests, Next.js typecheck/lint/build, Playwright/axe, Lighthouse CI.

## Constraints And Non-Goals

- No auth layer is in scope for the academic demo; do not expose publicly without an access layer.
- Raw Kaggle CSV, generated ARFF/CSV outputs, and model binaries are intentionally gitignored.
- Production credentials must never be stored in docs, commits, chat, screenshots, or memory files.
- Database writes, migrations, seed runs, resets, or production-like maintenance require explicit DB confirmation and rollback planning.
- Current re-onboarding cleanup is documentation, safety, and verification only; no public API changes, DB writes, training runs, deployment, or GitHub writes.
