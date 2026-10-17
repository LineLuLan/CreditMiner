import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const loaded = { exports: {} };
const source = readFileSync(new URL("./insight-label.ts", import.meta.url), "utf8");
new Function("module", "exports", ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(loaded, loaded.exports);
const { insightCategoryLabel } = loaded.exports;

test("quartile labels preserve API boundaries in a single readable line", () => {
  assert.equal(insightCategoryLabel("Q1: <= NT$50,000"), "Up to NT$50k");
  assert.equal(insightCategoryLabel("Q2: NT$50,000-140,000"), "NT$50k-140k");
  assert.equal(insightCategoryLabel("Q3: NT$140,000-240,000"), "NT$140k-240k");
  assert.equal(insightCategoryLabel("Q4: > NT$240,000"), "Over NT$240k");
  assert.equal(insightCategoryLabel("Q1: <= NT$1,000"), "Up to NT$1,000");
  assert.equal(insightCategoryLabel("Q2: NT$1,000-2,102"), "NT$1,000-2,102");
  assert.equal(insightCategoryLabel("Q4: > NT$5,008"), "Over NT$5,008");
  assert.equal(insightCategoryLabel("Q1: pays <= 4.1%"), "Pays up to 4.1%");
  assert.equal(insightCategoryLabel("Q2: 4.1-8.8%"), "Pays 4.1-8.8%");
  assert.equal(insightCategoryLabel("Q4: > 61.1%"), "Pays over 61.1%");
  assert.equal(insightCategoryLabel("Q4: > NT$310,500"), "Over NT$310.5k");
  assert.equal(insightCategoryLabel("3+ months late"), "3+ months late");
});
