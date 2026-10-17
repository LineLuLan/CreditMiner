import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const source = readFileSync(new URL(`./${name}.ts`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loaded = { exports: {} };
  new Function("module", "exports", "require", outputText)(loaded, loaded.exports, (id) =>
    id.startsWith("@/lib/")
      ? load(id.slice(6))
      : id.startsWith("./")
        ? load(id.slice(2))
        : require(id),
  );
  cache.set(name, loaded.exports);
  return loaded.exports;
}
const f = load("rules-format");

test("current persona trait labels remain verbatim while old prefixes normalize", () => {
  const { formatPersonaTrait } = load("constants");
  assert.equal(formatPersonaTrait("Late months (of 6): 5.2 vs 0.8"), "Late months (of 6): 5.2 vs 0.8");
  assert.equal(formatPersonaTrait("Late months: 5.2 vs 0.8"), "Late months (of 6): 5.2 vs 0.8");
  assert.equal(formatPersonaTrait("Utilization, Sep: 61% vs 42%"), "Utilization, Sep: 61% vs 42%");
});

test("base lift controls families without filtering modifiers or inventing synthetic lift", () => {
  const { families } = JSON.parse(readFileSync(new URL("../../.api-samples/rules-families-default.json", import.meta.url), "utf8"));
  assert.equal(f.filterRuleFamilies(families, 1).length, 10);
  assert.ok(f.filterRuleFamilies(families, 1.01).every((family) => family.baseRule));
  const source = families.find((family) => family.baseRule?.ruleId === 2);
  assert.equal(f.filterRuleFamilies([source], 3.13).length, 0, "higher-lift modifiers cannot rescue a base");
  const custom = { ...source, modifiers: source.modifiers.map((modifier) => ({ ...modifier, lift: 1 })) };
  assert.deepEqual(f.filterRuleFamilies([custom], 3)[0].modifiers, custom.modifiers);
});

test("family ladders use real bases in condition order, without mutating API ranking", () => {
  const response = JSON.parse(readFileSync(new URL("../../.api-samples/rules-families-default.json", import.meta.url), "utf8"));
  const before = response.families.map((family) => family.familyId);
  const ladders = f.ruleLadders(response.families, response.groups);
  assert.deepEqual(ladders.map((group) => group.attribute), ["PAY_1", "MAX_DELAY", "MONTHS_DELAYED"]);
  assert.deepEqual(ladders[0].families.map((family) => family.baseRule.conditions[0].value), ["1", "2", "[3, inf)"]);
  assert.equal(ladders[2].families.length, 2);
  assert.deepEqual(response.families.map((family) => family.familyId), before);
  assert.equal(f.strongestDefaultFamily(response.families).baseRule.ruleId, 2);
  assert.equal(f.strongestDefaultFamily(response.families.map((family) => ({ ...family, baseRule: family.baseRule ? { ...family.baseRule, support: .0199 } : null }))), undefined);
});

test("old Weka intervals retain units and open/closed boundaries", () => {
  assert.equal(
    f.conditionText({ attribute: "AVG_UTILIZATION", value: "'(0.56192-inf)'" }),
    "Average utilization: above 56%",
  );
  assert.equal(
    f.conditionText({ attribute: "LIMIT_BAL", value: "'(-inf-75000]'" }),
    "Credit limit: up to NT$75,000",
  );
  assert.equal(
    f.conditionText({ attribute: "LIMIT_BAL", value: "'(75000-inf)'" }),
    "Credit limit: above NT$75,000",
  );
  assert.equal(f.conditionText({ attribute: "AGE", value: "'(38.5-inf)'" }), "Age: above 38.5");
});
test("structured labels, units and operators preserve their meaning", () => {
  assert.equal(
    f.conditionText({
      attribute: "LIMIT_BAL",
      label: "Limit",
      operator: "=",
      value: "<=50000",
      unit: "NT$",
    }),
    "Credit limit: up to NT$50,000",
  );
  assert.equal(
    f.conditionText({ attribute: "AVG_UTILIZATION", value: "50-100%" }),
    "Average utilization: 50-100%",
  );
  assert.equal(f.conditionText({ attribute: "AGE", value: "30-39" }), "Age: 30-39 years");
  assert.equal(
    f.conditionText({ attribute: "LIMIT_BAL", operator: ">", value: 50000 }),
    "Credit limit: above NT$50,000",
  );
  assert.equal(
    f.conditionText({ attribute: "PAY_RATIO", operator: "<=", value: 0.5 }),
    "Payment ratio: up to 50%",
  );
  assert.equal(f.conditionText({ attribute: "PAY_1", value: 8 }), "Latest statement status (Sep): 3+ months late");
});
test("names prefer API text, otherwise order conditions and cap at two", () => {
  assert.equal(
    f.shortRuleName({ lhs: "AGE=30-39, LIMIT_BAL=<=50000, PAY_1=2", rhs: "Default=Yes" }),
    "Latest: 2 months late; Credit limit <= NT$50k",
  );
  assert.equal(f.shortRuleName({ lhs: "PAY_1=2", shortName: "API name" }), "API name");
  assert.equal(
    f.shortRuleName({ lhs: "PAY_1=2", conditions: [{ attribute: "PAY_2", value: 0 }] }),
    "Status, Aug: revolving",
  );
  assert.equal(f.shortRuleName({ lhs: "PAY_1=2", conditions: [] }), "Latest statement: 2 months late");
});
test("structured categorical operators cannot reverse the derived rule meaning", () => {
  assert.equal(
    f.conditionText({ attribute: "EDUCATION", operator: "!=", value: "University" }),
    "Education: not University",
  );
  assert.equal(
    f.conditionText({ attribute: "SEX", operator: "!=", value: "Male" }),
    "Sex: not Male",
  );
  assert.equal(
    f.conditionText({ attribute: "RISK_TIER", operator: "in", value: "High" }),
    "Risk tier: in High",
  );
});

test("legacy and structured fallback names match every captured rule including members", () => {
  const rules = JSON.parse(
    readFileSync(new URL("../../.api-samples/rules.json", import.meta.url), "utf8"),
  );
  for (const rule of rules.flatMap((entry) => [entry, ...(entry.familyMembers ?? [])])) {
    assert.equal(f.shortRuleName({ lhs: rule.lhs }), rule.shortName, rule.lhs);
    assert.equal(
      f.shortRuleName({ ...rule, shortName: undefined }),
      rule.shortName,
      `structured ${rule.lhs}`,
    );
  }
});

test("attribute labels share the canonical feature map", () => {
  const rules = JSON.parse(readFileSync(new URL("../../.api-samples/rules.json", import.meta.url), "utf8"));
  for (const rule of rules.flatMap((entry) => [entry, ...(entry.familyMembers ?? [])]))
    for (const condition of rule.conditions)
      assert.equal(f.RULE_ATTRIBUTE_LABELS[condition.attribute], load("constants").FEATURE_LABELS[condition.attribute], condition.attribute);
});
