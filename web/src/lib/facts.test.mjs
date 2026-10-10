import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getFact, createFacts, insightFactId, evidenceFactIds } from "./facts.ts";

const sample = (name) =>
  JSON.parse(readFileSync(new URL(`../../.api-samples/${name}.json`, import.meta.url), "utf8"));
const sources = {
  overview: sample("overview"),
  insights: sample("insights"),
  visuals: sample("insight-visuals"),
  clusters: sample("clusters"),
  report: sample("mining-report"),
};

test("three overview signals use exact catalogue values ahead of rounded adapters", () => {
  const catalogue = sample("facts");
  for (const [id, apiId] of [
    ["late2-sep-default-rate", "default-rate-pay1-late2"],
    ["late3plus-6m-default-rate", "default-rate-months-delayed-ge3"],
    ["cluster-c0-default-rate", "default-rate-cluster-0"],
  ]) {
    const expected = catalogue.facts.find((fact) => fact.factId === apiId);
    const actual = getFact(id, { ...sources, catalogue });
    assert.equal(actual.value, expected.value);
    assert.equal(actual.n, expected.n);
    assert.equal(actual.baseline, expected.baseline);
    assert.deepEqual(actual.ci95, expected.ci95);
  }
});

test("catalogue baseline and selected model facts preserve their metric meaning", () => {
  const catalogue = sample("facts");
  const facts = createFacts({ ...sources, catalogue });
  assert.equal(facts.getFact("total-clients").value, catalogue.baseline.totalClients);
  assert.equal(facts.getFact("default-count").value, catalogue.baseline.defaultCount);
  assert.equal(facts.getFact("default-rate").value, catalogue.baseline.defaultRate);
  assert.equal(facts.getFact("best-model-f1").value,
    catalogue.facts.find((fact) => fact.factId === "selected-model-holdout-f1").value);
  assert.equal(facts.getFact("best-model-cv-f1").value,
    catalogue.facts.find((fact) => fact.factId === "selected-model-cv-f1").value);
});

test("portfolio facts follow supplied data, including zero, without a global cache", () => {
  assert.equal(getFact("total-clients", sources).value, sources.overview.totalCustomers);
  assert.equal(getFact("default-count", sources).value, sources.overview.defaultCount);
  assert.equal(getFact("default-rate", sources).value, sources.overview.defaultRate);
  const zero = createFacts({ overview: { ...sources.overview, defaultCount: 0, defaultRate: 0 } });
  assert.equal(zero.getFact("default-count").value, 0);
  assert.equal(zero.getFact("default-rate").value, 0);
  assert.equal(getFact("default-rate").value, null);
});

test("published insights normalize percentages and retain cohort metadata", () => {
  const late = getFact("late2-sep-default-rate", sources);
  assert.ok(Math.abs(late.value - 0.691) < 1e-12);
  assert.equal(late.n, 2666);
  assert.equal(late.multiplier, 3.1);
  assert.ok(Math.abs(late.baseline - 0.221) < 1e-12);
  assert.equal(late.unit, "ratio");
  assert.match(late.source, /insights\/visuals/);
  assert.equal(getFact("late3plus-6m-default-rate", sources).value, 0.6);
  assert.equal(getFact("late3plus-6m-default-rate", sources).n, 3743);
  assert.equal(getFact("cluster-c0-default-rate", sources).value, 0.535);
  assert.equal(getFact("cluster-c0-share-of-defaults", sources).value, 0.445);
});

test("cohort headlines stay authoritative and cannot be confused with rounded bar averages", () => {
  const visuals = sources.visuals.map((v) =>
    v.title === "Each late month adds risk" ? { ...v, headline: { ...v.headline, value: "61.2%" } } : v,
  );
  assert.equal(getFact("late3plus-6m-default-rate", { ...sources, visuals }).value, 0.612);
  assert.equal(insightFactId(sources.insights[0]), "late2-sep-default-rate");
});

test("unknown, missing, nonfinite and malformed facts remain absent", () => {
  assert.equal(getFact("unknown", sources).value, null);
  assert.equal(getFact("best-model-f1").value, null);
  assert.equal(
    getFact("total-clients", { overview: { ...sources.overview, totalCustomers: NaN } }).value,
    null,
  );
  const visuals = sources.visuals.map((v) => ({
    ...v,
    headline: { ...v.headline, value: "unavailable" },
  }));
  assert.equal(getFact("late2-sep-default-rate", { ...sources, visuals }).value, null);
  const insights = sources.insights.map((v) => ({ ...v, discovery: "No published cohort share." }));
  assert.equal(getFact("cluster-c0-share-of-defaults", { ...sources, insights }).value, null);
});

test("best F1 comes from the declared best model and variant, not another model or CV", () => {
  const best = sources.report.classification.modelMetrics.find(
    (m) =>
      m.model === sources.report.classification.bestModel &&
      m.variant === sources.report.classification.bestVariant,
  );
  assert.equal(getFact("best-model-f1", sources).value, best.testF1);
  const report = structuredClone(sources.report);
  report.classification.modelMetrics.find(
    (m) =>
      m.model === report.classification.bestModel &&
      m.variant === report.classification.bestVariant,
  ).testF1 = null;
  assert.equal(getFact("best-model-f1", { ...sources, report }).value, null);
});

test("insight headline cohorts are distinct from the first cited evidence fact", () => {
  const catalogue = sample("facts");
  for (const [title, id] of [
    ["Age matters only at the edges", "default-rate-age-60-plus"],
    ["The risk tier rule separates clients well", "default-rate-risk-tier-high"],
  ]) {
    const insight = sources.insights.find((row) => row.title === title);
    assert.equal(insightFactId(insight), id);
    assert.notEqual(evidenceFactIds(insight.evidence)[0], id);
    assert.equal(getFact(id, { ...sources, catalogue }).value,
      catalogue.facts.find((row) => row.factId === id).value);
  }
  const spread = getFact("education-default-spread", { ...sources, catalogue });
  assert.equal(spread.unit, "points");
  const education = catalogue.facts.filter((row) => row.factId.startsWith("default-rate-education-"));
  assert.equal(spread.value, (Math.max(...education.map((row) => row.value)) - Math.min(...education.map((row) => row.value))) * 100);
  for (const insight of sources.insights)
    for (const id of evidenceFactIds(insight.evidence))
      assert.ok(catalogue.facts.some((row) => row.factId === id), id);
});
