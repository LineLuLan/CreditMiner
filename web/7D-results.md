# 7D results for Line

Date: 2026-10-16 (Asia/Bangkok).

Decision: incomplete because D4's repository-wide wording cleanup reaches files excluded from FILES. D1-D3 and D5-D7 are implemented; D4 is implemented in the allowed owners. Confidence: high for completed changes, supported by regression checks, full gates and independent review. No commits or servers were started.

## Changed files

- src/lib/facts.ts
- src/components/rules/RuleEvidence.tsx
- src/app/page.tsx
- src/app/rules/page.tsx
- src/components/report/RulesAndAnomalySections.tsx
- src/components/report/ranking-copy.test.mjs
- src/components/report/paper/PaperReportDocument.tsx
- src/components/report/ExecutiveSummary.tsx
- src/components/features/PcaScatterCard.tsx
- src/app/eda/redesign-layout.test.mjs
- 7D-results.md

Source list is based on SHA-256 comparison with the task-start snapshot, after reading 7C-results.md. Earlier-wave changes were already present. All edits are inside web/src and this report. Caption-order source and tests are byte-identical to the snapshot. 7C changes were preserved.

## Findings and success criteria

| Item | Result | Evidence |
| --- | --- | --- |
| D1 | PASS | src/components/rules/RuleEvidence.tsx:21 shared immutable descending-base-lift sort; :92 chart; :208 cards and single-condition list; :242 synthetic families follow all real bases. src/components/report/RulesAndAnomalySections.tsx:176 applies it to both Tables 11/12. Regression at src/components/report/ranking-copy.test.mjs:54 covers both outcomes, synthetic families and immutability; :76 renders the non-default tab from the captured support-ordered response. |
| D2 | PASS | src/components/rules/RuleEvidence.tsx:55 reads both finalSupport values and omits thresholds if either is absent. src/app/rules/page.tsx:167 passes existing report methodology; src/components/report/RulesAndAnomalySections.tsx:51 shares it across report documents. Changed-value and missing-pass regression: ranking-copy.test.mjs:88. |
| D3 | PASS | src/components/features/PcaScatterCard.tsx:46 derives unique baseline centroid keys, falling back to persona centroid keys; :58 omits the count if unavailable. Changed three-feature and empty-data regression: ranking-copy.test.mjs:105. No formatInt(8) literal remains. |
| D4 | FAIL | Authorized copy is aligned at src/components/report/ExecutiveSummary.tsx:70, :91, :93, :115; src/app/page.tsx:82; src/components/report/paper/PaperReportDocument.tsx:135. Executive-summary regression: ranking-copy.test.mjs:115. Repository-wide rendered-copy scan still finds the excluded owners listed below. |
| D5 | PASS | src/components/report/RulesAndAnomalySections.tsx:110 labels the column Persona; :122 resolves report clustering displayName by clusterId and falls back to Persona N. Changed-name, unknown-id and null-id regression: ranking-copy.test.mjs:122. |
| D6 | PASS | src/lib/facts.ts:63 supplies the requested label map keyed by factId; src/app/page.tsx:116 renders it. Rate/share values still come from FactValue. No numeric data literals were introduced; threshold digits in the requested labels describe their fixed cohorts. Regression: ranking-copy.test.mjs:137. |
| D7 | PASS | src/components/report/RulesAndAnomalySections.tsx:189, :192, :207, :208, :210 use dashes for missing base/member counts and uplift. Null, undefined and zero regression: ranking-copy.test.mjs:144. |

| Criterion | Result | Evidence |
| --- | --- | --- |
| 1: D1-D7 and greps | FAIL | Six findings complete; D4 blocked outside FILES. All other forbidden-copy scans pass. |
| 2: gates and unchanged captions | PASS | Verified: typecheck, lint, all 140 tests, production build. Caption-order source/test hashes match the task-start snapshot; caption-order tests pass. |
| 3: results file | PASS | This report records changed files, D1-D7, criteria status and gate tails. |

## Scope blockers

The explicit FILES boundary excludes these remaining rendered-copy owners:

- src/components/features/PredictForm.tsx:140 - nearest segment.
- src/components/features/PredictResult.tsx:92 - Clients in this segment.
- src/app/clusters/page.tsx:234 - Segment averages (also a 7C owner).
- src/lib/constants.ts:276 - Segment category label, rendered by src/components/insights/InsightVisualCard.tsx:80.
- src/components/report/InsightsAndAppendices.tsx:82 - segment-level uplift metrics.
- src/components/report/MiningReportDocument.tsx:52 - Classification, segments, rules.
- src/app/layout.tsx:17 - client segmentation in page metadata, if the vocabulary requirement includes metadata.

Not verified: complete D4 cleanup. Proper follow-up is to authorize these owners for copy-only changes. API category values, route-path variables, and Recharts segment props are identifiers, not rendered persona copy, and should remain intact.

## Verification

Verified: all source files under src pass the non-ASCII scan. Existing Unicode escapes remain escaped. Verified: git diff --check -- src reports no whitespace errors (only Git LF/CRLF notices).

