# Resume 1 - final 7A contract and rule cohort counts

Line - 2026-10-16

Decision: PASS. Resume 1 corrects matching-client counts and adopts the final 7A summary contract. This section supersedes the earlier rule totals and gate results below. Confidence: high for source behavior, sample-backed rendering, and local gates.

Verified: typecheck, lint, all 128 node tests, production build, unchanged caption identifiers/order, ASCII scan, and diff whitespace check. The supervisor refreshed the API samples during this run; the final tests pass against those refreshed samples. This worker did not edit samples, backend files, dependencies, or configuration, start servers, or commit.

## Resume 1 evidence

| Requirement | Result | Evidence (paths relative to web) |
| --- | --- | --- |
| P1 Rules hero | PASS | src/app/rules/page.tsx:61 uses lhsCount for clients and jointCount for defaulted. Inline test proves "n = 2,666 clients, 1,843 defaulted". |
| P1 family cards, ladders, singles | PASS | src/components/rules/RuleEvidence.tsx:171/:212/:243 show lhsCount as n clients and a separate outcome count. Missing lhsCount renders "-", including legacy cards. |
| P1 modifier tables | PASS | RuleEvidence.tsx:260/:286 columns use vs family, Clients = lhsCount, Defaults = jointCount. Zero is preserved. |
| P1 both report documents | PASS | src/components/report/RulesAndAnomalySections.tsx:169/:189/:207 has Confidence, Lift, Clients, Defaults, vs family; src/components/report/paper/PaperReportDocument.tsx:171 reuses the same table. Missing Clients is "-", including synthetic bases. |
| Outcome semantics | PASS | Non-default tab/Table 12 use "Non-defaults" for jointCount. That field counts matches of the selected outcome; calling it Defaults would introduce another correctness defect. Default tab/Table 11 use "Defaults". |
| Optional contract/schema | PASS | src/lib/mining-report-schemas.ts:59/:79 accept optional/null lhsCount on rules, family members and modifiers; :409 retains all four category subtotals. Negative counts fail validation. |
| Final summary | PASS | src/components/report/ExecutiveSummary.tsx:97 reads topRuleLift, ruleCount, familyCount; report-consistency.test.mjs:46 verifies "3.33x" and "58 rules in 20 families". RulesAndAnomalySections.tsx:54 reads 37 default / 21 non-default rule subtotals with legacy fallbacks. |
| Rules tab KPIs | PASS | src/app/rules/page.tsx derives counts from the selected families response; review-polish.test.mjs verifies default 10/37 and non-default 10/21 independently of combined summary totals. |
| Facts and five utilization bars | PASS | src/lib/facts.test.mjs:16 verifies new inclusive fact precedence plus explicitly absent-field fallback; src/app/eda/redesign-layout.test.mjs:166 uses inline 69.5% and all five final utilization labels. Existing duration and PCA optional-field tests remain green. |
| Refreshed-label compatibility | PASS | src/lib/constants.ts:243 preserves current persona traits verbatim, preventing duplicate "(of 6)"; src/lib/rules-format.ts handles the refreshed no-balance short name. rules-format.test.mjs:28 verifies current and old trait strings; captured-rule parity remains green. |
| Printed report fit | PASS | src/components/report/report-consistency.test.mjs:174 checks both six-column rule tables fit their print container; existing Tables 8/9 and disclosure tests also pass. |
| Original W1-W14 / criterion 1 | PASS | Earlier implementation/evidence remains below. Final greps find no prohibited feature labels, HighSchool only in constants, and no listed literal statistics in production source (CSS color/opacity numbers only). All jointCount rendering sites were inspected for correct outcome labels. |
| Criterion 2 | PASS | All final gates exit 0, 128/128 tests; production build generated 14/14 static pages. Caption-order source/tests unchanged. |
| Criterion 3 | PASS | This top section records resumed files, evidence, review, final gate tails and remaining integration work. |

Fallback policy: missing/null lhsCount means Clients "-", never jointCount or an estimate from confidence. An explicit zero remains zero. Summary fields retain existing report fallbacks when absent.

Assumption: non-default outcome columns are named Non-defaults. Alternatives were to compute default counts as lhsCount minus jointCount (unavailable on legacy responses), or retain the selected-outcome count. The latter preserves the API meaning across both old and new contracts.

## Files changed in Resume 1

