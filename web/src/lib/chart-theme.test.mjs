import assert from "node:assert/strict";
import test from "node:test";
import { CHART_SEMANTIC, CLUSTER_COLORS, clusterColor } from "./chart-theme.ts";

test("semantic chart tokens have a single canonical meaning", () => {
  assert.deepEqual(CHART_SEMANTIC, {
    danger: "hsl(var(--danger))",
    success: "hsl(var(--success))",
    neutral: "hsl(var(--chart-neutral))",
    baseline: "hsl(var(--chart-baseline))",
    primary: "hsl(var(--primary))",
  });
  assert.equal(CLUSTER_COLORS.length, 5);
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
