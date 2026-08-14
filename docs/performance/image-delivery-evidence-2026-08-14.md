# 이미지 전달 최적화 반복 측정 증거

- 측정일: 2026-08-14 KST
- 측정 코드: `3f0beac58f20cc55f5314d3b746930855735a586`
- 브랜치: `perf/image-evidence-100`
- 대상: Vercel Preview `photomap-kyksltxjd-sabins-projects-011c6dea.vercel.app`
- raw evidence: [optimized 100회](./results/image-final-optimized-100.json), [baseline 30회](./results/image-final-baseline-30.json)

## 결론

통제된 mobile-mid 4G 합성 환경에서 최적화 버전을 100회 콜드 실행했다. 첫 사진 완료 p95는 **2.615초**, 최대값은 **2.679초**, LCP p75는 **2.500초**였다. 첫 사진과 모달 이미지 성공률은 모두 **100%**였고, 1,300개 request에서 request failure, HTTP 오류, console 오류는 모두 0건이었다.

같은 commit, Vercel Preview, physical runner, browser profile에서 522KB JPEG baseline을 30회 측정했다. 최적화 버전은 baseline 대비 첫 사진 p95를 **85.1%**, LCP p75를 **85.6%**, cold run당 관측 전송량을 **89.5%** 줄였다.

이 결과는 synthetic lab evidence다. 실제 사용자 RUM이나 Vercel Speed Insights의 field percentile로 표현하면 안 된다.

## 이력서에 사용할 수 있는 문장

> 통제된 mobile-mid 4G 환경에서 이미지 최적화 버전을 100회 콜드 실행한 결과, 첫 사진 완료 p95 2.615초, 최대 2.679초, LCP p75 2.500초, 이미지 로딩 성공률 100%를 기록했습니다.

비교 근거까지 포함하려면 다음 문장을 쓸 수 있다.

> 동일 Vercel Preview에서 522KB JPEG baseline 30회와 WebP 파생본 최적화 버전 100회를 비교해 첫 사진 p95를 85.1%, LCP p75를 85.6%, run당 관측 전송량을 89.5% 줄였습니다.

표본 수가 baseline 30회, optimized 100회로 다르다는 점은 면접이나 상세 문서에서 밝혀야 한다.

## 최종 결과

| 지표 | Baseline cold 30 | Optimized cold 100 | 변화 |
| --- | ---: | ---: | ---: |
| 첫 사진 p50 | 17.366초 | 2.506초 | -85.6% |
| 첫 사진 p75 | 17.454초 | 2.552초 | -85.4% |
| 첫 사진 p95 | 17.552초 | 2.615초 | **-85.1%** |
| 첫 사진 max | 17.609초 | 2.679초 | **-84.8%** |
| LCP p75 | 17.392초 | 2.500초 | **-85.6%** |
| LCP p95 | 17.544초 | 2.568초 | -85.4% |
| FCP p75 | 1.360초 | 1.300초 | -4.4% |
| TTFB p75 | 0.114초 | 0.110초 | -3.5% |
| 모달 shell p95 | 0.161초 | 0.133초 | -17.3% |
| 모달 첫 이미지 p95 | 0.206초 | 0.165초 | -19.8% |
| cold run당 request | 15 | 13 | -13.3% |
| cold run당 관측 전송량 | 3,200,451B | 335,423B | **-89.5%** |
| 첫 사진 성공률 | 30/30 | 100/100 | 둘 다 100% |
| 모달 이미지 성공률 | 30/30 | 100/100 | 둘 다 100% |
| request failure | 0 | 0 | 변화 없음 |
| HTTP 오류 | 0 | 0 | 변화 없음 |
| console 오류 | 0 | 0 | 변화 없음 |
| CLS p75 | 0 | 0 | 변화 없음 |

warm context는 mode별 warmup 5회 뒤 10회 측정했다. optimized 모달 첫 이미지 p95는 68.1ms, baseline은 116.3ms였다. 핵심 주장은 browser cache를 공유하지 않는 cold 결과로 제한한다.

모달 지표는 thumbnail을 즉시 보여주는 첫 시각 피드백까지의 시간이다. 고해상도 display WebP가 비동기로 완전히 교체되는 시간과 같지 않다.

## 가상 측정 환경

| 항목 | 값 |
| --- | --- |
| viewport | 390 × 844 |
| device scale factor | 2 |
| mobile / touch | true / true |
| CPU slowdown | 4배 |
| network latency | 150ms |
| download | 1.6Mbps |
| upload | 0.75Mbps |
| connection type | cellular4g |
| browser | Headless Chrome 151.0.7922.138 |
| Playwright | 1.62.0 |
| Node.js | v24.16.0 |
| OS | Windows_NT 10.0.26200 x64 |
| concurrency | 1 |
| runner | 단일 physical runner, 정확한 지리 위치는 독립 검증하지 않음 |