- src/app/rules/page.tsx
- src/components/rules/RuleEvidence.tsx
- src/lib/mining-report-schemas.ts
- src/components/report/RulesAndAnomalySections.tsx
- src/components/report/paper/PaperReportDocument.tsx
- src/lib/schemas.test.mjs
- src/lib/facts.test.mjs
- src/components/rules/review-polish.test.mjs
- src/components/report/report-consistency.test.mjs
- src/app/eda/redesign-layout.test.mjs
- src/lib/constants.ts
- src/lib/rules-format.ts
- src/lib/rules-format.test.mjs
- src/lib/mining-layout.test.mjs
- 7B-results.md

## Final gate tails

Unicode tool-output symbols are represented by literal Unicode escapes to keep this file ASCII. For gates with fewer than 15 lines, all output is shown.

### corepack pnpm typecheck - Verified, exit 0

```text
$ tsc --noEmit
```

### corepack pnpm lint - Verified, exit 0

```text
$ next lint
\u2714 No ESLint warnings or errors
```

### node --test (every src/**/*.test.mjs) - Verified, exit 0

```text
\u2714 only consecutive identical months are run-length encoded (13.5405ms)
\u2714 API displayText and steps override raw grammar independently (12.4832ms)
\u2714 deduplication keeps higher ratio while preserving original family order (13.6303ms)
\u2714 CV delta only compares rows belonging to the same algorithm (11.7535ms)
\u2714 curated stories take precedence, with legacy fallback only when absent (13.5807ms)
\u2714 API compressed steps retain repeated months when displayText is absent (13.7574ms)
\u2714 shared sequence schema preserves curated display and uncertainty metadata (30.0349ms)
\u2139 tests 128
\u2139 suites 0
\u2139 pass 128
\u2139 fail 0
\u2139 cancelled 0
\u2139 skipped 0
\u2139 todo 0
\u2139 duration_ms 7889.5417
```

### corepack pnpm build - Verified, exit 0

```text
\u251c \u25cb /eda                                 13.1 kB         305 kB
\u251c \u25cb /insights                            1.54 kB         279 kB
\u251c \u25cb /mining-report                       8.11 kB         332 kB
\u251c \u25cb /pipeline                            5.33 kB         161 kB
\u251c \u25cb /predict                             15.8 kB         204 kB
\u251c \u25cb /report/paper                        8.76 kB         322 kB
\u251c \u25cb /rules                               3.71 kB         170 kB
\u2514 \u25cb /sequences                           6.3 kB          162 kB
+ First Load JS shared by all            87.5 kB
  \u251c chunks/261-fed82895be9bb9e1.js       31.7 kB
  \u251c chunks/79fd7726-c61b78a620e366be.js  53.6 kB
  \u2514 other shared chunks (total)          2.1 kB


\u25cb  (Static)  prerendered as static content
```

ASCII scan: rg -n '[^\\x00-\\x7F]' src 7B-results.md returns no matches.
Whitespace check: git diff --check -- src 7B-results.md passes; existing LF/CRLF notices are informational.

## Review, remaining evidence, and handoff

Static review only: independent reviewer found one P3 test-maintenance issue (legacy assertions depended on captured samples lacking lhsCount); corrected by explicitly removing new fields in legacy fixtures. Sample refresh subsequently exposed seven stale test expectations and the duplicate persona trait suffix; the suffix was reproduced by a failing test and fixed. Final sample-backed tests, inline contract tests, and independent follow-up review pass.

Not verified: live dashboard screenshots against the backend and a physical/PDF print capture. No services were started. The supervisor can recapture the UI after integrating both packets.

Sources checked: task's final 7A contract and provided Recharts/Next.js documentation checks dated 2026-10-16; local schemas, source, and refreshed sample responses read on 2026-10-16. No new dependency API was introduced. Existing Recharts warnings remain non-failing.

Cost/latency: no new dependencies or API requests; changes format already-loaded fields. Runtime latency was not benchmarked. Risk: legacy payloads show unavailable client counts explicitly. Rollback: revert only Resume 1 source/report hunks; preserve earlier wave changes and supervisor-refreshed samples. Next task: supervisor live integration/recapture. Usage: unavailable in current runtime.

### Report worker output (verbatim, ASCII-escaped)

```text
Completed report count corrections in three scoped files.

- `RulesAndAnomalySections.tsx:169`: Clients uses `lhsCount`; outcome count uses `jointCount`, labelled Defaults or Non-defaults. Missing cohort counts show \u201c-\u201d; zero remains zero; comparison is \u201cvs family.\u201d
- `PaperReportDocument.tsx:171`: passes explicit outcome to the shared table.
- `report-consistency.test.mjs:46`: covers 58 rules, 20 families, 3.33x lift and category subtotals; exact 2666/1843 and 563/415 examples, missing/zero counts, and synthetic families.

Verified: all 8 report/caption tests, typecheck, ASCII scan. Caption identifiers unchanged. No known blockers.

usage: unavailable in current runtime
```

