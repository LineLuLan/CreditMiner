import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sample = (name) => JSON.parse(readFileSync(resolve(root, `../.api-samples/${name}.json`), "utf8"));
const cache = new Map();
let report = sample("mining-report");
const mocks = {
  "next/navigation": { usePathname: () => "/rules" },
  "@/hooks/useRules": { useRuleFamilies: (category) => ({ data: sample(category === "default" ? "rules-families-default" : "rules-families-nondefault") }) },
  "@/hooks/useMiningReport": { useMiningReport: () => ({ data: report }) },
  "@/hooks/useClusters": { useClusters: () => ({ data: sample("clusters") }) },
  "@/hooks/useOverview": { useOverview: () => ({ data: sample("overview") }) },
  "@/hooks/useInsights": { useInsights: () => ({}), useInsightVisuals: () => ({}) },
  "@/hooks/useEda": { useEdaPca2d: () => ({}), usePcaMeta: () => ({ data: { ...sample("eda-pca-2d-meta"), explainedVarianceOfTotal: [.3, .2] } }), useEdaDefaultBy: () => ({}) },
  "@/hooks/useFacts": { useFacts: (sources = {}) => load(resolve(root, "lib/facts.ts")).createFacts({ ...sources, catalogue: sample("facts") }) },
};
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } });
  const loaded = { exports: {} };
  const localRequire = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (!id.startsWith("@/") && !id.startsWith(".")) return require(id);
    const target = id.startsWith("@/") ? resolve(root, id.slice(2)) : resolve(dirname(file), id);
    const source = [target, `${target}.ts`, `${target}.tsx`].find((path) => existsSync(path) && /\.tsx?$/.test(path));
    assert.ok(source, `Cannot resolve ${id}`);
    return load(source);
  };
  new Function("module", "exports", "require", outputText)(loaded, loaded.exports, localRequire);
  cache.set(file, loaded.exports);
  return loaded.exports;
}
const render = (file, name, props = {}) => renderToStaticMarkup(React.createElement(load(resolve(root, file))[name], props));
const evidence = "components/rules/RuleEvidence.tsx";
const tables = "components/report/RulesAndAnomalySections.tsx";
const text = (html) => html.replace(/<[^>]+>/g, "").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
function assertOrder(markup, names) {
  const positions = names.map((name) => markup.indexOf(name));
  assert.ok(positions.every((position) => position >= 0), `Missing names: ${names}`);
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), `Wrong order: ${names}`);
}

test("API support order renders in descending base lift in both outcomes and report tables", () => {
  const { shortRuleName } = load(resolve(root, "lib/rules-format.ts"));
  for (const outcome of ["default", "nonDefault"]) {
    const families = sample(outcome === "default" ? "rules-families-default" : "rules-families-nondefault").families;
    const original = structuredClone(families);
    const ranked = families.filter((family) => family.baseRule).sort((a, b) => b.baseRule.lift - a.baseRule.lift);
    const names = ranked.map((family) => shortRuleName(family.baseRule));
    assertOrder(text(render(evidence, "FamilyChart", { families, outcome, baseline: .22 })), names);
    for (const withModifiers of [true, false]) {
      const rows = families.filter((family) => family.baseRule).map((family) => ({ ...family,
        modifiers: withModifiers ? [{ ...families.find((item) => item.modifiers.length).modifiers[0], label: "Modifier" }] : [],
      }));
      const synthetic = { ...families[0], familyId: "synthetic", baseRule: null, label: "Synthetic last", modifiers: [] };
      const cards = text(render(evidence, "RuleFamilies", { families: [synthetic, ...rows], outcome }));
      assertOrder(cards, [...names, "Synthetic last"]);
      const table = text(render(tables, "FamilyRulesTable", { families: [synthetic, ...rows], outcome: outcome === "default" ? "default" : "non-default" }));
      assertOrder(table, [...names, "Synthetic last"]);
    }
    assert.deepEqual(families, original, "Rendering must not mutate cached API data");
  }
});

