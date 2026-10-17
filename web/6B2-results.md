# Wave 6B2 results for Line

Date: 2026-10-16
Decision: R1-R7 implementation is present; delivery remains blocked by the final build gate.
Confidence: high for tested contracts and sample rendering; final production build Not verified.

## Blocker history

1. Initial packet: report persona metadata was absent and shared request/schema owners were outside FILES.
2. Resume 1: shared scope was expanded, but both cluster samples had a zero portfolio baseline and null centroids.
3. Resume 2: post-seeding samples repaired the data. The requested first focused schema check then exposed frontend stripping of conditions.text. R6 field preservation fixed it, and the focused check passed.
4. Final gate: an initial production build passed. After the final label-map/dead-helper cleanup, the required rerun failed at src/app/layout.tsx:2 and :8 because next/font could not fetch Inter from fonts.googleapis.com (connect EACCES). This file is outside FILES. The unchanged stop rule applies: "a gate fails outside FILES - stop". No font, network, deployment, or layout workaround was attempted.

## Requirements and acceptance

PASS below means the scoped implementation and cited checks are complete. It does not override the failed build gate.

| Item | Result | File:line evidence and checks |
| --- | --- | --- |
| R1 Rules | PASS | src/app/rules/page.tsx:23 uses both family queries, supported-base hero, separate KPI tiles and two tabs. src/components/rules/RuleEvidence.tsx:52 renders API-ordered 28px confidence bars; :120 groups ascending ladders; :188 renders big confidence, lift chip, n and top-three/expandable modifiers. Synthetic bases remain unavailable. src/lib/rules-format.ts:60 holds captured labels; :175 fallback names; :243 supported hero; :249 base-lift filter; :255 ladders. Tests: src/lib/rules-format.test.mjs:28, :38, :118, :132 and src/components/rules/review-polish.test.mjs. Dead legacy grouping/naming/table helpers removed. |
| R2 Sequences | PASS | src/components/sequences/SequenceHero.tsx:21 leads with familyStory; :27 preserves exact pattern and the existing CI. PatternBars.tsx:22 and PatternTable.tsx:22 show family story plus exact detail/rates. src/components/sequences/AllPatterns.tsx:15 paginates the full artifact at 25 rows, with conditional Family column. src/app/sequences/page.tsx:65 wires it. Existing ItemLegend and 6B1 MethodNotes delta remain unchanged by this run. Eighteen sequence tests pass. |
| R3 Clusters | PASS | src/app/clusters/page.tsx:78 combines above-baseline persona names/shares; :89 uses actual evidence.k/silhouette; :91 renders sorted 2x2 cards; :203 compares four personas plus Portfolio with whole-year age. src/lib/chart-theme.ts:43 defines personaColor and clusterColor delegates. src/components/clusters/clusters-view.ts:62 caps samples at 150 per persona. src/components/features/PcaScatterCard.tsx:129 uses named series and shared colors. CustomerTable.tsx and ClusterCustomersDialog.tsx use the same scale. Only requested CSS/Tailwind tokens changed; print CSS untouched. Nine focused color/cluster tests pass. |
| R4 Insights | PASS | src/lib/facts.ts:46 and :59 map priority tile three to the combined delaying-persona fact; src/app/page.tsx:111 uses the visual headline label. InsightVisualCard.tsx:117 forces all category ticks. :75 and app/page.tsx:110 suppress empty lifts and absent authoritative multipliers. The demographic headline uses the API high-school cohort. src/app/eda/redesign-layout.test.mjs:136 renders real Recharts axes at fixed dimensions and checks all persona/status labels, tick counts, and missing/empty lift chips. |
| R5 Reports | PASS | RulesAndAnomalySections.tsx:30 and :40 retain caption IDs; :161 renders bold bases and indented modifiers with confidence, lift, joint count and uplift. ClusteringSection.tsx:22 uses final model silhouette and separates sweep evidence; :42 renders the API selection rationale. Four persona cards and centroid columns retain names/taglines/shares. ExecutiveSummary.tsx:90-92 shows the top persona name and data-derived persona count. SequenceSection.tsx:71 leads with familyStory while exact tables remain. paper/PaperReportDocument.tsx:37 and :122-161 integrate family queries, persona cards, selection evidence and centroids. Both caption-order tests pass. |
| R6 Schemas/tests | PASS | mining-report-schemas.ts:70-101 types modifiers, nullable bases, groups and passthrough families; :432 preserves selection. schemas.ts:133-135 preserves edges/binning/notes. report/sequence-data.ts:24-25 and :33 preserve familyStory/familyItems and unknown fields. schemas.test.mjs parses all 21 captured samples and checks field equality. Updated browser static checks cover 400/1440px and expanded evidence. |
| R7 EDA | PASS | app/eda/EdaSections.tsx:29 requests 10 bins using the selected server mode, renders API edges/counts directly, and :134-135 shows notes as a muted line. Local approximate/fallback prose removed. lib/api.ts:88-90 sends binning; hooks/useEda.ts:14-17 includes it in the request and cache key. api-contract.test.mjs:42 verifies both modes and separate caches. |
| Criterion 1: R1-R7 implemented with evidence | PASS | Evidence above; final delivery gate still blocked. |
| Criterion 2: no raw-code literals in rendered-copy sources | PASS | Required rg scan of the three route/component trees, excluding tests, returned zero matches. The explicitly unchanged technical ItemLegend still displays API-provided field definitions when expanded; these are not literal page-copy codes introduced by this work. |
| Criterion 3: no hardcoded result numbers | PASS | rg for 69.1, 53.5, 44.5, 0.47, 0.26, 82% across src excluding tests returned zero matches. |
| Criterion 4: all four gates green | FAIL | Final typecheck/lint/99 tests passed. Final build failed on out-of-scope Inter download with EACCES. |
| Criterion 5: results report | PASS | This file lists changed files, evidence, gate tails and limitations. One build stack-trace fragment was elided by the tool; disclosed below. |

