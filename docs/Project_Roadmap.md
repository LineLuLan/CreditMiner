# CreditMiner project roadmap

Updated: 2026-09-28

## Objective

Deliver a reproducible IT160IU Data Mining project that predicts credit-card default on UCI dataset 350 and mines six-month repayment sequences with GSP. The repository must include the offline evidence, REST API, interactive dashboard, and print-first academic report.

## Current status

| Workstream | State | Evidence |
|---|---|---|
| Data understanding and preparation | Done | 30,000 source rows; 29,965 rows after duplicate removal; Phase 1-3 artifacts |
| Classification | Done | Ten Weka variants, 10-fold cross-validation, and a 5,993-row holdout test |
| Clustering and anomaly analysis | Done | K-means with `k=2`, PCA coordinates, and centroid-distance evidence |
| Association rules | Done | 42 default rules and 50 non-default rules |
| Sequence mining | Done | GSP patterns at support `0.10` and a fold-local feature experiment |
| Backend and demo profile | Done | Spring API, H2 demo seed, PostgreSQL profiles, and shaded CLI |
| Frontend and reports | Done | Current application routes, including the STE report and print-first paper |
| Repository scope migration | Done in wave 4 | Current dataset, APIs, web views, samples, and documentation aligned |
| Submission administration | Open | Team roster, instructor confirmation, and final ZIP |

## Assignment coverage

| Step | Deliverable | Implementation |
|---|---|---|
| 1. Understand and prepare data | Data description, cleaning, and engineered features | `Phase1Report`, `Phase2Report`, `Phase3Report` |
| 2. Apply mining methods | Classification, clustering, anomalies, and association rules | `Phase5Pipeline`, `Phase6Pipeline`, `Phase7Pipeline` |
| 3. Evaluate and interpret | Cross-validation, holdout metrics, insights, and sequence experiment | Phase 5 evidence, `InsightFactsReport`, `Phase10Pipeline` |
| 4. Present the result | API, dashboard, STE report, and academic paper | Spring Boot, Next.js, `/mining-report`, `/report/paper` |

## Verified headline results

| Result | Value |
|---|---:|
| Rows after cleaning | 29,965 |
| Training rows | 23,972 |
| Test rows | 5,993 |
| Default rate | 22.1% |
| Best model | RandomForest cost-sensitive |
| Cross-validation F1, `Default=Yes` | 0.5263 |
| Holdout F1, `Default=Yes` | 0.5333 |
| Holdout ROC AUC | 0.777 |
| Frequent patterns, default group | 2,037 |
| Frequent patterns, non-default group | 1,729 |
| Strongest default pattern | `<{PARTIAL}{LATE_2}>`: 48.2% versus 14.1% |

## Milestones

| Milestone | State | Exit condition |
|---|---|---|
| Scope migration | Complete | Current data schema is used from raw input through UI |
| Mining evidence | Complete | All eight offline mains produce their contracted artifacts |
| Application integration | Complete | Demo and PostgreSQL profiles expose the documented API |
| Report integration | Complete | Web and print views use the same evidence contracts |
| Documentation refresh | Complete | Root and `docs/` guides describe only the current scope |
| Team roster | Open | Replace each placeholder with the confirmed name and student ID |
| Instructor review | Open | Confirm the expected report and code packaging with the instructor |
| Submission ZIP | Open | Build, inspect, and submit the final folder |

## Remaining actions

1. Confirm all team member names and student IDs. Do not infer them from commit history.
2. Ask the instructor to confirm the final naming and content rules.
3. Export `/report/paper` to `report.pdf`.
4. Run the repository quality gates and inspect the generated submission folder.
5. Build the final ZIP with `scripts/build-submission.ps1`.

## Risks and controls

| Risk | Control |
|---|---|
| Generated evidence does not match the submitted code | Regenerate all eight phases in order and compare artifact timestamps |
| Dataset licence is omitted | Keep the UCI dataset 350 citation and CC BY 4.0 notice in the README and report |
| Sequence feature selection leaks across folds | Keep pattern selection inside each training fold |
| Local demo depends on an external database | Use the `demo` profile with H2 and seeded artifacts |
| Credentials enter the archive | Use the git-ignored `backend/.env` pattern and run a secret scan |
| Submission contains local caches or credentials | Build from the packaging script and inspect the output before delivery |

## Completion checklist

- [x] Offline phase chain and evidence artifacts
- [x] Spring API and demo profile
- [x] Next.js dashboard and report routes
- [x] GSP sequence evidence
- [x] Current documentation and API samples
- [ ] Confirmed team roster
- [ ] Instructor confirmation
- [ ] Final `report.pdf`
- [ ] Final submission ZIP
