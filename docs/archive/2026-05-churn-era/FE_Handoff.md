# FE → BE Handoff: Asks & Open Questions

> Frontend's wish-list and clarifications addressed to Backend.
> When BE answers, mark item as **RESOLVED** with link to the implementation commit/endpoint.

---

## 1. Environment Variables Needed

The frontend needs the following from BE / DevOps:

| Var | Purpose | Status |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL for the REST API | OPEN — default `http://localhost:8080/api` |
| `NEXT_PUBLIC_APP_NAME` | Branding (currently "CreditMiner") | OPEN |
| `NEXT_PUBLIC_FEATURE_DARK_MODE` | Toggle dark mode (default true) | OPEN |
| `NEXT_PUBLIC_GA_ID` | Optional analytics (skip for academic demo) | DEFERRED |

---

## 2. Error Messages Wanted

We want **user-friendly** error strings the FE can surface verbatim. Please add a `userMessage` field on top of the existing error envelope, OR document mapping.

Examples we want:

| Error code | User message |
|---|---|
| `VALIDATION_ERROR` | "Some fields are invalid. Please review and try again." |
| `MODEL_NOT_LOADED` | "The prediction service is starting up — try again in a few seconds." |
| `INFERENCE_ERROR` | "We couldn't compute a prediction for this customer. Please contact support." |
| `DB_ERROR` | "Service temporarily unavailable. Please try again later." |
| `NOT_FOUND` | "We couldn't find this customer." |

**Status**: OPEN

---

## 3. Edge Cases & Empty States

We need predictable BE responses for these:

| Scenario | Expected BE behavior |
|---|---|
| `/api/customers` with no results | `{ total: 0, items: [] }` (200) — NOT 404 |
| `/api/clusters` before training done | 503 with `MODEL_NOT_LOADED` |
| `/api/predict` with all-zeros body | 400 with `VALIDATION_ERROR` |
| `/api/rules?minLift=99` (no rules match) | `[]` (200) — NOT 404 |
| `/api/customers/0` (invalid id) | 404 with `NOT_FOUND` |

**Status**: OPEN

---

## 4. Loading & Performance Expectations

We will show loading skeletons. Please target these latencies:

| Endpoint | Target p95 | Hard cap |
|---|---|---|
| `/api/overview` | 50 ms | 200 ms |
| `/api/predict` | 100 ms | 500 ms |
| `/api/customers?size=20` | 100 ms | 500 ms |
| `/api/eda/correlation` | 200 ms | 1000 ms |
| `/api/rules` | 100 ms | 500 ms |

If anything exceeds the hard cap, please paginate or cache.

**Status**: TARGETS-SET (verify after Wave 7)

---

## 5. CORS

Spring Boot must allow:

- Origin: `http://localhost:3000` (dev), `https://creditminer-demo.vercel.app` (prod, TBD)
- Methods: `GET, POST, OPTIONS`
- Headers: `Content-Type, Accept`
- Credentials: `false` (no cookies — academic project)

**Status**: ASK — implement in `CorsConfig.java` (BE-02)

---

## 6. Sample Data for Form

For the `/predict` page "Load Sample" button, we'd like:

- An endpoint or static JSON with **3 example customers** representing:
  1. **Low-risk loyal**: `{customerAge: 45, totalTransCt: 80, monthsInactive12Mon: 1, ...}`
  2. **Borderline / mid-risk**: `{...}`
  3. **High-risk imminent churn**: `{customerAge: 52, totalTransCt: 25, monthsInactive12Mon: 5, avgUtilizationRatio: 0.85, ...}`

Either expose `/api/customers/samples` or commit a static `web/public/sample-customers.json` — we don't mind which.

**Status**: OPEN

---

## 7. Accessibility

We're targeting **WCAG 2.1 AA**. From BE, we just need:

- Don't rely on color alone in any returned data (e.g., always include `category: "churn"|"retention"` text alongside any color hint)
- Numeric IDs are fine; humans see persona names which BE already provides.

**Status**: NOTED

---

## 8. Versioning & Breaking Changes

Please bump endpoint to `/api/v2/...` for any breaking change. Additive changes are fine without bump.

If a field is renamed, add the new one and keep the old one for **2 weeks** with `@deprecated` JSDoc/comment in `BE_Handoff.md`.

**Status**: AGREED

---

## 9. Open Questions

- [ ] Should `/api/predict` return raw probability (0..1) or percentage (0..100)? — **FE ask: 0..1, we format**
- [ ] Will there be batch predict (CSV upload)? — v2 maybe
- [ ] How to handle prediction history per browser session? — store client-side in localStorage for now
- [ ] PCA coordinates: separate endpoint or in `/api/clusters`? — **FE ask: in `/api/clusters`, one round-trip**

### Resolved
_(none yet)_

---

## 10. Testing Coordination

We will provide a Postman/Bruno collection in `docs/api/` once endpoints are live. Please share fixtures for E2E tests (`docs/api/fixtures/`).