## Changed files

These 44 files were changed or created by this packet, including this report. Other dirty files shown by git status belong to pre-existing 6B1/backend work. Samples were refreshed by the supervisor and were not edited or invented by this run.

- `src/app/clusters/page.tsx`
- `src/app/customers/CustomerTable.tsx`
- `src/app/eda/EdaSections.tsx`
- `src/app/eda/redesign-layout.test.mjs`
- `src/app/globals.css`
- `src/app/page.tsx`
- `src/app/rules/page.tsx`
- `src/app/sequences/page.tsx`
- `src/components/clusters/clusters-view.ts`
- `src/components/features/ClusterCustomersDialog.tsx`
- `src/components/features/PcaScatterCard.tsx`
- `src/components/insights/InsightVisualCard.tsx`
- `src/components/report/ClusteringSection.tsx`
- `src/components/report/ExecutiveSummary.tsx`
- `src/components/report/RulesAndAnomalySections.tsx`
- `src/components/report/SequenceSection.tsx`
- `src/components/report/paper/PaperReportDocument.tsx`
- `src/components/report/sequence-data.ts`
- `src/components/rules/RuleEvidence.tsx`
- `src/components/rules/review-polish.test.mjs`
- `src/components/sequences/AllPatterns.tsx`
- `src/components/sequences/PatternBars.tsx`
- `src/components/sequences/PatternTable.tsx`
- `src/components/sequences/SequenceHero.tsx`
- `src/hooks/useEda.ts`
- `src/hooks/useRules.ts`
- `src/lib/api.ts`
- `src/lib/api-contract.test.mjs`
- `src/lib/chart-theme.test.mjs`
- `src/lib/chart-theme.ts`
- `src/lib/clusters-view.test.mjs`
- `src/lib/facts.test.mjs`
- `src/lib/facts.ts`
- `src/lib/format.test.mjs`
- `src/lib/mining-layout.test.mjs`
- `src/lib/mining-report-schemas.ts`
- `src/lib/rules-format.test.mjs`
- `src/lib/rules-format.ts`
- `src/lib/schemas.test.mjs`
- `src/lib/schemas.ts`
- `src/lib/sequence-format.test.mjs`
- `src/lib/sequence-format.ts`
- `tailwind.config.ts`
- `6B2-results.md`

