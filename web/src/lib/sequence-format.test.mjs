import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

function loadComponent(relativePath, overrides = {}) {
  const cache = new Map();
  function load(url) {
    if (cache.has(url.href)) return cache.get(url.href).exports;
    const source = readFileSync(url, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2021,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    const loaded = { exports: {} };
    cache.set(url.href, loaded);
    const localRequire = (specifier) => {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
      if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return require(specifier);
      const base = specifier.startsWith("@/")
        ? new URL(`../${specifier.slice(2)}`, import.meta.url)
        : new URL(specifier, url);
      const target = [".ts", ".tsx"].map((extension) => new URL(`${base.href}${extension}`))
        .find((candidate) => existsSync(candidate));
      return load(target);
    };
    new Function("module", "exports", "require", outputText)(loaded, loaded.exports, localRequire);
    return loaded.exports;
  }
  return load(new URL(relativePath, import.meta.url));
}

const sample = JSON.parse(readFileSync(new URL("../../.api-samples/sequences.json", import.meta.url), "utf8"));
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

test("sequence hero leads with the API family story and preserves exact evidence", () => {
  const { SequenceHero } = loadComponent("../components/sequences/SequenceHero.tsx");
  const pattern = sample.stories.defaultStories[0];
  const html = renderToStaticMarkup(React.createElement(SequenceHero, { pattern }));
  assert.ok(html.includes(pattern.familyStory));
  assert.ok(html.includes(`Exact pattern: ${pattern.displayText}`));
  assert.match(html, /58\.1% of defaulters/);
  assert.match(html, /19\.1% of non-defaulters/);
  assert.match(html, /3\.0x/);
  assert.match(html, /95% confidence intervals/);
});

test("story cards retain API family order, exact patterns, and both support rates", () => {
  for (const [name, patterns, limit] of [
    ["PatternBars", sample.stories.defaultStories, 5],
    ["PatternTable", sample.stories.nonDefaultStories, 3],
  ]) {
    const Component = loadComponent(`../components/sequences/${name}.tsx`)[name];
    const html = renderToStaticMarkup(React.createElement(Component, { patterns }));
    let previous = -1;
    for (const pattern of patterns.slice(0, limit)) {
      const position = html.indexOf(pattern.familyStory);
      assert.ok(position > previous);
      previous = position;
      assert.ok(html.includes(pattern.displayText));
      assert.ok(html.includes(`${(pattern.supportDefault * 100).toFixed(1)}%`));
      assert.ok(html.includes(`${(pattern.supportNonDefault * 100).toFixed(1)}%`));
    }
  }
});

test("All patterns keeps exact labels with a conditional Family column", () => {
  const { AllPatterns } = loadComponent("../components/sequences/AllPatterns.tsx");
  const patterns = sample.stories.defaultStories;
  const html = renderToStaticMarkup(React.createElement(AllPatterns, { patterns }));
  assert.match(html, /<details/);
  assert.match(html, />All patterns</);
  assert.match(html, />Family</);
  for (const pattern of patterns) {
    assert.ok(html.includes(pattern.familyStory));
    assert.ok(html.includes(pattern.displayText));
  }
  const legacy = renderToStaticMarkup(React.createElement(AllPatterns, {
    patterns: patterns.map(({ familyStory, ...pattern }) => pattern),
  }));
  assert.doesNotMatch(legacy, />Family</);
});

test("All patterns renders only 25 of the 1247 sample patterns and exposes pagination", () => {
  const { AllPatterns } = loadComponent("../components/sequences/AllPatterns.tsx");
  const html = renderToStaticMarkup(React.createElement(AllPatterns, { patterns: sample.patterns }));
  assert.equal((html.match(/<tr /g) ?? []).length, 26);
  assert.match(html, /1,247 exact patterns/);
  assert.match(html, /Page 1 of 50/);
  assert.match(html, /disabled=""[^>]*>Previous/);
  assert.match(html, />Next</);
});

test("All patterns pagination reaches the final row and supports returning to the previous page", () => {
  let page = 48;
  const { AllPatterns } = loadComponent("../components/sequences/AllPatterns.tsx", {
    react: { ...React, useState: () => [page, (nextPage) => { page = nextPage; }] },
  });
  function buttons(element) {
    if (!React.isValidElement(element)) return [];
    return [
      ...(element.type === "button" ? [element] : []),
      ...React.Children.toArray(element.props.children).flatMap(buttons),
    ];
  }
  const before = AllPatterns({ patterns: sample.patterns });
  buttons(before).find((button) => button.props.children === "Next").props.onClick();
  assert.equal(page, 49);
  const finalPage = AllPatterns({ patterns: sample.patterns });
  const html = renderToStaticMarkup(finalPage);
  assert.equal((html.match(/<tr /g) ?? []).length, 23);
  const { humanisePattern } = loadModule("sequence-format");
  assert.ok(html.includes(humanisePattern(sample.patterns.at(-1)).text));
  assert.equal(buttons(finalPage).find((button) => button.props.children === "Next").props.disabled, true);
  buttons(finalPage).find((button) => button.props.children === "Previous").props.onClick();
  assert.equal(page, 48);
});

test("both report variants share family-led sequence evidence with exact table labels", () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
  const shared = read("../components/report/SequenceSection.tsx");
  assert.match(shared, /Leading default story: \{defaults\[0\]\.familyStory \|\| humanisePattern\(defaults\[0\]\)\.text\}/);
  assert.match(shared, /<td[^>]*>\{humanisePattern\(row\)\.text\}<\/td>/);
  assert.match(read("../components/report/MiningReportDocument.tsx"), /<SequenceSection value=\{report\.sequences\}/);
  assert.match(read("../components/report/paper/PaperReportDocument.tsx"), /<SequenceEvidence artifact=\{sequence\}/);
  assert.match(read("../components/sequences/MethodNotes.tsx"), /formatCvF1Change\(comparison\.delta, comparison\.algo\)/);
});

