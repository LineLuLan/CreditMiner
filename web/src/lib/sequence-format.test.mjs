import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function loadModule(name) {
  const source = readFileSync(new URL(`./${name}.ts`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
  });
  const loaded = { exports: {} };
  const localRequire = (specifier) =>
    specifier.startsWith("./") ? loadModule(specifier.slice(2)) : require(specifier);
  new Function("module", "exports", "require", outputText)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

test("GSP braces are ordered months and commas join items within one month", () => {
  const { humanisePattern } = loadModule("sequence-format");
  assert.deepEqual(humanisePattern("<{PARTIAL}{LATE_2,NONE}{PAID_FULL}>"), {
    text: "Partial payment, then 2 months late + no payment, then paid in full",
    steps: [
      { items: ["partial payment"], sameMonth: false },
      { items: ["2 months late", "no payment"], sameMonth: true },
      { items: ["paid in full"], sameMonth: false },
    ],
  });
});

test("unknown tokens remain inspectable; empty tokens and malformed patterns are safe", () => {
  const { humanisePattern } = loadModule("sequence-format");
  assert.equal(
    humanisePattern("<{ FUTURE_STATUS, ,PARTIAL }{}>").text,
    "FUTURE_STATUS + partial payment",
  );
  assert.equal(humanisePattern("<{constructor,toString}>").text, "Constructor + toString");
  for (const pattern of ["", "<>", "<{}>", "broken", "<{PARTIAL}>trailing"]) {
    assert.deepEqual(humanisePattern(pattern), { text: "Pattern unavailable", steps: [] });
  }
});

test("all known tokens have readable names", () => {
  const { humanisePattern } = loadModule("sequence-format");
  assert.equal(
    humanisePattern(
      "<{NO_USE,PAID_FULL,REVOLVING,LATE_1,LATE_2,LATE_3PLUS,NONE,PARTIAL,COVERED,NO_BALANCE}>",
    ).text,
    "No card use + paid in full + revolving + 1 month late + 2 months late + 3+ months late + no payment + partial payment + bill covered + no balance",
  );
});

test("only consecutive identical months are run-length encoded", () => {
  const { humanisePattern } = loadModule("sequence-format");
  const result = humanisePattern("<{REVOLVING}{REVOLVING}{REVOLVING}{PARTIAL}{REVOLVING}>");
  assert.equal(result.text, "Revolving x3, then partial payment, then revolving");
  assert.equal(result.steps.length, 5);
  assert.equal(
    humanisePattern("<{PARTIAL,LATE_2}{LATE_2,PARTIAL}>").text,
    "(partial payment + 2 months late) x2",
  );
});

test("API displayText and steps override raw grammar independently", () => {
  const { humanisePattern } = loadModule("sequence-format");
  const input = {
    pattern: "<{NONE}>",
    displayText: "Reviewed API label",
    steps: [{ items: ["PARTIAL", "LATE_2"], sameMonth: true }],
  };
  assert.deepEqual(humanisePattern(input), {
    text: "Reviewed API label",
    steps: [{ items: ["partial payment", "2 months late"], sameMonth: true }],
  });
  assert.equal(
    humanisePattern({ ...input, displayText: " " }).text,
    "Partial payment + 2 months late",
  );
  assert.equal(humanisePattern({ pattern: "<{NONE}>", steps: [] }).text, "No payment");
});

test("deduplication keeps higher ratio while preserving original family order", () => {
  const { deduplicatePatterns } = loadModule("sequence-format");
  const rows = [
    { pattern: "<{REVOLVING}{REVOLVING}>", ratio: 0.3 },
    { pattern: "<{PARTIAL}>", ratio: 0.4 },
    { pattern: "<{REVOLVING}{REVOLVING}>", ratio: 0.5, displayText: "Different API label" },
    { pattern: "<{NONE}>", ratio: 0.2 },
  ];
  assert.deepEqual(deduplicatePatterns(rows, 3), [rows[2], rows[1], rows[3]]);
  const enriched = rows.map((row, index) => ({
    ...row,
    groupPrevalenceRatio: index === 0 ? 2 : 1,
  }));
  assert.deepEqual(deduplicatePatterns(enriched, 3), [enriched[0], enriched[1], enriched[3]]);
});

test("CV delta only compares rows belonging to the same algorithm", () => {
  const { matchedCvComparison } = loadModule("sequence-format");
  const rows = [
    { algo: "RANDOMFOREST", features: "base", cv: { f1: 0.4747 } },
    { algo: "DECISIONTREE", features: "base+seq", cv: { f1: 0.4345 } },
  ];
  assert.equal(matchedCvComparison(rows), null);
  rows.push({ algo: "DECISIONTREE", features: "base", cv: { f1: 0.4321 } });
  assert.equal(matchedCvComparison(rows).algo, "DECISIONTREE");
  rows.push({ algo: "RANDOMFOREST", features: "base+seq", cv: { f1: 0.4748 } });
  assert.equal(matchedCvComparison(rows).algo, "RANDOMFOREST");
  assert.ok(Math.abs(matchedCvComparison(rows).delta - 0.0001) < 1e-10);
});

test("curated stories take precedence, with legacy fallback only when absent", () => {
  const { selectSequenceStories } = loadModule("sequence-format");
  const legacy = { topDefaultPatterns: ["raw-default"], topNonDefaultPatterns: ["raw-non-default"] };
  assert.deepEqual(selectSequenceStories(legacy), {
    defaultStories: legacy.topDefaultPatterns,
    nonDefaultStories: legacy.topNonDefaultPatterns,
  });
  assert.deepEqual(selectSequenceStories({ ...legacy, stories: {
    defaultStories: ["curated"], nonDefaultStories: [],
  } }), { defaultStories: ["curated"], nonDefaultStories: [] });
});

test("API compressed steps retain repeated months when displayText is absent", () => {
  const { humanisePattern } = loadModule("sequence-format");
  const result = humanisePattern({ pattern: "<{REVOLVING}{REVOLVING}{PARTIAL}>", steps: [
    { items: ["revolving"], sameMonth: false, repeat: 2 },
    { items: ["partial payment"], sameMonth: false, repeat: 1 },
  ] });
  assert.equal(result.text, "Revolving x2, then partial payment");
  assert.equal(result.steps.length, 3);
});

test("shared sequence schema preserves curated display and uncertainty metadata", () => {
  const { SequencePatternSchema, SequenceStoriesSchema } = loadModule("../components/report/sequence-data");
  const legacy = { pattern: "<{LATE_2}>", length: 1, supportDefault: 0.3,
    supportNonDefault: 0.05, supportDiff: 0.25, ratio: 6 };
  const enriched = { ...legacy, displayText: "2 months late x2", familyId: "late",
    steps: [{ items: ["2 months late"], sameMonth: false, repeat: 2 }],
    groupPrevalenceRatio: 6, groupPrevalenceRatioStatus: "finite",
    ci95: { supportDefault: { low: 0.28, high: 0.32 }, supportNonDefault: { low: 0.04, high: 0.06 } },
  };
  assert.deepEqual(SequencePatternSchema.parse(legacy), legacy);
  assert.deepEqual(SequenceStoriesSchema.parse({ defaultStories: [enriched], nonDefaultStories: [] }),
    { defaultStories: [enriched], nonDefaultStories: [] });
});
