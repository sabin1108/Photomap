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

## Public Vercel Baseline

Use `https://photomap-three.vercel.app/` for deployed-app Lighthouse comparisons after an issue is completed.

Current baseline, measured on 2026-07-21 from three Lighthouse runs:

- Raw reports:
  - `E:\memory\photomap\lightHouse\issue-vercel-baseline-2026-07-21-run1-home.report.report.json`
  - `E:\memory\photomap\lightHouse\issue-vercel-baseline-2026-07-21-run2-home.report.report.json`
  - `E:\memory\photomap\lightHouse\issue-vercel-baseline-2026-07-21-run3-home.report.report.json`
- Median Performance: 86
- Median FCP: 1447 ms
- Median LCP: 3860 ms
- Median TBT: 137 ms
- Median CLS: 0.005175
- Median Speed Index: 3032 ms
- Median TTI: 4076 ms
- Median total byte weight: 360 KiB

After each issue lands on Vercel, run Lighthouse against the public URL at least three times and compare the median against this baseline. Report score deltas in points, and timing/payload deltas as percentages:

```powershell
cd Frontend
npm run perf:lighthouse -- --issue <issue>-vercel-run1 --view home --url https://photomap-three.vercel.app/
npm run perf:lighthouse -- --issue <issue>-vercel-run2 --view home --url https://photomap-three.vercel.app/
npm run perf:lighthouse -- --issue <issue>-vercel-run3 --view home --url https://photomap-three.vercel.app/
```

Use this formula for metrics where lower is better, such as LCP, TBT, Speed Index, TTI, and bytes:

```text
improvement_percent = (baseline_median - new_median) / baseline_median * 100
```

Use this formula for Lighthouse Performance score:

```text
score_delta_points = new_median - baseline_median
```

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

## Frame Budget Export

Run a WebGL/canvas flow in performance preview, leave the target view, then browser console:

```js
copy(JSON.stringify(window.__PHOTOMAP_EXPORT_FRAME_BUDGET__(), null, 2))
```

Save the copied JSON or paste the summary into the issue characteristic note under `E:\memory\photomap\characteristic`.

## Handoff Rule

모든 handoff는 이 폴더들을 언급하고, 다음 에이전트에게 이슈 완료마다 Lighthouse, React Profiler, characteristic 한글 요약을 기록하라고 알려야 한다.

## Required Component Change Flow

When a component function, render path, route loading behavior, iframe/WebGL lifecycle, image delivery path, or store selector changes, run before/after performance evidence in the same environment.

Minimum flow:

```powershell
cd Frontend
npm run build:perf
npm run preview:perf
npm run perf:lighthouse -- --issue <issue>-before --view home --url http://127.0.0.1:4173/
# make the code change
npm run build:perf
npm run perf:lighthouse -- --issue <issue>-after --view home --url http://127.0.0.1:4173/
npm run perf:analyze -- --label issue-<issue> --before E:\memory\photomap\lightHouse\issue-<issue>-before-home.report.report.json --after E:\memory\photomap\lightHouse\issue-<issue>-after-home.report.report.json
```

The analysis note must explain the direction of change and the likely reason, even when the score gets worse or stays flat. For UI-only changes that do not affect the home route, still run `npm run build:perf` and record why Lighthouse is not representative.

## Globe Frame Budget Toggles

`GlobeView` supports measurement and quality/performance tuning through Vite environment variables:

```text
VITE_GLOBE_DEVICE_PIXEL_RATIO=1.5
VITE_GLOBE_MAP_SAMPLES=8000
VITE_GLOBE_MARKER_LIMIT=120
VITE_GLOBE_MARKER_SIZE=0.045
```

Bounds are enforced in code:

- `VITE_GLOBE_DEVICE_PIXEL_RATIO`: 1 to 2
- `VITE_GLOBE_MAP_SAMPLES`: 4000 to 12000
- `VITE_GLOBE_MARKER_LIMIT`: 20 to 300
- `VITE_GLOBE_MARKER_SIZE`: 0.02 to 0.08

For #13, keep viewport, server mode, and capture duration the same when comparing frame budget JSON.
