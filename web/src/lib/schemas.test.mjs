import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loaded = { exports: {} };
  new Function("module", "exports", "require", outputText)(loaded, loaded.exports, (id) =>
    id.startsWith("@/")
      ? load(resolve(root, `${id.slice(2)}.ts`))
      : id.startsWith(".")
        ? load(resolve(dirname(file), `${id}.ts`))
        : require(id),
  );
  cache.set(file, loaded.exports);
  return loaded.exports;
}
const s = load(resolve(root, "lib/schemas.ts"));
const samples = resolve(root, "../.api-samples");
const sample = (name) => JSON.parse(readFileSync(resolve(samples, `${name}.json`), "utf8"));

test("wave 7A optional contracts retain zero durations, summary counts and total PCA variance", () => {
  const cluster = sample("clusters")[1];
  const enriched = { ...cluster, longestDelayMonths: 0, baseline: { ...cluster.baseline, longestDelayMonths: 0.8 } };
  assert.deepEqual(s.ClusterSchema.parse(enriched), enriched);
  const report = { ...sample("mining-report"), summary: { familyCount: 20, ruleCount: 58, topRuleLift: 3.33, defaultRuleCount: 37, defaultFamilyCount: 10, nonDefaultRuleCount: 21, nonDefaultFamilyCount: 10 } };
  assert.deepEqual(s.MiningReportSchema.parse(report).summary, report.summary);
  const pca = { ...sample("eda-pca-2d-meta"), explainedVarianceOfTotal: [0.4, 0.2] };
  assert.deepEqual(s.PcaMetaSchema.parse(pca), pca);
});

test("rule cohort counts remain distinct for bases, family members and modifiers", () => {
  const source = sample("rules-families-default");
  const family = source.families.find((item) => item.familyId === "PAY_1=2");
  const base = { ...family.baseRule, lhsCount: 2666, jointCount: 1843,
    familyMembers: [{ ...family.baseRule, lhsCount: 563, jointCount: 415 }] };
  const modifier = { ...family.modifiers[0], lhsCount: 563, jointCount: 415 };
  const enriched = { ...source, families: [{ ...family, baseRule: base, modifiers: [modifier] }] };
  assert.deepEqual(s.RuleFamiliesResponseSchema.parse(enriched), enriched);
  assert.equal(s.RuleSchema.parse(base).lhsCount, 2666);
  assert.equal(s.RuleSchema.parse(base).familyMembers[0].lhsCount, 563);
  assert.equal(s.RuleModifierSchema.parse(modifier).lhsCount, 563);
  assert.equal(s.RuleModifierSchema.parse({ ...modifier, lhsCount: 0, jointCount: 0 }).lhsCount, 0);
  const { lhsCount, ...legacy } = modifier;
  assert.equal(s.RuleModifierSchema.parse(legacy).lhsCount, undefined);
  assert.equal(s.RuleModifierSchema.parse({ ...modifier, lhsCount: null }).lhsCount, null);
  assert.equal(s.RuleSchema.parse({ ...base, lhsCount: null }).lhsCount, null);
  assert.equal(s.RuleModifierSchema.safeParse({ ...modifier, lhsCount: -1 }).success, false);
});
const schemas = {
  anomalies: s.AnomalySchema.array(),
  clusters: s.ClusterSchema.array(),
  "customer-1": s.CustomerDetailSchema,
  "customers-page1": s.PageResponseSchema(s.CustomerSummarySchema),
  "eda-correlation": s.EdaCorrelationSchema,
  "eda-default-by-PAY_1": s.EdaDefaultGroupSchema.array(),
  "eda-describe": s.EdaDescribeSchema,
  "eda-distribution-LIMIT_BAL": s.EdaDistributionSchema,
  "eda-distribution-LIMIT_BAL-quantile": s.EdaDistributionSchema,
  "eda-pca-2d": s.PcaPointSchema.array(),
  "eda-pca-2d-meta": s.PcaMetaSchema,
  facts: s.FactsResponseSchema,
  "insight-visuals": s.InsightVisualSchema.array(),
  insights: s.InsightSchema.array(),
  "mining-report": s.MiningReportSchema,
  overview: s.OverviewResponseSchema,
  "predict-response": s.PredictResponseSchema,
  rules: s.RuleSchema.array(),
  "rules-families-default": s.RuleFamiliesResponseSchema,
  "rules-families-nondefault": s.RuleFamiliesResponseSchema,
  sequences: s.SequenceArtifactSchema,
};
for (const file of readdirSync(samples).filter((file) => file.endsWith(".json"))) {
  test(`current API sample parses: ${file}`, () => {
    const name = file.slice(0, -5);
    assert.ok(schemas[name], `Missing schema coverage for ${file}`);
    assert.ok(schemas[name].parse(sample(name)));
  });
}

