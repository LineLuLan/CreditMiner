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
  assert.equal(f.formatNt(-1250.6), "-NT$1,251");
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

test("fraction deltas use signed percentage points and suppress rounded zero", () => {
  const { formatDeltaPp } = loadModule("format");
  for (const value of [0, -0, 0.000049, -0.000049]) {
    assert.equal(formatDeltaPp(value), "no change (0.00 pp)");
  }
  assert.equal(formatDeltaPp(0.00005), "+0.01 pp");
  assert.equal(formatDeltaPp(-0.00005), "-0.01 pp");
  assert.equal(formatDeltaPp(0.0026), "+0.26 pp");
  assert.equal(formatDeltaPp(-0.0026), "-0.26 pp");
  assert.equal(formatDeltaPp(null), "n/a");
});

test("delay durations and CV comparison sentences distinguish zero from missing evidence", () => {
  const { formatDelayMonths, formatCvF1Change } = loadModule("format");
  assert.equal(formatDelayMonths(0), "0.0 months");
  assert.equal(formatDelayMonths(-0.57), "-0.6 months");
  assert.equal(formatDelayMonths(2.6261), "2.6 months");
  assert.equal(formatDelayMonths(null), "n/a");
  for (const value of [0, -0, 0.000049, -0.000049]) {
    assert.equal(formatCvF1Change(value, "RANDOMFOREST"), "Adding the pattern features leaves CV F1 unchanged (0.00 pp) for Random forest.");
  }
  assert.equal(formatCvF1Change(0.0026, "RANDOMFOREST"), "Adding the pattern features changes CV F1 by +0.26 pp for Random forest.");
  assert.equal(formatCvF1Change(-0.0026, "DECISIONTREE"), "Adding the pattern features changes CV F1 by -0.26 pp for J48.");
});

test("desktop and mobile navigation share the requested product order", () => {
  const { NAV_ITEMS } = loadModule("constants");
  assert.deepEqual(NAV_ITEMS.map(({ label }) => label), [
    "Overview", "Insights", "EDA", "Customers", "Personas", "Rules", "Sequences",
    "Predict", "Mining Report", "Methodology",
  ]);
  for (const component of ["Sidebar", "MobileNav"]) {
    const source = readFileSync(new URL(`../components/layout/${component}.tsx`, import.meta.url), "utf8");
    assert.match(source, /NAV_ITEMS\.map/);
    assert.match(source, /item\.href === "\/pipeline" \? Workflow/);
  }
});

test("feature labels cover all numeric columns and retain unknown codes", () => {
  const { EDA_NUMERIC_COLS, FEATURE_LABELS, featureLabel } = loadModule("constants");
  for (const code of EDA_NUMERIC_COLS) assert.ok(FEATURE_LABELS[code]);
  assert.equal(featureLabel("PAY_1"), "Latest statement status (Sep)");
  assert.equal(featureLabel("PAY_AMT6"), "Payment, Apr");
  assert.equal(featureLabel("NEW_FEATURE"), "NEW_FEATURE");
});

test("persona traits translate legacy prefixes while preserving current API strings", () => {
  const { formatPersonaTrait } = loadModule("constants");
  assert.equal(formatPersonaTrait("Maximum delay 2.6 months vs 0.4"), "Longest delay 2.6 months vs 0.4");
  assert.equal(formatPersonaTrait("5.2 late months vs 0.8"), "Late months (of 6): 5.2 vs 0.8");
  assert.equal(formatPersonaTrait("Latest utilization 10% vs 42%"), "Utilization, Sep 10% vs 42%");
  assert.equal(formatPersonaTrait("Limit NT$292k vs NT$167k"), "Credit limit NT$292k vs NT$167k");
  const current = "Longest delay: 0.0 months";
  assert.equal(formatPersonaTrait(current), current);
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
  const { friendlyRuleValue } = loadModule("rules-format");
  assert.equal(friendlyRuleValue("(-inf-0.064326]", "PAY_RATIO"), "up to 6%");
  assert.equal(friendlyRuleValue("(0.5625-inf)", "AVG_UTILIZATION"), "above 56%");
  assert.equal(friendlyRuleValue("(-0.125-0.254]", "BILL_TREND"), "-13% to 25%");
  assert.equal(friendlyRuleValue("(20000-99448.3]", "LIMIT_BAL"), "NT$20,000 to NT$99,448");
  assert.equal(friendlyRuleValue("(20-35]", "AGE"), "20 to 35");
  assert.equal(friendlyRuleValue("2", "PAY_1"), "2 months late");
  assert.equal(friendlyRuleValue("No", "Default"), "Non-default");
  assert.equal(friendlyRuleValue("'(-inf-0.064326]'", "PAY_RATIO"), "up to 6%");
});
