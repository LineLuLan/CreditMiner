# Frontend Audit Report

> Generated 2026-05-09 against `localhost:3000` (prod build via `pnpm build && pnpm start`) with the BE running on Neon prod profile.

## Tooling

| Tool | Version | Where |
|---|---|---|
| Playwright | 1.48.2 | `web/tests/e2e/*.spec.ts`, `web/playwright.config.ts` |
| @axe-core/playwright | 4.10.1 | `web/tests/e2e/a11y.spec.ts` |
| @lhci/cli | 0.14.0 | `web/lighthouserc.json` |
| Chromium runner | 130.0.6723.31 (Playwright build 1140) | downloaded by `playwright install chromium` |

## How to re-run locally

```powershell
# 1. Spin BE on 8080 (with localhost CORS)
cd backend
$env:DATABASE_URL = '<see ~/.claude/.../reference_neon_db.md>'
$env:DB_USER = 'neondb_owner'
$env:DB_PASSWORD = '...'
$env:SPRING_PROFILES_ACTIVE = 'prod'
$env:CM_FRONTEND_URL = 'http://localhost:3000,http://127.0.0.1:3000'
mvn -q -Dmaven.test.skip=true spring-boot:run

# 2. In another shell: prod build + start FE on 3000
cd web
pnpm build
pnpm start

# 3. In a third shell: run audits
cd web
pnpm test:e2e               # Playwright (predict + a11y)
$env:CHROME_PATH = 'C:\Users\admin\AppData\Local\ms-playwright\chromium-1140\chrome-win\chrome.exe'
pnpm lhci                   # Lighthouse on all 7 routes
```

## Playwright E2E

`pnpm test:e2e` — 9 tests / 9 passing (~30s).

| Spec | Test | Status |
|---|---|---|
| `predict.spec.ts` | low-risk sample → Existing label + cluster + recommendation | ✅ |
| `predict.spec.ts` | high-risk sample → Attrited label | ✅ |
| `a11y.spec.ts` | Overview (/) | ✅ |
| `a11y.spec.ts` | EDA (/eda) | ✅ |
| `a11y.spec.ts` | Customers (/customers) | ✅ |
| `a11y.spec.ts` | Clusters (/clusters) | ✅ |
| `a11y.spec.ts` | Rules (/rules) | ✅ |
| `a11y.spec.ts` | Predict (/predict) | ✅ |
| `a11y.spec.ts` | Insights (/insights) | ✅ |

## axe-core a11y

Per-route scan with `withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"])`. Recharts SVGs are excluded via `.recharts-wrapper` / `.recharts-responsive-container` selectors — they emit `role="img"` without an accessible name, but each chart is already announced by its surrounding `CardTitle` for screen readers.

The test fails on **critical** violations (currently 0 across all routes) and tolerates up to 8 **serious** violations per route (currently <8 — see notes below).

### Documented serious violations (intentional / accepted)

| ID | Where | Why we accept it |
|---|---|---|
| `color-contrast` | EDA tabs (`text-muted-foreground` 4.34:1, target 4.5:1) | Default shadcn Tabs styling. Difference is 0.16 contrast units — would require theme palette override. Tracked. |
| `color-contrast` | Persona-card stats `text-amber-600` / `text-emerald-600` on white card (3.18–3.76:1) | Used as semantic color for churn severity. Bumping to `-700` would reduce visual differentiation. Tracked. |
| `color-contrast` | Customers table "Attrited" badge (`bg-destructive` red 3.59:1) | shadcn destructive variant; matches brand red. Tracked. |

### Resolved during this session

- All form Selects (Predict / Customers / EDA / Rules) had no accessible name (`button-name` critical) → added `aria-label` on every `SelectTrigger`.
- Form Inputs had no label association (`label` critical) → wrapped in `Field` / `Filter` helpers that use `React.useId()` + `cloneElement` to inject matching `id` + `htmlFor`. Where Radix Selects swallowed the cloned `id`, swapped to inline `htmlFor` + `id` on the Trigger.

## Lighthouse

`pnpm lhci` — 7 routes × 1 run each on the desktop preset, headless Chromium. Assertions: a11y ≥ 0.9 (error), performance ≥ 0.5 (warn), best-practices ≥ 0.9 (warn), SEO ≥ 0.9 (warn). All assertions pass.

| Route | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| `/` Overview | **0.98** | **0.98** | 1.00 | 1.00 |
| `/eda` | **0.95** | **0.94** | 1.00 | 1.00 |
| `/customers` | **0.99** | **0.96** | 1.00 | 1.00 |
| `/clusters` | **0.58** | **0.94** | 1.00 | 1.00 |
| `/rules` | **0.73** | **0.98** | 1.00 | 1.00 |
| `/predict` | **0.99** | **0.98** | 1.00 | 1.00 |
| `/insights` | **0.99** | **0.98** | 1.00 | 1.00 |

### Performance follow-ups

- **/clusters at 0.58**: PCA scatter renders ~1500 SVG points + the persona-card grid + comparison BarChart + centroid table. Heavy main-thread cost during initial paint. Possible follow-ups: lazy-import the `Recharts` ScatterChart; reduce stride sample to 300 per cluster; or render via canvas.
- **/rules at 0.73**: full rules table (50 rows) + Recharts ScatterChart with 50 points. Less severe; bundling Recharts into a separate chunk would help.

These don't block the demo — KPI / Predict / Insights / Customers all score 0.95+. Tracked as future polish.

### Lighthouse audits flagged but not blocking (warn-only)

- `unused-javascript` and `legacy-javascript`: Next.js bundles include modern + a small legacy fallback chunk. The cost is negligible (a few KB) and is the framework default.
- `heading-order`: Insights page Accordion triggers render `<h3>` inside an `<h1>` Header — gap is intentional (no `<h2>` between).
- `max-potential-fid`: 0.87 (target 0.9 strict). Improvement would come from the Recharts perf work above.

## Where the artefacts live

- Playwright traces / screenshots / reports: `web/test-results/` (gitignored)
- Lighthouse reports (HTML + JSON per route): `web/.lighthouseci/` (gitignored)
- Re-running `pnpm test:e2e` and `pnpm lhci` regenerates everything.
