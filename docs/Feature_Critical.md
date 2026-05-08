# Critical Features — Risk-Tiered Scope

> **Use this when time is short.** Scope decisions live here.
> If you're tempted to add a Tier 4 feature, ask: "Does it improve M5 (demo) or M6 (submission)?" If no, skip.

---

## Tier 1 — MUST-HAVE for demo/submission

These features collectively ARE the project. If any one fails, the demo fails.

| ID | Feature | BE | FE | DB | Risk if missing |
|---|---|---|---|---|---|
| C1 | `/api/predict` endpoint working with RandomForest | ✅ | | | No demo |
| C2 | `/predict` page form + result | | ✅ | | No demo |
| C3 | Overview page (`/`) with 4 KPIs + donut | | ✅ | | Looks empty |
| C4 | At least 1 trained classifier with F1 ≥ 0.75 | ✅ | | | Pipeline incomplete |
| C5 | KMeans clustering with 3+ clusters labeled | ✅ | | ✅ | No persona story |
| C6 | 5+ insights (Discovery/Evidence/Recommendation) | ✅ | ✅ | ✅ | No business value shown |
| C7 | DB schema applied + seeded | | | ✅ | No data layer |
| C8 | Skeleton + branching workflow | | | | (Done in W1) |
| C9 | README + technical report (30-40 pgs) | | | | Submission rejected |
| C10 | Demo video (5-7 min) | | | | Grading penalty |

**Ship blocker policy**: any Tier 1 task in `BLOCKED` for >2 days escalates to lead.

---

## Tier 2 — SHOULD-HAVE (quality lift)

These make the demo polished but the project survives without them.

| ID | Feature | Effort | Drop if behind |
|---|---|---|---|
| Q1 | EDA page (`/eda`) — histogram, correlation, churn-by | 1 day | YES — story can be told from /clusters |
| Q2 | Customers table (`/customers`) — server-side pagination + filter | 2 days | NO — useful for grading |
| Q3 | Rules page (`/rules`) — table + scatter | 1 day | YES — Apriori output can be in slides |
| Q4 | Clusters page (`/clusters`) — PCA scatter + personas | 1.5 days | NO — central to story |
| Q5 | Anomaly detection flag in DB + `/api/anomalies` | 1 day | YES — only ~5% of customers |
| Q6 | SMOTE + Cost-Sensitive comparison table | 0.5 day | NO — demonstrates DM rigor |
| Q7 | 10-fold CV results in report | 0.5 day | NO — grading criterion |
| Q8 | Loading skeletons everywhere | 0.5 day | NO — polish matters in demo |
| Q9 | Error toasts | 0.5 day | YES — alerts are fine fallback |
| Q10 | Dark mode polish | 1 day | YES — light mode acceptable |

---

## Tier 3 — NICE-TO-HAVE (only if ahead)

| ID | Feature | Effort |
|---|---|---|
| N1 | Playwright E2E tests | 1 day |
| N2 | Live deploy (Vercel + Render + Neon) | 1.5 days |
| N3 | Batch predict (CSV upload) | 1 day |
| N4 | EM clustering comparison | 0.5 day |
| N5 | SHAP explainability | 2 days |
| N6 | Model versioning UI | 0.5 day |
| N7 | Real-time anomaly WebSocket | 2 days |
| N8 | Mobile-perfect responsive | 1 day |

---

## Tier 4 — EXPLICITLY OUT OF SCOPE

Do NOT spend time on these in v1.

- Authentication / authorization
- Multi-tenancy
- A/B testing framework
- Internationalization
- PWA / offline support
- Custom design system (use shadcn defaults)
- Server actions for `/predict` (use REST endpoint)
- GraphQL (REST only)
- Microservices split (single Spring Boot app)
- Kubernetes deployment

---

## Scope Cut Drill (when behind)

If by **end of W6** any of these are not done, cut Tier 2 features in this order:
1. Drop `Q3 Rules page` (slides cover it)
2. Drop `Q1 EDA page` (story works without it)
3. Drop `Q9 Error toasts` (use browser alerts)
4. Drop `Q10 Dark mode` (default light mode)
5. Drop `Q5 Anomaly UI` (keep DB flags)

If by **end of W7** still behind: deliver only Tier 1 + report + slides + video. Live deploy is optional.

---

## Risk Matrix (probability × impact)

```
                Low impact     Medium impact     High impact
Low prob        Q10            Q9                Q1, Q3
Medium prob                    N3, N4            Q2, Q5
High prob                      Q7                C1 (predict latency)
```

**Top watch**: C1 inference latency. If `/predict` p95 > 500ms in W6, optimize:
- Pre-load all models in `@PostConstruct`
- Cache feature engineering for sample customers
- Switch from RF (slow) to J48 (fast) if needed

---

## Dependency Risks

| Dependency | Risk | Mitigation |
|---|---|---|
| Weka 3.8.6 | Old API; Neon Postgres compat | Locked version in pom.xml |
| Next.js 14 | Breaking changes in 15 | Pinned to 14.x |
| shadcn/ui | Manual copy of components | Lock versions in `components.json` |
| Neon free tier | DB suspends after inactivity | Add health-check pinger |
| Render free tier | Cold start > 30s | Warm-up pinger from frontend |
| Kaggle dataset | URL changes / TOS | Mirror to `db/seeds/` if needed |
