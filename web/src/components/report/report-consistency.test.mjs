import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
const effects = [];
const cache = new Map();
const mocks = {
  react: { ...React, useEffect: (effect) => effects.push(effect) },
  "@/hooks/useClusters": { useClusters: () => ({ data: sample("clusters") }) },
  "@/hooks/useEda": { usePcaMeta: () => ({ data: { explainedVarianceOfTotal: [.3, .2] } }) },
  "@/hooks/useRules": { useRuleFamilies: (category) => ({ data: sample(category === "default" ? "rules-families-default" : "rules-families-nondefault") }) },
  "@/hooks/useSequences": { useSequences: () => ({ data: sample("sequences") }) },
  "@/hooks/useInsights": { useInsightVisuals: () => ({ data: sample("insight-visuals") }) },
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
const render = (file, name, props) => renderToStaticMarkup(React.createElement(load(resolve(root, `components/report/${file}.tsx`))[name], props));

test("raw delay statistics explain the data-driven clipped portfolio mean", () => {
  const report = sample("mining-report");
  const delay = report.methodology.featureEngineering.derivedFeatures.find((row) => row.name === "MAX_DELAY");
  delay.mean = .5432;
  report.clustering.clusters[0].baseline.longestDelayMonths = 1.234;
  const html = render("DataSections", "DataPreparationSection", { report });
  assert.match(html, /-2\.0000/);
  assert.match(html, /0\.5432/);
  assert.match(html, /portfolio 1\.2 months vs raw 0\.54/);
  delete report.clustering.clusters[0].baseline.longestDelayMonths;
  const missing = render("DataSections", "DataPreparationSection", { report });
  assert.match(missing, /Codes below 0 mean paid in full or no card use/);
  assert.doesNotMatch(missing, /portfolio .* months vs raw/);
});

test("both sequence documents use plain month and payment copy", () => {
  for (const [file, name, props] of [
    ["SequenceSection", "SequenceSection", { value: sample("sequences") }],
    ["paper/PaperReportDocument", "PaperReportDocument", { report: sample("mining-report") }],
  ]) {
    const html = render(file, name, props);
    assert.match(html, /from the April 2005 statement to the September 2005 statement/);
    assert.match(html, /Nothing due/);
    assert.match(html, /Payment covers the bill/);
    assert.doesNotMatch(html, /PAY_6 \(April|NO_BALANCE means|COVERED means/);
  }
});

test("Insight 1 explains the combined cohort using its current bars", () => {
  const { InsightVisualCard } = load(resolve(root, "components/insights/InsightVisualCard.tsx"));
  const visual = sample("insight-visuals")[0];
  visual.bars.find((bar) => bar.label === "2 months late").value = 62.3;
  visual.bars.find((bar) => bar.label === "3+ months late").value = 73.4;
  const props = { insight: sample("insights")[0], visual };
  const html = renderToStaticMarkup(React.createElement(InsightVisualCard, props));
  assert.match(html, /2\+ months combines the 2 months \(62\.3%\) and 3\+ months \(73\.4%\) bars/);
  visual.bars.pop();
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(InsightVisualCard, props)), /2\+ months combines/);
});

