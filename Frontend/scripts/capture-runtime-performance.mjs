import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire("E:/memory/photomap/tools/playwright/package.json");
const { chromium } = require("playwright");

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith("--")) continue;
  const key = arg.slice(2);
  const next = process.argv[i + 1];
  if (!next || next.startsWith("--")) args.set(key, "true");
  else { args.set(key, next); i += 1; }
}

const issue = args.get("issue") ?? "manual";
const phase = args.get("phase") ?? "current";
const url = args.get("url") ?? "http://127.0.0.1:4173/";
const memoryRoot = args.get("memory-root") ?? "E:\\memory\\photomap";
const reactProfileDir = path.join(memoryRoot, "reactProfile");
const characteristicDir = path.join(memoryRoot, "characteristic");
mkdirSync(reactProfileDir, { recursive: true });
mkdirSync(characteristicDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
await page.waitForTimeout(5_000);

const profiler = await page.evaluate(() => globalThis.__PHOTOMAP_EXPORT_PROFILER__?.() ?? null);

await page.evaluate(() => {
  const buttons = [...document.querySelectorAll("button")];
  const globeTarget = buttons.find((button) => /globe|전체|all/i.test(button.textContent ?? ""));
  globeTarget?.click();
});
await page.waitForTimeout(3_000);
await page.evaluate(() => {
  const buttons = [...document.querySelectorAll("button")];
  const timeline = buttons.find((button) => /timeline|타임라인/i.test(button.textContent ?? ""));
  timeline?.click();
});
await page.waitForTimeout(1_000);
const frameBudget = await page.evaluate(() => globalThis.__PHOTOMAP_EXPORT_FRAME_BUDGET__?.() ?? []);

await browser.close();

const profilePath = path.join(reactProfileDir, `issue-${issue}-${phase}-profile.json`);
const framePath = path.join(characteristicDir, `issue-${issue}-${phase}-frame-budget.json`);
writeFileSync(profilePath, JSON.stringify(profiler, null, 2));
writeFileSync(framePath, JSON.stringify(frameBudget, null, 2));
console.log(JSON.stringify({ profilePath, framePath }, null, 2));