import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
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
const baseUrl = args.get("url") ?? "http://127.0.0.1:4173/";
const date = args.get("date") ?? new Date().toISOString().slice(0, 10);
const rootDir = path.resolve(process.cwd(), "..");
const performanceDir = path.join(rootDir, "docs", "performance");
const artifactsDir = path.join(performanceDir, "artifacts");
const fileName = `${date}-issue-${issue}.md`;
const filePath = path.join(performanceDir, fileName);

mkdirSync(artifactsDir, { recursive: true });

const commit = (() => {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: rootDir, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
})();

if (existsSync(filePath)) {
  console.error(`Performance record already exists: ${filePath}`);
  process.exit(1);
}

const content = `# Performance Record - Issue #${issue}

Date: ${date}
Commit: ${commit}
Target: ${baseUrl}
Mode: local production preview with \`VITE_ENABLE_PROFILER=true\`

## Lighthouse

| View | URL | Performance | Accessibility | Best Practices | SEO | Artifact |
|---|---|---:|---:|---:|---:|---|
| Home | ${baseUrl} | TBD | TBD | TBD | TBD | \`docs/performance/artifacts/issue-${issue}-home.*\` |

## React Profiler

Use performance preview, run the target flow, then export in browser console:

\`\`\`js
copy(JSON.stringify(window.__PHOTOMAP_EXPORT_PROFILER__(), null, 2))
\`\`\`

| Flow | Component/View | Commits | Max actualDuration | Avg actualDuration | Max baseDuration | Avg baseDuration | Notes |
|---|---|---:|---:|---:|---:|---:|---|
| Initial render | PhotomapApp | TBD | TBD | TBD | TBD | TBD | |

## Commands

\`\`\`powershell
cd Frontend
npm run build:perf
npm run preview:perf
npm run perf:lighthouse -- --issue ${issue} --view home --url ${baseUrl}
\`\`\`

## Notes

- Build:
- Lighthouse warnings:
- Profiler flow notes:
- Known limitations:
`;

writeFileSync(filePath, content, "utf8");
console.log(filePath);