Verified: no matches for the literal minimum-support phrase, formatInt(8), or C-dollar-brace cluster codes in report components. The authorized executive summary, paper and overview have no segment wording. The broader src scan has the D4 matches above.

New regression coverage adds eight tests. Ordering failures were reproduced using captured non-default API order, including the rendered non-default tab. Changed support values, persona names and missing counts exposed the corresponding old behavior. The first full suite had 139 passes and one stale overview-copy assertion; the two legacy label assertions at src/app/eda/redesign-layout.test.mjs:96 and :100 now reflect D6. Final suite: 140 passed, zero failed.

Gate tails below preserve the last 15 lines, or all output if shorter. Non-ASCII console symbols are escaped for this ASCII-only report.

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

### node --test (every *.test.mjs under src)

Verified: exit 0.

```text
\u2714 only consecutive identical months are run-length encoded (11.0424ms)
\u2714 API displayText and steps override raw grammar independently (11.7111ms)
\u2714 deduplication keeps higher ratio while preserving original family order (11.9979ms)
\u2714 CV delta only compares rows belonging to the same algorithm (11.3145ms)
\u2714 curated stories take precedence, with legacy fallback only when absent (10.6934ms)
\u2714 API compressed steps retain repeated months when displayText is absent (9.8955ms)
\u2714 shared sequence schema preserves curated display and uncertainty metadata (24.9881ms)
\u2139 tests 140
\u2139 suites 0
\u2139 pass 140
\u2139 fail 0
\u2139 cancelled 0
\u2139 skipped 0
\u2139 todo 0
\u2139 duration_ms 7152.0105
```

### corepack pnpm build

Verified: exit 0.

```text
\u251c \u25cb /eda                                 13.1 kB         305 kB
\u251c \u25cb /insights                            1.54 kB         280 kB
\u251c \u25cb /mining-report                       8.3 kB          333 kB
\u251c \u25cb /pipeline                            5.33 kB         161 kB
\u251c \u25cb /predict                             15.8 kB         204 kB
\u251c \u25cb /report/paper                        8.76 kB         323 kB
\u251c \u25cb /rules                               3.88 kB         170 kB
\u2514 \u25cb /sequences                           6.4 kB          162 kB
+ First Load JS shared by all            87.5 kB
  \u251c chunks/261-fed82895be9bb9e1.js       31.7 kB
  \u251c chunks/79fd7726-c61b78a620e366be.js  53.6 kB
  \u2514 other shared chunks (total)          2.1 kB


\u25cb  (Static)  prerendered as static content
```

## Independent review

No material defects found in the scoped changes. Reviewer output follows verbatim except Unicode escapes required by the ASCII constraint.

```text
No material defects found in the scoped D1\u2013D7 changes. Confidence: high.

Static review only: reviewed eight source files, regression tests, captured API samples, and 7C results. Ranking, support captions, feature counts, persona names, overview labels, and report-table placeholders match the scoped requirements.

Residual risk: D4\u2019s broader removal of \u201csegment\u201d wording remains blocked by out-of-scope files. Browser interactions and live API behavior were not reviewed; no checks independently rerun.

No files changed. usage: unavailable in current runtime.
```

Review model: gpt-6-astra, high effort, as requested in the packet. Runtime usage: unavailable in current runtime.

Evidence checked on 2026-10-16: ../.handoff/wave6/review-7B-fable.md; 7C-results.md; .api-samples/mining-report.json, rule-family samples, clusters.json, facts.json and PCA metadata. No external documentation was needed for these data ordering and copy changes.

Coverage gaps: live API and hydrated interactions were not tested. Existing sample-backed browser layout/print checks ran without servers as part of the Node suite. No model eval gate is relevant to these presentation-only changes.

Rationale: one shared sort keeps every ranking consumer aligned without mutating query data; metadata is passed from the existing report query. A new query inside the footnote was viable but would add unnecessary coupling. A factId label map preserves catalogue statistics and avoids parsing prose.

Cost/latency: zero new dependencies and zero new API requests. Sorting uses O(n log n) time and O(n) copied arrays per ranked view. Browser latency was not benchmarked. No AI or backend model behavior changed.

Risk and rollback: the remaining D4 copy is inconsistent. Missing support metadata intentionally removes the numeric note. Reverse only the ten source/test file edits made in this task; do not reset all web/src because that would erase 7C and earlier waves.

## Handoff within the authorized report

- What we build: truthful ranking captions and data-driven presentation for Line's CreditMiner dashboard.
- Current state: six findings complete; D4 partial; all runnable gates pass.
- Files in flight: the ten source/test files above and this report; no background work remains.
- What changed: shared lift ordering, metadata-driven captions/counts, scoped persona copy, anomaly names, consistent overview labels and report dashes.
- What failed and why: D4 needs excluded source owners; first full suite had stale pre-D6 copy assertions, now updated and passing.
- The one next step: supervisor supplies an expanded copy-only packet for the listed D4 owners, including explicit permission to touch the 7C clusters page.

usage: unavailable in current runtime

