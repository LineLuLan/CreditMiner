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
const cache = new Map();
const mocks = {
  "@/hooks/useSequences": { useSequences: () => ({ data: sample("sequences") }) },
  "@/hooks/useFacts": { useFacts: (sources = {}) => load(resolve(root, "lib/facts.ts")).createFacts({ ...sources, catalogue: sample("facts") }) },
  "next/navigation": { usePathname: () => route },
  "next/dynamic": () => () => null,
  "@/hooks/useRules": { useRules: (lift, category) => ({ data: sample("rules").filter((rule) => rule.lift >= lift && (!category || rule.category === category)) }) },
  "@/hooks/useOverview": { useOverview: () => ({ data: sample("overview") }) },
  "@/hooks/useClusters": { useClusters: () => ({ data: sample("clusters") }) },
  "@/hooks/useCustomers": { useCustomers: () => ({ data: sample("customers-page1") }), useCustomer: () => ({}) },
  "@/hooks/useAnomalies": { useAnomalies: () => ({ data: sample("anomalies") }), ANOMALY_LIST_LIMIT: 1000 },
  "@/hooks/useInsights": { useInsights: () => ({ data: sample("insights") }), useInsightVisuals: () => ({ data: sample("insight-visuals") }) },
  "@/hooks/useMiningReport": { useMiningReport: () => ({ data: sample("mining-report") }) },
  "@/hooks/useEda": { useEdaDistribution: () => ({ data: sample("eda-distribution-LIMIT_BAL") }), useEdaDefaultBy: () => ({ data: sample("eda-default-by-PAY_1") }), useEdaCorrelation: () => ({ data: sample("eda-correlation") }) },
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
          assert.ok(text.includes("permutation importance: mean holdout AUC drop over 5 shuffles"));
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
