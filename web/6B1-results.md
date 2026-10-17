# Wave 6B1 results for Line

Date: 2026-10-16
Overall: FAIL - implementation is complete; required acceptance gates are blocked.
Decision: leave the scoped diff in the working tree for supervisor integration. Confidence: high in the targeted implementation; build readiness is Not verified.
No commit, server startup, dependency change, backend edit, or caption-id change was performed.

## Findings

PASS below means the requested code change is present. Review status is Static review only unless an executed check is explicitly identified.

| Finding | Result | Evidence |
| --- | --- | --- |
| F1 | PASS | src/app/clusters/page.tsx:107 removes the metadata note; src/components/features/PcaScatterCard.tsx:76 uses fixed product copy even when the API supplies old text; src/app/eda/EdaSections.tsx:140, src/app/customers/page.tsx:185 and src/components/features/PredictForm.tsx:70 use the requested copy. |
| F2 | PASS | src/lib/constants.ts:258 sets the requested order; src/app/customers/page.tsx:77 says Customers; src/lib/format.test.mjs:56 verifies order and both shared-nav consumers with Workflow preserved. Verified by node tests. |
| F3 | PASS | src/components/report/RuntimeChart.tsx:76 uses compactTime without an axis unit; line 176 reuses compactTime in the tooltip. |
| F4 | PASS | src/components/report/ModelComparisonChart.tsx:67 renders all ticks and bolds Best; bars retain constant primary/success fills without Cell overrides. |
| F5 | PASS | src/lib/format.ts:42 adds formatDeltaPp; src/lib/format.test.mjs:44 checks zero, signed near-zero, both threshold boundaries, signed deltas and null; consumers are MethodNotes.tsx:19, SequenceSection.tsx:255 and ConclusionsSection.tsx:42. Verified formatter tests. |
| F6 | PASS | src/lib/constants.ts:90 and :123 define labels and fallback; FeatureImportanceEvidence.tsx:33/:50, DataPreparationCharts.tsx:93/:123 and PredictResult.tsx:115 use them; labels have 190px space at 11px. EDA pickers and correlation headings already use complete readable label maps. Verified map coverage test. |
| F7 | PASS | src/components/report/AlgorithmCards.tsx:114 names Cost-sensitive learning/SMOTE, capitalizes the baseline sentence, and uses one-decimal absolute pp with raises/lowers. |
| F8 | PASS | src/components/report/InsightsAndAppendices.tsx:27 adds the visible four-column table above the existing disclosure, using already supplied visuals matched by title; empty insights retain only the disclosure. |
| F9 | PASS | src/components/report/ClusteringSection.tsx:112 uses displayName with muted C id and removes the risk-score tile; RulesAndAnomalySections.tsx:73/:75/:79/:83 supplies the four requested labels. |
| F10 | PASS | src/app/pipeline/page.tsx:90 falls back from default finalSupport to minSupport; non-default already reads minSupport; both labels say Min support. |
| F11 | PASS | src/app/clusters/page.tsx:111 places the silhouette selection once below the hero; the default badge uses an explicit escaped nonbreaking space at line 173. |
| F12 | PASS | src/components/features/PcaScatterCard.tsx:120/:132 rounds axis domains outward and uses allowDecimals=false plus formatInt ticks. |
| F13 | PASS | src/app/clusters/page.tsx:217 uses whole age years; line 295 uses one-decimal age deltas; months and currency formatting are unchanged. |
| F14 | PASS | src/components/insights/InsightVisualCard.tsx:95 uses clamp(24 * bars + 48, 160, 320); line 117 shows every category; 150px, 11px custom ticks split labels at colon-space. |
| F15 | PASS | src/app/page.tsx:93/:94 expands KPI labels; line 98 keeps the client share on one line and moves Low/Medium counts into the title tooltip. |

## Success criteria

| Criterion | Result | Evidence |
| --- | --- | --- |
| 1: F1-F15 changes and evidence | PASS | All fifteen entries above; independent review found no material implementation defect. |
| 2: grep, delta and navigation gates | FAIL | Pre-existing src/lib/schemas.ts:4 contains the words API contract in a technical comment. This file is explicitly reserved. No other prohibited-copy match was found. RuntimeChart has no ms unit; delta and navigation tests pass. |
| 3: all runnable gates green | FAIL | Typecheck passed; all 82 tests passed including caption-order and formatter tests. Lint failed on a cache-file permission error; build not run after the explicit stop rule. |
| 4: results report | PASS | Changed files, finding evidence, acceptance status and gate tails are recorded here. |

## Verification

- Verified: corepack pnpm typecheck, exit 0.
- Verified: all 82 node tests, exit 0, including the existing sample-backed 400px/1440px static layout checks and caption-order tests.
- Verified: git diff --check -- src, no whitespace errors.
- Verified: ASCII scan of all changed src files, no non-ASCII output. The scan used --relative -- src because Git's repository root is the parent directory and backend work is concurrent.
- Static review only: independent reviewer checked F1-F15 against the specification and saved API samples; no material defect found.
- Not verified: lint did not complete because .next/cache/eslint/.cache_w25cp7 could not be opened (EPERM).
- Not verified: production build, stopped under the packet's out-of-scope gate-failure rule.
- Not verified: hydrated Recharts label fit, new chart appearance, and printed output. Existing static layout tests are narrower evidence.

