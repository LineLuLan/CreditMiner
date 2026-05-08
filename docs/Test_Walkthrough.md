# Test Walkthrough — CreditMiner

> Step-by-step E2E test scenarios per feature. Use this for **demo rehearsals** and **regression checks** before each merge to `develop`.

---

## 0. Pre-flight Checklist

Before running any walkthrough, ensure:

- [ ] Postgres reachable (`docker compose ps` shows `creditminer-postgres` healthy)
- [ ] `db/schema.sql` and `db/seed.sql` applied
- [ ] Backend running: `cd backend && mvn spring-boot:run` → http://localhost:8080
- [ ] `BankChurners.csv` placed at `backend/data/raw/BankChurners.csv`
- [ ] `TrainPipeline` has run at least once (so `models/*.model` exist)
- [ ] Frontend running: `cd web && pnpm dev` → http://localhost:3000

> If any item fails, mark it in `BE_Tracker.md` or `FE_Tracker.md` as **BLOCKED** and notify the team.

---

## 1. Backend smoke tests (curl)

### 1.1 `GET /api/overview`
```bash
curl -s http://localhost:8080/api/overview | jq
```
**Expected**: 200 with `totalCustomers >= 10000`, `churnRate ≈ 0.16`

### 1.2 `POST /api/predict` — low-risk customer
```bash
curl -X POST http://localhost:8080/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "customerAge": 45, "gender": "M", "dependentCount": 3,
    "educationLevel": "Graduate", "maritalStatus": "Married",
    "incomeCategory": "$60K - $80K", "cardCategory": "Blue",
    "monthsOnBook": 36, "totalRelationshipCount": 5,
    "monthsInactive12Mon": 2, "contactsCount12Mon": 3,
    "creditLimit": 12500, "totalRevolvingBal": 800,
    "totalTransAmt": 4500, "totalTransCt": 45,
    "avgUtilizationRatio": 0.064
  }'
```
**Expected**: 200 with `churnProb < 0.3`, `label = "Existing"`, `topFeatures` length = 3

### 1.3 `POST /api/predict` — high-risk customer
```bash
curl -X POST http://localhost:8080/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "customerAge": 52, "gender": "F", "dependentCount": 0,
    "educationLevel": "High School", "maritalStatus": "Divorced",
    "incomeCategory": "Less than $40K", "cardCategory": "Blue",
    "monthsOnBook": 18, "totalRelationshipCount": 2,
    "monthsInactive12Mon": 5, "contactsCount12Mon": 6,
    "creditLimit": 3000, "totalRevolvingBal": 2500,
    "totalTransAmt": 800, "totalTransCt": 12,
    "avgUtilizationRatio": 0.83
  }'
```
**Expected**: 200 with `churnProb > 0.6`, `label = "Attrited"`

### 1.4 `POST /api/predict` — invalid body
```bash
curl -X POST http://localhost:8080/api/predict \
  -H "Content-Type: application/json" \
  -d '{ "customerAge": -5 }'
```
**Expected**: 400 with `error.code = "VALIDATION_ERROR"`

### 1.5 `GET /api/customers?page=1&size=5`
**Expected**: 200, `items.length = 5`, `total = 10127`

### 1.6 `GET /api/customers/INVALID`
**Expected**: 404, `error.code = "NOT_FOUND"`

### 1.7 `GET /api/clusters`
**Expected**: 200, array length = k (3 or 4), each item has `personaName`, `centroid`

### 1.8 `GET /api/rules?minLift=1.5`
**Expected**: 200, all rules `lift > 1.5`, sorted desc

### 1.9 `GET /api/insights`
**Expected**: 200, length >= 5

### 1.10 `GET /api/anomalies`
**Expected**: 200, ~3-5% of customers (300-500 entries)

### 1.11 Cold-start behavior
Restart backend, immediately call `/predict` before init completes.
**Expected**: 503 with `error.code = "MODEL_NOT_LOADED"`. Retry after 5s should succeed.

---

## 2. Frontend page-by-page walkthrough

