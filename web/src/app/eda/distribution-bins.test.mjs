import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(import.meta.url);
function load() {
  const ts = require("typescript");
  const source = readFileSync(new URL("./distribution-bins.ts", import.meta.url), "utf8");
  const loaded = { exports: {} };
  new Function("module", "exports", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(loaded, loaded.exports);
  return loaded.exports;
}
test("bin regrouping conserves aggregate and each class, including sparse tails", () => {
  const { regroupDistribution } = load();
  const source = { type: "numeric", binEdges: [0,10,20,30,40,50], counts: [500,300,200,0,0], series: [{label:"Yes",counts:[100,90,80,0,0]},{label:"No",counts:[400,210,120,0,0]}] };
  for (const mode of ["equal", "quantile", "log"]) {
    const result = regroupDistribution(source, mode);
    assert.equal(result.counts.reduce((a,b) => a+b,0), 1000);
    assert.equal(result.series[0].counts.reduce((a,b) => a+b,0),270);
    assert.equal(result.binEdges.length, result.counts.length+1);
    assert.equal(result.tail.count, 0);
    assert.equal(result.tail.start, 30);
    for (const count of result.counts) assert.ok(Number.isInteger(count));
  }
});
test("quantiles use whole source bins and do not invent values; signed log accepts negative bills", () => {
  const { regroupDistribution } = load();
  const source = {type:"numeric",binEdges:Array.from({length:21},(_,i)=>i-10),counts:Array(20).fill(10)};
  const result = regroupDistribution(source,"quantile");
  assert.equal(result.counts.length,10);
  assert.deepEqual(result.counts,Array(10).fill(20));
  const log = regroupDistribution(source,"log");
  assert.equal(log.counts.reduce((a,b)=>a+b,0),200);
  assert.equal(log.binEdges[0],-10);
  assert.equal(log.binEdges.at(-1),10);
});
test("nominal, invalid edges, empty and zero data return safely without invented bins", () => {
  const { regroupDistribution } = load();
  for (const source of [
    {type:"nominal",categories:["A"],binEdges:[],counts:[5]},
    {type:"numeric",binEdges:[],counts:[]},
    {type:"numeric",binEdges:[0,1],counts:[0]},
    {type:"numeric",binEdges:[1,0],counts:[5]},
  ]) assert.deepEqual(regroupDistribution(source,"quantile").counts,source.counts);
});

test("missing, empty or inconsistent class counts cannot replace aggregate observations", () => {
  const { hasCompleteClassSeries } = load();
  assert.equal(hasCompleteClassSeries([10], [{label:"Yes",counts:[0]},{label:"No",counts:[0]}]), false);
  assert.equal(hasCompleteClassSeries([10], [{label:"Yes",counts:[4]}]), false);
  assert.equal(hasCompleteClassSeries([10], [{label:"Yes",counts:[4]},{label:"No",counts:[6]}]), true);
  assert.equal(hasCompleteClassSeries([0], [{label:"Yes",counts:[0]},{label:"No",counts:[0]}]), true);
});
