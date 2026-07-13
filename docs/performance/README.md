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

That summary is written to `E:\memory\photomap\characteristic`.

## Handoff Rule

Every handoff must mention these folders and tell the next agent to record Lighthouse, React Profiler, and characteristic summary after each completed issue.