## Verification

- Verified: corepack pnpm typecheck, exit 0.
- Verified: corepack pnpm lint, exit 0, no ESLint warnings/errors.
- Verified: every src *.test.mjs via node --test, 99 tests passed, 0 failed, 0 skipped.
- Verified: caption numbering, 21 sample schemas, family-name/label parity, ladder ordering, persona colors/sampling, binning/cache contract, and empty-lift handling.
- Verified: server-free Chromium sample layouts at 400px and 1440px, including expanded evidence; chart tick tests use real Recharts with a fixed-size container.
- Verified: requested ASCII scan, including the two new source/test files and Tailwind config, found no non-ASCII text. git diff --check passed.
- Not verified: final production build; command ran and failed with EACCES fetching Inter. An earlier successful build is not claimed for the final tree.
- Not verified: a live hydrated app against a running backend, printed pagination, and dark-mode screenshots. No servers were started.

Full tests emit existing Node module-type warnings and Recharts defaultProps deprecation warnings. Build output also includes non-fatal webpack cache EPERM warnings; the final failure is the denied font request.

## Review and corrections

Two workers reviewed slices they did not implement. The review found one P2: a populated visual lift string paired with a null authoritative multiplier rendered an n/a badge. Both consumers now gate on the resolved multiplier as well as the nonempty lift. Regression coverage includes empty, whitespace-only, and populated-but-unavailable cases.

Integration caught a wrong hook import, corrected it to hooks/useRules, and verified real imports via typecheck/build. Final R1 inspection also found the old long-label map; a failing sample-label parity test now passes after updating labels. Unused legacy helpers and their obsolete tests were removed. Final diffs were checked for DRY/KISS without refactoring unrelated code.

## Assumptions, costs, and residual risks

- Captured post-seeding API samples are authoritative. No rates or shares are reconstructed for a missing synthetic base. Synthetic families appear at the minimum lift setting only and have no base chart/ladder point.
- Selected model silhouette is taken from finalSilhouette/evidence. The report shows the separate k=2 sweep score and API chosenReason; the dashboard omits that optional clause. Formatting the actual final silhouette yields 0.25 (or 0.251 at three decimals), not a hardcoded 0.26.
- All 1,247 raw sequence patterns lack story/display metadata in the captured raw list. Existing exact-pattern formatting is used there. Enriched stories use API familyStory/displayText; the Family column appears only when that metadata exists.
- Rules use two category queries and filter lift locally. PCA renders at most 600 points, and All patterns renders 25 table rows per page. No new dependencies or model calls were added. Latency and cost deltas were not benchmarked.
- The web report's out-of-scope app/mining-report/page.tsx still makes its two legacy rule requests. The new family section adds two cached family requests. Removing those unused parent requests is a future scope cleanup; report evidence itself uses family responses.
- No backend, secrets, deployment configuration, commits, pushes, or server starts were performed.

## Sources checked

Local source, captured API samples, and repository context checked on 2026-10-16.
Supervisor supplied the Recharts 2.15.4 documentation check from context7 dated 2026-10-16; repository pins Recharts 2.12.7. The implemented chart behavior was checked against the installed package by tests. Next.js 14.2.18 and zod 3.23.8 are the installed versions used by the gates. No independent external documentation fetch was needed for this bounded implementation.

## Gate tails

The following are the last 20 returned lines (or all output when shorter). Non-ASCII console glyphs are escaped to preserve the packet's ASCII-only requirement. The build tool truncated part of one stack-trace fragment; that marker is retained rather than reconstructing unavailable output.

### typecheck - exit 0

Command: `corepack pnpm typecheck`

```text
$ tsc --noEmit
```

### lint - exit 0

Command: `corepack pnpm lint`

```text
$ next lint
\u2714 No ESLint warnings or errors
```

### tests - exit 0

Command: `$tests = @(rg --files src -g '*.test.mjs'); node --test @tests`

