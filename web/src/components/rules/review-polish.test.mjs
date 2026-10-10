import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");
const { chromium } = require("@playwright/test");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sample = (name) => JSON.parse(readFileSync(resolve(root, `../.api-samples/${name}.json`), "utf8"));
const capturedRules = sample("rules");
let rules = capturedRules;
const cache = new Map();
const mocks = {
  "next/navigation": { usePathname: () => "/rules" },
  "@/hooks/useRules": { useRules: (lift, category) => ({ data: rules.filter((rule) => rule.lift >= lift && (!category || rule.category === category)) }) },
  "@/hooks/useOverview": { useOverview: () => ({ data: sample("overview") }) },
  "@/hooks/useSequences": { useSequences: () => ({ data: sample("sequences") }) },
  "@/hooks/useFacts": { useFacts: (sources = {}) => load(resolve(root, "lib/facts.ts")).createFacts({ ...sources, catalogue: sample("facts") }) },
};
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } });
  const loaded = { exports: {} };
  const localRequire = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (!id.startsWith("@/") && !id.startsWith(".")) return require(id);
    const target = id.startsWith("@/") ? resolve(root, id.slice(2)) : resolve(dirname(file), id);
    const source = [target, `${target}.ts`, `${target}.tsx`].find((path) => existsSync(path) && /\.tsx?$/.test(path));
    assert.ok(source, `Cannot resolve ${id}`);
    return load(source);
  };
  new Function("module", "exports", "require", outputText)(loaded, loaded.exports, localRequire);
  cache.set(file, loaded.exports);
  return loaded.exports;
}
const RulesPage = load(resolve(root, "app/rules/page.tsx")).default;
const renderRules = () => renderToStaticMarkup(React.createElement(RulesPage));
const hero = () => renderRules().split("Strongest default family")[1].split("Portfolio baseline")[0];

test("captured default rules show both family and member counts and a supported hero", () => {
  rules = capturedRules;
  const markup = renderRules();
  assert.match(markup, /Families \/ rules/);
  assert.match(markup, /10 families \/ 37 rules/);
  assert.match(hero(), /Sep: 2 mo late/);
  assert.match(hero(), /n = 1,843 clients/);
});

test("hero includes the two-percent boundary and falls back to greatest representative lift", () => {
  const defaults = capturedRules.filter((rule) => rule.category === "default");
  rules = defaults.map((rule, index) => ({ ...rule, support: index === 1 ? 0.02 : 0.0199 }));
  assert.match(hero(), /Sep: 2 mo late/);
  rules = defaults.map((rule) => ({ ...rule, support: 0.0199 }));
  assert.match(hero(), /Sep: 3\+ mo late/);
  rules = [];
  assert.match(renderRules(), /No default rules are available/);
  rules = capturedRules;
});

test("sequence footnote resolves to the section id rendered in the DOM", async () => {
  const { MethodNotes } = load(resolve(root, "components/sequences/MethodNotes.tsx"));
  const { SequenceSection } = load(resolve(root, "components/report/SequenceSection.tsx"));
  const markup = renderToStaticMarkup(React.createElement(React.Fragment, null,
    React.createElement(MethodNotes, { artifact: sample("sequences") }),
    React.createElement(SequenceSection, { value: null }),
  ));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(markup);
    const href = await page.getByRole("link", { name: "report", exact: true }).getAttribute("href");
    assert.equal(href, "/mining-report#section-5-3");
    assert.equal(await page.locator(href.slice(href.indexOf("#"))).count(), 1);
    assert.match(await page.locator("#section-5-3").innerText(), /5\.3 Sequence mining/);
  } finally {
    await browser.close();
  }
});


test("exact rule conditions retain API labels, operators and intervals with readable fallbacks", () => {
  const { RuleFamilies } = load(resolve(root, "components/rules/RuleEvidence.tsx"));
  const source = capturedRules.find((rule) => rule.lhs === "PAY_1=3+");
  const render = (rule) => renderToStaticMarkup(React.createElement(RuleFamilies, {
    families: [{ id: "sample", label: "Sample", rules: [rule] }], baseline: .22,
  }));
  const markup = render(source);
  assert.ok(markup.includes('>Sep status in [3, inf)</p>'), "API condition has spaces and label");
  assert.ok(markup.includes('title="Sep status: in [3, inf)"'), "readable title is retained");
  const noLabel = { ...source, conditions: source.conditions.map(({ label, ...condition }) => condition) };
  assert.ok(render(noLabel).includes('>Sep status in [3, inf)</p>'), "shared label handles absent API label");
  const legacy = { ...source, conditions: undefined, lhs: "PAY_1=2" };
  assert.ok(render(legacy).includes('>Sep status: 2 mo late</p>'), "legacy exact line is readable");
});

test("sequence and paper pages display plain API error messages and missing-message fallbacks", () => {
  const sequenceHook = mocks["@/hooks/useSequences"].useSequences;
  let apiError;
  mocks["@/hooks/useSequences"].useSequences = () => ({ error: apiError });
  mocks["@/hooks/useMiningReport"] = { useMiningReport: () => ({ error: apiError }) };
  try {
    for (const [path, fallback] of [
      ["app/sequences/page.tsx", "Failed to load sequences"],
      ["app/report/paper/page.tsx", "Failed to load report"],
    ]) {
      const Page = load(resolve(root, path)).default;
      apiError = { code: "ARTIFACT_MISSING", message: "Requested artifact is unavailable" };
      assert.ok(renderToStaticMarkup(React.createElement(Page)).includes(apiError.message), `${path} preserves API message`);
      apiError = { code: "NETWORK_ERROR" };
      assert.ok(renderToStaticMarkup(React.createElement(Page)).includes(fallback), `${path} retains fallback`);
    }
  } finally {
    mocks["@/hooks/useSequences"].useSequences = sequenceHook;
  }
});
