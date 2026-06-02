# Active State - CreditMiner

## Current Snapshot

- Date: 2026-06-02
- Working branch: `codex/reacquaint-cleanup` from `origin/develop`
- Source of truth branch for re-onboarding: `develop`
- Worktree goal: cleanup, review, project memory, safe local init, verification readiness, and a consolidated data-mining report feature
- Safety scope: no production writes, no DB seed/reset/train, no `.env` reads, no deploy, no GitHub writes

## Re-Onboarding Findings

- `main` lags behind `develop`; use `develop` for current project state.
- Project memory files were absent and have now been added: `ProjectBrief.md`, `Architecture.md`, `ACTIVE_STATE.md`.
- `.codegraph/` was absent and `codegraph` CLI is not installed; `.codegraph/` is now ignored.
- A database password was present in `docs/BE_Handoff.md`; the current tracked doc has been redacted. Treat the exposed value as compromised and rotate it in Neon.
- Toolchain available locally: `git`, `node`, `corepack`; user shell now has JDK 21.0.11 and Maven 3.9.16.
- Toolchain missing locally: `pnpm` standalone, `docker`, `psql`, `codegraph`.
- Current Codex process was started before the JDK/Maven PATH update; restart Codex/terminal sessions before relying on plain `java`/`mvn` lookup inside this agent.
- Node local version is v24.16.0; CI uses Node 20 and `web/package.json` requires `>=20`.

## Validation Log

- `git fetch origin --prune`: completed.
- Branch created from `origin/develop`: completed.
- Static health scans:
  - TODO/stub scan found placeholder or stale comments in backend pipeline/report/anomaly/overview areas.
  - DB write scan confirmed destructive or mutating SQL in `db/schema.sql`, `db/reset.sql`, and `db/migrations/2026-05-09_refresh_insights.sql`.
  - API scan confirmed frontend uses typed API client and documented backend endpoints.
- Frontend safe init/verification:
  - `corepack pnpm install --frozen-lockfile`: passed; lockfile was already up to date.
  - `corepack pnpm typecheck`: passed.
  - `corepack pnpm lint`: passed with no warnings or errors.
  - `corepack pnpm build`: passed; `/mining-report` included, all 11 static pages generated.
  - Overview UI was refreshed into a clearer mining dashboard with dataset summary, mining signals, action links, readable chart labels, and a CRISP-DM evidence path.
  - Shared Recharts/Radix tooltip styling was updated so dark-mode chart and small-control tooltips render readable foreground text.
  - Browser smoke passed in dark mode against `http://localhost:3000`: overview rendered the refreshed dashboard, donut tooltip showed `Attrited : 1,627 (16.1%)`, no `Network Error`, and no console/page errors.
  - Follow-up layout pass compacted Overview/EDA, prevented full-page horizontal overflow with `main min-w-0`, contained correlation heatmap scrolling inside its card, capped churn-by bar width, and disabled chart animations that made screenshots look partially rendered.
  - Overview now states the core mining question: which customers are likely to churn, what segments/rules explain risk, and which retention actions should be prioritized.
  - Mining Report was redesigned from tabbed evidence pages into a one-page executive dashboard covering the mining question, answer, report health, model evidence, dataset balance, segmentation, association rules, anomalies, and actionable insights.
  - Mining Report follow-up compacted the top evidence header and changed actionable insights into action-first cards so recommendations, evidence, and priority are easier to scan.
  - Mining Report rule evidence now renders business-readable rule cards instead of raw formula-heavy tables, and the classification driver chart has reduced left-axis padding.
  - Mining Report rules/anomaly section now avoids cross-card height stretching, contains long rule lists in an internal scroll area, and the desktop sidebar stays fixed while the page scrolls.
  - Mining Report actionable insights now include reader-facing summary tiles and per-insight interpretation text so teachers/reviewers can see the evidence-to-action reasoning.
  - Cluster PCA scatter tooltip now includes the hovered point's cluster label (`C0`/`C1`/`C2`) alongside PC1/PC2.
  - Added a Pipeline sidebar page mapping CRISP-DM/data-mining phases to backend artifacts, APIs, and frontend screens so reviewers can see where train results appear.
  - Rules page no longer uses the low-information support-vs-confidence scatter; it now highlights support-ranked rules, repeated conditions, and business-readable rule evidence cards.
  - Rules page condition-frequency panel is now a vertical draggable slider; the ranked rule evidence list is also contained in a vertical slider showing up to 6 rule cards at once on desktop.