### Independent initial review (verbatim; P3 resolved above)

```text
[P3] `src/components/rules/review-polish.test.mjs:62`, `:74`, `:100`, `:117`: tests assume captured samples lack `lhsCount`. Planned 7A recapture will invalidate these assertions. Derive captured expectations from the fields and explicitly remove `lhsCount` in legacy cases.

Static review only: no material product issue found. All Clients counts use `lhsCount`; missing values show "-", zero survives, and outcome counts retain correct Default/Non-default headings. Both reports share the corrected table. Summary/category totals and caption IDs remain consistent.

Residual risk: fresh backend responses and full gates remain parent verification.

usage: unavailable in current runtime
```

### Independent follow-up review (verbatim, ASCII-escaped)

```text
Static review only: no material defects found.

Current persona traits remain verbatim; legacy prefixes normalize correctly. The utilization fallback matches "No balance (utilization <= 0%)". Legacy count and fact tests now explicitly remove new fields, resolving the earlier sample-refresh finding.

Residual risk: runtime gates rely on the parent\u2019s executed results; none were rerun here.

usage: unavailable in current runtime
```

---

# Wave 7B web results

Line - 2026-10-16

Decision: W1-W14 implemented. Confidence: high for the web implementation and local gates.
Verified: typecheck, lint, all 121 node tests, production build, ASCII scan, caption preservation.
Static review only: independent W1-W14 review; its two legacy payment-ratio headers were corrected.
Not verified: refreshed 7A HTTP samples and live dashboard recaptures; these remain the supervisor's integration step.

No commits, servers, dependency changes, backend edits, or source writes outside src and this report.
Existing worktree changes were preserved.

## Findings and success criteria

