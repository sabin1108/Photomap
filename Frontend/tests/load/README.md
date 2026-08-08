# 사용자 1만 명 Supabase read 부하 테스트

초기 사진 탐색의 카테고리, 사진 50개, 즐겨찾기 조회를 한 session iteration으로
묶는다. iteration 하나는 Supabase API 요청 3개를 병렬 실행한다.

| profile | session iteration/s | 예상 API RPS | 기본 시간 |
| --- | ---: | ---: | ---: |
| `smoke` | 1 | 3 | 5분 |
| `normal` | 3 | 9 | 30분 |
| `peak` | 8 | 24 | 30분 |
| `spike` | 최대 20 | 최대 60 | 약 6분 |
| `soak` | 5 | 15 | 2시간 |

## 사전 조건

1. production과 분리된 Supabase staging을 준비한다.
2. staging에 production과 같은 schema, RLS, index, 유사한 row 분포를 넣는다.
3. `tests/load/.env.load.example`을 참고해 shell 환경변수를 설정한다.
4. `LOAD_TEST_CONFIRM=staging-only`를 직접 확인한다.
5. Grafana k6를 설치한다. repo는 k6 binary를 포함하지 않는다.

`LOAD_SUPABASE_ANON_KEY`에는 staging publishable/anon key만 사용한다. PhotoMap
production project ref와 `sb_secret_` key는 script가 거부한다.

## 실행

```powershell
npm run load:check
npm run test:load-contract
k6 run -e LOAD_PROFILE=smoke tests/load/supabase-read.js
k6 run -e LOAD_PROFILE=peak tests/load/supabase-read.js
k6 run -e LOAD_PROFILE=spike tests/load/supabase-read.js
k6 run -e LOAD_PROFILE=soak tests/load/supabase-read.js
```

짧은 harness 확인은 `LOAD_DURATION=30s`처럼 override한다. 실제 판정은 기본 시간으로
실행한다. 결과에는 p95, p99, error, 429, 5xx, dropped iterations, 받은 byte와
동일 시간 Supabase CPU, memory, connection, egress를 기록한다.

승인 없는 Vercel URL, production Supabase, 실제 Mapbox/Kakao endpoint에는 실행하지
않는다.

## localhost 정적 자산 부하

먼저 performance build와 preview를 실행한다.

```powershell
npm run build:perf
npm run preview:perf
```

다른 terminal에서 localhost만 대상으로 실행한다.

```powershell
npm run load:local -- --concurrency 10 --duration-seconds 15
npm run load:local -- --concurrency 50 --duration-seconds 15
npm run load:local -- --concurrency 100 --duration-seconds 15
npm run load:local -- --concurrency 200 --duration-seconds 15
```

`local-static-load.mjs`는 기본적으로 localhost 외 target을 거부한다. HTML에서 entry
asset을 찾고 root HTML, favicon, entry JS, entry CSS, Unity map HTML을 반복
요청한다. 이 결과는 local static server의 처리량과 latency만 나타내며 Vercel CDN,
Supabase DB capacity, browser rendering 성능을 대신하지 않는다.
