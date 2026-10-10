import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [baseUrl, outputDirectory] = process.argv.slice(2);
if (!baseUrl || !outputDirectory || process.argv.length !== 4) {
  throw new Error('Usage: node scripts/render-report.mjs <baseUrl> <outDir>');
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'web/package.json'));
const { chromium } = require('@playwright/test');
const out = resolve(outputDirectory);
await mkdir(resolve(out, 'code/docs'), { recursive: true });

// Intent: export the actual report pages. Status: fail closed on page errors.
// Next: rerun after report changes. Blockers: local Chromium availability.
// Confidence: PDF text/page gates are enforced separately by the builder.
let browser;
try {
  try {
    browser = await chromium.launch();
  } catch (error) {
    console.error('PLAYWRIGHT_LAUNCH_FAILED');
    throw error;
  }
  for (const [route, filename] of [
    ['/report/paper', 'report.pdf'],
    ['/mining-report', 'code/docs/web-report.pdf'],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }, colorScheme: 'light',
    });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('response', response => {
        if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`);
      });
      const response = await page.goto(new URL(route, baseUrl).href, {
        waitUntil: 'networkidle', timeout: 120000,
      });
      if (!response?.ok()) throw new Error(`${route}: HTTP ${response?.status()}`);
      await page.waitForTimeout(3000);
      await page.emulateMedia({ media: 'print' });
      await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
      await page.waitForTimeout(800);
      if (errors.length) throw new Error(`${route}:\n${errors.join('\n')}`);
      const content = await page.locator('main').first().innerText();
      if (content.length < 1000 || /Failed to load report|Application error:/i.test(content)) {
        throw new Error(`${route}: report missing, incomplete, or showing an error`);
      }
      const path = resolve(out, filename);
      await page.pdf({ path, format: 'A4', printBackground: true, preferCSSPageSize: true });
      if (errors.length) throw new Error(`${route}:\n${errors.join('\n')}`);
      console.log(`Rendered ${route} -> ${path}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser?.close();
}
