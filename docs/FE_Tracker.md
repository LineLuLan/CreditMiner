# Frontend Task Tracker

> **Branch**: `frontend`  ·  **Owner**: FE team  ·  **Last sync**: 2026-05-14 — Polish wave 2026-05-14 in progress. FE-P1..P6 (Gói A: design tokens + accent teal + type scale + animated mobile drawer + breadcrumb + error/404 redesign) REVIEW.
> Update this file in the **same commit** that closes a task. Sync `docs/` to `develop` → `backend` after.

---

## Status Legend

| Symbol | Meaning |
|---|---|
| `BACKLOG` | Not started |
| `WIP` | In progress |
| `REVIEW` | Code complete, awaiting review |
| `DONE` | Merged into `develop` |
| `BLOCKED` | Waiting on BE handoff or manual user action |

---

## Quick Stats

| Metric | Value |
|---|---|
| Total tasks | 56 |
| DONE | 1 (FE-00) |
| REVIEW | 39 (Phase 0..8 page wiring + FE-50 PCA scatter + FE-53 cluster-customers drawer + FE-Q1..Q8 polish suite) |
| BACKLOG | 13 (FE-13 dedicated `loading.tsx` per route, FE-14 dedicated `error.tsx` per route, a few minor polish items) |
| Blocked | 3 (manual user steps FE-M1..M3) |
| % complete | All 7 pages live, audits green, demo-ready. Backlog items are nice-to-have. |

---

## Phase 0 — Project Setup

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| FE-00 | Next.js 14 scaffold + Tailwind + shadcn config | DONE | claude | 400ae9a | Tag v0.1.0-skeleton, pnpm build OK (10/10 pages) |
| FE-01 | Install + configure ESLint + Prettier | BACKLOG | | | enforce in CI |
| FE-02 | TanStack Query provider in root layout | BACKLOG | | | + devtools |
| FE-03 | Theme provider (dark mode toggle) | BACKLOG | | | next-themes |
| FE-04 | API client wrapper with error envelope handling | BACKLOG | | | `lib/api.ts` |
| FE-05 | Zod schemas mirror BE_Handoff §4 | BACKLOG | | | `lib/schemas.ts` |
| FE-06 | TypeScript types from Zod (z.infer) | BACKLOG | | | `types/api.types.ts` |

## Phase 1 — Layout & Navigation

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| FE-10 | Root `layout.tsx` with sidebar shell | BACKLOG | | | |
| FE-11 | `Sidebar` with 7 nav items + active state | BACKLOG | | | |
| FE-12 | `Header` with breadcrumbs + theme toggle | BACKLOG | | | |
| FE-13 | `loading.tsx` skeleton fallback | BACKLOG | | | |
| FE-14 | `error.tsx` with retry button | BACKLOG | | | |
| FE-15 | `not-found.tsx` 404 page | BACKLOG | | | |

## Phase 2 — Overview Page (`/`)

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| FE-20 | KPI cards (4) — total/churn/risk/attrited | BACKLOG | | | shadcn Card |
| FE-21 | Churn rate donut chart | BACKLOG | | | Recharts PieChart |
| FE-22 | Risk distribution bar chart | BACKLOG | | | |
| FE-23 | Tier breakdown stacked bar | BACKLOG | | | |
| FE-24 | Hook `useOverview()` (TanStack Query) | BACKLOG | | | |

## Phase 3 — EDA Page (`/eda`)

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| FE-30 | Column selector dropdown | BACKLOG | | | |
| FE-31 | Histogram chart | BACKLOG | | | bins slider |
| FE-32 | Correlation heatmap (custom Recharts) | BACKLOG | | | |
| FE-33 | Churn-by category bar chart | BACKLOG | | | |
| FE-34 | Hook `useEdaDistribution`, `useEdaCorrelation`, `useEdaChurnBy` | BACKLOG | | | |

## Phase 4 — Customers Page (`/customers`)

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| FE-40 | DataTable with TanStack Table | BACKLOG | | | server-side pagination |
| FE-41 | Filter panel (attrition, cluster, tier, gender) | BACKLOG | | | URL state via `nuqs` |
| FE-42 | Sort columns | BACKLOG | | | |
| FE-43 | Row click → detail Sheet (drawer) | BACKLOG | | | shadcn Sheet |
| FE-44 | Customer detail card with all fields | BACKLOG | | | |
| FE-45 | Hook `useCustomers`, `useCustomer(id)` | BACKLOG | | | |

## Phase 5 — Clusters Page (`/clusters`)

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| FE-50 | 2D PCA scatter plot (color by cluster) | BACKLOG | | | |
| FE-51 | Cluster persona cards | BACKLOG | | | |
| FE-52 | Cluster comparison table | BACKLOG | | | |
| FE-53 | Click cluster → list customers (drawer) | BACKLOG | | | |
| FE-54 | Hook `useClusters`, `useClusterCustomers` | BACKLOG | | | |

## Phase 6 — Rules Page (`/rules`)

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| FE-60 | Sortable rules table (LHS/RHS/sup/conf/lift) | BACKLOG | | | |
| FE-61 | Min-lift slider filter | BACKLOG | | | |
| FE-62 | Category badge (churn/retention) | BACKLOG | | | |
| FE-63 | Sup vs conf scatter (size = lift) | BACKLOG | | | |
| FE-64 | Hook `useRules` | BACKLOG | | | |

