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
let families = sample("rules-families-default");
const cache = new Map();
const mocks = {
  recharts: {
    ...require("recharts"),
    // Supply the measured report-column width for server-rendered SVG layout checks.
    ResponsiveContainer: ({ children, minHeight }) => React.createElement("div", {
      className: "recharts-responsive-container", style: { width: "100%", height: minHeight ?? 288, minHeight },
    }, React.cloneElement(children, { width: 560, height: minHeight ?? 288 })),
  },
  "next/navigation": { usePathname: () => "/rules" },
  "@/hooks/useRules": { useRuleFamilies: (category) => ({ data: category === "default" ? families : sample("rules-families-nondefault") }) },
  "@/hooks/useOverview": { useOverview: () => ({ data: sample("overview") }) },
  "@/hooks/useClusters": { useClusters: () => ({ data: sample("clusters") }), useClusterCustomers: () => ({}) },
  "@/hooks/useMiningReport": { useMiningReport: () => ({ data: sample("mining-report") }) },
  "@/hooks/useEda": { usePcaMeta: () => ({ data: sample("eda-pca-2d-meta") }) },
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
const hero = () => renderRules().split("Strongest well-supported family")[1].split("Portfolio baseline")[0];

test("captured default rules show both family and member counts and a supported hero", () => {
  families = sample("rules-families-default");
  const markup = renderRules();
  assert.match(markup, />Families \(default rules\)<\/p><p[^>]*>10<\/p>/);
  assert.match(markup, />Rules \(default class\)<\/p><p[^>]*>37<\/p>/);
  assert.match(markup, /All outcomes: 58 rules in 20 families/);
  assert.match(hero(), /Latest statement: 2 months late/);
  const base = families.families.find((family) => family.familyId === "PAY_1=2").baseRule;
  const { formatInt } = load(resolve(root, "lib/format.ts"));
  assert.ok(hero().includes(`n = ${base.lhsCount == null ? "-" : formatInt(base.lhsCount)} clients, ${formatInt(base.jointCount)} defaulted`));
  assert.match(hero(), /adding Age 40-49 pushes it to 73.7%/);
  assert.match(hero(), /class="text-danger">69.1%<\/span> default/);
  assert.match(hero(), /default \(3\.1x base\)/);
  assert.equal((markup.match(/role="tab"/g) ?? []).length, 2);
});

test("hero without modifiers separates unavailable clients from known defaults", () => {
  const source = sample("rules-families-default");
  const family = source.families.find((item) => item.baseRule);
  families = { ...source, families: [{ ...family, baseRule: { ...family.baseRule, lhsCount: undefined, jointCount: 333, support: 0.03 }, modifiers: [] }] };
  try {
    assert.match(hero(), /n = - clients, 333 defaulted<\/p>/);
    assert.doesNotMatch(hero(), /adding|undefined/);
  } finally {
    families = source;
  }
});

test("rule counts distinguish matching clients from defaults with new, absent and zero lhsCount", () => {
  const source = sample("rules-families-default");
  const family = source.families.find((item) => item.familyId === "PAY_1=2");
  const { RuleFamilies, FamilyLadders } = load(resolve(root, "components/rules/RuleEvidence.tsx"));
  const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
  const cells = (html) => [...html.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((match) => match[1].replace(/<[^>]+>/g, ""));
  try {
    const enriched = { ...family, baseRule: { ...family.baseRule, lhsCount: 2666 }, modifiers: [{ ...family.modifiers[0], lhsCount: 563 }] };
    families = { ...source, families: [enriched] };
    assert.match(hero(), /n = 2,666 clients, 1,843 defaulted/);
    const cards = render(RuleFamilies, { families: [enriched], outcome: "default" });
    assert.match(cards, /n = 2,666 clients/);
    assert.match(cards, />Clients<\/th><th[^>]*>Defaults<\/th>/);
    assert.deepEqual(cells(cards).slice(-2), ["563", "415"]);
    const single = render(RuleFamilies, { families: [{ ...enriched, modifiers: [] }], outcome: "default" });
    assert.match(single, /n = 2,666 clients/);
    assert.match(single, /Defaults: 1,843/);
    const ladders = render(FamilyLadders, { families: [enriched, { ...enriched, familyId: "second", baseRule: { ...enriched.baseRule, lhsCount: 123 } }], groups: [{ attribute: "PAY_1", attributeLabel: "Latest statement", familyIds: [enriched.familyId, "second"] }], outcome: "default" });
    assert.match(ladders, /n = 2,666 clients/);
    const legacy = render(RuleFamilies, { families: [{ ...family, baseRule: { ...family.baseRule, lhsCount: undefined }, modifiers: [{ ...family.modifiers[0], lhsCount: undefined }] }], outcome: "default" });
    assert.match(legacy, /n = - clients/);
    assert.deepEqual(cells(legacy).slice(-2), ["-", "415"]);
    const zero = render(RuleFamilies, { families: [{ ...enriched, baseRule: { ...enriched.baseRule, lhsCount: 0, jointCount: 0 }, modifiers: [{ ...enriched.modifiers[0], lhsCount: 0, jointCount: 0 }] }], outcome: "default" });
    assert.match(zero, /n = 0 clients/);
    assert.deepEqual(cells(zero).slice(-2), ["0", "0"]);
  } finally {
    families = source;
  }
});

test("non-default counts retain their outcome and tab KPIs use category families", () => {
  const source = sample("rules-families-nondefault");
  const { RuleFamilies } = load(resolve(root, "components/rules/RuleEvidence.tsx"));
  const legacyFamilies = source.families.map((family) => ({ ...family,
    baseRule: family.baseRule ? { ...family.baseRule, lhsCount: undefined } : null,
    modifiers: family.modifiers.map((modifier) => ({ ...modifier, lhsCount: undefined })),
  }));
  const markup = renderToStaticMarkup(React.createElement(RuleFamilies, { families: legacyFamilies, outcome: "nonDefault" }));
  assert.match(markup, />Non-defaults<\/th>/);
  assert.doesNotMatch(markup, />Defaults<\/th>/);
  assert.match(markup, /n = - clients/);
  const originalUseState = React.useState;
  try {
    React.useState = (initial) => originalUseState(initial === "default" ? "nonDefault" : initial);
    const page = renderRules();
    assert.match(page, />Families \(non-default class\)<\/p><p[^>]*>10<\/p>/);
    assert.match(page, />Rules \(non-default class\)<\/p><p[^>]*>21<\/p>/);
    assert.match(page, /All outcomes: 58 rules in 20 families/);
  } finally {
    React.useState = originalUseState;
  }
});

test("persona badges format the baseline once and delay cells preserve numeric deltas", () => {
  const hook = mocks["@/hooks/useClusters"].useClusters;
  mocks["@/hooks/useClusters"].useClusters = () => ({ data: sample("clusters").map((cluster) => ({
    ...cluster, longestDelayMonths: undefined,
    baseline: { ...cluster.baseline, longestDelayMonths: undefined },
  })) });
  try {
  const Page = load(resolve(root, "app/clusters/page.tsx")).default;
  const markup = renderToStaticMarkup(React.createElement(Page));
  assert.match(markup, /default - 2\.9x base<\/div>/);
  assert.doesNotMatch(markup, /base\s+base/);
  assert.match(markup, /Longest delay/);
  assert.match(markup, /<span>-0\.6 months<\/span>/);
  assert.doesNotMatch(markup, />none</);
  assert.match(markup, /-\d+\.\d+ months<\/div>/);
  assert.match(markup, /negative codes represent paid in full or no use/);
  } finally { mocks["@/hooks/useClusters"].useClusters = hook; }
});

test("persona count and sweep evidence use captured data with a missing-evidence fallback", () => {
  const { Sidebar } = load(resolve(root, "components/layout/Sidebar.tsx"));
  const { ClusteringSection } = load(resolve(root, "components/report/ClusteringSection.tsx"));
  const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
  assert.match(render(Sidebar), /4 personas/);
  assert.match(render(ClusteringSection, { report: sample("mining-report") }), /The k = 2 sweep silhouette is 0.468, the final k = 4 model scores 0.251\./);
  const hook = mocks["@/hooks/useClusters"].useClusters;
  try {
    mocks["@/hooks/useClusters"].useClusters = () => ({});
    assert.doesNotMatch(render(Sidebar), /personas/);
  } finally {
    mocks["@/hooks/useClusters"].useClusters = hook;
  }
  mocks["@/hooks/useMiningReport"] = { useMiningReport: () => ({ data: sample("mining-report") }) };
  assert.match(render(load(resolve(root, "app/pipeline/page.tsx")).default), /Run K-means with k=4/);
});

test("clipped durations override legacy codes and preserve four identity colours", () => {
  const hook = mocks["@/hooks/useClusters"].useClusters;
  const clusters = sample("clusters").map((cluster) => ({
    ...cluster, longestDelayMonths: cluster.clusterId === 1 ? 0 : 1,
    baseline: { ...cluster.baseline, longestDelayMonths: 0.8 },
  }));
  try {
    mocks["@/hooks/useClusters"].useClusters = () => ({ data: clusters });
    const Page = load(resolve(root, "app/clusters/page.tsx")).default;
    const markup = renderToStaticMarkup(React.createElement(Page));
    assert.match(markup, /<span>0\.0 months<\/span>/);
    assert.doesNotMatch(markup, /Longest delay falls back/);
    assert.match(markup, /-0\.8 months/);
    assert.doesNotMatch(markup, /[+-]\d+\.\d{2} months/);
    assert.match(markup, /Bill trend \(% of limit\)/);
    for (const token of ["danger", "warning", "primary", "chart-neutral"]) {
      assert.ok(markup.includes(`background-color:hsl(var(--${token}))`), token);
    }
    assert.match(markup, /-NT\$75,882/);
    assert.doesNotMatch(markup, /NT\$-/);
    assert.match(markup, /k = 2 scores 0\.47 but merges 82% of clients/);
  } finally {
    mocks["@/hooks/useClusters"].useClusters = hook;
  }
});

test("customer flags follow visible rows and education uses the shared labels", () => {
  const { CustomerTable } = load(resolve(root, "app/customers/CustomerTable.tsx"));
  const { EDUCATION_VALUES, EDUCATION_LABELS } = load(resolve(root, "lib/constants.ts"));
  const source = sample("customers-page1").items[0];
  const items = EDUCATION_VALUES.map((education, index) => ({ ...source, clientId: index + 1, education, isOutlier: false, isAnomaly: false }));
  const render = (rows) => renderToStaticMarkup(React.createElement(CustomerTable, { items: rows, isLoading: false, size: rows.length, onSelect() {} }));
  const plain = render(items);
  assert.doesNotMatch(plain, />Flags</);
  for (const education of EDUCATION_VALUES) assert.ok(plain.includes(EDUCATION_LABELS[education]));
  const flagged = render([{ ...items[0], isAnomaly: true }]);
  assert.match(flagged, />Flags</);
  assert.match(flagged, />anomaly</);
});

test("dashboard and report CV copy agree and unavailable numeric data stays distinct", () => {
  const render = (path, name, props) => renderToStaticMarkup(React.createElement(load(resolve(root, path))[name], props));
  const expected = "Adding the pattern features leaves CV F1 unchanged (0.00 pp) for Random forest.";
  assert.ok(render("components/sequences/MethodNotes.tsx", "MethodNotes", { artifact: sample("sequences") }).includes(expected));
  assert.ok(render("components/report/SequenceSection.tsx", "SequenceSection", { value: sample("sequences") }).includes(expected));
  const report = sample("mining-report");
  assert.ok(render("components/report/ConclusionsSection.tsx", "ConclusionsSection", { report }).includes(expected));
  const synthetic = sample("rules-families-default").families.filter((family) => !family.baseRule);
  const table = render("components/report/RulesAndAnomalySections.tsx", "FamilyRulesTable", { families: synthetic });
  assert.equal((table.match(/title="not applicable">-<\/td>/g) ?? []).length, synthetic.reduce((count, family) => count + 4 + family.modifiers.length, 0));
  assert.doesNotMatch(table, />n\/a<\/td>/);
  const preparation = render("components/report/DataSections.tsx", "DataPreparationSection", { report });
  assert.equal((preparation.match(/title="not applicable">-<\/td>/g) ?? []).length, 4);
  report.methodology.featureEngineering.derivedFeatures[0].mean = null;
  assert.match(render("components/report/DataSections.tsx", "DataPreparationSection", { report }), />n\/a<\/td>/);
  const insights = render("components/report/InsightsAndAppendices.tsx", "InsightsSection", { report, visuals: sample("insight-visuals") });
  assert.equal((insights.match(/title="not applicable">-<\/td>/g) ?? []).length, 2);
});

test("all five non-default stories fit at 400px and report charts retain all labels at 1440px", async () => {
  const { PatternTable } = load(resolve(root, "components/sequences/PatternTable.tsx"));
  const { selectSequenceStories } = load(resolve(root, "lib/sequence-format.ts"));
  const patterns = selectSequenceStories(sample("sequences")).nonDefaultStories;
  assert.equal(patterns.length, 5);
  const { DataPreparationSection, DataUnderstandingSection } = load(resolve(root, "components/report/DataSections.tsx"));
  const report = sample("mining-report");
  const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
  const stories = render(PatternTable, { patterns });
  const preparation = render(DataPreparationSection, { report });
  const understanding = render(DataUnderstandingSection, { report, defaultBy: sample("eda-default-by-PAY_1"), defaultDimension: "PAY_1" });
  const markup = stories + preparation + understanding;
  const config = require("tailwindcss/loadConfig")(resolve(root, "../tailwind.config.ts"));
  config.content = [{ raw: markup, extension: "html" }];
  const css = (await require("postcss")([require("tailwindcss")(config)]).process(
    readFileSync(resolve(root, "app/globals.css"), "utf8"), { from: undefined },
  )).css;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 400, height: 900 } });
    await page.setContent(`<style>${css}</style><main class="p-4">${stories}</main>`);
    assert.equal(await page.locator("li").count(), 5);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    for (const row of await page.locator("li").all()) {
      assert.equal(await row.locator("dd").count(), 2);
      const box = await row.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= 400);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.setContent(`<style>${css}</style><main class="report-shell p-4">${preparation}${understanding}</main>`);
    const chart = page.getByRole("img", { name: "Combined outlier flags by column", exact: true });
    const labels = chart.locator(".recharts-yAxis .recharts-cartesian-axis-tick-value");
    const expectedLabels = Object.keys(report.methodology.preprocessing.outlierByColumn).map(load(resolve(root, "lib/constants.ts")).featureLabel);
    assert.equal(await labels.count(), expectedLabels.length);
    assert.deepEqual(await labels.allTextContents(), expectedLabels);
    for (const label of await labels.all()) assert.ok((await label.boundingBox()).height > 0);
    const figureTwo = page.getByRole("img", { name: /Default rate by/ });
    const statusLabels = await figureTwo.locator(".recharts-yAxis .recharts-cartesian-axis-tick-value").allTextContents();
    assert.ok(statusLabels.includes("No use (n=2,750)"));
    assert.ok(statusLabels.includes("3+ months late (n=463)"));
    // The captured API contains 20 numeric columns; also exercise the packet's 25-row boundary.
    const expanded = structuredClone(report);
    for (const feature of expanded.methodology.featureEngineering.derivedFeatures.slice(0, 5)) {
      expanded.methodology.preprocessing.outlierByColumn[feature.name] = { combinedCount: 0 };
    }
    await page.setContent(`<style>${css}</style><main class="report-shell p-4">${render(DataPreparationSection, { report: expanded })}</main>`);
    assert.equal(await labels.count(), 25);
    await page.emulateMedia({ media: "print" });
    assert.ok((await chart.locator(".recharts-responsive-container").boundingBox()).height >= 600);
  } finally {
    await browser.close();
  }
});