The new formatter, navigation and feature-label tests were first run before implementation: three failed as expected. After implementation all six tests in format.test.mjs passed.

## Changed files

- src/app/clusters/page.tsx
- src/app/customers/page.tsx
- src/app/eda/EdaSections.tsx
- src/app/page.tsx
- src/app/pipeline/page.tsx
- src/components/features/PcaScatterCard.tsx
- src/components/features/PredictForm.tsx
- src/components/features/PredictResult.tsx
- src/components/insights/InsightVisualCard.tsx
- src/components/report/AlgorithmCards.tsx
- src/components/report/ClusteringSection.tsx
- src/components/report/ConclusionsSection.tsx
- src/components/report/DataPreparationCharts.tsx
- src/components/report/FeatureImportanceEvidence.tsx
- src/components/report/InsightsAndAppendices.tsx
- src/components/report/ModelComparisonChart.tsx
- src/components/report/RulesAndAnomalySections.tsx
- src/components/report/RuntimeChart.tsx
- src/components/report/SequenceSection.tsx
- src/components/sequences/MethodNotes.tsx
- src/lib/constants.ts
- src/lib/format.test.mjs
- src/lib/format.ts
- 6B1-results.md

## Gate tails

Tails contain up to the last 20 lines. Non-ASCII console glyphs are preserved as Unicode escape text to meet the ASCII-only file requirement.

### typecheck

Command: corepack pnpm typecheck
Exit: 0

```text
$ tsc --noEmit
```

### lint

Command: corepack pnpm lint
Exit: 1

```text
$ next lint
EPERM: operation not permitted, open 'D:\01_Workspaces\CreditMiner\web\.next\cache\eslint\.cache_w25cp7'
[ELIFECYCLE] Command failed with exit code 1.
```

### tests

Command: $testFiles = @(rg --files src -g '*.test.mjs'); node --test @testFiles
Exit: 0

```text
\u2714 optional sequence presentation survives validation and remains optional (8.7262ms)
\u2714 optional cluster metadata survives validation (0.689ms)
\u2714 GSP braces are ordered months and commas join items within one month (137.5114ms)
\u2714 unknown tokens remain inspectable; empty tokens and malformed patterns are safe (27.7545ms)
\u2714 all known tokens have readable names (21.2305ms)
\u2714 only consecutive identical months are run-length encoded (38.7203ms)
\u2714 API displayText and steps override raw grammar independently (15.7681ms)
\u2714 deduplication keeps higher ratio while preserving original family order (18.4284ms)
\u2714 CV delta only compares rows belonging to the same algorithm (17.3727ms)
\u2714 curated stories take precedence, with legacy fallback only when absent (20.801ms)
\u2714 API compressed steps retain repeated months when displayText is absent (12.0062ms)
\u2714 shared sequence schema preserves curated display and uncertainty metadata (29.2861ms)
\u2139 tests 82
\u2139 suites 0
\u2139 pass 82
\u2139 fail 0
\u2139 cancelled 0
\u2139 skipped 0
\u2139 todo 0
\u2139 duration_ms 10374.4367
```

### build

Command: corepack pnpm build
Not verified: not executed after lint failed outside FILES. No build output exists.

## Independent review output

```text
Static review only: no material defects found across F1-F15. Changes stay within the named findings; reserved files contain only necessary targeted edits.

Unmet acceptance gates:

- src/lib/schemas.ts:4 retains "API contract" in a pre-existing comment; the file is reserved.
- Lint failed with the reported cache-file EPERM.
- Build was not run after the stop rule triggered.

Residual risk: chart label fit, mobile layout, and printed output were not browser-tested.

usage: unavailable in current runtime
```

## Continuation handoff

### What we build
Backend-independent copy, label and chart fixes for Line's CreditMiner web review.

### Current state
All F1-F15 code changes are present. Required acceptance remains FAIL due to lint permissions, the reserved-file grep match and the unrun build.

### Files in flight
The changed-file list above is this worker's scope. Concurrent backend changes belong to another worker and were not used as evidence. Reserved web files received only named edits and necessary formatter imports.

### What changed
Shared feature labels and percentage-point formatting; menu order; chart ticks, colors, spacing and height; report insight table; requested copy and metric removals. No new network requests or dependencies. Cost and latency were not benchmarked; no service-cost changes are introduced.

### What failed and why
Lint cannot open its existing cache file. The raw grep criterion also conflicts with the reserved schemas file's pre-existing comment. The packet requires stopping on an out-of-scope gate failure, so no cache workaround or reserved-file edit was attempted.

### The one next step
Supervisor should resolve cache access and assign the schemas comment to its owning wave, then rerun lint, the grep gate and production build before accepting delivery.

## Assumptions, sources and rollback

- Assumption: named removals/moves in shared files authorize their complete JSX elements plus necessary formatter imports; no redesign is authorized.
- Sources checked on 2026-10-16: repository source, tests, project context and web/.api-samples (including insights, insight visuals and PCA metadata). The task supplied the Recharts documentation findings dated 2026-10-16; no external API behavior was guessed.
- Metrics/eval: 82/82 source tests passing, typecheck passing, lint incomplete, build unrun. No production or backend validation claimed.
- Risk: hydrated chart clipping and print appearance remain for supervisor visual review.
- Rollback: revert only this worker's scoped diff; do not blindly run the packet's broad checkout command after another wave has edited shared paths.
- usage: unavailable in current runtime

