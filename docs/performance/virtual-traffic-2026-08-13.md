# Photomap Vercel 가상 사용자 성능 측정 — 2026-08-13

## 결론

사진 상세 shell 자체보다 원본 이미지 전달과 저사양 mobile tail이 핵심 병목이다.
Vercel production 20-session pilot에서 LCP p75는 `1544ms`, INP p75는 `176ms`였다.
하지만 photo detail image는 p50 `6.7s`, p95 `15.1s`였다. 사용자는 modal이 열린
뒤 큰 원본 사진을 오래 기다릴 수 있다.

이 결과는 실제 사용자 RUM이 아니다. 실제 사용자 분포를 가정해 동일 Vercel 환경에서
재현한 synthetic browser traffic baseline이다.

## 측정 환경

- target: `https://photomap-three.vercel.app/`
- deployment: Vercel Production
- date: 2026-08-13 KST
- runner region: 단일 물리 runner, network/CPU는 Chrome DevTools Protocol로 emulation
- browser: 설치된 Chrome headless, Playwright 제어
- production safety: 20 session, concurrency 1, map traffic disabled
- seed: `20260813`
- duration: `246.8s`
- session success: `20/20`

Production에는 부하 용량 시험을 하지 않았다. staging Vercel Preview가 없고 최신 GitHub
deployment도 Production이어서, full virtual traffic은 safety policy로 차단했다.

## 가상 사용자 모델

| Segment | 비율 | CPU | Latency | Download | Upload |
| --- | ---: | ---: | ---: | ---: | ---: |
| mobile mid 4G | 45% | 4x slowdown | 150ms | 1.6Mbps | 0.75Mbps |
| mobile low slow-4G | 25% | 6x slowdown | 300ms | 0.75Mbps | 0.35Mbps |
| desktop Wi-Fi | 30% | 1x | 40ms | 10Mbps | 5Mbps |

- cold session 60%, returning session 40%
- photo detail 65%, map 35%, relation 15%, album 10%
- think time 500~1500ms
- mobile viewport `390x844` 또는 `360x800`
- desktop viewport `1440x900`

실제 pilot의 random sampling 결과는 mobile mid 11, mobile low 6, desktop 3 session이었다.

## Golden Signals

### Latency

| Metric | p50 | p75 | p95 | p99 |
| --- | ---: | ---: | ---: | ---: |
| FCP | 1336ms | 1404ms | 2592ms | 2616ms |
| LCP | 1460ms | 1544ms | 2792ms | 2856ms |
| INP approximation | 120ms | 176ms | 216ms | 216ms |
| TTFB | 35ms | 104ms | 134ms | 137ms |
| primary image | 1577ms | 1675ms | 2924ms | 3005ms |
| photo detail shell | 195ms | 360ms | 813ms | 813ms |
| photo detail image | 6716ms | 14289ms | 15142ms | 15142ms |

INP는 Event Timing API를 synthetic interaction에 적용한 approximation이다. Chrome field
INP와 같은 사용자 모집단 지표로 주장하지 않는다.

### Traffic

- requests: `667`
- duration: `246.8s`
- 평균 browser request rate: 약 `2.70 request/s`
- Content-Length로 관측된 전송량: `23,569,627 bytes`
- 이 byte 값은 header가 없는 response를 제외하므로 실제 총량보다 작을 수 있다.

Sequential production pilot이므로 Vercel/Supabase capacity를 검증하지 않는다.

### Errors

- browser request failures: `75/667`, 약 `11.2%`
- HTTP error response로 기록된 항목: `0`
- console error: `0`
- 실패 75건 전부 Supabase transform image의 `net::ERR_BLOCKED_BY_ORB`
- 별도 HTTP 검사에서 transform URL은 `403 FeatureNotEnabled`, 원본은 `200 image/jpeg`

HTTP/console error만 보면 정상처럼 보이지만 실제 image request는 실패한다. Golden
Signals의 묵시적 오류를 별도로 측정해야 하는 이유다.

### Saturation

서버 CPU, memory, connection, disk/network saturation은 production pilot에서 수집하지
않았다. client CPU slowdown이 커질수록 latency가 급증했다. 이는 client-side device
capacity와 image transfer가 tail을 만드는 신호지만 server saturation 근거는 아니다.

## Segment 결과

| Segment | Sessions | Primary p75 | Primary p95 | Detail p75 | Detail p95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| mobile mid 4G | 11 | 1641ms | 1694ms | 6773ms | 6975ms |
| mobile low slow-4G | 6 | 2924ms | 3005ms | 14745ms | 15142ms |
| desktop Wi-Fi | 3 | 410ms | 410ms | 1112ms | 1112ms |

Desktop만 보면 빠르지만 mobile low 사용자는 상세 사진을 15초 가까이 기다린다. 전체
평균이나 warm-cache 단일 측정만 제시하면 이 사용자를 숨기게 된다.

## Navigation 정정 측정

