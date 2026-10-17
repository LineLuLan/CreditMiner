import assert from "node:assert/strict";
import test from "node:test";
import { CHART_SEMANTIC, CLUSTER_COLORS, clusterColor, personaColor, personaIdentityColor } from "./chart-theme.ts";

test("semantic chart tokens have a single canonical meaning", () => {
  assert.deepEqual(CHART_SEMANTIC, {
    danger: "hsl(var(--danger))",
    warning: "hsl(var(--warning))",
    success: "hsl(var(--success))",
    neutral: "hsl(var(--chart-neutral))",
    neutral2: "hsl(var(--chart-neutral-2))",
    baseline: "hsl(var(--chart-baseline))",
    primary: "hsl(var(--primary))",
  });
  assert.equal(CLUSTER_COLORS.length, 5);
});

test("persona risk boundaries preserve four distinct semantic colours", () => {
  assert.equal(personaColor(1.75), CHART_SEMANTIC.danger);
  assert.equal(personaColor(1.749), CHART_SEMANTIC.warning);
  assert.equal(personaColor(1.15), CHART_SEMANTIC.warning);
  assert.equal(personaColor(1.149), CHART_SEMANTIC.neutral);
  assert.equal(personaColor(0.5, true), CHART_SEMANTIC.neutral2);
  assert.equal(personaColor(2, true), CHART_SEMANTIC.danger);
  assert.equal(clusterColor(0.1, 0.22, true), CHART_SEMANTIC.neutral2);
  assert.equal(clusterColor(0.3, 0.22), CHART_SEMANTIC.warning);
  assert.equal(clusterColor(0.3, 0), CHART_SEMANTIC.neutral);
  for (const missing of [undefined, null, NaN, Infinity, -Infinity]) {
    assert.equal(personaColor(missing, true), CHART_SEMANTIC.neutral);
  }
});

test("cluster colours follow observed default rate rather than cluster ID", () => {
  assert.equal(clusterColor(0.4, 0.22), CHART_SEMANTIC.danger);
  assert.equal(clusterColor(0.1, 0.22), CHART_SEMANTIC.neutral);
  assert.equal(clusterColor(0.22, 0.22), CHART_SEMANTIC.neutral);
  assert.equal(clusterColor(0, 0.22), CHART_SEMANTIC.neutral);
  for (const missing of [undefined, null, NaN, Infinity, -Infinity]) {
    assert.equal(clusterColor(missing, 0.22), CHART_SEMANTIC.neutral);
    assert.equal(clusterColor(0.22, missing), CHART_SEMANTIC.neutral);
  }
});

test("persona identity stays distinct without changing risk chip semantics", () => {
  assert.equal(personaIdentityColor("Persistent delayers", 2.9), CHART_SEMANTIC.danger);
  assert.equal(personaIdentityColor("Occasional delayers", 1.7), CHART_SEMANTIC.warning);
  assert.equal(personaIdentityColor("Transactors", 0.5), CHART_SEMANTIC.primary);
  assert.equal(personaIdentityColor("Revolvers, never late", 0.5), CHART_SEMANTIC.neutral);
  assert.equal(personaIdentityColor("Unknown", 2), CHART_SEMANTIC.danger);
  assert.equal(personaIdentityColor(undefined), CHART_SEMANTIC.neutral);
});
