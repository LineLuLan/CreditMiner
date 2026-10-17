# 7C results for Line

Latest status: Resume 1 completes C5/C6 and the five additional persona-copy replacements. See the Resume 1 section for current PASS evidence; the initial-pass blockers below are historical.

Date: 2026-10-16 (Asia/Bangkok).

Decision: incomplete. Seven items are implemented; C5 and C6 are blocked by the exact FILES scope. Confidence: high for the completed items, supported by passing gates and sample-backed rendering checks. No commits or servers were started.

## Scope blockers

- C5 requires src/components/report/ClassificationSection.tsx:86, which owns the hard-coded section-5-2 anchor and 5.2 Improvements heading. This file was omitted from FILES. Renumbering the other sections alone would leave duplicate anchors or inconsistent headings. No C5 edits were made.
- C6 requires src/components/report/RunCommandsAppendix.tsx:5, reused by the paper at src/components/report/paper/PaperReportDocument.tsx:184. This shared file was omitted from FILES. It owns all Phase descriptions. No C6 edits were made.
- Scope clarification for these two files was requested. No authorization has arrived. The proper fix is to edit these owners; duplicating or overriding their rendered output would be a workaround.

## Changed files in this task

- src/app/clusters/page.tsx
- src/app/customers/CustomerTable.tsx
- src/app/customers/page.tsx
- src/app/rules/page.tsx
- src/components/insights/InsightVisualCard.tsx
- src/components/report/DataSections.tsx
- src/components/report/report-consistency.test.mjs
- src/components/report/ReportPrimitives.tsx
- src/components/report/ReportToc.tsx
- src/components/report/SequenceSection.tsx
- src/components/rules/review-polish.test.mjs
- src/components/sequences/ItemLegend.tsx
- 7C-results.md

Earlier-wave changes were present before this task. The list above comes from SHA-256 comparison with a task-start snapshot, not the aggregate git diff.

## Findings and evidence

| Item | Result | Evidence |
| --- | --- | --- |
| C1 | PASS | src/app/rules/page.tsx:140 category-specific Families/Rules captions; :154-158 conditional All outcomes line from useMiningReport summary. Both tab expectations covered in src/components/rules/review-polish.test.mjs. |
| C2 | PASS | src/components/report/DataSections.tsx:198 reads raw MAX_DELAY and clipped baseline; :259-266 adds the explanatory Table 5 footnote. Raw statistics and min -2 remain unchanged. Changed-value and missing-baseline regression: src/components/report/report-consistency.test.mjs:46. |
| C3 | PASS | src/components/report/SequenceSection.tsx:93-103 uses plain month/payment prose shared by both reports. :124 maps table item names to readable labels; :131 includes ItemLegend as the token-code reference. src/components/sequences/ItemLegend.tsx:32 renders code - meaning. Both documents checked at src/components/report/report-consistency.test.mjs:61. |
| C4 | PASS | src/components/report/ReportToc.tsx:19-20 and src/components/report/ReportPrimitives.tsx:210-211 omit Appendix A from both screen TOCs. Browser check at src/components/report/report-consistency.test.mjs:86 verifies every TOC target is unique and visible, and Appendix A remains printable. |
| C5 | FAIL | Not verified: blocked by omitted ClassificationSection.tsx. Existing 5.2 Improvements and 5.3 Sequence mining remain. |
| C6 | FAIL | Not verified: blocked by omitted RunCommandsAppendix.tsx. Existing paper Steps 1-4 and appendix Phases remain. |
| C7 | PASS | src/app/customers/page.tsx:65, :99, :102, :298 and src/app/customers/CustomerTable.tsx:62 use Persona/All personas. Customer dialog title at page.tsx:246 already says Client. |
| C8 | PASS | src/app/clusters/page.tsx:260 labels Bill trend (% of limit); :286 formats month deltas to one decimal, retaining pp for rate deltas. Existing duration regression updated to assert the requested precision. |
| C9 | PASS | src/components/insights/InsightVisualCard.tsx:60-65 derives the note from the visual's 2 months late and 3+ months late bars; :181 renders muted copy. Changed-value/missing-bar test at src/components/report/report-consistency.test.mjs:74. |

## Success criteria

| Criterion | Result | Evidence |
| --- | --- | --- |
| 1: C1-C9 and forbidden-copy greps | FAIL | Seven items pass and forbidden rendered-copy grep passes; C5/C6 remain blocked. |
| 2: runnable gates and protected captions | PASS | Verified: typecheck, lint, all 132 tests, and production build. caption-order.ts and caption-order.test.mjs are byte-identical to the task-start snapshot. |
| 3: results file | PASS | This file records changes, item and criterion status, and gate tails. |