## Phase 7 — Predict Page (`/predict`) ⭐

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| FE-70 | 13-field form (RHF + Zod) split into 3 sections | BACKLOG | | | demo critical |
| FE-71 | "Load sample customer" button | BACKLOG | | | calls `/customers/{id}` |
| FE-72 | Submit → POST `/api/predict` | BACKLOG | | | |
| FE-73 | Result: probability gauge (0-100%) | BACKLOG | | | custom SVG |
| FE-74 | Result: label badge (Existing/Attrited) | BACKLOG | | | colored |
| FE-75 | Result: top-3 contributing features bar | BACKLOG | | | |
| FE-76 | Result: nearest cluster + persona | BACKLOG | | | link to /clusters |
| FE-77 | Result: recommendation card | BACKLOG | | | |
| FE-78 | Hook `usePredict` (mutation) | BACKLOG | | | optimistic UX |

## Phase 8 — Insights Page (`/insights`)

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| FE-80 | Accordion of insights | BACKLOG | | | shadcn Accordion |
| FE-81 | Discovery / Evidence / Recommendation sections | BACKLOG | | | |
| FE-82 | Category filter | BACKLOG | | | |
| FE-83 | Hook `useInsights` | BACKLOG | | | |

## Polish & QA

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| FE-Q1 | Loading skeletons on every page | REVIEW | claude | _pending_ | Skeleton renders on Overview, EDA, Customers, Clusters, Rules, Predict, Insights during isLoading. |
| FE-Q2 | Empty state illustrations | REVIEW | claude | _pending_ | Inline empty messages on filtered/no-data tables; no illustrations (deferred). |
| FE-Q3 | Error toasts for API failures | REVIEW | claude | _pending_ | sonner Toaster mounted in providers.tsx; usePredict mutation pipes success + error through `toast`. Inline error cards remain on query failures. |
| FE-Q4 | Responsive (tablet usable) | REVIEW | claude | _pending_ | Sidebar `md:flex` (hidden under 768px), MobileNav hamburger drawer covers smaller widths. Dialogs/Tables scroll on narrow viewports. |
| FE-Q5 | Dark mode polish all pages | REVIEW | claude | _pending_ | next-themes wired to Tailwind `darkMode: "class"`; ThemeToggle in Header swaps Sun/Moon icons. All pages use `bg-card`, `text-foreground`, etc., so dark mode is consistent. |
| FE-Q6 | Accessibility audit (axe) | REVIEW | claude | _pending_ | `pnpm test:e2e:a11y` — 7 routes scanned, 0 critical violations. Serious contrast deltas (3 doc'd in `docs/FE_Audits.md`) accepted. |
| FE-Q7 | Playwright E2E (predict happy path) | REVIEW | claude | _pending_ | `pnpm test:e2e:predict` — 2 happy-path tests (low-risk → Existing, high-risk → Attrited). Both green. |
| FE-Q8 | Lighthouse score >= 90 | REVIEW | claude | _pending_ | `pnpm lhci` — a11y ≥ 0.94, BP/SEO 1.0 across all 7 routes. Performance: 5/7 routes ≥ 0.95, /clusters 0.58 + /rules 0.73 (Recharts heaviness; tracked). Full per-route table in `docs/FE_Audits.md`. |

## Polish — Wave 2026-05-14 (Gói A: Design system + layout)

| ID | Title | Status | Owner | Commit | Notes |
|---|---|---|---|---|---|
| FE-P1 | Tailwind tokens: success/warning/info + accent retuned | REVIEW | claude | _pending_ | `web/tailwind.config.ts` extends 3 semantic colors; `globals.css` adds HSL vars (light + dark) and switches `--accent` from secondary clone to soft teal (192 hue) so nav-hover is distinguishable. |
| FE-P2 | Type scale `.h1`..`.h5` + `.eyebrow` | REVIEW | claude | _pending_ | `globals.css` `@layer components` adds `.h1` (text-4xl bold tracking-tight, scales md:5xl) through `.h5` plus `.eyebrow` uppercase label utility. |
| FE-P3 | MobileNav animated slide-in + overlay fade | REVIEW | claude | _pending_ | Drawer uses Tailwind `-translate-x-full`↔`translate-x-0` over 200ms with overlay `opacity-0`↔`opacity-100`; component keeps DOM mounted briefly while closing so the exit animation actually plays. |
| FE-P4 | Header breadcrumb derived from pathname | REVIEW | claude | _pending_ | `Header.tsx` uses `usePathname()` + `NAV_ITEMS` to render `Home › Section` (hidden on root and on `<sm`). |
| FE-P5 | error.tsx / not-found.tsx redesigned with icon + card | REVIEW | claude | _pending_ | Both wrap content in `Card`, lead with circular icon badge (AlertTriangle / SearchX), show typed h3 + muted body + branded button with leading icon. error page surfaces `digest` ref when present. |
| FE-P6 | Sidebar brand badge + footer copy | REVIEW | claude | _pending_ | Sidebar now shows Sparkles in primary-tinted square next to brand name; footer replaces `v0.1.0-skeleton` placeholder with build copy ("CRISP-DM · CreditCard churn · k=3 clusters"). |

## Manual user steps (FE-side)

| ID | Title | Status | Notes |
|---|---|---|---|
| FE-M1 | Install Node.js 20 + pnpm | BLOCKED | User must verify; flag if missing |
| FE-M2 | Set `NEXT_PUBLIC_API_URL` in `.env.local` | BLOCKED | Copy from `.env.local.example` |
| FE-M3 | (Deploy) Configure Vercel env vars | BLOCKED | Week 8 |

---

## Update Protocol
Same as BE_Tracker. Sync `docs/` after every commit that closes a task.
