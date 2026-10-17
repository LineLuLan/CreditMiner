# 6B3 results - Line - 2026-10-16

## What we build

Close F1-F8 in the dashboard and shared web/print report components. Keep API contracts, dependencies, palette, and caption identifiers unchanged. No server was started and no commit was made.

Decision: keep the existing shared lift formatter and add shared delay/CV sentence formatters. This preserves existing consumers while fixing presentation at the callers. Confidence: high for checked behavior; full hydrated-page and PDF visual acceptance remains with the supervisor.

## Current state

| Finding | Result | File:line evidence (relative to web/) |
| --- | --- | --- |
| F1 | PASS - Verified | `src/app/rules/page.tsx:58` and `src/app/clusters/page.tsx:156` no longer append another base; `src/lib/format.ts:59` retains the existing multiplier contract. Rendered hero/badge assertions: `src/components/rules/review-polish.test.mjs:54` and `:79`. |
| F2 | PASS - Verified | `src/components/layout/Sidebar.tsx:36` reads evidence.k and omits absent evidence; `src/app/pipeline/page.tsx:44` and `:83` use selected k; `src/lib/constants.ts:13` removes stale comment; `src/components/report/ClusteringSection.tsx:40` renders the data-backed sweep/final sentence. Test: `src/components/rules/review-polish.test.mjs:91`. MobileNav has no stale k clause and needed no edit. |
| F3 | PASS - Verified | `src/lib/format.ts:64` formats non-positive durations as none; `src/app/clusters/page.tsx:198`, `:251`, `:274`, and `:293` cover values, Longest delay, numeric delta chips, and footnote. `src/components/report/ClusteringSection.tsx:179` and `:196` also fix both report centroid tables via shared exports. Tests: `src/lib/format.test.mjs:56`, `src/components/rules/review-polish.test.mjs:79`. |
| F4 | PASS - Verified | `src/lib/format.ts:69`, `src/components/sequences/MethodNotes.tsx:18`, `src/components/report/SequenceSection.tsx:255`, and `src/components/report/ConclusionsSection.tsx:41` share the required zero/nonzero sentence. `src/components/report/FeatureImportanceEvidence.tsx:28` capitalizes Permutation. Tests: `src/lib/format.test.mjs:56`, `src/components/rules/review-polish.test.mjs:108`. Paper imports these components; no duplicated literal required a paper edit. |
| F5 | PASS - Verified | `src/components/report/DataSections.tsx:56` uses PAY_STATUS_LABELS and preserves the merged API group; `src/components/report/DataPreparationCharts.tsx:81`, `:86`, `:98`, and `:99` provide 24 px per row, print minimum height, interval=0, and 9 px category text. Browser layout test: `src/components/rules/review-polish.test.mjs:127`. Captured 20 categories and a deliberate 25-row boundary fixture both retain all ticks at 1440 px. |
| F6 | PASS - Verified | `src/components/report/DataSections.tsx:278` marks nominal numeric statistics not applicable. `src/components/report/RulesAndAnomalySections.tsx:181` and `:204` cover synthetic base cells and modifier uplift without a base. `src/components/report/InsightsAndAppendices.tsx:35` and `:40` suppress lift for insights 4/9. Cells display ASCII hyphens with title="not applicable"; missing numeric evidence still displays n/a. Test: `src/components/rules/review-polish.test.mjs:108`. |
| F7 | PASS - Verified | Existing guard at `src/app/rules/page.tsx:62` retained. Regression test `src/components/rules/review-polish.test.mjs:67` renders a modifier-free family as n = 333 clients, with no adding clause; captured hero still includes n = 1,843 and Age 40-49 / 73.7%. |
| F8 | PASS - Verified | `src/components/sequences/PatternTable.tsx:7` removes the three-story truncation; `:20` tightens list spacing. The existing page already passes all API stories. Browser test `src/components/rules/review-polish.test.mjs:127` checks five rows, both support values per row, and no document overflow at 400 px. |

| Success criterion | Result | Evidence |
| --- | --- | --- |
| 1: F1-F8 with locations | PASS - Verified | Finding table above and regression checks. |
| 2: forbidden-copy greps | PASS - Verified | No base base, difference of no change, lowercase permutation importance:, or adding undefined in src. The only non-test literal k=2/k = 2 is the permitted ClusteringSection.tsx:40 sweep sentence. x base occurs only in the formatter and correct expected strings in tests. |
| 3: all requested gates | PASS - Verified | Typecheck, lint, all 105 tests, and final production build pass with exit 0. All 14 static pages generated. |
| 4: results report | PASS | This file includes changes, evidence, gate tails, assumptions, and remaining review limits. |

## Files in flight

This task changed the following 20 source/test files, plus this results file. The working tree already contained earlier-wave changes; those were preserved.