test("hero includes the two-percent boundary and does not invent a supported base", () => {
  const source = sample("rules-families-default");
  families = { ...source, families: source.families.map((family, index) => ({ ...family, baseRule: family.baseRule ? { ...family.baseRule, support: index === 1 ? .02 : .0199 } : null })) };
  assert.match(hero(), /Latest statement: 2 months late/);
  families = { ...source, families: [] };
  assert.match(renderRules(), /No default base rules meet the 2% support threshold/);
  families = source;
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
    assert.equal(href, "/mining-report#section-5-4");
    assert.equal(await page.locator(href.slice(href.indexOf("#"))).count(), 1);
    assert.match(await page.locator("#section-5-4").innerText(), /5\.4 Sequence mining/);
  } finally {
    await browser.close();
  }
});


test("family charts preserve rank, omit synthetic bases, and show modifier evidence", () => {
  const { RuleFamilies, FamilyChart, FamilyLadders } = load(resolve(root, "components/rules/RuleEvidence.tsx"));
  const source = sample("rules-families-default");
  const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
  const chart = render(FamilyChart, { families: source.families, baseline: source.baseline.defaultRate, outcome: "default" });
  assert.equal((chart.match(/role="img"/g) ?? []).length, 9);
  assert.ok(chart.indexOf("Latest statement: 3+") < chart.indexOf("Latest statement: 2 months"));
  assert.match(chart, /sm:min-h-7/);
  assert.match(chart, /border-dashed/);
  const cards = render(RuleFamilies, { families: source.families, outcome: "default" });
  assert.match(cards, /Show all 5/);
  assert.match(cards, /\+4.6 pp/);
  assert.match(cards, /Single-condition families/);
  assert.doesNotMatch(cards, /No modifier changes this rate at the mining thresholds./);
  assert.match(cards, /vs family/);
  const synthetic = render(RuleFamilies, { families: source.families.filter((family) => !family.baseRule), outcome: "default" });
  assert.match(synthetic, /Combined rules only/);
  assert.doesNotMatch(synthetic, /\+\d+\.\d pp/);
  const ladder = render(FamilyLadders, { families: source.families, groups: source.groups, outcome: "default" });
  assert.ok(ladder.indexOf("1 month late") < ladder.indexOf("2 months late"));
  assert.doesNotMatch(ladder, /Latest statement:|Longest delay:/);
  assert.match(ladder, /n =/);
  const nonDefaults = sample("rules-families-nondefault");
  assert.match(render(FamilyChart, { families: nonDefaults.families, baseline: nonDefaults.baseline.defaultRate, outcome: "nonDefault" }), /77.9%/);
});

