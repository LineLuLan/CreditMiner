# Project brief — CreditMiner

## Project identity

| Field | Value |
| --- | --- |
| Course | IT160IU Data Mining |
| Project | CreditMiner |
| Dataset | UCI Machine Learning Repository dataset 350, Default of Credit Card Clients |
| Citation | Yeh and Lien, 2009 |
| Dataset license | CC BY 4.0 |
| Team leader | Tran Nam Anh (ITDSIU23030) |
| Other members | [Full name] ([Student ID]) — to be confirmed |

## Product statement

CreditMiner is a reproducible data mining project for credit-card default prediction and repayment-pattern analysis. It converts a 30,000-client source dataset into Weka models, descriptive evidence, clusters, association rules, anomaly signals, and GSP sequence patterns. A Spring Boot API and Next.js dashboard make the results inspectable for course assessment and portfolio review.

## Users

- Course evaluators who need traceable evidence for every assignment step.
- Student team members who regenerate artifacts and prepare the report.
- Demo operators who need a local run without database credentials.
- Portfolio reviewers who want to inspect the architecture, API, and results.

## Assignment outcomes

| Step | Outcome | Implementation |
| --- | --- | --- |
| 1. Prepare and understand the data | Clean source data, descriptive statistics, and engineered features | Phases 1–3 |
| 2. Predict default | Create the reproducible seed-42 split and compare ten classifier variants with cross-validation and holdout evaluation | Phase 5 |
| 3. Discover patterns | Produce clusters, PCA, anomalies, Apriori rules, and GSP sequences | Phases 6, 7, and 10 |
| 4. Communicate results | Serve evidence through an API, dashboard, web report, and print report | Insight facts, Spring Boot, and Next.js |

## Evidence of success

| Measure | Current artifact result |
| --- | ---: |
| Clean rows | 29,965 |
| Train / test rows | 23,972 / 5,993 |
| Default rate | 22.1% |
| Selected classifier | Cost-sensitive RandomForest |
| Cross-validation F1 for `Default=Yes` | 0.5263 |
| Holdout F1 for `Default=Yes` | 0.5333 |
| Holdout ROC AUC | 0.777 |
| GSP patterns at support 0.10 | 2,037 default / 1,729 non-default |

The strongest reported default pattern is `<{PARTIAL}{LATE_2}>`, with support of 48.2% in the default group and 14.1% in the non-default group.

## Deliverables

- A reproducible eight-stage offline pipeline.
- Serialized Weka classifier and cluster models.
- JSON, CSV, and ARFF evidence artifacts.
- A shaded CLI JAR with preprocessing, training, prediction, evaluation, and sequence commands.
- A Spring Boot REST API under `/api`.
- An interactive Next.js application with overview, EDA, cluster, customer, rule, insight, prediction, pipeline, sequence, and report pages.
- A print-first academic report at `/report/paper` for PDF output.
- A submission folder containing `report.pdf` and `code/`.

## Technical scope

The backend uses Java 17, Spring Boot 3.2.5, Weka 3.8.6, the GSP package 1.0.1, Maven, Spring Data JPA, H2, and PostgreSQL. The frontend uses Next.js 14.2 App Router, TypeScript, Tailwind, shadcn, Recharts, TanStack Query, and zod.

The local demo uses H2 and seeds it from generated artifacts. Development and production profiles use PostgreSQL, including Neon. The pipeline trains offline; the API loads model artifacts for online inference.

## Constraints

- Do not invent team details, results, citations, or run status.
- Do not store database credentials or other secrets in the repository.
- Do not perform database writes, migrations, resets, or seeds without an explicit target and rollback plan.
- Do not expose the academic demo publicly without an access layer.
- Keep source data attribution and the third-party licenses with redistributed material.
- Keep raw, processed, and model schemas aligned across a single pipeline run.

## Out of scope

- Real-time model retraining.
- Authentication and multi-tenant access.
- Automated production deployment.
- A production credit decision system.
- Claims that the model is suitable for lending decisions without further validation, fairness review, and governance.

## Completion definition

The course project is complete when the documented pipeline is reproducible, the API and web gates pass, the report matches the generated artifacts, all team details are confirmed, the instructor confirms the expected submission form, and the final submission ZIP is inspected before delivery.

See [README.md](README.md) for operator commands, [Architecture.md](Architecture.md) for the design, and [ACTIVE_STATE.md](ACTIVE_STATE.md) for the current delivery state.
