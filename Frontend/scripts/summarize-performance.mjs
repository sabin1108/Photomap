import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
const date = args.get("date") ?? new Date().toISOString().slice(0, 10);
const memoryRoot = args.get("memory-root") ?? "E:\\memory\\photomap";
const lighthousePath = args.get("lighthouse") ?? path.join(memoryRoot, "lightHouse", `issue-${issue}-${view}.report.json`);
const profilePath = args.get("profile") ?? path.join(memoryRoot, "reactProfile", `issue-${issue}-profile.json`);
const characteristicDir = path.join(memoryRoot, "characteristic");
const outputPath = args.get("output") ?? path.join(characteristicDir, `${date}-issue-${issue}-summary.md`);

mkdirSync(characteristicDir, { recursive: true });

const readJson = (filePath) => existsSync(filePath) ? JSON.parse(readFileSync(filePath, "utf8")) : null;
const score = (category) => category?.score == null ? "N/A" : Math.round(category.score * 100);
const auditMs = (lhr, key) => {
  const value = lhr?.audits?.[key]?.numericValue;
  return typeof value === "number" ? `${Math.round(value)}ms` : "N/A";
};
const auditRaw = (lhr, key) => {
  const value = lhr?.audits?.[key]?.numericValue;
  return typeof value === "number" ? Math.round(value * 1000) / 1000 : "N/A";
};

const lhr = readJson(lighthousePath);
const profile = readJson(profilePath);
const profilerSummary = profile?.summary ?? {};

const profilerRows = Object.entries(profilerSummary).map(([name, item]) => (
  `| ${name} | ${item.commits ?? "N/A"} | ${item.maxActualDuration ?? "N/A"}ms | ${item.avgActualDuration ?? "N/A"}ms | ${item.maxBaseDuration ?? "N/A"}ms | ${item.avgBaseDuration ?? "N/A"}ms | |`
));

const content = `# Photomap Performance Summary - Issue #${issue}

Date: ${date}

## Raw Inputs

- Lighthouse: \`${lighthousePath}\` ${lhr ? "" : "(missing)"}
- React Profiler: \`${profilePath}\` ${profile ? "" : "(missing)"}

## Lighthouse

| View | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|
| ${view} | ${score(lhr?.categories?.performance)} | ${score(lhr?.categories?.accessibility)} | ${score(lhr?.categories?.["best-practices"])} | ${score(lhr?.categories?.seo)} | ${auditMs(lhr, "largest-contentful-paint")} | ${auditRaw(lhr, "cumulative-layout-shift")} | ${auditMs(lhr, "total-blocking-time")} |

## React Profiler

| Component/View | Commits | Max actualDuration | Avg actualDuration | Max baseDuration | Avg baseDuration | Notes |
|---|---:|---:|---:|---:|---:|---|
${profilerRows.length ? profilerRows.join("\n") : "| N/A | N/A | N/A | N/A | N/A | N/A | profiler JSON missing |"}

## How Performance Changed

- Baseline comparison: add previous issue summary or prior raw records when available.
- Improved:
- Regressed:
- Evidence:
`;

writeFileSync(outputPath, content, "utf8");
console.log(outputPath);