```text
\u2714 all pattern selection preserves API arrays and deduplicates only legacy exact patterns (15.979ms)
\u2714 400px static layout guards keep story text wrapping and tables locally scrollable (1.0478ms)
\u2714 GSP braces are ordered months and commas join items within one month (11.3531ms)
\u2714 unknown tokens remain inspectable; empty tokens and malformed patterns are safe (9.5836ms)
\u2714 all known tokens have readable names (19.9304ms)
\u2714 only consecutive identical months are run-length encoded (20.7032ms)
\u2714 API displayText and steps override raw grammar independently (14.9955ms)
\u2714 deduplication keeps higher ratio while preserving original family order (14.0567ms)
\u2714 CV delta only compares rows belonging to the same algorithm (11.023ms)
\u2714 curated stories take precedence, with legacy fallback only when absent (12.6456ms)
\u2714 API compressed steps retain repeated months when displayText is absent (12.0149ms)
\u2714 shared sequence schema preserves curated display and uncertainty metadata (40.4745ms)
\u2139 tests 99
\u2139 suites 0
\u2139 pass 99
\u2139 fail 0
\u2139 cancelled 0
\u2139 skipped 0
\u2139 todo 0
\u2139 duration_ms 10343.9764
```

### build - exit 1

Command: `corepack pnpm build`

```text
    at symbolIterator (D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\dist\compiled\neo-async\async.js:1:14444)
    at done (D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\dist\compiled\neo-async\async.js:1:14824)
    at Hook.eval [as callAsync] (eval at create (D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\dist\compiled\webpack\bundle5.js:13:28858), <anonymous>:15:1)
    at Hook.CALL_ASYNC_DELEGATE [as _ca\u2026396 tokens truncated\u2026spaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\dist\trace\trace.js:154:20)
    at Object.<anonymous> (D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\dist\build\webpack\loaders\css-loader\src\index.js??ruleSet[1].rules[14].oneOf[2].use[1]!D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\dist\build\webpack\loaders\next-font-loader\index.js??ruleSet[1].rules[14].oneOf[2].use[2]!D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\font\google\target.css?{"path":"src\\app\\layout.tsx","import":"Inter","arguments":[{"subsets":["latin"],"display":"swap","variable":"--font-sans"}],"variableName":"inter"}:1:7)
    at D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\dist\compiled\webpack\bundle5.js:28:922493
    at Hook.eval [as call] (eval at create (D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\dist\compiled\webpack\bundle5.js:13:28636), <anonymous>:7:1)
    at Hook.CALL_DELEGATE [as _call] (D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\dist\compiled\webpack\bundle5.js:13:25906)
    at D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\dist\compiled\webpack\bundle5.js:28:131198
    at tryRunOrWebpackError (D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\dist\compiled\webpack\bundle5.js:28:312943)
    at __webpack_require_module__ (D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\dist\compiled\webpack\bundle5.js:28:131165)
    at __nested_webpack_require_153728__ (D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\dist\compiled\webpack\bundle5.js:28:130607)
    at D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\dist\compiled\webpack\bundle5.js:28:131454
    at symbolIterator (D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\dist\compiled\neo-async\async.js:1:14444)

Generated code for D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\dist\build\webpack\loaders\css-loader\src\index.js??ruleSet[1].rules[14].oneOf[2].use[1]!D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\dist\build\webpack\loaders\next-font-loader\index.js??ruleSet[1].rules[14].oneOf[2].use[2]!D:\01_Workspaces\CreditMiner\web\node_modules\.pnpm\next@14.2.18_@playwright+te_ec2b5c6d47151cd459f7a64c500f9a39\node_modules\next\font\google\target.css?{"path":"src\\app\\layout.tsx","import":"Inter","arguments":[{"subsets":["latin"],"display":"swap","variable":"--font-sans"}],"variableName":"inter"}


> Build failed because of webpack errors
[ELIFECYCLE] Command failed with exit code 1.
```

## Continuation and rollback

Next task: supervisor restores build-time access to the font host, or separately authorizes a local-font solution in src/app/layout.tsx and its asset/config owners, then reruns corepack pnpm build. Network restoration preserves current typography and scope; bundling the font makes builds independent of that external fetch but needs separate asset/config work. This packet does not choose or implement that infrastructure change.

Keep the completed source changes in the working tree. Roll back only this packet's hunks and its two newly created source/test files if needed; do not run a broad checkout because it would discard pre-existing 6B1 edits. No data rollback is involved.