| Finding | Result | Evidence (paths relative to web) |
| --- | --- | --- |
| W1 | PASS | src/lib/constants.ts:52 canonical FEATURE_LABELS; :123 EDA aliases; :242 legacy trait adapter. src/app/clusters/page.tsx:260 comparison labels; src/lib/rules-format.ts:64 rule labels alias FEATURE_LABELS; customer table/dialog headers now call featureLabel. Forbidden-label grep has no non-test matches. |
| W2 | PASS | src/lib/mining-report-schemas.ts:17 optional per-persona/baseline durations. src/app/clusters/page.tsx:227/:264 uses durations and recalculates delta; :301 shows code-mean footnote only on fallback. src/lib/format.ts:66 prints 0.0 months. Report centroids use the same preference. New rendered regression verifies zero and -0.80-month delta. |
| W3 | PASS | src/lib/chart-theme.ts:52 personaIdentityColor maps four names to danger/warning/primary/chart-neutral while personaColor retains risk thresholds. src/components/features/PcaScatterCard.tsx:43 sorts by multiplier and :140 sets series fill; src/app/clusters/page.tsx:154 card accent; src/app/customers/CustomerTable.tsx:144 dot; src/components/features/ClusterCustomersDialog.tsx:61 dialog dot. Tests cover all four identities and risk boundaries. |
| W4 | PASS | src/app/rules/page.tsx:50 exact supported-family hero label. src/lib/facts.ts:47 new inclusive fact ID with legacy fallback; src/app/page.tsx:49 fixed fact-driven signals, :112 concentration ratio chip, :116 exact second label, :100 high-risk definition. InsightVisualCard.tsx:42 prefers API headline factId. |
| W5 | PASS | src/lib/constants.ts:235 shared education/marriage mappings; src/lib/schemas.ts:9 uses shared enum values; src/app/customers/CustomerTable.tsx:135 education mapping; src/app/customers/page.tsx:346 detail mappings; src/components/features/PredictFields.tsx:109 shared labels. HighSchool appears only in the constants mapping/enum source. |
| W6 | PASS | src/components/rules/RuleEvidence.tsx:52 ladder levels, :90 mobile stacked ranking with visible values, :194 compact Single-condition families, :251 vs family. Ranking copy retained. Chromium checks ranking geometry at 400px. |
| W7 | PASS | src/app/insights/page.tsx:64 items-stretch; src/components/insights/InsightVisualCard.tsx:60 flex height, :181 mt-auto Details, :152 API highlight; src/components/insights/insight-label.ts:5 derives quartile labels from API boundaries. Boundary tests include payment/ratio/currency and changed thresholds. |
| W8 | PASS | src/components/sequences/SequenceHero.tsx:24 and PatternBars.tsx:28 use x.x more common among defaulters. Exact pattern remains visible. |
| W9 | PASS | src/lib/constants.ts:284 nav/breadcrumb Personas; src/app/clusters/page.tsx:51 title and :95 selection/elbow explanation (merged share parsed from API reason). src/lib/format.ts:23 sign before NT$. Warning chips use foreground text over warning/15; measured contrast 17.01:1 light and 15.20:1 dark. |
| W10 | PASS | src/components/features/PredictForm.tsx:92 mobile form submit; :114 sticky result panel below header at lg; :117 desktop submit explicitly associated with form. Chromium checks mobile/desktop controls and form association. |
| W11 | PASS | src/app/pipeline/page.tsx:142 Step 1-7 only; Phase badge removed. |
| W12 | PASS | src/components/report/ExecutiveSummary.tsx:98 optional summary lift/count/families, :192 one-decimal percent gauges. model-labels.ts centralizes names for report charts/tables/legends, including ROC/PR. ClusteringSection.tsx:47 total PCA variance, :127 identity colour, :145 traits without codes. ConclusionsSection.tsx:31 three fact-derived findings plus derived-risk caveat. Model selection rule remains once in section 6 plus executive summary. |
| W13 | PASS | src/components/report/ClassificationSection.tsx:217 splits model metrics under unchanged Table 8 caption; RuntimeChart.tsx:126/:161 compact Table 9 columns and notes. ReportPrimitives.tsx:18 beforeprint opens disclosures and afterprint restores them. paper/PaperReportDocument.tsx:137 dedicated persona heading, :181 shared Insights table, :96 single preprocessing account. ClusteringSection.tsx:186 and DataSections.tsx:279 percent bill trend. Team placeholders retained. Print geometry and disclosure restoration tests pass. |
| W14 | PASS | src/app/eda/EdaSections.tsx:38/:120 derives the median-limit callout from loaded class statistics. src/app/customers/CustomerTable.tsx:41/:63/:152 hides empty Flags and renders API flag/anomaly badges. Browser/SSR checks cover callout and both flag states. |
| Criterion 1 | PASS | W1-W14 evidence above. Forbidden-label grep clean. Enum grep only constants. No hard-coded listed statistics; raw numeric grep matches only existing CSS colour/opacity and chart dimensions, detailed below. |
| Criterion 2 | PASS | All four gates exit 0; 121/121 node tests. Caption-order files unchanged and both caption tests pass. Build generated 14/14 static pages. |
| Criterion 3 | PASS | This report includes changed files, result/evidence matrix, and final gate tails. |

## Changed files

These 53 source/test files were touched in this task; the repository already had changes from earlier waves. Review the working-tree diff without resetting that prior work.

- src/app/page.tsx
- src/app/clusters/page.tsx
- src/app/customers/CustomerTable.tsx
- src/app/customers/page.tsx
- src/app/eda/EdaSections.tsx
- src/app/eda/redesign-layout.test.mjs
- src/app/insights/page.tsx
- src/app/pipeline/page.tsx
- src/app/rules/page.tsx
- src/components/charts/PrCurveChart.tsx
- src/components/charts/RocCurveChart.tsx
- src/components/features/ClusterCustomersDialog.tsx
- src/components/features/PcaScatterCard.tsx
- src/components/features/PredictFields.tsx
- src/components/features/PredictForm.tsx
- src/components/insights/insight-label.test.mjs
- src/components/insights/insight-label.ts
- src/components/insights/InsightVisualCard.tsx
- src/components/report/AlgorithmCards.tsx
- src/components/report/ClassificationSection.tsx
- src/components/report/ClusteringSection.tsx
- src/components/report/ConclusionsSection.tsx
- src/components/report/DataSections.tsx
- src/components/report/EvaluationSection.tsx
- src/components/report/ExecutiveSummary.tsx
- src/components/report/InsightsAndAppendices.tsx
- src/components/report/model-labels.test.mjs
- src/components/report/model-labels.ts
- src/components/report/ModelComparisonChart.tsx
- src/components/report/report-consistency.test.mjs
- src/components/report/ReportPrimitives.tsx
- src/components/report/RuntimeChart.tsx
- src/components/report/SequenceSection.tsx
- src/components/report/paper/PaperReportDocument.tsx
- src/components/rules/review-polish.test.mjs
- src/components/rules/RuleEvidence.tsx
- src/components/sequences/PatternBars.tsx
- src/components/sequences/SequenceHero.tsx
- src/lib/api-contract.test.mjs
- src/lib/chart-theme.test.mjs
- src/lib/chart-theme.ts
- src/lib/constants.ts
- src/lib/contrast.test.mjs
- src/lib/facts.test.mjs
- src/lib/facts.ts
- src/lib/format.test.mjs
- src/lib/format.ts
- src/lib/mining-layout.test.mjs
- src/lib/mining-report-schemas.ts
- src/lib/rules-format.test.mjs
- src/lib/rules-format.ts
- src/lib/schemas.test.mjs
- src/lib/schemas.ts
- 7B-results.md

