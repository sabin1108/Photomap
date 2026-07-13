import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith("--")) continue;
  const key = arg.slice(2);
  const next = process.argv[i + 1];
  if (!next || next.startsWith("--")) {
    args.set(key, "true");
  } else {
    args.set(key, next);
    i += 1;
  }
}

const issue = args.get("issue") ?? "manual";
const view = args.get("view") ?? "home";
const url = args.get("url") ?? "http://127.0.0.1:4173/";
const memoryRoot = args.get("memory-root") ?? "E:\\memory\\photomap";
const lighthouseDir = path.join(memoryRoot, "lightHouse");
const outputPath = path.join(lighthouseDir, `issue-${issue}-${view}.report`);

mkdirSync(lighthouseDir, { recursive: true });

const result = spawnSync(
  "npx",
  [
    "lighthouse",
    url,
    "--output=html",
    "--output=json",
    `--output-path=${outputPath}`,
    "--chrome-flags=--headless --no-sandbox",
  ],
  { stdio: "inherit", shell: process.platform === "win32" },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Lighthouse artifacts written near: ${outputPath}`);