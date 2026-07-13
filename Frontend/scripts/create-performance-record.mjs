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
const memoryRoot = args.get("memory-root") ?? "E:\\memory\\photomap";
const lighthouseDir = path.join(memoryRoot, "lightHouse");
const reactProfileDir = path.join(memoryRoot, "reactProfile");
const characteristicDir = path.join(memoryRoot, "characteristic");
const rootDir = path.resolve(process.cwd(), "..");
const fileName = `${date}-issue-${issue}.md`;
const filePath = path.join(characteristicDir, fileName);

mkdirSync(lighthouseDir, { recursive: true });
mkdirSync(reactProfileDir, { recursive: true });
mkdirSync(characteristicDir, { recursive: true });

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

const content = `# Photomap 성능 특성 기록 - Issue #${issue}

측정일: ${date}
커밋: ${commit}
대상: ${baseUrl}
측정 모드: \`VITE_ENABLE_PROFILER=true\`를 켠 local preview

## 원본 기록 위치

- Lighthouse JSON: \`${path.join(lighthouseDir, `issue-${issue}-home.report.json`)}\`
- Lighthouse HTML: \`${path.join(lighthouseDir, `issue-${issue}-home.report.html`)}\`
- React Profiler JSON: \`${path.join(reactProfileDir, `issue-${issue}-profile.json`)}\`

## Lighthouse 요약

| 화면 | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|
| Home | 기록 필요 | 기록 필요 | 기록 필요 | 기록 필요 | 기록 필요 | 기록 필요 | 기록 필요 |

## React Profiler 요약

| 흐름 | 컴포넌트/뷰 | Commit 수 | 최대 actualDuration | 평균 actualDuration | 최대 baseDuration | 평균 baseDuration | 메모 |
|---|---|---:|---:|---:|---:|---:|---|
| 초기 렌더 | PhotomapApp | 기록 필요 | 기록 필요 | 기록 필요 | 기록 필요 | 기록 필요 | |

## 성능 변화 해석

- 이전 기준선:
- 이번 결과:
- 좋아진 점:
- 나빠진 점:
- 근거:

## 실행 명령

\`\`\`powershell
cd Frontend
npm run build:perf
npm run preview:perf
npm run perf:lighthouse -- --issue ${issue} --view home --url ${baseUrl}
# 브라우저에서 React Profiler export 후 ${path.join(reactProfileDir, `issue-${issue}-profile.json`)}에 저장
npm run perf:summary -- --issue ${issue}
\`\`\`

## React Profiler export 방법

성능 preview에서 측정할 흐름을 실행한 뒤 브라우저 console에서 실행한다.

\`\`\`js
copy(JSON.stringify(window.__PHOTOMAP_EXPORT_PROFILER__(), null, 2))
\`\`\`

## 학습 메모

- Lighthouse 점수만 보지 말고 LCP, TBT, CLS, payload, main-thread work를 같이 본다.
- React Profiler는 어떤 컴포넌트가 몇 번 commit됐고 렌더 시간이 얼마인지 보는 용도다.
- 개선 여부는 이전 raw 기록과 같은 조건으로 비교해야 말할 수 있다.
`;

writeFileSync(filePath, content, "utf8");
console.log(filePath);