## Final gates

The commands ran after the final review correction. Unicode terminal glyphs below are escaped to keep this file ASCII.

### corepack pnpm typecheck - Verified, exit 0

```text
$ tsc --noEmit
```

### corepack pnpm lint - Verified, exit 0

```text
$ next lint
\u2714 No ESLint warnings or errors
```

### node --test (every src/**/*.test.mjs) - Verified, exit 0

Invocation: node --test (rg --files src -g '*.test.mjs'). Last 15 lines:

```text
\u2714 only consecutive identical months are run-length encoded (14.3315ms)
\u2714 API displayText and steps override raw grammar independently (11.791ms)
\u2714 deduplication keeps higher ratio while preserving original family order (12.4243ms)
\u2714 CV delta only compares rows belonging to the same algorithm (12.3262ms)
\u2714 curated stories take precedence, with legacy fallback only when absent (13.6641ms)
\u2714 API compressed steps retain repeated months when displayText is absent (13.4043ms)
\u2714 shared sequence schema preserves curated display and uncertainty metadata (33.922ms)
\u2139 tests 121
\u2139 suites 0
\u2139 pass 121
\u2139 fail 0
\u2139 cancelled 0
\u2139 skipped 0
\u2139 todo 0
\u2139 duration_ms 10014.0787
```

### corepack pnpm build - Verified, exit 0

Last 15 lines:

```text
\u251c \u25cb /eda                                 13.1 kB         305 kB
\u251c \u25cb /insights                            1.54 kB         279 kB
\u251c \u25cb /mining-report                       8.11 kB         331 kB
\u251c \u25cb /pipeline                            5.33 kB         161 kB
\u251c \u25cb /predict                             15.8 kB         204 kB
\u251c \u25cb /report/paper                        8.76 kB         322 kB
\u251c \u25cb /rules                               3.69 kB         170 kB
\u2514 \u25cb /sequences                           6.3 kB          162 kB
+ First Load JS shared by all            87.5 kB
  \u251c chunks/261-fed82895be9bb9e1.js       31.7 kB
  \u251c chunks/79fd7726-c61b78a620e366be.js  53.6 kB
  \u2514 other shared chunks (total)          2.1 kB


\u25cb  (Static)  prerendered as static content
```

## Scans and review

- Verified: rg -n '[^\\x00-\\x7F]' src produced no matches.
- Verified: forbidden W1 labels have no matches outside tests.
- Verified: HighSchool has two matches in src/lib/constants.ts only (mapping and enum source).
- Verified: caption-order.ts and caption-order.test.mjs have no diff.
- Verified: git diff --check -- src exits 0. Git emits existing LF/CRLF conversion notices.
- Listed-statistic grep: only non-statistical tokens remain: opacity 0.25 in ConfusionMatrix/PredictResult; HSL channel 38 in globals.css; chart heights 380 in PcaScatterCard/ModelComparisonChart. No listed statistic is hard-coded in product copy.
- Independent Static review only found two P3 "Pay ratio" headers. Both now use featureLabel("PAY_RATIO"); sort labels were aligned too. No other material issue found.
- Tests emit existing Recharts defaultProps and Node module-type warnings; these do not fail gates.
- Initial regression checks deliberately failed on old currency placement, delay "none", inclusive fact selection, and navigation. They pass with the implementation.
- Initial integrated failures were obsolete overview copy and missing test-hook mocks after optional metadata hooks were introduced. Expectations now assert the specified behavior; no assertion was removed to hide a functional failure.

## Evidence, tradeoffs, and limits

