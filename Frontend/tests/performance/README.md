# Vercel virtual traffic

Photomap browser traffic는 Vercel deployment만 대상으로 한다. 실제 사용자 RUM이
아니며, 고정된 사용자 분포와 network/CPU 조건을 재현하는 synthetic test다.

## Safety policy

- Production alias는 `production-pilot` 확인값이 필요하다.
- Production은 최대 20 session, concurrency 1, map traffic 비활성이다.
- Full traffic은 명시한 staging Vercel hostname에서만 허용한다.
- Staging preflight가 production Supabase ref를 발견하면 즉시 중단한다.
- Production Supabase capacity나 실제 사용자 규모를 이 결과로 주장하지 않는다.

Policy tests:

```powershell
node --test tests/performance/virtual-traffic-policy.test.mjs
```

## Production pilot

```powershell
$env:VIRTUAL_TRAFFIC_CONFIRM='production-pilot'
node tests/performance/vercel-virtual-traffic.mjs `
  --target https://photomap-three.vercel.app/ `
  --sessions 20 `
  --concurrency 1 `
  --seed 20260813 `
  --output E:\memory\photomap\characteristic\virtual-traffic-pilot.json
```

Production pilot는 home과 photo detail을 측정한다. map은 skip한다. 관계/앨범 mobile
navigation은 실제 menu open 동작을 포함하는 별도 runner로 확인한다.

```powershell
$env:VIRTUAL_TRAFFIC_CONFIRM='production-pilot'
node tests/performance/vercel-navigation-traffic.mjs `
  --target https://photomap-three.vercel.app/ `
  --sessions 20 `
  --concurrency 1 `
  --output E:\memory\photomap\characteristic\navigation-pilot.json
```

## Staging traffic

Vercel Preview가 staging Supabase에 연결된 뒤 실행한다.

```powershell
$env:VIRTUAL_TRAFFIC_CONFIRM='staging-only'
$env:VIRTUAL_TRAFFIC_STAGING_HOST='photomap-staging-example.vercel.app'
node tests/performance/vercel-virtual-traffic.mjs `
  --target https://photomap-staging-example.vercel.app/ `
  --sessions 1000 `
  --concurrency 20 `
  --seed 20260813 `
  --output E:\memory\photomap\characteristic\virtual-traffic-staging.json
```

실행 전 staging synthetic image, RLS fixture, test user, Supabase resource dashboard를
준비한다. 비용이 바뀌는 Vercel/Supabase plan이나 compute 변경은 별도 승인이 필요하다.

## Model

- device: mobile mid 45%, mobile low 25%, desktop 30%
- session: cold 60%, returning 40%
- actions: photo detail 65%, map 35%, relation 15%, album 10%
- think time: 500~1500ms
- mobile mid: CPU 4x, 150ms latency, 1.6Mbps down
- mobile low: CPU 6x, 300ms latency, 0.75Mbps down
- desktop: CPU 1x, 40ms latency, 10Mbps down

기본 output은 raw sample, p50/p75/p95/p99, action 성공률, FCP/LCP/INP/CLS/TTFB,
request failure, HTTP error, console error, 관측 byte를 포함한다.

## 이미지 전달 반복 측정

Production Supabase에 접속하지 않는 명시적 Vercel Preview에서만 100회 측정한다.
Vercel Authentication을 끄고 `perfImageMode` fixture가 보이는지 먼저 확인한다.

```powershell
$env:PHOTOMAP_BASE_URL='https://DEPLOYMENT.vercel.app/?perfImageMode=optimized'
$env:PHOTOMAP_COLD_MODAL_RUNS='100'
$env:PHOTOMAP_WARM_MODAL_RUNS='10'
$env:PHOTOMAP_MODAL_WARMUPS='5'
$env:PHOTOMAP_MODAL_OUTPUT='E:\memory\photomap\characteristic\image-final-optimized-100.json'
$env:VIRTUAL_TRAFFIC_CONFIRM='staging-only'
$env:VIRTUAL_TRAFFIC_STAGING_HOST='DEPLOYMENT.vercel.app'
node tests/performance/vercel-modal-usability.mjs
```

runner는 cold run마다 새 browser context를 만들고 concurrency 1로 실행한다.
실패 실행을 분모에 포함하며 LCP, 전송량, request failure, HTTP 오류, console 오류,
Git commit, Node, Chrome, OS를 JSON에 기록한다.

최종 근거: `docs/performance/image-delivery-evidence-2026-08-14.md`
