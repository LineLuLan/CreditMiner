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

test("old Weka intervals retain units and open/closed boundaries", () => {
  assert.equal(
    f.conditionText({ attribute: "AVG_UTILIZATION", value: "'(0.56192-inf)'" }),
    "Mean use: above 56%",
  );
  assert.equal(
    f.conditionText({ attribute: "LIMIT_BAL", value: "'(-inf-75000]'" }),
    "Limit: up to NT$75,000",
  );
  assert.equal(
    f.conditionText({ attribute: "LIMIT_BAL", value: "'(75000-inf)'" }),
    "Limit: above NT$75,000",
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
    "Limit: up to NT$50,000",
  );
  assert.equal(
    f.conditionText({ attribute: "AVG_UTILIZATION", value: "50-100%" }),
    "Mean use: 50-100%",
  );
  assert.equal(f.conditionText({ attribute: "AGE", value: "30-39" }), "Age: 30-39 years");
  assert.equal(
    f.conditionText({ attribute: "LIMIT_BAL", operator: ">", value: 50000 }),
    "Limit: above NT$50,000",
  );
  assert.equal(
    f.conditionText({ attribute: "PAY_RATIO", operator: "<=", value: 0.5 }),
    "Payment ratio: up to 50%",
  );
  assert.equal(f.conditionText({ attribute: "PAY_1", value: 8 }), "Sep status: 3+ mo late");
});
test("names prefer API text, otherwise order conditions and cap at two", () => {
  assert.equal(
    f.shortRuleName({ lhs: "AGE=30-39, LIMIT_BAL=<=50000, PAY_1=2", rhs: "Default=Yes" }),
    "Sep: 2 mo late; Limit: <=NT$50k",
  );
  assert.equal(f.shortRuleName({ lhs: "PAY_1=2", shortName: "API name" }), "API name");
  assert.equal(
    f.shortRuleName({ lhs: "PAY_1=2", conditions: [{ attribute: "PAY_2", value: 0 }] }),
    "Aug: revolving",
  );
  assert.equal(f.shortRuleName({ lhs: "PAY_1=2", conditions: [] }), "Sep: 2 mo late");
});
test("families use exact repayment conditions without merging different intervals", () => {
  assert.equal(
    f.ruleFamily({ lhs: "AGE=30-39, PAY_1=2" }),
    f.ruleFamily({ lhs: "PAY_1=2, MAX_DELAY=2" }),
  );
  assert.notEqual(f.ruleFamily({ lhs: "PAY_1=2" }), f.ruleFamily({ lhs: "PAY_1=3" }));
  assert.notEqual(f.ruleFamily({ lhs: "PAY_1=3" }), f.ruleFamily({ lhs: "PAY_1=4" }));
  assert.equal(f.ruleFamily({ lhs: "PAY_1=2", familyId: "repayment" }), "repayment");
});
test("legacy report exports still expose exact raw conditions", () => {
  const parsed = f.parseRuleSide("PAY_1=2, MAX_DELAY=2");
  assert.equal(parsed[0].raw, "PAY_1=2");
  assert.equal(f.friendlyRuleValue("2", "PAY_1"), "2 months late");
  assert.equal(f.formatRuleOutcome("Default=No"), "Non-default");
});

test("families rank their best evidence first and keep outcome baselines separate", () => {
  const rules = JSON.parse(
    readFileSync(new URL("../../.api-samples/rules.json", import.meta.url), "utf8"),
  );
  const grouped = f.groupRuleFamilies(rules);
  assert.equal(grouped[0].rules[0].ruleId, 1);
  assert.deepEqual(
    grouped.slice(0, 3).map((family) => family.rules[0].ruleId),
    [1, 2, 3],
  );
  assert.equal(
    grouped.reduce((sum, family) => sum + family.rules.length, 0),
    rules.reduce((sum, rule) => sum + 1 + rule.familyMembers.length, 0),
  );
  const pair = [
    { ...rules[0], familyId: "same" },
    { ...rules[0], familyId: "same", category: "non-default" },
  ];
  assert.equal(f.groupRuleFamilies(pair).length, 2);
  assert.deepEqual(f.groupRuleFamilies([]), []);
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
    "Derived tier: in High",
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

test("nested family members retain the shortest representative even when pairs have higher lift", () => {
  const rules = JSON.parse(
    readFileSync(new URL("../../.api-samples/rules.json", import.meta.url), "utf8"),
  );
  const groups = f.groupRuleFamilies(rules);
  for (const group of groups) {
    const lengths = group.rules.map((rule) => f.ruleConditions(rule).length);
    assert.equal(lengths[0], Math.min(...lengths));
  }
  assert.equal(
    groups.reduce((sum, group) => sum + group.rules.length, 0),
    rules.reduce((sum, rule) => sum + 1 + rule.familyMembers.length, 0),
  );
});

test("minimum lift also filters expanded members while preserving the representative", () => {
  const sample = JSON.parse(readFileSync(new URL("../../.api-samples/rules.json", import.meta.url), "utf8"));
  const families = f.groupRuleFamilies(sample.filter((rule) => rule.lift >= 1.6), 1.6);
  assert.ok(families.flatMap((family) => family.rules).every((rule) => rule.lift >= 1.6));
  for (const family of families) assert.equal(family.rules[0].conditions.length, Math.min(...family.rules.map((rule) => rule.conditions.length)));
});
