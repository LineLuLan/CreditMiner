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
let route = "/rules";
let fixedCharts = false;
const cache = new Map();
const mocks = {
  recharts: {
    ...require("recharts"),
    ResponsiveContainer: ({ children, ...props }) => fixedCharts
      ? React.cloneElement(children, { width: 320, height: 280 })
      : React.createElement(require("recharts").ResponsiveContainer, props, children),
  },
  "@/hooks/useSequences": { useSequences: () => ({ data: sample("sequences") }) },
  "@/hooks/useFacts": { useFacts: (sources = {}) => load(resolve(root, "lib/facts.ts")).createFacts({ ...sources, catalogue: sample("facts") }) },
  "next/navigation": { usePathname: () => route },
  "next/dynamic": () => () => null,
  "@/hooks/useRules": {
    useRules: (lift, category) => ({ data: sample("rules").filter((rule) => rule.lift >= lift && (!category || rule.category === category)) }),
    useRuleFamilies: (category) => ({ data: sample(`rules-families-${category.toLowerCase()}`) }),
  },
  "@/hooks/useOverview": { useOverview: () => ({ data: sample("overview") }) },
  "@/hooks/useClusters": { useClusters: () => ({ data: sample("clusters") }) },
  "@/hooks/useCustomers": { useCustomers: () => ({ data: sample("customers-page1") }), useCustomer: () => ({}) },
  "@/hooks/useAnomalies": { useAnomalies: () => ({ data: sample("anomalies") }), ANOMALY_LIST_LIMIT: 1000 },
  "@/hooks/useInsights": { useInsights: () => ({ data: sample("insights") }), useInsightVisuals: () => ({ data: sample("insight-visuals") }) },
  "@/hooks/useMiningReport": { useMiningReport: () => ({ data: sample("mining-report") }) },
  "@/hooks/useEda": { usePcaMeta: () => ({ data: sample("eda-pca-2d-meta") }), useEdaDistribution: (_col, _bins, _split, mode) => ({ data: sample(`eda-distribution-LIMIT_BAL${mode === "quantile" ? "-quantile" : ""}`) }), useEdaDefaultBy: () => ({ data: sample("eda-default-by-PAY_1") }), useEdaCorrelation: () => ({ data: sample("eda-correlation") }) },
  "@/hooks/usePredict": { usePredict: () => ({ isPending: false }) },
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


test("5B2 sample-backed pages fit 400/1440px and report TOC hides in print, without servers", async (t) => {
  const postcss = require("postcss");
  const tailwind = require("tailwindcss");
  const cssFile = resolve(root, "app/globals.css");
  const { css } = await postcss([tailwind({ config: resolve(root, "../tailwind.config.ts") })]).process(readFileSync(cssFile, "utf8"), { from: cssFile });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route("**/*", (request) => request.abort());
    for (const name of ["", "predict", "eda", "customers", "insights", "pipeline", "mining-report", "report/paper"]) {
      route = `/${name}`;
      const Component = load(resolve(root, `app/${name ? `${name}/` : ""}page.tsx`)).default;
      const markup = renderToStaticMarkup(React.createElement(Component));
      for (const width of [400, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ media: "screen" });
        await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body><div class="min-w-0 md:pl-64">${markup}</div></body></html>`);
        const content = await page.evaluate(() => document.documentElement.scrollWidth);
        assert.ok(content <= width, `${route} at ${width}px: document width ${content}`);
        if (name === "predict") {
          assert.ok(await page.getByText("Your prediction appears here").isVisible());
          assert.equal(await page.locator('input[value="200,000"]').count(), 1);
          const form = await page.locator("form").boundingBox();
          const result = await page.locator('aside[aria-label="Prediction result"]').boundingBox();
          assert.ok(width === 400 ? result.y > form.y + form.height : result.x > form.x + form.width, "prediction result is below mobile form and beside desktop form");
        }
        if (name === "insights") {
          const text = await page.locator("body").innerText();
          for (const insight of sample("insights")) assert.ok(text.includes(insight.title));
          assert.equal(await page.locator('[aria-label="Evidence facts"]').count(), sample("insights").length);
        }
        if (name === "") {
          const signals = page.locator('section[aria-labelledby="top-signals-title"] a');
          assert.equal(await signals.count(), 3);
          assert.ok((await signals.nth(2).innerText()).includes("share of defaults held by the delaying personas"));
          const shares = sample("facts").facts;
          const ratio = shares.find((fact) => fact.factId === "share-of-defaults-delayers").value / shares.find((fact) => fact.factId === "share-of-clients-delayers").value;
          assert.ok((await signals.nth(2).innerText()).includes(`${ratio.toFixed(1)}x their client share`));
          assert.ok((await signals.nth(1).innerText()).includes("default rate when late in 3+ of the last 6 months"));
        }
        if (name === "eda") {
          const text = await page.locator("body").innerText();
          for (const note of sample("eda-distribution-LIMIT_BAL-quantile").notes) assert.ok(text.includes(note));
          assert.doesNotMatch(text, /Approximate|Bins use equal widths/);
          const series = sample("eda-distribution-LIMIT_BAL-quantile").series;
          const { formatNt } = load(resolve(root, "lib/format.ts"));
          assert.ok(text.includes(`Defaulters' median credit limit is ${formatNt(series.find((row) => row.label === "Yes").stats.median)} vs ${formatNt(series.find((row) => row.label === "No").stats.median)} for non-defaulters`));
        }
        if (name === "pipeline") {
          const text = await page.locator("body").innerText();
          for (let n = 1; n <= 7; n++) assert.ok(text.includes(`Step ${n}`));
          assert.match(text, /RandomForest \(cost-sensitive\)/);
        }
        if (name === "mining-report" || name === "report/paper") {
          const text = await page.locator("body").textContent();
          assert.ok(text.includes(sample("sequences").stories.defaultStories[0].displayText), "report uses current curated story");
          assert.ok(text.includes(sample("clusters")[0].displayName), "report uses enriched cluster names");
          assert.ok(text.includes(sample("rules")[0].shortName), "report uses short rule names");
          assert.ok(text.includes("Permutation importance: mean holdout AUC drop over 5 shuffles"));
        }
        if (name === "mining-report") {
          assert.equal(await page.locator(".report-toc").isVisible(), width >= 1280);
          await page.emulateMedia({ media: "print" });
          assert.equal(await page.locator(".report-toc").isVisible(), false);
        }
        await page.emulateMedia({ media: "screen" });
        await page.locator("details").evaluateAll((elements) => elements.forEach((element) => { element.open = true; }));
        const expandedWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        assert.ok(expandedWidth <= width, `${route} expanded evidence at ${width}px: document width ${expandedWidth}`);
        t.diagnostic(`${route}: ${width}px document and expanded evidence fit; sample-backed static markup`);
      }
    }
    const { PredictResult } = load(resolve(root, "components/features/PredictResult.tsx"));
    const result = renderToStaticMarkup(React.createElement(PredictResult, { data: sample("predict-response"), previousDefaultProb: null, resultRef: null }));
    await page.setViewportSize({ width: 400, height: 1000 });
    await page.emulateMedia({ media: "screen" });
    await page.setContent(`<html><head><style>${css}</style></head><body><div class="p-4">${result}</div></body></html>`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "filled prediction result fits 400px");
  } finally { await browser.close(); }
});