test("enriched sample fields survive parsing without loss", () => {
  const cluster = s.ClusterSchema.parse(sample("clusters")[0]);
  for (const key of ["displayName", "tagline", "shareOfClients", "shareOfDefaults", "defaultRateMultiplier", "baseline", "centroidDelta", "traits", "evidence"])
    assert.deepEqual(cluster[key], sample("clusters")[0][key], key);
  const rules = s.RuleSchema.array().parse(sample("rules"));
  for (const [index, rule] of rules.entries())
    for (const key of ["shortName", "conditions", "familyId", "familyLabel", "familyMembers", "jointCount", "baseline"])
      assert.deepEqual(rule[key], sample("rules")[index][key], key);
  assert.deepEqual(s.SequenceArtifactSchema.parse(sample("sequences")).stories, sample("sequences").stories);
  assert.deepEqual(s.FactsResponseSchema.parse(sample("facts")), sample("facts"));
  assert.ok(s.FactsResponseSchema.parse(sample("facts")).facts.every((fact) => fact.factId));
  assert.deepEqual(s.PcaMetaSchema.parse(sample("eda-pca-2d-meta")), sample("eda-pca-2d-meta"));
  assert.equal(s.PredictResponseSchema.parse(sample("predict-response")).importanceMethod, sample("predict-response").importanceMethod);
});
test("wave 6A families, distribution metadata and report selection survive parsing", () => {
  for (const category of ["default", "nondefault"]) {
    const raw = sample(`rules-families-${category}`);
    assert.deepEqual(s.RuleFamiliesResponseSchema.parse(raw), raw);
  }
  for (const name of ["eda-distribution-LIMIT_BAL", "eda-distribution-LIMIT_BAL-quantile"]) {
    const raw = sample(name);
    const parsed = s.EdaDistributionSchema.parse(raw);
    for (const key of ["edges", "binning", "notes"]) assert.deepEqual(parsed[key], raw[key], key);
  }
  const raw = sample("mining-report");
  const parsed = s.MiningReportSchema.parse(raw);
  assert.deepEqual(parsed.clustering.selection, raw.clustering.selection);
  assert.deepEqual(parsed.clustering.clusters, raw.clustering.clusters);
  assert.equal(parsed.methodology.associationRules.nonDefaultPass.finalSupport,
    raw.methodology.associationRules.nonDefaultPass.finalSupport);
});
test("optional structured rule fields survive validation", () => {
  const added = {
    shortName: "Late now",
    familyId: "late",
    familyLabel: "Late status",
    jointCount: 42,
    baseline: 0.22,
    conditions: [
      { attribute: "PAY_1", label: "Sep status", operator: "=", value: 2, unit: "months" },
    ],
  };
  const parsed = s.RuleSchema.parse({ ...sample("rules")[0], ...added });
  for (const [key, value] of Object.entries(added)) assert.deepEqual(parsed[key], value);
  assert.equal(s.RuleSchema.safeParse({ ...sample("rules")[0], jointCount: "bad" }).success, false);
});
test("optional sequence presentation survives validation and remains optional", () => {
  const added = {
    displayText: "Partial payment, then late",
    steps: [{ items: ["PARTIAL"], sameMonth: false }],
    familyId: "late",
    groupPrevalenceRatio: 3.4,
  };
  const artifact = sample("sequences");
  artifact.topDefaultPatterns[0] = { ...artifact.topDefaultPatterns[0], ...added };
  const parsed = s.SequenceArtifactSchema.parse(artifact).topDefaultPatterns[0];
  for (const [key, value] of Object.entries(added)) assert.deepEqual(parsed[key], value);
});
test("optional cluster metadata survives validation", () => {
  const added = {
    shareOfDefaults: 0.445,
    baselineDelta: 0.314,
    pcaExplainedVariance: [0.4, 0.2],
    zoomBounds: { xMin: -2, xMax: 2, yMin: -1, yMax: 1 },
  };
  const parsed = s.ClusterSchema.parse({ ...sample("clusters")[0], ...added });
  for (const [key, value] of Object.entries(added)) assert.deepEqual(parsed[key], value);
});