최초 runner는 mobile sidebar 내부 button을 직접 click해 viewport 밖 timeout을 기능
실패로 오판했다. 코드 확인 결과 실제 mobile flow는 `메뉴 열기`를 먼저 누른다. AI가
`Sidebar.tsx`를 검사해 harness 오류를 찾았고, 실제 menu interaction을 포함한 별도
20-session 측정으로 정정했다.

| Flow | Attempts | Success | p50 | p75 | p95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 관계 보기 | 10 | 100% | 1394ms | 1650ms | 1801ms |
| 앨범 | 10 | 100% | 1848ms | 2732ms | 2953ms |

Mobile menu open p95는 관계 보기 표본 `168ms`, 앨범 표본 `296ms`였다. 기능은
정상이나 relation/album 화면 전환 tail은 직접 조작 목표 `200ms`보다 훨씬 느리다.

## 기존 frontend 최적화와 현재 한계

코드에 이미 적용된 최적화:

- first rows thumbnail `loading=eager`, `fetchPriority=high`
- below-fold thumbnail `loading=lazy`
- `width/height` 명시로 layout shift 축소
- `@tanstack/react-virtual` 기반 photo grid virtualization
- thumbnail용 Supabase `320x320`, quality 70 transform URL 생성
- Unity initial loading/race/frame 작업 축소: commits `1ed10b8`, `17f8838`, `cba4059`

하지만 Supabase tenant에서 image transformation 기능이 비활성이라 thumbnail URL
최적화가 실제로 작동하지 않는다. `ImageWithFallback`이 placeholder를 보여줘 page와
session은 성공해도 실제 thumbnail request failure가 남는다. full modal은
`photo.url` 원본을 그대로 사용해 slow-4G에서 p95 15초가 된다.

## 다음 최적화

1. staging Storage에 실제 thumbnail 파일을 생성한다. transform 기능 유료 활성화 여부와
   무관하게 `thumbnail_url`이 200 image response를 반환해야 한다.
2. 상세용으로 최대 display width에 맞춘 WebP/AVIF derivative를 저장한다. 원본은 다운로드
   또는 확대 요청 때만 가져온다.
3. 목표: mobile low detail image p75 `<=1500ms`, p95 `<=2500ms`, image failure `0%`.
4. relation/album module을 route-level lazy load하고 idle prefetch를 비교한다. initial bundle과
   first navigation 사이 trade-off를 같은 runner에서 전후 측정한다.
5. staging Preview를 staging Supabase와 연결한 뒤 100, 500, 1000 session 순서로 높인다.
6. 최종 production 배포 후 Vercel Speed Insights RUM p75로 실제 사용자 결과를 확인한다.

이번 작업은 baseline 환경과 측정 harness를 만들고 병목을 찾은 단계다. 앱 최적화 코드는
아직 변경하지 않았다. 따라서 “15초에서 개선했다”고 주장하지 않는다. 다음 deployment의
동일 seed 전후 결과가 생긴 뒤 개선율을 기록한다.

## AI 사용 내역

AI는 다음에 사용했다.

- 기존 성능 문서와 Golden Signals 기준을 읽고 workload와 성공 조건 설계
- device/network/session/action 확률 모델 생성
- production/staging 오실행 방지 policy와 contract tests 구현
- Playwright/CDP 기반 browser traffic, Web Vitals, action latency, 오류 수집 구현
- raw JSON의 p50/p75/p95/p99 및 segment 분석
- Supabase ORB failure를 원본 HTTP response와 대조해 원인 분리
- 최초 mobile navigation 오판을 코드 검사로 찾아 실제 menu flow로 정정
- 결과·한계·과장 금지 문구 작성

AI는 실제 사용자 traffic이나 측정값을 생성·보정하지 않았다. 숫자는 Vercel deployment를
실제로 실행한 browser raw evidence에서 계산했다. 사용자 모델은 가정이며 실제 사용자
분포라는 주장을 하지 않는다.

## 재현

Runner와 안전 정책:

- `Frontend/tests/performance/vercel-virtual-traffic.mjs`
- `Frontend/tests/performance/vercel-navigation-traffic.mjs`
- `Frontend/tests/performance/virtual-traffic-policy.mjs`
- `Frontend/tests/performance/virtual-traffic-policy.test.mjs`
- `Frontend/tests/performance/README.md`

Raw evidence:

- `E:\memory\photomap\characteristic\2026-08-13-vercel-virtual-traffic-pilot.json`
- `E:\memory\photomap\characteristic\2026-08-13-vercel-navigation-traffic.json`
- `E:\memory\photomap\characteristic\2026-08-13-vercel-mobile-usability.json`
- `E:\memory\photomap\characteristic\2026-08-13-vercel-modal-usability.json`

## 제한

- 실제 사용자 RUM 아님
- 단일 runner region
- production pilot concurrency 1
- map traffic은 production 안전 정책으로 제외
- device mix와 action probability는 가정
- p99는 표본 20에서 사실상 max에 가까워 참고값
- server resource saturation과 cost는 별도 staging dashboard 측정 필요