### 2.1 `/` Overview
1. Open http://localhost:3000
2. **Verify**: 4 KPI cards render with non-zero numbers
3. **Verify**: Donut chart shows churn split
4. **Verify**: No console errors
5. Reload — skeleton appears briefly

**Edge cases**:
- Stop backend → page should show error toast, retry button works
- Slow 3G (DevTools) → loading skeletons stay visible until data arrives

### 2.2 `/eda`
1. Pick `Credit_Limit` from dropdown
2. **Verify**: histogram appears with ~20 bins
3. Change `bins` slider to 10 — chart re-renders
4. Switch to correlation tab — heatmap renders, hover shows values
5. Switch to "churn-by" tab, pick `Income_Category` — bar chart renders

### 2.3 `/customers`
1. Table loads page 1 (20 rows)
2. Click `Risk Score` header — sort toggles asc/desc
3. Filter by `attritionFlag = Attrited` — table updates, total drops
4. Page-2 button — second page loads
5. Click any row — detail Sheet opens with all fields

**Edge cases**:
- URL params persist on reload (filters, page)
- Empty filter result shows empty state, not crash

### 2.4 `/clusters`
1. PCA scatter renders with k colors
2. Hover any point — tooltip shows clientNum
3. Persona cards below show all k clusters
4. Click a persona — drawer lists customers in that cluster

### 2.5 `/rules`
1. Rules table loads sorted by `lift` desc
2. Move min-lift slider — table filters
3. Click sup/conf scatter — points correspond to table rows
4. Filter by `category = churn` — only churn rules visible

### 2.6 `/predict` ⭐ (DEMO CRITICAL)
1. **Empty form** — submit → validation errors highlight required fields
2. Click **"Load sample customer"** — form fills with low-risk customer
3. Submit → result section appears within ~1s
4. **Verify**:
   - Probability gauge animates 0 → ~12%
   - Label badge shows "Existing" in green
   - Top-3 features bar shows non-zero contributions
   - Cluster name + persona link works
   - Recommendation text is non-empty
5. Manually edit `avgUtilizationRatio` to 0.85 + `monthsInactive12Mon` to 5 — submit → result flips to "Attrited" red
6. Submit 5x in a row — no UI lag, no duplicate requests (debounced)

### 2.7 `/insights`
1. Accordion shows 5+ collapsed insights
2. Expand each — Discovery / Evidence / Recommendation visible
3. Filter by category — list shrinks

---

## 3. Cross-feature scenarios

### 3.1 Sample Demo Story (5 minutes)
1. Start at `/` — "Here's our 10K customers, 16% churning."
2. → `/eda` — "Churn highly correlated with low transaction count + high utilization."
3. → `/clusters` — "We found 3 personas: Premium Loyal, High-Risk Spenders, Dormant."
4. → `/rules` — "Top rule: high-utilization + inactive → churn (lift 4.8)."
5. → `/predict` — "Let's predict for a real customer..." Load sample → submit.
6. → `/insights` — "Here are 5 actionable recommendations..."

### 3.2 Performance budgets
Use Chrome DevTools or Lighthouse:
- Initial page load: LCP < 2.5s
- API call latency: p95 < 500ms
- Time to interactive: < 3s

### 3.3 Accessibility
- Tab navigation works on all pages
- Screen reader announces results on `/predict`
- Color contrast >= 4.5:1 (Lighthouse)
- All charts have textual fallback (data table)

---

## 4. Browser compatibility

| Browser | Version | Tested |
|---|---|---|
| Chrome | latest | TBD |
| Firefox | latest | TBD |
| Safari | latest | TBD |
| Edge | latest | TBD |

(Mark as ✅/❌ after each release)

---

## 5. Automated tests (when present)

```bash
# Backend
cd backend && mvn test

# Frontend
cd web && pnpm test
cd web && pnpm test:e2e   # Playwright (optional)
```

---

## 6. Known issues
_(Update as discovered. Move to "Resolved" once fixed.)_

| Date | Issue | Severity | Status |
|---|---|---|---|
| _(none yet)_ | | | |
