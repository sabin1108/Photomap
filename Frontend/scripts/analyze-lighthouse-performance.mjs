import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith("--")) continue;
  const key = arg.slice(2);
  const next = process.argv[i + 1];
  if (!next || next.startsWith("--")) args.set(key, "true");
  else { args.set(key, next); i += 1; }
}

const memoryRoot = args.get("memory-root") ?? "E:\\memory\\photomap";
const characteristicDir = path.join(memoryRoot, "characteristic");
const beforePath = args.get("before");
const afterPath = args.get("after");
const label = args.get("label") ?? "performance";
const outputPath = args.get("output") ?? path.join(characteristicDir, `${new Date().toISOString().slice(0, 10)}-${label}-lighthouse-analysis.md`);
mkdirSync(characteristicDir, { recursive: true });

if (!afterPath || !existsSync(afterPath)) {
  console.error("Missing --after Lighthouse JSON path");
  process.exit(1);
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const score = (lhr, key) => Math.round((lhr.categories[key]?.score ?? 0) * 100);
const ms = (lhr, key) => Math.round(lhr.audits[key]?.numericValue ?? 0);
const kib = (bytes) => Math.round((bytes ?? 0) / 1024);
const pctLowerBetter = (before, after) => before ? Math.round(((before - after) / before) * 1000) / 10 : null;
const pctHigherBetter = (before, after) => before ? Math.round(((after - before) / before) * 1000) / 10 : null;
const fmt = (value) => value == null ? "N/A" : `${value > 0 ? "+" : ""}${value}%`;

const metricSet = (lhr) => ({
  performance: score(lhr, "performance"),
  fcp: ms(lhr, "first-contentful-paint"),
  lcp: ms(lhr, "largest-contentful-paint"),
  tbt: ms(lhr, "total-blocking-time"),
  speedIndex: ms(lhr, "speed-index"),
  jsBootup: ms(lhr, "bootup-time"),
  mainThread: ms(lhr, "mainthread-work-breakdown"),
  payloadKiB: kib(lhr.audits["total-byte-weight"]?.numericValue),
});

const after = readJson(afterPath);
const before = beforePath && existsSync(beforePath) ? readJson(beforePath) : null;
const afterMetrics = metricSet(after);
const beforeMetrics = before ? metricSet(before) : null;
const failingAudits = Object.values(after.audits)
  .filter((audit) => audit.score !== null && audit.score !== undefined && audit.score < 1 && audit.scoreDisplayMode !== "notApplicable")
  .map((audit) => ({ id: audit.id, title: audit.title, score: audit.score, display: audit.displayValue ?? "" }))
  .sort((a, b) => a.score - b.score)
  .slice(0, 20);

const opportunityRows = Object.values(after.audits)
  .filter((audit) => audit.details?.type === "opportunity" || /Est savings/.test(audit.displayValue ?? ""))
  .map((audit) => `| ${audit.id} | ${audit.title} | ${audit.displayValue ?? ""} |`)
  .join("\n");

const comparisonRows = beforeMetrics ? [
  ["Performance", beforeMetrics.performance, afterMetrics.performance, fmt(pctHigherBetter(beforeMetrics.performance, afterMetrics.performance))],
  ["FCP", `${beforeMetrics.fcp}ms`, `${afterMetrics.fcp}ms`, fmt(pctLowerBetter(beforeMetrics.fcp, afterMetrics.fcp))],
  ["LCP", `${beforeMetrics.lcp}ms`, `${afterMetrics.lcp}ms`, fmt(pctLowerBetter(beforeMetrics.lcp, afterMetrics.lcp))],
  ["TBT", `${beforeMetrics.tbt}ms`, `${afterMetrics.tbt}ms`, fmt(pctLowerBetter(beforeMetrics.tbt, afterMetrics.tbt))],
  ["Speed Index", `${beforeMetrics.speedIndex}ms`, `${afterMetrics.speedIndex}ms`, fmt(pctLowerBetter(beforeMetrics.speedIndex, afterMetrics.speedIndex))],
  ["JS bootup", `${beforeMetrics.jsBootup}ms`, `${afterMetrics.jsBootup}ms`, fmt(pctLowerBetter(beforeMetrics.jsBootup, afterMetrics.jsBootup))],
  ["Main thread", `${beforeMetrics.mainThread}ms`, `${afterMetrics.mainThread}ms`, fmt(pctLowerBetter(beforeMetrics.mainThread, afterMetrics.mainThread))],
  ["Payload", `${beforeMetrics.payloadKiB}KiB`, `${afterMetrics.payloadKiB}KiB`, fmt(pctLowerBetter(beforeMetrics.payloadKiB, afterMetrics.payloadKiB))],
].map((row) => `| ${row.join(" | ")} |`).join("\n") : "| 기준선 없음 | N/A | N/A | N/A |";

const content = `# Lighthouse Performance 분석 - ${label}

## Raw

- Before: ${beforePath ? `\`${beforePath}\`` : "없음"}
- After: \`${afterPath}\`

## 전후 비교

| 지표 | Before | After | 변화 |
|---|---:|---:|---:|
${comparisonRows}

## 최우선 실패 audit

| Audit | Score | 표시값 |
|---|---:|---|
${failingAudits.map((audit) => `| ${audit.id} | ${Math.round(audit.score * 100)} | ${audit.display} |`).join("\n")}

## 절감 후보

| Audit | 제목 | 추정 절감 |
|---|---|---|
${opportunityRows || "| 없음 | N/A | N/A |"}

## 다음 액션 판단 기준

- LCP가 4초 이상이면 이미지 크기, LCP resource discovery, 데이터 fetch 지연부터 본다.
- TBT가 300ms 이상이면 initial JS, heavy component mount, main-thread work부터 본다.
- payload가 5MiB 이상이면 이미지 transform/CDN cache/thumbnail을 먼저 적용한다.
`;

writeFileSync(outputPath, content, "utf8");
console.log(outputPath);