test("non-default tab renders its ranking chart in lift order", () => {
  const originalUseState = React.useState;
  try {
    React.useState = (initial) => originalUseState(initial === "default" ? "nonDefault" : initial);
    const markup = render("app/rules/page.tsx", "default");
    const { shortRuleName } = load(resolve(root, "lib/rules-format.ts"));
    const families = sample("rules-families-nondefault").families;
    const names = families.filter((family) => family.baseRule).sort((a, b) => b.baseRule.lift - a.baseRule.lift).map((family) => shortRuleName(family.baseRule));
    assertOrder(text(markup.split("Base conditions ranked")[1].split("Condition ladders")[0]), names);
  } finally { React.useState = originalUseState; }
});

test("Apriori support follows finalSupport in page and report, with an unnumbered fallback", () => {
  const original = report;
  report = structuredClone(report);
  try {
    report.methodology.associationRules.defaultPass.finalSupport = .035;
    report.methodology.associationRules.nonDefaultPass.finalSupport = .045;
    for (const markup of [render("app/rules/page.tsx", "default"), render(tables, "RulesSection", { report })]) {
      assert.match(text(markup), /minimum support 3.5% default \/ 4.5% non-default/);
    }
    for (const methodology of [undefined, { defaultPass: { finalSupport: .035 } }, { nonDefaultPass: { minSupport: .02 } }]) {
      const markup = text(render(evidence, "RuleFootnote", { methodology }));
      assert.match(markup, /Modifiers are mined together with the base condition \(Apriori\)\./);
      assert.doesNotMatch(markup, /minimum support/);
    }
  } finally { report = original; }
});

test("PCA feature count follows baseline centroid keys and omits unavailable counts", () => {
  const clusters = sample("clusters");
  for (const cluster of clusters) cluster.baseline.centroid = { one: 0, two: 0, three: 0 };
  const markup = text(render("components/features/PcaScatterCard.tsx", "PcaScatterCard", { clusters }));
  assert.match(markup, /50.0% of the variance of the 3 features/);
  const empty = text(render("components/features/PcaScatterCard.tsx", "PcaScatterCard"));
  assert.match(empty, /variance of the features/);
  assert.doesNotMatch(empty, /0 features/);
});

test("executive summary uses persona wording", () => {
  const markup = text(render("components/report/ExecutiveSummary.tsx", "ExecutiveSummary", { report }));
  assert.match(markup, /Highest-default persona/);
  assert.match(markup, /Behavior, persona, and model results/);
  assert.doesNotMatch(markup, /segment/i);
});

test("anomalies show matched persona names and unknown-id fallback", () => {
  const changed = structuredClone(report);
  const cluster = changed.clustering.clusters[0];
  cluster.displayName = "Named persona";
  changed.anomalies.topAnomalies = [
    { clientId: 1, reason: "Example", score: 1, clusterId: cluster.clusterId },
    { clientId: 2, reason: "Example", score: 1, clusterId: 99 },
    { clientId: 3, reason: "Example", score: 1, clusterId: null },
  ];
  const markup = text(render(tables, "AnomalySection", { report: changed }));
  assert.match(markup, /Named persona/);
  assert.match(markup, /Persona 99/);
  assert.doesNotMatch(markup, /C99|undefined/);
});

test("overview priority labels use consistent rate and share grammar", () => {
  const markup = text(render("app/page.tsx", "default"));
  for (const label of ["default rate when 2+ months late on the latest statement", "default rate when late in 3+ of the last 6 months", "share of defaults held by the delaying personas"]) {
    assert.ok(markup.includes(label), label);
  }
});

test("report tables use dashes for missing counts and uplift while preserving zero", () => {
  const family = sample("rules-families-default").families.find((item) => item.baseRule && item.modifiers.length);
  for (const missing of [null, undefined, 0]) {
    const changed = { ...family, baseRule: { ...family.baseRule, lhsCount: missing, jointCount: missing },
      modifiers: [{ ...family.modifiers[0], lhsCount: missing, jointCount: missing, upliftPp: missing }] };
    const markup = render(tables, "FamilyRulesTable", { families: [changed] });
    const cells = [...markup.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((match) => text(match[1]));
    const expected = missing == null ? "-" : "0";
    assert.deepEqual([cells[3], cells[4], cells[9], cells[10], cells[11]], [expected, expected, expected, expected, missing == null ? "-" : "+0.0 pp"]);
  }
});