Chrome DevTools Protocol의 `Network.emulateNetworkConditions`와 `Emulation.setCPUThrottlingRate`를 사용했다. 이름은 mobile-mid 4G지만 실제 이동통신망이 아니라 browser emulation이다.

optimized는 2026-08-14 22:28:09~22:33:09 KST에 299.7초 동안 실행했다. baseline은 22:33:21~22:42:37 KST에 555.9초 동안 실행했다.

## 표본 생성 방식

1. Vercel Preview에 `?perfImageMode=optimized` 또는 `?perfImageMode=baseline`을 명시한다.
2. preflight에서 HTTPS Vercel hostname, app `<main>`, Production Supabase ref 미접속을 확인한다.
3. cold run마다 새 Chromium browser context를 만든다. browser process는 mode 실행 동안 공유한다.
4. network와 CPU 조건을 적용한 뒤 `domcontentloaded`까지 navigation한다.
5. 첫 fixture 이미지의 `complete`와 `naturalWidth > 0`을 확인한다.
6. 이미지 완료 뒤 100ms settle하고 Performance Timeline의 마지막 LCP entry를 읽는다.
7. 첫 사진을 눌러 모달 shell과 첫 visible image 완료를 측정한다.
8. 실패가 발생해도 sample 배열에 남기고 전체 실행 수를 성공률 분모로 사용한다.
9. CDP `encodedDataLength`, request failure, HTTP 4xx/5xx, console error를 run별로 저장한다.
10. p50, p75, p95, p99, max, mean을 nearest-rank 방식으로 집계한다.

fresh context는 cookie, session, browser HTTP cache를 분리한다. Vercel edge cache, DNS, OS cache까지 cold로 만들지는 않는다.

## baseline과 optimized 차이

모든 UI 코드, commit, deployment, device profile은 같다. query parameter가 image fixture variant만 바꾼다.

| Variant | 파일 | 1개 크기 | 용도 |
| --- | --- | ---: | --- |
| baseline | `travel-baseline.jpg` | 522,002B | grid와 detail에 같은 JPEG 사용 |
| optimized thumbnail | `travel-thumb.webp` | 30,496B | grid와 즉시 모달 preview |
| optimized display | `travel-display.webp` | 260,958B | detail 고해상도 비동기 교체 |
| source | `travel-source.png` | 2,941,774B | 파생본 생성 원본, browser 전달 대상 아님 |

baseline JPEG 대비 thumbnail은 파일 하나 기준 94.2%, display WebP는 50.0% 작다. 전체 run 전송량은 JS/CSS/font와 request header도 포함하므로 파일 크기 비율과 정확히 같지 않다.

## 적용한 최적화

- 업로드 시 thumbnail 480px WebP quality 0.72와 display 1600px WebP quality 0.80을 물리 파일로 생성한다.
- grid, cover, timeline, relation, favorite 화면은 thumbnail URL을 사용한다.
- 첫 LCP 후보 하나만 `fetchPriority="high"`를 주고 나머지는 auto 또는 lazy로 둔다.
- 모달은 이미 받은 thumbnail을 즉시 보여주고 display WebP를 비동기로 교체한다.
- 유료 Supabase Image Transformations에 의존하지 않는다. legacy transform URL은 public object URL로 복구한다.
- immutable derivative path와 긴 cache control을 사용한다.
- benchmark mode는 고정 synthetic fixture만 쓰고 Supabase와 `VITE_DEMO_USER_ID`에 의존하지 않는다.
- HTML에 고정돼 있던 Production Supabase preload를 제거해 측정과 공개 demo의 403/ORB 오염을 없앴다.

## 측정 중 발견하고 제외한 결과

최종 결과 전에 다음 실패 또는 불완전한 실행을 발견했다. 최종 raw evidence에 합치지 않았다.

1. 과거 Preview는 Production Supabase의 category, media, favorites REST를 호출했다. staging 안전 정책이 100회 실행을 차단했다.
2. Production alias에서는 hostname 조건 때문에 `perfImageMode=optimized`가 활성화되지 않았다. 1회 smoke의 첫 사진 63.044초는 최종 결과에서 제외했다.
3. 새 Preview는 Authentication 화면이 아니라 `VITE_DEMO_USER_ID` 누락 화면을 보였다. performance fixture를 env와 DB에서 격리해 해결했다.
4. 첫 100/30 실행에서 일부 LCP observer callback이 늦어 FCP 값이 섞였다. 직접 Performance Timeline을 읽고 100ms settle한 뒤 두 mode를 전부 다시 실행했다.