test("every screen TOC link has one visible target, while Appendix A remains printable", async () => {
  const markup = render("MiningReportDocument", "MiningReportDocument", {
    report: sample("mining-report"), defaultDimension: "PAY_1",
  });
  const alternateToc = render("ReportPrimitives", "ReportToc", {});
  const config = require("tailwindcss/loadConfig")(resolve(root, "../tailwind.config.ts"));
  config.content = [{ raw: markup + alternateToc, extension: "html" }];
  const css = (await require("postcss")([require("tailwindcss")(config)]).process(
    readFileSync(resolve(root, "app/globals.css"), "utf8"), { from: undefined },
  )).css;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.setContent(`<style>${css}</style>${markup}${alternateToc}`);
    assert.deepEqual(await page.locator("#section-5 h3.report-heading").allTextContents(), [
      "5.1 Algorithms", "5.2 Personas (K-means)",
      "5.3 Association rules and anomalies", "5.4 Sequence mining",
    ]);
    assert.equal(await page.locator('section[aria-label="Algorithms and improvements"] h4').filter({ hasText: /^Improvements$/ }).count(), 1);
    assert.equal(await page.locator("#section-5-3 #section-5-3-anomalies").count(), 1);
    for (const href of await page.locator('nav[aria-label="Report contents"] a').evaluateAll((links) => links.map((link) => link.getAttribute("href")))) {
      assert.equal(await page.locator(href).count(), 1, `${href} must have exactly one target`);
      assert.ok(await page.locator(href).isVisible(), `${href} must be visible on screen`);
    }
    assert.equal(await page.locator("#appendix-a").isVisible(), false);
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.locator("#appendix-a").isVisible(), true);
  } finally {
    await browser.close();
  }
});

test("paper and command appendix use the seven Methodology steps with legacy command names", () => {
  const paper = render("paper/PaperReportDocument", "PaperReportDocument", { report: sample("mining-report") });
  const steps = [
    [1, 1, "Phase1Report"], [2, 2, "Phase2Report"], [3, 3, "Phase3Report"],
    [4, 5, "Phase5Pipeline"], [5, 6, "Phase6Pipeline"], [6, 7, "Phase7Pipeline"],
    [6, 9, "InsightFactsReport"], [7, 10, "Phase10Pipeline"],
  ];
  const { MAVEN_PHASE_COMMANDS } = load(resolve(root, "components/report/RunCommandsAppendix.tsx"));
  assert.equal(MAVEN_PHASE_COMMANDS.length, steps.length);
  steps.forEach(([step, phase, main], index) => {
    const entry = MAVEN_PHASE_COMMANDS[index];
    assert.ok(entry.description.includes(`Step ${step}`), entry.description);
    assert.ok(entry.description.includes(`(Phase ${phase})`), entry.description);
    assert.equal(entry.command, `mvn -q compile exec:java -Dexec.mainClass=com.creditminer.pipeline.${main}`);
  });
  assert.match(paper, /Steps 1-3 prepare the data; Step 4 creates the split/);
  assert.match(paper, /Step 4 reads the prepared train and test data as ARFF/);
  assert.match(paper, /Step 4 applies SMOTE/);
  assert.match(paper, /Step 5 groups clients into personas/);
  assert.match(paper, /Step 6 mines association rules/);
  assert.match(paper, /Step 7 mines repayment sequences/);
  assert.doesNotMatch(paper, /Step [2389] (?:writes|applies|uses)/);
  assert.match(paper, /5\.2 Personas \(K-means\)/);
  assert.match(paper, /5\.3 Association rules and anomalies/);
});

test("summary prefers API rule totals and keeps legacy summaries usable", () => {
  const report = sample("mining-report");
  report.summary = {
    ruleCount: 58, familyCount: 20, topRuleLift: 3.33,
    defaultRuleCount: 37, defaultFamilyCount: 10,
    nonDefaultRuleCount: 21, nonDefaultFamilyCount: 10,
  };
  const html = render("ExecutiveSummary", "ExecutiveSummary", { report });
  assert.match(html, /58 rules in 20 families/);
  assert.match(html, /3\.33x/);
  assert.match(html, />\d+\.\d%<\/span>/);
  const rules = render("RulesAndAnomalySections", "RulesSection", { report });
  assert.match(rules, /37 default rules and 21 non-default rules/);
  assert.equal(report.summary.defaultRuleCount + report.summary.nonDefaultRuleCount, report.summary.ruleCount);
  assert.equal(report.summary.defaultFamilyCount + report.summary.nonDefaultFamilyCount, report.summary.familyCount);
  delete report.summary;
  const legacy = render("ExecutiveSummary", "ExecutiveSummary", { report });
  assert.ok(legacy.includes(`${report.rules.totalRules} rules`));
  assert.ok(legacy.includes(`${report.rules.maxLift.toFixed(2)}x`));
});

