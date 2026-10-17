import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(
  new URL("../components/clusters/clusters-view.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
});
const loaded = { exports: {} };
new Function("module", "exports", outputText)(loaded, loaded.exports);
const { clusterInsight, pcaView, riskAboveBaseline, safeRatio, sortPersonas, lowestRiskPersonaId, samplePcaPersonas } = loaded.exports;

test("hero selects concentrated risk and computes shares from captured cluster evidence", () => {
  const clusters = JSON.parse(
    readFileSync(new URL("../../.api-samples/clusters.json", import.meta.url), "utf8"),
  );
  const result = clusterInsight(clusters);
  const above = clusters.filter((cluster) => cluster.defaultRateMultiplier > 1);
  assert.deepEqual(result.clusters.map((cluster) => cluster.clusterId), [0, 2]);
  assert.equal(result.names, above.map((cluster) => cluster.displayName).join(" and "));
  assert.equal(result.clientShare, above.reduce((sum, cluster) => sum + cluster.shareOfClients, 0));
  assert.equal(result.defaultShare, above.reduce((sum, cluster) => sum + cluster.shareOfDefaults, 0));
  assert.deepEqual(sortPersonas(clusters).map((cluster) => cluster.clusterId), [0, 2, 1, 3]);
  assert.equal(lowestRiskPersonaId(clusters), 3);
  const missing = clusters.map(({ shareOfDefaults, ...cluster }) => cluster);
  assert.equal(clusterInsight(missing).defaultShare, null);
});

test("PCA metadata overrides local percentile bounds and counts only in central view", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 5, y: 5 },
    { x: 20, y: 20 },
  ];
  const meta = { zoomBounds: { xMin: -1, xMax: 10, yMin: -2, yMax: 12 }, outsideCount: 40 };
  const view = pcaView(points, false, meta);
  assert.deepEqual(view.xDomain, [-1, 10]);
  assert.deepEqual(view.yDomain, [-2, 12]);
  assert.equal(view.outsideCount, 40);
  assert.equal(view.points.length, 2);
  assert.equal(pcaView(points, true, meta).outsideCount, 0);
});

test("zero defaults, empty data, and invalid inputs do not invent shares or multipliers", () => {
  assert.equal(clusterInsight([]), null);
  assert.equal(clusterInsight([{ size: 0, defaultRate: 0.9 }]), null);
  assert.equal(clusterInsight([{ size: 10, defaultRate: NaN }]), null);
  assert.equal(
    clusterInsight([
      { size: 10, defaultRate: 0.2 },
      { size: 5, defaultRate: Infinity },
    ]),
    null,
  );
  assert.equal(clusterInsight([{ size: 10, defaultRate: 0 }]), null);
  for (const baseline of [undefined, null, NaN, Infinity, 0])
    assert.equal(safeRatio(0.5, baseline), null);
  assert.equal(safeRatio(0, 0.2), 0);
  assert.equal(riskAboveBaseline(0.2, 0.2), false);
  assert.equal(riskAboveBaseline(0.3, 0.2), true);
  assert.equal(riskAboveBaseline(0.3, NaN), false);
});

test("PCA samples every named persona at most 150 times without changing bounds", () => {
  const clusters = [0, 1, 2, 3].map((clusterId) => ({ clusterId }));
  const points = clusters.flatMap(({ clusterId }) => Array.from({ length: 301 }, (_, x) => ({ x, y: x, clusterId })));
  const groups = samplePcaPersonas(points, clusters);
  assert.deepEqual(groups.map(({ id, sample }) => [id, sample.length]), [[0, 150], [1, 150], [2, 150], [3, 150]]);
  assert.equal(samplePcaPersonas([], clusters).length, 4);
  assert.equal(points.length, 1204);
});

test("PCA bounds use all points, count the union outside either axis, and restore full range", () => {
  const points = Array.from({ length: 101 }, (_, i) => ({ x: i, y: 100 - i, clusterId: i % 2 }));
  const focused = pcaView(points, false);
  assert.deepEqual(focused.xDomain, [1, 99]);
  assert.deepEqual(focused.yDomain, [1, 99]);
  assert.equal(focused.outsideCount, 2);
  assert.equal(focused.points.length, 99);
  const full = pcaView(points, true);
  assert.deepEqual(full.xDomain, [0, 100]);
  assert.deepEqual(full.yDomain, [0, 100]);
  assert.equal(full.outsideCount, 0);
  assert.equal(full.points.length, 101);
});

test("PCA interpolates percentiles and handles empty, degenerate, and nonfinite points", () => {
  const view = pcaView(
    [
      { x: 0, y: 2 },
      { x: 100, y: 2 },
      { x: Infinity, y: 3 },
    ],
    false,
  );
  assert.deepEqual(view.xDomain, [1, 99]);
  assert.deepEqual(view.yDomain, [1, 3]);
  assert.equal(view.outsideCount, 2);
  assert.equal(view.invalidCount, 1);
  assert.deepEqual(pcaView([], false).xDomain, [-1, 1]);
});
