# Issue #10 Performance Baseline

Issue: https://github.com/sabin1108/Photomap/issues/10
Recorded at: 2026-07-19 KST
Baseline commit: `bda6531 fix(demo): 보조 뷰와 상태 화면 정리`

## Artifact Locations

Performance evidence is stored outside the repository, following
[docs/performance/README.md](./README.md).

- Baseline note: `E:\memory\photomap\characteristic\2026-07-19-issue-10-baseline-record.md`
- Homepage URL Lighthouse raw: `E:\memory\photomap\lightHouse\issue-10-deploy-home.report.report.json`
- Latest production URL Lighthouse raw: `E:\memory\photomap\lightHouse\issue-10-deploy-current-home.report.report.json`
- Dev/performance React Profiler raw: `E:\memory\photomap\reactProfile\issue-10-dev-baseline-profile.json`
- Dev/performance frame budget raw: `E:\memory\photomap\characteristic\issue-10-dev-baseline-frame-budget.json`

## Result

- `https://photomap-beta.vercel.app` returned HTTP 404 during Lighthouse collection.
- The latest GitHub production deployment URL redirected to Vercel login instead of the Photomap app.
- Deployment Lighthouse values from this run are access-state evidence, not app performance evidence.
- Dev/performance React Profiler baseline exists: `PhotomapApp` 11 commits, max `actualDuration` 28.4ms, average `actualDuration` 9.45ms.
- No new README or portfolio performance claim should use the deployment Lighthouse values until a publicly accessible app URL is verified.

## Follow-up

#11 must first settle a verified public deployment URL. After that, Lighthouse should be measured again against the app itself.
