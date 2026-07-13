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

const content = `# Photomap 성능 요약 - Issue #${issue}

측정일: ${date}

## 원본 입력

- Lighthouse: \`${lighthousePath}\` ${lhr ? "" : "(파일 없음)"}
- React Profiler: \`${profilePath}\` ${profile ? "" : "(파일 없음)"}

## Lighthouse

| 화면 | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|
| ${view} | ${score(lhr?.categories?.performance)} | ${score(lhr?.categories?.accessibility)} | ${score(lhr?.categories?.["best-practices"])} | ${score(lhr?.categories?.seo)} | ${auditMs(lhr, "largest-contentful-paint")} | ${auditRaw(lhr, "cumulative-layout-shift")} | ${auditMs(lhr, "total-blocking-time")} |

## React Profiler

| 컴포넌트/뷰 | Commit 수 | 최대 actualDuration | 평균 actualDuration | 최대 baseDuration | 평균 baseDuration | 메모 |
|---|---:|---:|---:|---:|---:|---|
${profilerRows.length ? profilerRows.join("\n") : "| 기록 없음 | N/A | N/A | N/A | N/A | N/A | profiler JSON이 없거나 entry가 없음 |"}

## 성능 변화 해석

- 이전 기준선: 비교할 이전 raw 기록을 적는다.
- 이번 결과: 이번 Lighthouse/Profiler 수치를 적는다.
- 좋아진 점: 이전보다 개선된 지표만 적는다.
- 나빠진 점: 이전보다 악화된 지표만 적는다.
- 근거: raw 파일 경로와 숫자를 함께 적는다.

## 학습 메모

성능 분석은 점수 하나로 끝내면 안 된다. Lighthouse는 사용자 체감 로딩과 브라우저 작업량을 보는 도구이고, React Profiler는 React 렌더링 비용을 보는 도구다. 두 기록을 같이 봐야 네트워크 병목인지, JavaScript 실행 병목인지, React 렌더링 병목인지 구분할 수 있다.
`;

writeFileSync(outputPath, content, "utf8");
console.log(outputPath);