Worker model: gpt-6-astra, high, as requested; three implementation workers and two independent cross-reviews.
usage: unavailable in current runtime

## Worker outputs

These are the implementation workers' original reports, before integration corrections and final gates. The final results above supersede their outstanding checks and line numbers. JSON strings preserve the original output text; Unicode is escaped to satisfy ASCII-only files.

### Rules worker

```json
"Implemented Line\u2019s R1 rules UI and R5 family tables within scope.\n\n- API families drive hero, KPIs, filtering, ranked chart, ladders, and modifier cards.\n- Synthetic families show no invented base metrics.\n- Report caption IDs preserved; base rows bold, modifiers indented.\n- Fallback names match all captured rules and members.\n- Removed unused legacy grouping/table code after checking callers.\n\nVerified: focused tests **14/14 passed**; scoped `git diff --check` passed.\n\nEvidence: `RuleEvidence.tsx:51`, `rules-format.ts:232`, `RulesAndAnomalySections.tsx:161`.\n\nRemaining: root typecheck, lint, build, and integrated visual review. No commits. Confidence: high for tested behavior.\n\nusage: unavailable in current runtime"
```

### Sequence worker

```json
"Implemented for Line within assigned scope.\n\n- Family headlines: `SequenceHero.tsx:21`, `PatternBars.tsx:22`, `PatternTable.tsx:22`.\n- Exact pattern details, both support rates, and hero CI preserved.\n- Added `AllPatterns.tsx:15`: 25-row pagination, conditional Family column, local horizontal scrolling.\n- Full-pattern selection and legacy fallback: `sequence-format.ts:85`.\n- Shared web/paper report family headline: `SequenceSection.tsx:71`; exact table labels preserved.\n- ItemLegend, MethodNotes 6B1 sentence, and caption IDs unchanged.\n\nVerified: 18/18 sequence tests pass; scoped `git diff --check` passes. Tests include sample rendering, pagination transitions, legacy fallback, and static 400px layout guards.\n\nNot verified: browser layout, full build/typecheck, independent review; root owns those gates.\n\nSample limitation: all 1,247 raw patterns lack family/display metadata; these use the existing exact-pattern formatter. Family appears when metadata exists.\n\nConfidence: high. No dependencies, commits, servers, or out-of-scope edits. Rollback: revert only this slice, preserving prior 6B1 edits.\n\nusage: unavailable in current runtime"
```

### Cluster worker

```json
"Implemented R3/R5 for Line within the assigned paths.\n\n- Combined above-baseline hero shares, sorted 2x2 persona cards, API taglines/traits, comparison table: [page.tsx](D:/01_Workspaces/CreditMiner/web/src/app/clusters/page.tsx:78).\n- Shared four-color mapping and consistent PCA/client/dialog colors: [chart-theme.ts](D:/01_Workspaces/CreditMiner/web/src/lib/chart-theme.ts:43).\n- PCA capped at 150 points per persona: [clusters-view.ts](D:/01_Workspaces/CreditMiner/web/src/components/clusters/clusters-view.ts:62).\n- Report distinguishes final silhouette from sweep evidence and renders API selection rationale: [ClusteringSection.tsx](D:/01_Workspaces/CreditMiner/web/src/components/report/ClusteringSection.tsx:22).\n- Executive summary includes highest-default persona and data-derived persona count: [ExecutiveSummary.tsx](D:/01_Workspaces/CreditMiner/web/src/components/report/ExecutiveSummary.tsx:92).\n\n**Verified:** 9 focused tests, scoped ESLint, and diff whitespace check passed.\n\n**Not verified:** Full typecheck failed only at the concurrently edited `src/app/rules/page.tsx:173-174`: `RuleFamilyGroup[]` contract mismatch and nullable baseline. Browser review remains with integration.\n\nConfidence: high for tested logic. Missing API shares remain unavailable rather than inferred. No commits, backend edits, dependencies, or server changes. Next: independent integration review and full gates. Rollback: revert only this slice\u2019s diff.\n\nusage: unavailable in current runtime"
```