test("report rule tables distinguish exact cohort and outcome counts, including missing and zero counts", () => {
  const family = structuredClone(sample("rules-families-default").families.find((row) => row.baseRule && row.modifiers.length));
  family.baseRule.lhsCount = 2666;
  family.baseRule.jointCount = 1843;
  family.modifiers = [
    { ...family.modifiers[0], ruleId: 101, lhsCount: 563, jointCount: 415 },
    { ...family.modifiers[0], ruleId: 102, lhsCount: undefined, jointCount: 17 },
    { ...family.modifiers[0], ruleId: 103, lhsCount: 0, jointCount: 0 },
  ];
  const html = render("RulesAndAnomalySections", "FamilyRulesTable", { families: [family] });
  const cells = [...html.matchAll(/<tr[^>]*>(.*?)<\/tr>/g)].map(([, row]) => [...row.matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/g)].map(([, cell]) => cell.replaceAll(/<[^>]+>/g, "")));
  assert.deepEqual(cells[0], ["Condition", "Confidence", "Lift", "Clients", "Defaults", "vs family"]);
  assert.deepEqual(cells[1].slice(3, 5), ["2,666", "1,843"]);
  assert.deepEqual(cells[2].slice(3, 5), ["563", "415"]);
  assert.deepEqual(cells[3].slice(3, 5), ["-", "17"]);
  assert.deepEqual(cells[4].slice(3, 5), ["0", "0"]);
  delete family.baseRule.lhsCount;
  const legacy = render("RulesAndAnomalySections", "FamilyRulesTable", { families: [family] });
  assert.match(legacy, /<td[^>]*>-<\/td><td[^>]*>1,843<\/td>/);
  const synthetic = render("RulesAndAnomalySections", "FamilyRulesTable", { families: [{ ...family, baseRule: null }] });
  assert.match(synthetic, /No standalone base/);
  assert.match(render("RulesAndAnomalySections", "FamilyRulesTable", { families: [] }), /colSpan="6"/i);
});

test("non-default tables label outcome counts explicitly, including synthetic families", () => {
  const family = structuredClone(sample("rules-families-nondefault").families.find((row) => row.baseRule && row.modifiers.length));
  family.baseRule.lhsCount = 100;
  family.baseRule.jointCount = 80;
  const html = render("RulesAndAnomalySections", "FamilyRulesTable", { families: [family], outcome: "non-default" });
  assert.match(html, />Non-defaults<\/th>/);
  assert.doesNotMatch(html, />Defaults<\/th>/);
  assert.match(html, /<td[^>]*>100<\/td><td[^>]*>80<\/td>/);
  const synthetic = render("RulesAndAnomalySections", "FamilyRulesTable", { families: [{ ...family, baseRule: null }], outcome: "non-default" });
  assert.match(synthetic, />Non-defaults<\/th>/);
  assert.match(synthetic, /No standalone base/);
  for (const [file, name] of [["RulesAndAnomalySections", "RulesSection"], ["paper/PaperReportDocument", "PaperReportDocument"]]) {
    const document = render(file, name, { report: sample("mining-report") });
    assert.match(document, />Defaults<\/th>/);
    assert.match(document, />Non-defaults<\/th>/);
  }
});