Sources checked 2026-10-16: ../.handoff/wave6/review-ux-opus-result.md; ProjectBrief.md, Architecture.md, ACTIVE_STATE.md; checked-in .api-samples; packet's 7A contract; installed package/source; both report caption registries. Packet supplied a Recharts 2.15.4 documentation check; this workspace actually installs Recharts 2.12.7. The implementation uses existing compatible interfaces and passed the installed-version browser tests. Next.js is 14.2.18.

Chosen option: optional schema fields and source-backed fallbacks. Alternative: require 7A before rendering. Optional fields let legacy captured responses continue rendering while new responses supply corrected durations, summary totals and PCA variance.

Application cost/latency: no new dependencies, application AI calls, training or backend processing. Personas adds one cached mining-report query for selection/elbow evidence (current sample is 151,118 bytes uncompressed); reports reuse the cached PCA metadata query. Network latency was not measured. The production build reports first-load JavaScript of 193 kB for Personas, 331 kB for Mining Report and 322 kB for Paper.

Coverage: headless sample-backed 400px/1440px layouts; mobile rule values; responsive prediction submission; printed Table 8/9 widths; disclosure expansion/restoration; canonical labels; fact fallbacks; zero delay durations and delta units; flags; quartile formatting; chart identity palette; theme contrast; runtime schemas; unchanged caption numbering.

Not verified: fresh 7A response captures and end-to-end interactions against running services. Existing sample fixtures remain untouched as requested. Before 7A fields arrive, legacy centroid-code means are explicitly disclosed and old report totals remain the fallback. Updated backend resource text was inspected where available, but no service was started.

Rollback: reverse only 7B hunks in the working tree. A broad checkout of src would also destroy pre-existing wave work and is not appropriate in this dirty checkout. No rollback was executed.

Next task: supervisor recaptures samples after 7A and 7B complete, then repeats live screenshot/print review using the corrected backend fields.

usage: unavailable in current runtime

## Continuation context

- What we build: consistent dashboard and two reports for Line's wave 7B findings.
- Current state: implementation and required local gates complete.
- Files in flight: none from 7B; backend 7A is independently owned.
- What changed: canonical names, corrected optional facts/durations, identity colours, readable responsive/print evidence.
- What failed and why: initial regression tests caught old behavior; integrated old-copy assertions were updated; no final gate failure.
- One next step: refresh 7A samples and live recaptures.

## Worker output (verbatim; non-ASCII punctuation escaped)

### Interaction worker

```text
Implemented W4 Rules hero, W5 Predict enums, W6-W8, W10-W11.

Verified: 9 focused tests, scoped ESLint, ASCII scan. Browser checks cover 400px Rules rankings and responsive Predict controls.

Full shared suite: 13 passed, 2 failed from concurrent persona/report changes:
- Obsolete `none` assertion.
- Missing `usePcaMeta` mock.

Evidence and integration details sent to parent. No servers or commits. Confidence: high for assigned changes; refreshed API samples remain pending.

usage: unavailable in current runtime
```

### Report worker

```text
Implemented W12-W13 and report-side W1-W3.

- API summary counts/lift, shared model names, decimal gauges, fact-based conclusions, PCA variance, and persona labels/colours are aligned.
- Paper Tables 8/9 fit print; disclosures expand and restore; Section 7 Insights reuses the web table; clustering has its own heading; bill trend uses percentages.
- Caption identifiers and numbering remain unchanged.

Verified: 7 report tests, typecheck, lint, ASCII scan. Print tests ran headlessly without servers.

Evidence: `ExecutiveSummary.tsx:98`, `ClusteringSection.tsx:47`, `ConclusionsSection.tsx:31`, `ClassificationSection.tsx:217`, `RuntimeChart.tsx:126`, `paper/PaperReportDocument.tsx:137`, `ReportPrimitives.tsx:18`.

Confidence: high. Remaining verification: integrated samples after backend completion and parent\u2019s full build/review.

usage: unavailable in current runtime
```

### Independent reviewer

```text
[P3] W1: `CustomerTable.tsx:61` and `ClusterCustomersDialog.tsx:103` retain "Pay ratio". Use `featureLabel("PAY_RATIO")` for canonical "Payment ratio".

Static review only: W1-W14 reviewed; no other material issues found. Caption registry unchanged. Optional backend fields have fallbacks.

Residual risks: updated 7A responses, responsive screenshots, and actual print rendering need integration verification. Parent owns gates.

usage: unavailable in current runtime
```

Integration decision: both historical test failures and both review headers above are resolved; final gates in this report supersede the workers' intermediate verification status.


