# Project Roadmap — CreditMiner

> **Master timeline & milestone tracker.** Updated weekly by the lead.
> Current pointer: **Week 1 — Skeleton Bootstrap ✅**

---

## Current Status

```
[████░░░░░░░░░░░░░░░░] 5% — Skeleton bootstrap complete
```

| Field | Value |
|---|---|
| Sprint week | 1 / 8 |
| Phase | Phase 0 — Setup |
| Branch state | main + develop + backend + frontend all in sync |
| Tag | `v0.1.0-skeleton` |
| Next milestone | Phase 1 — Data Understanding (BE) + Layout (FE) |
| Active blockers | 0 |

---

## 8-Week Plan

| Week | Theme | BE Output | FE Output | Demo state |
|---|---|---|---|---|
| **W1** ✅ | Setup + EDA | Repo scaffold, preliminary EDA in Weka GUI | Repo scaffold, layout shell | "skeleton runs locally" |
| **W2** | Preprocess + Feature Eng | `clean.arff`, `clean_assoc.arff`, 6 derived features | Overview page wired with stub data | "overview KPIs render" |
| **W3** | Classification | 3 classifiers trained + tuned + comparison table | EDA page wired | "EDA charts work" |
| **W4** | Clustering + Anomaly | `kmeans.model`, persona descriptions | Customers page table | "browse customers" |
| **W5** | Apriori + Insights | `rules.json`, 5 insights | Clusters + Rules pages | "rules + clusters viewable" |
| **W6** | REST API | All 12 endpoints live | All pages talk to real BE | "real data end-to-end" |
| **W7** | Predict UX + polish | Prediction logging, refinements | Predict form polished + dark mode | "demo-ready" |
| **W8** | Deploy + report | Render deploy, model upload | Vercel deploy, screenshots | "submit" |

---

## Critical Path (must-not-slip)

```
Phase 1 (W1) ──▶ Phase 2 (W2) ──▶ Phase 3 (W2) ──▶ Phase 5 (W3)
                                                       │
                                                       ▼
                                                   Models exist
                                                       │
                                                       ▼
                                            BE-90 /predict (W6) ◄── FE-70 form (W7)
                                                       │
                                                       ▼
                                                  Demo (W8)
```

If `/api/predict` slips, the demo loses its centerpiece. Protect it.

---

## Milestones

| ID | Name | Target | Status |
|---|---|---|---|
| M1 | Skeleton bootstrap | end W1 | ✅ DONE — tag `v0.1.0-skeleton` |
| M2 | Models trained (3 classifiers + KMeans + Apriori) | end W5 | PENDING |
| M3 | Backend API complete (all 12 endpoints) | end W6 | PENDING |
| M4 | Frontend MVP (all 7 pages live) | mid W7 | PENDING |
| M5 | E2E demo recorded | mid W8 | PENDING |
| M6 | Submit + report + slides | end W8 | PENDING |

---

## Dependency Graph

```
                       ┌────────────────┐
                       │  M1 Skeleton   │ ─── tag v0.1.0
                       └───────┬────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
     ┌────────────────┐              ┌──────────────────┐
     │ BE Phase 1-4   │              │ FE Layout + Pgs  │
     │ (preprocess +  │              │ stubbed          │
     │  features)     │              └────────┬─────────┘
     └───────┬────────┘                       │
             │                                │
             ▼                                │
     ┌────────────────┐                       │
     │ M2 Models      │                       │
     │ (classify +    │                       │
     │  cluster +     │                       │
     │  rules)        │                       │
     └───────┬────────┘                       │
             │                                │
             ▼                                │
     ┌────────────────┐                       │
     │ M3 REST API    │ ◄─────────────────────┘
     │ (12 endpoints) │
     └───────┬────────┘
             │
             ▼
     ┌────────────────┐
     │ M4 FE wired    │
     └───────┬────────┘
             │
             ▼
     ┌────────────────┐
     │ M5 + M6 ship   │
     └────────────────┘
```

---

## Risks & Blockers (live log)

| Date | Risk / Blocker | Severity | Mitigation | Status |
|---|---|---|---|---|
| W1 | Apriori may yield few useful rules | High | Lower minSupport to 0.03; try FP-Growth fallback | Not yet hit |
| W1 | Java + Weka deploy is awkward on Render | Medium | Build fat JAR; use Render's Java runtime | Not yet hit |
| W1 | 10K rows render slowly in browser | Low | Server-side pagination already planned | Mitigated by design |
| _(add new entries weekly)_ | | | | |

---

## Weekly Reviews

### Week 1 (current) — Setup
- ✅ Repo created, branches set up
- ✅ Skeleton scaffolds compile/build (or flagged for manual)
- ✅ All 7 trackers seeded
- 🎯 Next: Phase 1 EDA on `backend` branch + Layout shell on `frontend` branch

### Week 2
_(fill at end of week)_

### Week 3
_(fill at end of week)_

---

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| W1 | Branching: 4-branch flat (main / develop / backend / frontend), no rebase | User-mandated; preserves history fully |
| W1 | Merge strategy: `--no-ff` always | History stays linear-readable but never rewritten |
| W1 | Move blueprints to `docs/` | Matches README structure; centralizes docs |
| W1 | Skeleton level = "Detailed scaffolding" | Faster team onboarding |
| W1 | No auth in API | Academic project; deploy with caveat |

---

## Final Deliverables Checklist (W8)

- [ ] `clean.csv` + `clean.arff` + `clean_assoc.arff`
- [ ] `models/*.model` + `models/rules.json`
- [ ] Backend repo (Maven, deployable)
- [ ] Frontend repo (Next.js, deployable)
- [ ] `db/schema.sql` + `db/seed.sql`
- [ ] 30-40 page technical report (DOCX/PDF)
- [ ] 15-20 demo slides
- [ ] 5-7 minute walkthrough video
- [ ] README with screenshots
- [ ] Live demo URL (optional)