test("personas use clipped delay months and percent trend with canonical labels", () => {
  const { ClusterCard, formatCentroid } = load(resolve(root, "components/report/ClusteringSection.tsx"));
  const cluster = { ...sample("clusters")[1], longestDelayMonths: 0 };
  const html = renderToStaticMarkup(React.createElement(ClusterCard, { cluster, defaultRate: cluster.defaultRate }));
  assert.doesNotMatch(html, />C[0-3]</);
  assert.match(html, /hsl\(var\(--primary\)\)/);
  assert.equal(formatCentroid("BILL_TREND", -.01), "-1.0%");
  assert.equal(formatCentroid("MAX_DELAY", 0), "0.0 months");
  const hook = mocks["@/hooks/useClusters"].useClusters;
  mocks["@/hooks/useClusters"].useClusters = () => ({ data: [cluster] });
  try {
    const section = render("ClusteringSection", "ClusteringSection", { report: sample("mining-report") });
    assert.match(section, /PC1 and PC2 explain 50\.0% of the variance of the 8 features/);
    assert.match(section, /0\.0 months/);
    assert.doesNotMatch(section, /legacy centroid mean/);
  } finally {
    mocks["@/hooks/useClusters"].useClusters = hook;
  }
});

test("conclusions and paper retain fact evidence, section order and one selection rule", () => {
  const report = sample("mining-report");
  const conclusion = render("ConclusionsSection", "ConclusionsSection", { report });
  assert.match(conclusion, /latest-statement ladder rises/);
  assert.match(conclusion, /Delaying personas account for/);
  assert.match(conclusion, /Utilization shows a U-shape/);
  assert.match(conclusion, /Risk tier is derived from delay features/);
  const paper = render("paper/PaperReportDocument", "PaperReportDocument", { report });
  assert.match(paper, /5\.2 Personas/);
  assert.ok(paper.indexOf("7 Insights") < paper.indexOf("8 Conclusions"));
  assert.equal((paper.match(/Selection rule:/g) ?? []).length, 1);
  assert.doesNotMatch(paper, /Phase 1 maps/);
  assert.match(paper, /Table 8\./);
  assert.match(paper, /Table 9\./);
});

test("paper comparison and runtime tables fit print, and disclosures restore after printing", async () => {
  const report = sample("mining-report");
  const markup = render("paper/PaperReportDocument", "PaperReportDocument", { report });
  const config = require("tailwindcss/loadConfig")(resolve(root, "../tailwind.config.ts"));
  config.content = [{ raw: markup, extension: "html" }];
  const css = (await require("postcss")([require("tailwindcss")(config)]).process(
    readFileSync(resolve(root, "app/globals.css"), "utf8"), { from: undefined },
  )).css;
  const { usePrintExpandedDetails } = load(resolve(root, "components/report/ReportPrimitives.tsx"));
  effects.length = 0;
  usePrintExpandedDetails();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 760, height: 1000 } });
    await page.setContent(`<style>${css}</style>${markup}`);
    await page.evaluate(`(${effects[0].toString()})()`);
    const before = await page.locator("details").evaluateAll((nodes) => nodes.map((node) => node.open));
    await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
    assert.ok((await page.locator("details").evaluateAll((nodes) => nodes.map((node) => node.open))).every(Boolean));
    await page.emulateMedia({ media: "print" });
    for (const number of [8, 9]) {
      const figure = page.locator("figure.report-table").filter({ has: page.locator("figcaption", { hasText: `Table ${number}.` }) });
      const box = await figure.boundingBox();
      assert.ok(box && box.width > 0);
      assert.equal(await figure.locator("table").count(), number === 8 ? 2 : 1);
      for (const table of await figure.locator("table").all()) {
        assert.ok(await table.evaluate((element) => element.scrollWidth <= element.clientWidth + 1));
      }
    }
    const ruleTables = page.locator("table").filter({ has: page.locator("th", { hasText: /^(Defaults|Non-defaults)$/ }) });
    assert.equal(await ruleTables.count(), 2);
    for (const table of await ruleTables.all()) {
      assert.equal(await table.locator("thead th").count(), 6);
      assert.ok(await table.evaluate((element) => element.scrollWidth <= element.clientWidth + 1));
    }
    await page.evaluate(() => dispatchEvent(new Event("afterprint")));
    assert.deepEqual(await page.locator("details").evaluateAll((nodes) => nodes.map((node) => node.open)), before);
  } finally {
    await browser.close();
  }
});
