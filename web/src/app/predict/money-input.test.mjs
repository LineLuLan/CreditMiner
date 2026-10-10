import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(import.meta.url);
function load() {
  const ts = require("typescript");
  const source = readFileSync(new URL("./money-input.ts", import.meta.url), "utf8");
  const loaded = { exports: {} };
  new Function("module", "exports", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(loaded, loaded.exports);
  return loaded.exports;
}
test("money edits group digits and retain numeric payloads, negative bills, and decimal drafts", () => {
  const { moneyEdit } = load();
  assert.deepEqual(moneyEdit("200000"), { text: "200,000", value: 200000 });
  assert.deepEqual(moneyEdit("-12,345.50", true), { text: "-12,345.50", value: -12345.5 });
  assert.deepEqual(moneyEdit("1000."), { text: "1,000.", value: 1000 });
  assert.equal(moneyEdit("-5"), null);
  assert.equal(moneyEdit("3e5"), null);
  assert.equal(moneyEdit("1.2.3"), null);
  assert.ok(Number.isNaN(moneyEdit("").value));
  assert.equal(moneyEdit("-", true).text, "-");
});
