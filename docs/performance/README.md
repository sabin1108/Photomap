# Performance Records

이 폴더는 이슈별 Lighthouse 결과와 React Profiler 요약을 남기는 곳이다.

## One Issue Flow

```powershell
cd Frontend
npm run perf:init -- --issue 5 --url http://127.0.0.1:4173/
npm run build:perf
npm run preview:perf
npm run perf:lighthouse -- --issue 5 --view home --url http://127.0.0.1:4173/
```

React Profiler는 `build:perf` 또는 `preview:perf`처럼 `performance` mode에서만 켜진다.
일반 `npm run build`에는 기록 장치가 비활성 상태로 남는다.

## React Profiler Export

성능 preview에서 측정할 flow를 직접 실행한 뒤 브라우저 console에서 실행한다.

```js
copy(JSON.stringify(window.__PHOTOMAP_EXPORT_PROFILER__(), null, 2))
```

필요하면 측정 전 초기화한다.

```js
window.__PHOTOMAP_RESET_PROFILER__()
```

요약값을 이슈별 markdown 파일의 `React Profiler` 표에 옮긴다.
원본 JSON이 필요하면 `docs/performance/artifacts/`에 저장한다. artifacts 폴더는 큰 파일 방지를 위해 기본 ignore된다.

## What To Commit

Commit by default:

- `docs/performance/YYYY-MM-DD-issue-N.md`
- script/config changes

Do not commit by default:

- `docs/performance/artifacts/*.html`
- `docs/performance/artifacts/*.json`

Artifacts can be force-added only when a reviewer explicitly needs raw evidence.