test("report family tables retain captions and render base and modifier hierarchy", () => {
  const { RulesSection, FamilyRulesTable } = load(resolve(root, "components/report/RulesAndAnomalySections.tsx"));
  const markup = renderToStaticMarkup(React.createElement(RulesSection, { report: sample("mining-report") }));
  const source = readFileSync(resolve(root, "components/report/RulesAndAnomalySections.tsx"), "utf8");
  assert.match(source, /id="default-rules"/);
  assert.match(source, /id="non-default-rules"/);
  assert.equal((markup.match(/data-caption="table"/g) ?? []).length, 2);
  const table = renderToStaticMarkup(React.createElement(FamilyRulesTable, { families: sample("rules-families-default").families }));
  assert.match(table, /border-b font-bold/);
  assert.match(table, /p-3 pl-7/);
  assert.match(table, /\+4.6 pp/);
  assert.match(table, /No standalone base/);
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

test("ranked rule labels stack above visible bars and values at 400px", async () => {
  const { FamilyChart } = load(resolve(root, "components/rules/RuleEvidence.tsx"));
  const source = sample("rules-families-default");
  const markup = renderToStaticMarkup(React.createElement(FamilyChart, {
    families: source.families, baseline: source.baseline.defaultRate, outcome: "default",
  }));
  const config = require("tailwindcss/loadConfig")(resolve(root, "../tailwind.config.ts"));
  config.content = [{ raw: markup, extension: "html" }];
  const css = (await require("postcss")([require("tailwindcss")(config)]).process(
    readFileSync(resolve(root, "app/globals.css"), "utf8"), { from: undefined },
  )).css;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 400, height: 900 } });
    await page.setContent(`<style>${css}</style><main class="p-4">${markup}</main>`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    for (const bar of await page.getByRole("img").all()) {
      const row = bar.locator("..");
      const labelBox = await row.locator(":scope > span").first().boundingBox();
      const barBox = await bar.boundingBox();
      const valueBox = await row.locator(":scope > span").last().boundingBox();
      assert.ok(labelBox.y + labelBox.height <= barBox.y);
      assert.ok(valueBox.width > 0 && valueBox.x + valueBox.width <= 400);
    }
  } finally {
    await browser.close();
  }
});

