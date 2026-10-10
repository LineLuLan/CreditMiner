# CreditMiner Web

CreditMiner Web is the interactive interface for the UCI credit-card default analysis. It presents data preparation, Weka model results, customer segments, association rules, anomalies, GSP repayment sequences, and single-client default predictions.

## Stack

| Area | Technology |
| --- | --- |
| Application | Next.js 14.2 App Router, React 18, TypeScript 5.6 |
| Styling | Tailwind CSS 3.4, shadcn/ui, Radix UI |
| Data | TanStack Query, TanStack Table, Axios, Zod |
| Forms | React Hook Form |
| Charts | Recharts |
| Tests | Playwright, axe-core, Lighthouse CI |
| Package manager | Corepack with pnpm |

## Requirements

- Node.js 20 or later
- Corepack
- A CreditMiner backend on port 8080 for development or port 8091 for the local demo

## Install

Run these commands from `web/`:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
cp .env.local.example .env.local
corepack pnpm dev
```

Open <http://localhost:3000>.

On Windows PowerShell, create the local environment file with:

```powershell
Copy-Item .env.local.example .env.local
```

## Backend profiles and ports

| Use | Backend profile | Backend URL | Frontend URL |
| --- | --- | --- | --- |
| Normal development | `dev` | `http://localhost:8080` | `http://localhost:3000` |
| Local portfolio demo | `demo` | `http://localhost:8091` | `http://localhost:3000` |

The `demo` profile uses an in-memory H2 database and seeds it from generated artifacts. Set the frontend API URL to `http://localhost:8091/api` when you use this profile.

Port 3000 works with the backend's default CORS allow-list. To use frontend port 3001, first add `http://localhost:3001` to the backend `creditminer.cors.allowed-origins` setting.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080/api` | Base URL for API requests |
| `NEXT_PUBLIC_API_PROXY` | `false` | Enable the optional Next.js development rewrite rule |
| `NEXT_PUBLIC_APP_NAME` | `CreditMiner` | Product name shown by the interface |

The current API client still sends requests directly to `NEXT_PUBLIC_API_URL`. Setting `NEXT_PUBLIC_API_PROXY=true` does not switch those requests to `/api` and does not solve CORS by itself.

Do not commit `.env.local`. The checked-in `.env.local.example` contains safe local defaults.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Project overview and headline results |
| `/eda` | Descriptive statistics, distributions, correlations, and PCA |
| `/clusters` | K-means segments and cluster customers |
| `/customers` | Searchable and paginated client records |
| `/rules` | Apriori association rules |
| `/insights` | Evidence-backed findings and visuals |
| `/predict` | Single-client default prediction |
| `/pipeline` | Data-mining workflow and artifact status |
| `/sequences` | GSP repayment-sequence patterns and experiment results |
| `/mining-report` | Interactive software-engineering and data-mining report |
| `/report/paper` | Print-first academic report used to create `report.pdf` |

## API samples

Verified response examples are stored in `.api-samples/`. They cover all dashboard data groups and one prediction response. The files are snapshots for documentation and contract review; the application still reads live data from the backend.

## Commands

| Command | Purpose |
| --- | --- |
| `corepack pnpm dev` | Start the development server on port 3000 |
| `corepack pnpm dev -p 3001` | Start a second local frontend after allowing its origin in the backend CORS setting |
| `corepack pnpm build` | Create the production build |
| `corepack pnpm start` | Serve the production build |
| `corepack pnpm typecheck` | Run TypeScript checks without emitting files |
| `corepack pnpm lint` | Run the Next.js ESLint checks |
| `corepack pnpm format:check` | Check source formatting |
| `corepack pnpm test:e2e` | Run the Playwright suite |
| `corepack pnpm test:e2e:predict` | Run the prediction browser test |
| `corepack pnpm test:e2e:a11y` | Run the accessibility browser test |
| `corepack pnpm lhci` | Run Lighthouse CI |

## Quality gates

Run these checks before a pull request:

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm format:check
corepack pnpm build
corepack pnpm test:e2e
```

The browser tests need the relevant backend and frontend servers. The build, type, lint, and format checks do not require a running backend.
