# Performance Records

Photomap performance evidence lives outside the repo under `E:\memory\photomap`.

## Storage Layout

- Lighthouse raw reports: `E:\memory\photomap\lightHouse`
- React Profiler raw JSON: `E:\memory\photomap\reactProfile`
- Human-readable performance characteristics: `E:\memory\photomap\characteristic`
- Chat/work log: `E:\memory\photomap\chat`

## One Issue Flow

```powershell
cd Frontend
npm run perf:init -- --issue 5 --url http://127.0.0.1:4173/
npm run build:perf
npm run preview:perf
npm run perf:lighthouse -- --issue 5 --view home --url http://127.0.0.1:4173/
```

React Profiler is enabled only in `performance` mode. Normal `npm run build` does not collect profiler data.

## React Profiler Export

Run the target flow in performance preview, then browser console:

```js
copy(JSON.stringify(window.__PHOTOMAP_EXPORT_PROFILER__(), null, 2))
```

Save the copied JSON to:

```text
E:\memory\photomap\reactProfile\issue-5-profile.json
```

Then generate a summary:

```powershell
npm run perf:summary -- --issue 5
```

요약은 `E:\memory\photomap\characteristic`에 저장한다. 이 폴더의 최종 정리 문서는 사용자가 학습할 수 있도록 반드시 한글로 작성한다.

## Handoff Rule

모든 handoff는 이 폴더들을 언급하고, 다음 에이전트에게 이슈 완료마다 Lighthouse, React Profiler, characteristic 한글 요약을 기록하라고 알려야 한다.