- Backend tests:
  - `mvn -B test`: passed via explicit Maven path after JDK/Maven install; 12 tests run, 0 failures, 0 errors, 1 skipped.
  - `mvn -B test`: passed again after mining-report artifact fallback; 12 tests run, 0 failures, 0 errors, 1 skipped.
  - `mvn -B test`: passed after adding demo H2 profile; 12 tests run, 0 failures, 0 errors, 1 skipped.
- Data-mining report feature:
  - Backend added read-only `GET /api/mining-report` via `MiningReportController` and `MiningReportService`.
  - Frontend added `/mining-report` with dataset, classification, clustering, rules, anomaly, and insight evidence tabs.
  - Frontend contract mirrored in `web/src/lib/schemas.ts`, `web/src/types/api.types.ts`, `web/src/lib/api.ts`, and `web/src/hooks/useMiningReport.ts`.
  - `MiningReportService` falls back to local artifacts/resources for clusters, rules, and insights when DB rows are unavailable, so artifact-only training can still feed the report page.
- Local runner:
  - `scripts/run-local.bat` starts backend and frontend dev servers in separate terminal windows when prerequisites are available.
  - The runner has a `--check` mode and intentionally does not run setup, train, deploy, or read `.env` files.
  - Backend now starts with Spring `demo` profile, using an in-memory H2 database seeded from local artifacts/resources at startup.
  - Runner now checks existing `8080`/`3000` services, waits for backend health before opening frontend, and avoids duplicate dev server windows when rerun.
  - Demo backend boot smoke passed: `/actuator/health` was `UP`; `/api/mining-report` returned 10127 rows, 3 clusters, 50 rules, and 5 insights.
  - Local dashboard browser smoke passed against `http://localhost:3000`: overview rendered 10,127 customers with no `Network Error` text and no console/page errors.
- Artifact training runner:
  - `scripts/train-artifacts.bat` runs Phase 1, 2, 3, 5, 6, and 7 via Maven and writes output to `docs/TRAINING_LOG.md`.
  - It is artifact-only and intentionally does not seed/reset databases, run SQL, deploy, or read `.env` files.
  - Full artifact training completed on 2026-06-02 from `backend/data/raw/BankChurners.csv`; summary lives in `docs/TRAINING_LOG.md`.
  - Generated local artifacts under `backend/data/processed` and `backend/models`; these are intentionally gitignored.
- DB verification: intentionally not run in this pass.
- DB/dev tooling checks: `docker`, `psql`, and `codegraph` are not installed.
- Secret scan: path/line-only scan found no tracked or untracked worktree hits for configured high-risk patterns.
- Diff hygiene: `git diff --check` passed; Git emitted Windows line-ending conversion warnings only.

## Current Backlog

- Rotate the previously exposed Neon database password before future shared or hosted use.
- Install or expose local JDK 17, Maven, Docker, psql, and pnpm/Corepack shim for full local verification.
- Fix or replace `TrainPipeline` so `scripts/train.*` invokes the real phase pipeline sequence, or update scripts/docs to call phase-specific runners explicitly.
- Make `db/schema.sql` safe for non-empty databases or clearly split destructive reset from create-only schema application.
- Add a test datasource so `CreditMinerApplicationTests` can run in CI without a live Postgres dependency.
- Decide whether `ReportService` is still needed for W8 deliverables; implement or remove the placeholder service.
- Review stale backend comments in `OverviewController` and `AnomalyService`; avoid behavior changes until current API responses are re-verified.
- Backend-verify `GET /api/mining-report` with JDK 17 + Maven available; then run a local API smoke against a safe dev database or approved hosted credentials.

## Next Actions

- Frontend install/typecheck/lint/build completed with Corepack; keep this log current after future code changes.
- Run a path/line-only secret scan after edits.
- Review the final diff for accidental generated files or secrets.
- When backend toolchain is available, run `mvn -B test` from `backend`.