test("all pattern selection preserves API arrays and deduplicates only legacy exact patterns", () => {
  const { selectAllSequencePatterns } = loadModule("sequence-format");
  assert.equal(selectAllSequencePatterns(sample), sample.patterns);
  assert.deepEqual(selectAllSequencePatterns({ ...sample, patterns: [] }), []);
  const first = { pattern: "<{PARTIAL}>", displayText: "First" };
  const second = { pattern: "<{NONE}>", displayText: "Second" };
  assert.deepEqual(selectAllSequencePatterns({ topDefaultPatterns: [first], topNonDefaultPatterns: [first, second] }), [first, second]);
});

test("400px static layout guards keep story text wrapping and tables locally scrollable", () => {
  for (const name of ["SequenceHero", "PatternBars", "PatternTable"]) {
    const source = readFileSync(new URL(`../components/sequences/${name}.tsx`, import.meta.url), "utf8");
    assert.match(source, /break-words/);
    assert.match(source, /min-w-0/);
    assert.doesNotMatch(source, /truncate|whitespace-nowrap/);
  }
  const table = readFileSync(new URL("../components/sequences/AllPatterns.tsx", import.meta.url), "utf8");
  assert.match(table, /min-w-0 max-w-full/);
  assert.match(table, /overflow-x-auto/);
});

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
    familyStory: "Late over two statements", familyItems: ["LATE_2"],
    steps: [{ items: ["2 months late"], sameMonth: false, repeat: 2 }],
    groupPrevalenceRatio: 6, groupPrevalenceRatioStatus: "finite",
    ci95: { supportDefault: { low: 0.28, high: 0.32 }, supportNonDefault: { low: 0.04, high: 0.06 } },
  };
  assert.deepEqual(SequencePatternSchema.parse(legacy), legacy);
  assert.deepEqual(SequenceStoriesSchema.parse({ defaultStories: [enriched], nonDefaultStories: [] }),
    { defaultStories: [enriched], nonDefaultStories: [] });
});