Verified: ASCII scan of all 12 changed source/test files found no non-ASCII characters. Existing escaped Unicode remains escaped. Verified: rg found no PAY_6 (April, NO_BALANCE means, COVERED means, or All clusters in src excluding test files. rg exit 1 means no matches.

## Verification history and gate tails

Tests first reproduced the missing clipped-delay note, plain sequence copy, combined-cohort note, and dead Appendix A link. All four tests passed after the changes. Full-suite failures were stale caption/precision expectations in the in-scope review-polish.test.mjs; those expectations now match C1/C8. Final full suite: 132 passed, zero failed.

Gate tails below preserve the last 15 output lines (or the full output if shorter). Non-ASCII console glyphs are escaped to keep this report ASCII.

### corepack pnpm typecheck

Verified: exit 0.

```text
$ tsc --noEmit
```

### corepack pnpm lint

Verified: exit 0.

```text
$ next lint
\u2714 No ESLint warnings or errors
```

### node --test (all *.test.mjs under src, enumerated with rg)

Verified: exit 0.

```text
\u2714 only consecutive identical months are run-length encoded (11.6071ms)
\u2714 API displayText and steps override raw grammar independently (8.5491ms)
\u2714 deduplication keeps higher ratio while preserving original family order (10.2893ms)
\u2714 CV delta only compares rows belonging to the same algorithm (9.8429ms)
\u2714 curated stories take precedence, with legacy fallback only when absent (10.9918ms)
\u2714 API compressed steps retain repeated months when displayText is absent (9.7119ms)
\u2714 shared sequence schema preserves curated display and uncertainty metadata (23.4701ms)
\u2139 tests 132
\u2139 suites 0
\u2139 pass 132
\u2139 fail 0
\u2139 cancelled 0
\u2139 skipped 0
\u2139 todo 0
\u2139 duration_ms 6333.8868
```

### corepack pnpm build

Verified: exit 0.

```text
\u251c \u25cb /eda                                 13.1 kB         305 kB
\u251c \u25cb /insights                            1.54 kB         280 kB
\u251c \u25cb /mining-report                       8.3 kB          332 kB
\u251c \u25cb /pipeline                            5.33 kB         161 kB
\u251c \u25cb /predict                             15.8 kB         204 kB
\u251c \u25cb /report/paper                        8.76 kB         323 kB
\u251c \u25cb /rules                               3.85 kB         170 kB
\u2514 \u25cb /sequences                           6.4 kB          162 kB
+ First Load JS shared by all            87.5 kB
  \u251c chunks/261-fed82895be9bb9e1.js       31.7 kB
  \u251c chunks/79fd7726-c61b78a620e366be.js  53.6 kB
  \u2514 other shared chunks (total)          2.1 kB


\u25cb  (Static)  prerendered as static content
```

## Review and limits

Independent review completed. No material issues found in the completed items. Output below is verbatim except Unicode escapes, required by the ASCII-only file constraint.

```text
No material issues found in C1\u2013C4 or C7\u2013C9. Confidence: high.

Static review only: inspected the scoped components, related report paths, API samples, and regression tests. The implementation preserves raw MAX_DELAY statistics, uses data-driven totals and cohort values, shares the revised sequence prose across both reports, and retains Appendix A for printing.

Coverage gaps: no checks independently rerun; parent reports passing typecheck, lint, 132 Node tests, and production build. C5/C6 remain incomplete and outside this review. Live API behavior and full browser interactions were not reviewed.

No files changed. usage: unavailable in current runtime.
```

Evidence checked on 2026-10-16: the council review at ../.handoff/wave6/review-ux-opus-r3-result.md; .api-samples/mining-report.json, clusters.json, insight-visuals.json, sequences.json and rule-family samples; Methodology source src/app/pipeline/page.tsx. External documentation was unnecessary for these copy changes.

Coverage: sample-backed static rendering, browser visibility/print/layout tests, typecheck, lint, complete Node suite, and build. Not verified: live API behavior or hydrated application interactions; no servers were permitted.

Cost/latency: no dependencies added. Rules now subscribes to the existing mining-report query for aggregate counts, so an uncached visit can fetch that report. Network latency and payload cost were not measured.

Risk: C5/C6 still prevent completion of the full consistency task. Missing optional summary/baseline/bar data omits the corresponding numerical note rather than inventing values. Team placeholders remain Line's separate task.

Rollback: selectively reverse this task's edits. Do not reset all of web/src because it contained earlier-wave uncommitted work before this task.

Next task: authorize ClassificationSection.tsx and RunCommandsAppendix.tsx for the minimal C5/C6 changes, then finish numbering and rerun affected checks.

usage: unavailable in current runtime

## Resume 1

Date: 2026-10-16. Line expanded FILES for ClassificationSection.tsx and RunCommandsAppendix.tsx, authorized numbering/cross-reference updates, and requested five additional persona-copy replacements. Read 7D-results.md before edits.

Decision: C5, C6 and the five extra replacements are complete. C1-C9 now PASS across the initial pass and Resume 1. Confidence: high. The initial blocked statuses above describe the earlier pass and are superseded by this section. No commits or servers were started.

### Changed files in Resume 1

- src/app/clusters/page.tsx
- src/components/features/PredictForm.tsx
- src/components/features/PredictResult.tsx
- src/components/report/ClassificationSection.tsx
- src/components/report/ClusteringSection.tsx
- src/components/report/InsightsAndAppendices.tsx
- src/components/report/MiningReportDocument.tsx
- src/components/report/paper/PaperReportDocument.tsx
- src/components/report/report-consistency.test.mjs
- src/components/report/ReportPrimitives.tsx
- src/components/report/ReportToc.tsx
- src/components/report/RulesAndAnomalySections.tsx
- src/components/report/RunCommandsAppendix.tsx
- src/components/report/SequenceSection.tsx
- src/components/rules/review-polish.test.mjs
- src/components/sequences/MethodNotes.tsx
- 7C-results.md

The list is based on a fresh SHA-256 snapshot taken after wave 7D. MethodNotes.tsx contains the cross-reference to the moved sequence section and was updated under the explicit cross-reference instruction.

### Findings and success criteria

| Item | Result | Evidence |
| --- | --- | --- |
| C5 | PASS | ClassificationSection.tsx:86-88 changes Improvements to an h4 with its own subordinate anchor; MiningReportDocument.tsx:54-58 groups it with 5.1 Algorithms. ClusteringSection.tsx:34-36 owns 5.2 Personas (K-means). MiningReportDocument.tsx:62-72 groups rules and anomalies under 5.3; RulesAndAnomalySections.tsx:25 and :76 use subordinate anchors/headings. SequenceSection.tsx:36-37 owns 5.4. ReportToc.tsx:12-15 and ReportPrimitives.tsx:203-206 agree. MethodNotes.tsx:22 links to section-5-4. Paper headings at paper/PaperReportDocument.tsx:134, :138, :166, :180 use the same numbering. All paths in this row are under src/components/report except MethodNotes.tsx, under src/components/sequences. |
| C6 | PASS | src/components/report/RunCommandsAppendix.tsx:7-35 maps phases 1/2/3/5/6/7/10 to Steps 1/2/3/4/5/6/7, with all eight original command strings preserved. Phase 9 is explicitly a supporting task after Step 6, rather than an invented eighth Methodology step. src/components/report/paper/PaperReportDocument.tsx:113-125 labels profiling, cleaning, features and classification correctly; :136 assigns SMOTE to Step 4; :140, :168 and :181 label persona/anomaly, rules and sequences as Steps 5, 6 and 7. |
| Extra persona wording | PASS | src/app/clusters/page.tsx:234; src/components/features/PredictForm.tsx:140; src/components/features/PredictResult.tsx:92; src/components/report/InsightsAndAppendices.tsx:82; src/components/report/MiningReportDocument.tsx:52. All five use persona/personas. Code identifiers remain unchanged. |
| Criterion 1: C1-C9 and forbidden-copy scans | PASS | Prior seven fixes remain; C5/C6 now pass. Original forbidden-copy scan and new stale-numbering/requested-wording scan have no matches in rendered source. |
| Criterion 2: gates and captions | PASS | Verified: typecheck, lint, all 141 tests, production build, ASCII scan and git diff --check. Both caption-order source and test files are byte-identical to the Resume 1 snapshot. |
| Criterion 3: results | PASS | This Resume 1 section records file:line evidence, changes and gate tails. |

### Verification

The focused tests first reproduced old headings and phase labels, then passed after implementation. The existing browser TOC test now checks the four numbered headings, the subordinate Improvements heading, the combined rules/anomalies section, unique visible targets and printable Appendix A. A new regression checks all eight Maven command strings and their Step/Phase mappings, plus paper step copy. The existing sequence-link browser test now proves its destination is section 5.4. Full suite: 141 passed, zero failed.

Verified: RuleEvidence.tsx, ExecutiveSummary.tsx, app/page.tsx and ranking-copy.test.mjs are byte-identical to the post-7D snapshot. The 7D rule ranking, support captions, anomaly persona-name and overview-label regressions pass. Changes to RulesAndAnomalySections.tsx only adjust its section anchors and heading levels; its 7D data handling is retained. The paper's 7D persona wording is retained.

Gate tails preserve the final 15 lines (or the full output if shorter). Non-ASCII console glyphs are escaped.

#### corepack pnpm typecheck

Verified: exit 0.

```text
$ tsc --noEmit
```

#### corepack pnpm lint

Verified: exit 0.

```text
$ next lint
\u2714 No ESLint warnings or errors
```

#### node --test (every *.test.mjs under src)

Verified: exit 0.

```text
\u2714 only consecutive identical months are run-length encoded (18.2397ms)
\u2714 API displayText and steps override raw grammar independently (19.7141ms)
\u2714 deduplication keeps higher ratio while preserving original family order (18.4433ms)
\u2714 CV delta only compares rows belonging to the same algorithm (18.1681ms)
\u2714 curated stories take precedence, with legacy fallback only when absent (17.2518ms)
\u2714 API compressed steps retain repeated months when displayText is absent (20.1525ms)
\u2714 shared sequence schema preserves curated display and uncertainty metadata (41.3005ms)
\u2139 tests 141
\u2139 suites 0
\u2139 pass 141
\u2139 fail 0
\u2139 cancelled 0
\u2139 skipped 0
\u2139 todo 0
\u2139 duration_ms 15325.6365
```

#### corepack pnpm build

Verified: exit 0.

```text
\u251c \u25cb /eda                                 13.1 kB         305 kB
\u251c \u25cb /insights                            1.54 kB         280 kB
\u251c \u25cb /mining-report                       8.37 kB         333 kB
\u251c \u25cb /pipeline                            5.33 kB         161 kB
\u251c \u25cb /predict                             15.8 kB         204 kB
\u251c \u25cb /report/paper                        8.98 kB         323 kB
\u251c \u25cb /rules                               3.88 kB         170 kB
\u2514 \u25cb /sequences                           6.4 kB          162 kB
+ First Load JS shared by all            87.5 kB
  \u251c chunks/261-fed82895be9bb9e1.js       31.7 kB
  \u251c chunks/79fd7726-c61b78a620e366be.js  53.6 kB
  \u2514 other shared chunks (total)          2.1 kB


\u25cb  (Static)  prerendered as static content
```

### Review, evidence and remaining scope

Independent review completed with no material issues. Output is verbatim except Unicode escapes required by the ASCII-only constraint:

```text
No material issues found in packet-7C Resume 1. Confidence: high.

Static review only: C5 headings, both TOCs, and the sequence link agree. C6 follows Methodology Steps 1\u20137, retains legacy phase mappings, and preserves command text. All five requested persona edits are present. Caption order and reviewed wave 7D behavior remain intact.

Residual risk: hydrated browser behavior and live API responses were not reviewed. No gates independently rerun; parent reports passing typecheck, lint, 141 tests, and scans. Production build was still running when delegated.

No files changed. usage: unavailable in current runtime.
```

The parent confirmed production build exit 0 after review delegation. All background work has completed. Review model: gpt-6-astra, high effort, as requested in the original packet.

Sources checked on 2026-10-16: 7D-results.md; current report components; src/app/pipeline/page.tsx (Methodology); captured API samples used by the regression suite; InsightFactsReport.java input paths (read only, to confirm Phase 9 summarizes preceding data/model/persona/rule artifacts). No external documentation was required.

Rationale: group existing sections and adjust heading levels while retaining content/caption order. Parenthetical phase mappings keep the seven-step reader scheme and executable class names together. No new abstraction, dependency, API request or model behavior was introduced. Latency was not benchmarked; these edits change copy and markup.

Not verified: live API and fully hydrated application interactions. Sample-backed browser layout, TOC and print checks ran without servers. The requested five wording locations are complete; the separate Segment category label in src/lib/constants.ts and segmentation metadata in src/app/layout.ts were not included in the expanded file scope and are unchanged. Team placeholders remain Line's separate task.

Rollback: selectively reverse the Resume 1 changes; preserve earlier-wave working-tree edits. No database, API, deployment or command behavior changed.

### Resume 1 handoff

- What we build: consistent report numbering, Methodology step labels and the five requested persona-copy replacements.
- Current state: C1-C9 and the scoped extra replacements pass; all required gates pass.
- Files in flight: the 16 source/test files listed above and this report.
- What changed: headings, wrappers, TOCs, sequence cross-reference, paper/command step descriptions, five copy strings and relevant tests.
- What failed and why: focused tests reproduced the pre-fix numbering/phase mismatches; both now pass. No final gate failures.
- The one next step: supervisor reviews the completed working-tree diff for submission.

usage: unavailable in current runtime