test("sequence ratio wording names the compared groups while retaining exact patterns", () => {
  const { selectSequenceStories } = load(resolve(root, "lib/sequence-format.ts"));
  const pattern = selectSequenceStories(sample("sequences")).defaultStories[0];
  for (const [file, name, props] of [
    ["SequenceHero", "SequenceHero", { pattern }],
    ["PatternBars", "PatternBars", { patterns: [pattern] }],
  ]) {
    const component = load(resolve(root, `components/sequences/${file}.tsx`))[name];
    const markup = renderToStaticMarkup(React.createElement(component, props));
    assert.match(markup, /\d+\.\dx more common among defaulters/);
    assert.ok(markup.includes(load(resolve(root, "lib/sequence-format.ts")).humanisePattern(pattern).text));
  }
});

test("prediction submit controls switch from the form to its sticky result panel at lg", async () => {
  mocks["@/hooks/usePredict"] = { usePredict: () => ({ isPending: false }) };
  const { PredictForm } = load(resolve(root, "components/features/PredictForm.tsx"));
  const markup = renderToStaticMarkup(React.createElement(PredictForm));
  const config = require("tailwindcss/loadConfig")(resolve(root, "../tailwind.config.ts"));
  config.content = [{ raw: markup, extension: "html" }];
  const css = (await require("postcss")([require("tailwindcss")(config)]).process(
    readFileSync(resolve(root, "app/globals.css"), "utf8"), { from: undefined },
  )).css;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 400, height: 900 } });
    await page.setContent(`<style>${css}</style><main class="p-4">${markup}</main>`);
    const formButton = page.locator("form button[type=submit]");
    const panelButton = page.locator("aside button[type=submit]");
    assert.equal(await formButton.isVisible(), true);
    assert.equal(await panelButton.isVisible(), false);
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(await formButton.isVisible(), false);
    assert.equal(await panelButton.isVisible(), true);
    assert.equal(await panelButton.evaluate((button) => button.form.id), "predict-customer-form");
    assert.equal(await page.locator("aside").evaluate((panel) => getComputedStyle(panel).position), "sticky");
  } finally {
    await browser.close();
  }
});