test("API persona/status chart labels all render and empty or absent multipliers have no chip", () => {
  fixedCharts = true;
  try {
    const { InsightVisualCard } = load(resolve(root, "components/insights/InsightVisualCard.tsx"));
    const visuals = sample("insight-visuals");
    const insights = sample("insights");
    for (const index of [0, 1, 2, 3, 8]) {
      const visual = visuals[index];
      const insight = insights.find((row) => row.title === visual.title);
      const html = renderToStaticMarkup(React.createElement(InsightVisualCard, { insight, visual }));
      assert.match(html, /recharts-yAxis/);
      assert.equal((html.match(/class="recharts-layer recharts-cartesian-axis-tick"/g) ?? []).length, visual.bars.length);
      for (const bar of visual.bars)
        for (const line of bar.label.split(": ")) assert.ok(html.includes(line.replaceAll(">", "&gt;").replaceAll("<", "&lt;")), `tick label: ${bar.label}`);
    }
    const insight = insights.find((row) => row.title === visuals[3].title);
    for (const lift of ["", " ", visuals[3].lift]) {
      const html = renderToStaticMarkup(React.createElement(InsightVisualCard, { insight, visual: { ...visuals[3], lift } }));
      assert.doesNotMatch(html, /ml-auto/);
    }
  } finally { fixedCharts = false; }
});

test("final 7A inline insight contracts render the inclusive fact and five utilization bands", () => {
  const factHook = mocks["@/hooks/useFacts"].useFacts;
  const catalogue = sample("facts");
  const latest = { ...catalogue.facts.find((fact) => fact.factId === "default-rate-pay1-late2"), factId: "default-rate-pay1-late2plus", value: 0.695, n: 3129 };
  const labels = ["0% or below (no balance)", "0-25%", "25-50%", "50-100%", "> 100%"];
  fixedCharts = true;
  mocks["@/hooks/useFacts"].useFacts = (sources = {}) => load(resolve(root, "lib/facts.ts")).createFacts({ ...sources, catalogue: { ...catalogue, facts: [...catalogue.facts.filter((fact) => fact.factId !== latest.factId), latest] } });
  try {
    const { InsightVisualCard } = load(resolve(root, "components/insights/InsightVisualCard.tsx"));
    const insight = { ...sample("insights")[0], title: "Two or more months late now predicts default" };
    const visual = { ...sample("insight-visuals")[0], title: insight.title, headline: { value: "69.5%", label: "default when two or more months late", factId: latest.factId } };
    const render = (item, chart) => renderToStaticMarkup(React.createElement(InsightVisualCard, { insight: item, visual: chart }));
    assert.match(render(insight, visual), />69\.5%</);
    const utilization = { ...sample("insight-visuals")[1], title: "Both inactive and over-limit cards default more", headline: { value: "34.9%", label: "default at 0% average utilization", factId: "default-rate-avg-utilization-le0" }, bars: labels.map((label, i) => ({ label, value: i + 10, n: i + 100, highlight: i === 0 || i === 4 })) };
    const html = render({ ...sample("insights")[1], title: utilization.title }, utilization);
    assert.equal((html.match(/class="recharts-layer recharts-cartesian-axis-tick"/g) ?? []).length, 5);
    for (const label of labels) assert.ok(html.includes(label.replaceAll(">", "&gt;")), label);
  } finally {
    mocks["@/hooks/useFacts"].useFacts = factHook;
    fixedCharts = false;
  }
});