- `src/lib/format.ts`
- `src/lib/format.test.mjs`
- `src/lib/constants.ts`
- `src/lib/sequence-format.test.mjs`
- `src/app/rules/page.tsx`
- `src/app/clusters/page.tsx`
- `src/app/pipeline/page.tsx`
- `src/app/eda/redesign-layout.test.mjs`
- `src/components/layout/Sidebar.tsx`
- `src/components/report/ClusteringSection.tsx`
- `src/components/report/SequenceSection.tsx`
- `src/components/report/ConclusionsSection.tsx`
- `src/components/report/FeatureImportanceEvidence.tsx`
- `src/components/report/DataSections.tsx`
- `src/components/report/DataPreparationCharts.tsx`
- `src/components/report/RulesAndAnomalySections.tsx`
- `src/components/report/InsightsAndAppendices.tsx`
- `src/components/sequences/MethodNotes.tsx`
- `src/components/sequences/PatternTable.tsx`
- `src/components/rules/review-polish.test.mjs`

## What changed

The implementation uses the existing formatMultiplier name (the packet calls it formatLift). PatternTable.tsx owns the non-default card; this path was omitted from FILES but is covered by F8's explicit components/sequences/* scope. This scope discrepancy was reported before editing. MobileNav, SequenceHero, PatternBars, the sequences page, paper files, and caption-order.ts required no edits.

For chart height, retaining a fixed print height would compress the category labels. The chosen alternative uses a responsive container minimum height, preserving 24 px per row without changing global print CSS. The actual installed Recharts package is 2.12.7, not the packet's documented 2.15.4; local ResponsiveContainer types support minHeight, and the tests run against the installed package.

Sources checked on 2026-10-16: captured .api-samples/clusters.json, mining-report.json, sequences.json, rules-families-default.json, insight-visuals.json, and eda-default-by-PAY_1.json; repository component sources and installed Recharts types. The packet supplies the external documentation check; no claim of a new external documentation lookup is made here.

Metrics: 105/105 Node tests; five visible non-default stories at 400 px; all 20 captured outlier labels and all 25 boundary-case labels at 1440 px; print chart container at least 600 px for 25 rows. The browser checks render actual Recharts SVG with a fixed 560 px report-column width and compiled repository CSS, without starting a server. ResponsiveContainer measurement itself is mocked for these static-markup tests.

Cost/latency: zero dependencies added. Sidebar uses the existing cached clusters query. Runtime latency and bundle-size deltas were not benchmarked; no performance improvement is claimed.

## What failed and why

Before implementation, the new hero test reproduced duplicated base and the new formatter test failed because the required helper did not exist. A test harness initially lacked useClusterCustomers; its stub was completed. The first chart assertion assumed the packet's 25 rows, while the actual captured API has 20; verification now covers both actual data and an explicit 25-row boundary case.

Two existing tests expected superseded lowercase/awkward wording. Their assertions now match the requested copy. An attempted removal of the exact non-default pattern text conflicted with existing evidence coverage and was reverted; the final list retains both the story and exact pattern text. Final checks cover the retained behavior.

Static review only: DRY/KISS pass on this task's changes kept shared formatting and avoided changing unrelated code. It found and corrected synthetic modifier uplift cells that still used n/a. Independent supervisor review is outstanding.

Verified: the exact packet-6B2 non-ASCII scan reported no NON-ASCII paths; git diff --check passed. Git emitted existing LF-to-CRLF notices only. The results report uses ASCII, including escaped non-ASCII glyphs in command tails.

Not verified: hydrated application rendering, complete generated PDFs, and dark-mode screenshots. Static browser checks do not establish final PDF pagination or visual acceptance. These remain supervisor review work, as specified.

Rollback: reverse only this task's edits in the listed files. Do not run the packet's broad git checkout rollback on this dirty working tree: it would discard earlier-wave work too.

## One next step

Supervisor: review the diff and refresh the full-page/PDF renders for Line's council acceptance. No commit or server startup is required from this worker.

usage: unavailable in current runtime

## Gate tails

Last 15 output lines per command, or the entire output when shorter. Non-ASCII glyphs are represented as literal Unicode escapes to keep this file ASCII.

### corepack pnpm typecheck

PASS - Verified; exit 0.

```text
$ tsc --noEmit
```

### corepack pnpm lint

PASS - Verified; exit 0.

```text
$ next lint
\u2714 No ESLint warnings or errors
```

### node --test --test-reporter=tap <every *.test.mjs under src>

PASS - Verified; exit 0.

```text
# Subtest: shared sequence schema preserves curated display and uncertainty metadata
ok 105 - shared sequence schema preserves curated display and uncertainty metadata
  ---
  duration_ms: 29.5392
  type: 'test'
  ...
1..105
# tests 105
# suites 0
# pass 105
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 7705.8535
```

### corepack pnpm build

PASS - Verified; exit 0.

```text
\u251c \u25cb /eda                                 13.1 kB         304 kB
\u251c \u25cb /insights                            1.69 kB         279 kB
\u251c \u25cb /mining-report                       11 kB           330 kB
\u251c \u25cb /pipeline                            5.37 kB         161 kB
\u251c \u25cb /predict                             15.8 kB         203 kB
\u251c \u25cb /report/paper                        12.3 kB         296 kB
\u251c \u25cb /rules                               3.49 kB         169 kB
\u2514 \u25cb /sequences                           6.26 kB         161 kB
+ First Load JS shared by all            87.5 kB
  \u251c chunks/261-fed82895be9bb9e1.js       31.7 kB
  \u251c chunks/79fd7726-c61b78a620e366be.js  53.6 kB
  \u2514 other shared chunks (total)          2.11 kB


\u25cb  (Static)  prerendered as static content
```