이 과정은 좋은 값만 고른 것이 아니다. 잘못된 실험 조건을 식별해 폐기하고, 수정된 동일 조건에서 전체 표본을 다시 생성했다.

## AI 활용 내역

AI는 다음 작업을 수행했다.

- 기존 handoff, 성능 문서, runner, image delivery 코드를 읽어 측정 범위와 안전 경계를 복원했다.
- Production Supabase 접속, Preview config 누락, performance hostname 조건을 각각 분리 진단했다.
- runner에 LCP, 실제 CDP 전송량, request failure, HTTP 오류, console 오류, 실패 분모, Git/Node/Chrome/OS 메타를 추가했다.
- performance fixture를 env와 DB에서 격리하고 반복 가능한 Preview를 만들었다.
- observer race를 raw 분포에서 발견하고 runner를 수정한 뒤 전체 측정을 다시 실행했다.
- raw JSON에서 percentile과 개선율을 계산하고 이 문서를 구성했다.

AI가 성능 숫자를 생성하거나 보정하지 않았다. 모든 최종 숫자는 Playwright가 실제 Vercel Preview를 실행해 만든 raw JSON에서 계산했다. Vercel Authentication과 deployment 설정은 사용자가 통제했다. 실제 사용자 사진, Production DB row, secret key는 사용하지 않았다.

## Raw evidence 무결성

- optimized SHA-256: `E6DA5CF3D6ED8BE8F90BB78FB3596D709B49C73E60DD0A628A0C5E21BFADA088`
- baseline SHA-256: `1FF8CDFC789856B632A92ED51A5597E0A103C8907F301201F0BE45FB6A914D32`
- 두 파일의 `environment.gitCommit`: `3f0beac58f20cc55f5314d3b746930855735a586`
- 두 파일의 preflight `observedSupabaseHosts`: 빈 배열

`environment.gitDirty`가 true인 이유는 측정 시 생성 중이던 raw JSON이 untracked 상태였기 때문이다. runner와 tracked application source는 위 commit과 일치했다.

## 재실행 명령

Frontend에서 실행한다.

```powershell
$env:PHOTOMAP_BASE_URL='https://DEPLOYMENT.vercel.app/?perfImageMode=optimized'
$env:PHOTOMAP_COLD_MODAL_RUNS='100'
$env:PHOTOMAP_WARM_MODAL_RUNS='10'
$env:PHOTOMAP_MODAL_WARMUPS='5'
$env:PHOTOMAP_MODAL_OUTPUT='E:\\memory\\photomap\\characteristic\\image-final-optimized-100.json'
$env:VIRTUAL_TRAFFIC_CONFIRM='staging-only'
$env:VIRTUAL_TRAFFIC_STAGING_HOST='DEPLOYMENT.vercel.app'
node tests/performance/vercel-modal-usability.mjs
```

baseline은 URL의 mode를 `baseline`, cold run을 `30`, output 이름을 `image-final-baseline-30.json`으로 바꾼다.

## 한계와 다음 검증

- synthetic lab 측정이다. 실제 사용자 device·지역·network 분포를 대표하지 않는다.
- 단일 physical runner다. runner 지리 위치는 독립 검증하지 않았다.
- optimized와 baseline을 순차 실행해 시간에 따른 Vercel edge 상태 차이가 남을 수 있다.
- 표본 수가 optimized 100, baseline 30으로 다르다.
- fresh browser context여도 Vercel CDN edge cache와 OS/DNS cache는 공유될 수 있다.
- CDP `encodedDataLength`는 response header를 포함하고 browser cache read는 제외한다.
- LCP는 lab timeline 값이다. field LCP와 동일한 통계가 아니다.
- concurrency 1은 사용자 latency와 반복성을 측정한다. server saturation이나 수용량 근거가 아니다.
- 장기 결론은 Vercel Speed Insights 또는 별도 RUM에서 최소 7~14일간 LCP/INP p75를 확인해야 한다.
- 고해상도 display WebP 완전 교체 시간은 별도 metric으로 추가할 수 있다.

## 검증

- `npx tsc -b`: 통과
- `node --test tests/image-delivery.test.mjs tests/performance/virtual-traffic-policy.test.mjs`: 8/8 통과
- `npm run build`: 통과
- optimized cold: 100/100 성공
- baseline cold: 30/30 성공
- final request failure / HTTP error / console error: 0 / 0 / 0
