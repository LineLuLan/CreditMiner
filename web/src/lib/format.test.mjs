import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const modules = new Map();

function loadModule(name) {
  if (modules.has(name)) return modules.get(name);
  const source = readFileSync(new URL(`./${name}.ts`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
  });
  const loaded = { exports: {} };
  const localRequire = (specifier) =>
    specifier.startsWith("@/lib/")
      ? loadModule(specifier.slice(6))
      : specifier.startsWith("./")
        ? loadModule(specifier.slice(2))
        : require(specifier);
  new Function("module", "exports", "require", outputText)(loaded, loaded.exports, localRequire);
  modules.set(name, loaded.exports);
  return loaded.exports;
}

test("shared formatters group, round, and preserve units", () => {
  const f = loadModule("format");
  assert.equal(f.formatNt(99448.3), "NT$99,448");
  assert.equal(f.formatNt(-1250.6), "NT$-1,251");
  assert.equal(f.formatInt(29965.6), "29,966");
  assert.equal(f.formatCount(29965), "29,965");
  assert.equal(f.formatPct(0.5625), "56.3%");
  assert.equal(f.formatPct(0.064326, 0), "6%");
  assert.equal(f.formatPct1(0.56), "56.0%");
  assert.equal(f.formatRatio(1.25), "125.0%");
  assert.equal(f.formatMultiplier(3.14), "3.1x base");
  assert.equal(f.formatMs(1234.6), "1,235 ms");
  assert.equal(f.formatDecimal(0.8765), "0.88");
  assert.equal(f.formatDecimal(1, 4), "1.0000");
});

test("all formatters show n/a for missing and nonfinite values, preserving zero", () => {
  const f = loadModule("format");
  for (const formatter of Object.values(f)) {
    for (const value of [null, undefined, NaN, Infinity, -Infinity]) {
      assert.equal(formatter(value), "n/a");
    }
    assert.notEqual(formatter(0), "n/a");
  }
});

test("rule thresholds use field units and preserve inequality boundaries", () => {
  const { friendlyRuleValue, parseRuleSide } = loadModule("rules-format");
  assert.equal(friendlyRuleValue("(-inf-0.064326]", "PAY_RATIO"), "up to 6%");
  assert.equal(friendlyRuleValue("(0.5625-inf)", "AVG_UTILIZATION"), "above 56%");
  assert.equal(friendlyRuleValue("(-0.125-0.254]", "BILL_TREND"), "-13% to 25%");
  assert.equal(friendlyRuleValue("(20000-99448.3]", "LIMIT_BAL"), "NT$20,000 to NT$99,448");
  assert.equal(friendlyRuleValue("(20-35]", "AGE"), "20 to 35");
  assert.equal(friendlyRuleValue("2", "PAY_1"), "2 months late");
  assert.equal(friendlyRuleValue("No", "Default"), "Non-default");
  assert.equal(parseRuleSide("PAY_RATIO='(-inf-0.064326]'")[0].value, "up to 6%");
});
