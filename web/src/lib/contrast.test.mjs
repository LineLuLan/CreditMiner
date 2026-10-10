import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwindcss from "tailwindcss";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const themes = Object.fromEntries(
  ["light", "dark"].map((theme) => {
    const selector = theme === "light" ? ":root" : "\\.dark";
    const block = css.match(new RegExp(`${selector}\\s*\\{([^}]+)\\}`))[1];
    return [
      theme,
      Object.fromEntries(
        [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
          name,
          value.trim(),
        ]),
      ),
    ];
  }),
);

function rgb(tokens, name) {
  const value = tokens[name];
  assert.ok(value, `Missing CSS token ${name}`);
  const reference = value.match(/^var\(--([\w-]+)\)(?:\s*\/\s*[\d.]+)?$/);
  if (reference) return rgb(tokens, reference[1]);
  const [h, sPercent, lPercent] = value.match(/[\d.]+/g).map(Number);
  const s = sPercent / 100;
  const l = lPercent / 100;
  const a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  });
}

function luminance(channels) {
  return channels
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(tokens, foreground, background, opacity = 1) {
  const bg = rgb(tokens, background);
  const fg = rgb(tokens, foreground).map((c, index) => c * opacity + bg[index] * (1 - opacity));
  const values = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("corrected theme values are read from the shipped CSS", () => {
  for (const [name, value] of Object.entries({
    border: "214 26% 84%",
    input: "214 26% 84%",
    secondary: "214 32% 92.5%",
    muted: "214 32% 92.5%",
    "muted-foreground": "215 19% 38%",
    accent: "192 60% 86%",
    danger: "0 72% 50%",
    "chart-neutral": "215 16% 57%",
  }))
    assert.equal(themes.light[name], value, `light ${name}`);
  assert.equal(themes.dark.danger, "0 84% 62%");
  assert.equal(themes.dark["chart-neutral"], "215 15% 40%");
  for (const tokens of Object.values(themes)) {
    assert.equal(tokens["chart-baseline"], "var(--foreground) / 0.6");
    assert.deepEqual(rgb(tokens, "chart-baseline"), rgb(tokens, "foreground"));
  }
});

for (const [theme, tokens] of Object.entries(themes)) {
  test(`${theme}: text >= 4.5 and semantic chart marks >= 3`, (t) => {
    for (const foreground of ["foreground", "muted-foreground"]) {
      for (const background of ["background", "card", "muted"]) {
        const ratio = contrast(tokens, foreground, background);
        t.diagnostic(`${foreground}/${background}: ${ratio.toFixed(2)}`);
        assert.ok(ratio >= 4.5, `${theme} ${foreground}/${background}: ${ratio}`);
      }
    }
    for (const [foreground, background] of [
      ["danger", "background"],
      ["danger-foreground", "danger"],
      ["accent-foreground", "accent"],
    ]) {
      const ratio = contrast(tokens, foreground, background);
      t.diagnostic(`${foreground}/${background}: ${ratio.toFixed(2)}`);
      assert.ok(ratio >= 4.5, `${theme} ${foreground}/${background}: ${ratio}`);
    }
    for (const foreground of ["danger", "success", "chart-neutral", "chart-baseline", "primary"]) {
      for (const background of ["background", "card"]) {
        const ratio = contrast(
          tokens,
          foreground,
          background,
          foreground === "chart-baseline" ? 0.6 : 1,
        );
        t.diagnostic(`${foreground}/${background}: ${ratio.toFixed(2)}`);
        assert.ok(ratio >= 3, `${theme} ${foreground}/${background}: ${ratio}`);
      }
    }
  });
}

test("rendered PCA marks and legend text preserve token contrast", () => {
  const pca = readFileSync(
    new URL("../components/features/PcaScatterCard.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(pca, /(?:fill|stroke)Opacity|opacity=/);
  assert.match(
    css,
    /\.recharts-legend-item-text\s*\{\s*color:\s*hsl\(var\(--foreground\)\) !important;/,
  );
});

test("legend text contrast survives the production Tailwind content scan", async () => {
  const result = await postcss([
    tailwindcss({ config: fileURLToPath(new URL("../../tailwind.config.ts", import.meta.url)) }),
  ]).process(css, { from: fileURLToPath(new URL("../app/globals.css", import.meta.url)) });
  assert.match(
    result.css,
    /\.recharts-legend-item-text\s*\{\s*color:\s*hsl\(var\(--foreground\)\) !important;/,
  );
});
