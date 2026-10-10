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
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sample = (name) => JSON.parse(readFileSync(resolve(root, `../.api-samples/${name}.json`), "utf8"));
let route = "/rules";
const cache = new Map();
const mocks = {
  "@/hooks/useFacts": { useFacts: (sources = {}) => load(resolve(root, "lib/facts.ts")).createFacts({ ...sources, catalogue: sample("facts") }) },
  "next/navigation": { usePathname: () => route },
  // Responsive PCA rendering needs a hydrated app. Quantiles have separate tests.
  "next/dynamic": () => () => null,
  "@/hooks/useRules": { useRules: (lift, category) => ({ data: sample("rules").filter((rule) => rule.lift >= lift && (!category || rule.category === category)) }) },
  "@/hooks/useOverview": { useOverview: () => ({ data: sample("overview") }) },
  "@/hooks/useClusters": { useClusters: () => ({ data: sample("clusters") }), useClusterCustomers: () => ({}) },
  "@/hooks/useSequences": { useSequences: () => ({ data: sample("sequences") }) },
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

test("sample-backed static layouts fit 400/1440px; native evidence disclosures work without servers", async (t) => {
  const postcss = require("postcss");
  const tailwind = require("tailwindcss");
  const cssFile = resolve(root, "app/globals.css");
  const { css } = await postcss([tailwind({ config: resolve(root, "../tailwind.config.ts") })]).process(readFileSync(cssFile, "utf8"), { from: cssFile });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route("**/*", (request) => request.abort());
    for (const name of ["rules", "clusters", "sequences"]) {
      route = `/${name}`;
      const Component = load(resolve(root, `app/${name}/page.tsx`)).default;
      const markup = renderToStaticMarkup(React.createElement(Component));
      for (const width of [400, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body><div class="min-w-0 md:pl-64">${markup}</div></body></html>`);
        const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
        assert.ok(dimensions.content <= width, `${name} at ${width}: document width ${dimensions.content}`);
        assert.equal(await page.locator("h1").count(), 1, `${name} has only the topbar H1`);
        if (name === "rules") {
          await page.getByRole("button", { name: "Metrics", exact: true }).click();
          assert.equal(await page.locator("[popover]").evaluate((element) => element.matches(":popover-open")), true);
          const rect = await page.locator("[popover]").boundingBox();
          assert.ok(rect.width <= width && rect.x >= 0 && rect.x + rect.width <= width, "glossary fits viewport");
          await page.keyboard.press("Escape");
          assert.equal(await page.locator("[popover]").evaluate((element) => element.matches(":popover-open")), false);
          const similar = page.locator("summary").filter({ hasText: /^\+/ }).first();
          if (await similar.count()) {
            await similar.click();
            assert.equal(await similar.evaluate((element) => element.parentElement.open), true);
          }
          if (width === 1440) {
            const labels = page.locator("button.block.max-w-full");
            for (const label of await labels.all()) assert.equal(await label.evaluate((element) => element.scrollWidth <= element.clientWidth), true, "desktop family label fits");
          }
        }
        if (name === "sequences") {
          const story = sample("sequences").stories.defaultStories[0];
          assert.ok((await page.locator("body").innerText()).includes(`${story.displayText}: ${(story.supportDefault * 100).toFixed(1)}% of defaulters`));
          const summary = page.locator("summary", { hasText: "How items are coded" });
          assert.equal(await summary.evaluate((element) => element.parentElement.open), false);
          await summary.click();
          assert.equal(await summary.evaluate((element) => element.parentElement.open), true);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        }
        t.diagnostic(`${name}: ${width}px fits; sample content rendered`);
      }
    }
  } finally {
    await browser.close();
  }
});
