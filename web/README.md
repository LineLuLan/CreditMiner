# CreditMiner Web

Next.js 14 (App Router) + Tailwind CSS + shadcn/ui + Recharts dashboard.

## Quick start

```bash
cp .env.local.example .env.local
# Edit NEXT_PUBLIC_API_URL if backend is not on localhost:8080

pnpm install        # or: npm install / yarn
pnpm dev            # http://localhost:3000

pnpm build          # production build
pnpm start          # serve production build
pnpm typecheck      # tsc --noEmit
pnpm lint           # next lint
pnpm format         # prettier --write
```

## Stack

- Next.js 14 App Router
- React 18 + TypeScript 5.6
- Tailwind CSS 3.4 + shadcn/ui (CSS variables based)
- TanStack Query 5 (server state) + TanStack Table 8 (data tables)
- React Hook Form 7 + Zod 3 (forms + validation)
- Recharts 2 (charts)
- Lucide icons
- next-themes (dark mode)

## Pages

| Route | Purpose | Tracker IDs |
|---|---|---|
| `/` | Overview KPIs | FE-20..24 |
| `/eda` | Exploratory analysis | FE-30..34 |
| `/customers` | Paginated customer table | FE-40..45 |
| `/clusters` | PCA scatter + personas | FE-50..54 |
| `/rules` | Apriori rules table | FE-60..64 |
| `/predict` | Churn prediction form (DEMO CRITICAL) | FE-70..78 |
| `/insights` | Discovery/Evidence/Recommendation | FE-80..83 |

See `docs/FE_Tracker.md` for the full backlog.

## API contract

The Zod schemas in `src/lib/schemas.ts` are the FE source of truth and
mirror `docs/BE_Handoff.md §4`. Update both in the same commit.
