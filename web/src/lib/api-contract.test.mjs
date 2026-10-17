import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const calls = [];
const client = {
  interceptors: { response: { use() {} } },
  get(path, options) {
    calls.push({ path, params: options.params });
    const name = path === "/rules/families"
      ? `rules-families-${options.params.category.toLowerCase()}`
      : `eda-distribution-LIMIT_BAL${options.params.binning === "quantile" ? "-quantile" : ""}`;
    return Promise.resolve({ data: JSON.parse(readFileSync(resolve(root, `../.api-samples/${name}.json`), "utf8")) });
  },
};
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  new Function("module", "exports", "require", outputText)(loaded, loaded.exports, (id) => {
    if (id === "axios") return { create: () => client };
    if (id === "@tanstack/react-query") return { useQuery: (options) => options };
    return id.startsWith("@/") ? load(resolve(root, `${id.slice(2)}.ts`))
      : id.startsWith(".") ? load(resolve(dirname(file), `${id}.ts`)) : require(id);
  });
  cache.set(file, loaded.exports);
  return loaded.exports;
}
const { useEdaDistribution } = load(resolve(root, "hooks/useEda.ts"));
const rules = load(resolve(root, "hooks/useRules.ts"));

test("distribution binning reaches the API and separates cached responses", async () => {
  const quantile = useEdaDistribution("LIMIT_BAL", 10, "Default", "quantile");
  const equal = useEdaDistribution("LIMIT_BAL", 10, "Default", "equal-width");
  assert.notDeepEqual(quantile.queryKey, equal.queryKey);
  for (const [query, mode] of [[quantile, "quantile"], [equal, "equal-width"]]) {
    const result = await query.queryFn();
    assert.deepEqual(calls.at(-1), {
      path: "/eda/distribution", params: { col: "LIMIT_BAL", bins: 10, split: "Default", binning: mode },
    });
    assert.equal(result.binning, mode);
    assert.equal(result.binEdges.length, result.counts.length + 1);
  }
  assert.equal(useEdaDistribution(null, 10, "Default", "quantile").enabled, false);
});

test("family hook sends the API category spelling and preserves nullable bases", async () => {
  for (const category of ["default", "nonDefault"]) {
    const query = rules.useRuleFamilies(category);
    const result = await query.queryFn();
    assert.deepEqual(calls.at(-1), { path: "/rules/families", params: { category } });
    assert.ok(query.queryKey.includes(category));
    assert.equal(result.families.length, 10);
    if (category === "default") {
      const combinedOnly = result.families.find((family) => family.baseRule === null);
      assert.ok(combinedOnly);
      assert.ok(combinedOnly.modifiers.every((modifier) => modifier.upliftPp === null));
    }
  }
});
