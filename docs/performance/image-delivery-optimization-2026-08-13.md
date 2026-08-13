# Vercel 이미지 전달 성능 최적화 실험

측정일: 2026-08-13  
대상 브랜치: `perf-image-delivery`  
대상 환경: Vercel Preview + Supabase staging  
최종 코드: `f5ef38f`

## 결론

모바일 4G 콜드 세션에서 첫 실제 사진이 보이는 p95를 **79.05초에서 3.59초로 95.5% 단축**했다. 사진을 누른 뒤 모달의 첫 시각 피드백은 p95 약 0.35초로 유지했다. 관계 보기 p95는 35.8%, 앨범 p95는 74.4% 개선됐다.

이 결과는 실제 사용자 RUM이 아니라 통제된 합성 실험이다. 최적화 전후의 방향성과 인과관계를 보여주는 강한 실험 증거지만, 실 서비스 전체 사용자의 p95라고 주장하지 않는다.

## 사용자 관점 결과

| 사용자 행동 | 기준 p50 | 최적화 p50 | 기준 p95 | 최적화 p95 | p95 변화 |
|---|---:|---:|---:|---:|---:|
| 콜드 진입 → 첫 실제 사진 | 78.03초 | 3.33초 | 79.05초 | 3.59초 | **-95.5%** |
| 사진 클릭 → 모달 첫 이미지 | 0.29초 | 0.25초 | 0.35초 | 0.35초 | 동등 |
| 콜드 진입 → 모달 첫 이미지 합산 | 약 78.31초 | 약 3.58초 | 약 79.40초 | 약 3.95초 | **-95.0%** |
| 관계 보기 전환 | 2.09초 | 1.47초 | 7.62초 | 4.90초 | **-35.8%** |
| 앨범 전환 | 3.83초 | 1.82초 | 15.37초 | 3.94초 | **-74.4%** |

모든 이미지 표본과 관계/앨범 전환은 성공률 100%였다. 모바일 메뉴 열기 시간은 최적화 전후가 비슷했다. 따라서 관계/앨범 개선은 메뉴 동작이 아니라 이미지 요청 경쟁 감소와 썸네일 사용에서 발생한 것으로 판단한다.

## 실험 환경

### 배포 및 데이터

- 앱: Vercel Preview의 고정 브랜치 URL
- 브랜치: `perf-image-delivery`
- DB: Supabase staging 프로젝트
- 데이터: staging의 합성 media 120행
- 실제 사용자 사진 및 Production DB/Storage: 사용하지 않음
- Vercel Authentication: 자동 측정 동안만 해제
- 지도 트래픽: 이미지 실험에서는 제외

### 모바일 상세 이미지 A/B

- viewport: 390×844
- device scale factor: 2
- CPU slowdown: 4배
- RTT: 150ms
- download: 1.6Mbps
- upload: 0.75Mbps
- 콜드: 새 브라우저 context 5회
- 웜: 동일 context 워밍업 5회 후 10회
- 동일 Vercel 브랜치, staging 데이터, 코드 경로 및 하네스 사용
- 기준 모드: `?perfImageMode=baseline`
- 최적화 모드: `?perfImageMode=optimized`

### 관계/앨범 A/B

- 총 20세션, 동시성 1
- 관계 보기 10회, 앨범 10회
- 프로필 순환:
  - 중급 모바일: CPU 4배, RTT 150ms, 1.6Mbps
  - 저사양 모바일: CPU 6배, RTT 300ms, 0.75Mbps
  - 데스크톱: CPU 1배, RTT 40ms, 10Mbps

## 발견한 문제

### 1. 첫 화면 이미지 대역폭 포화

기준 구현은 첫 화면 주변 사진 약 30장에 522,002바이트 JPEG를 각각 요청했다. 관측된 요청 수와 fixture 크기를 곱하면 초기 이미지 후보만 약 15.66MB다. 1.6Mbps 환경에서 요청들이 대역폭을 나눠 가지며 첫 사진 완료가 p95 79.05초까지 밀렸다.

### 2. Supabase Image Transformations 의존

썸네일이 없는 레코드는 `/storage/v1/render/image/public/` URL을 동적으로 만들었다. 해당 기능이 활성화되지 않은 프로젝트에서는 403이 발생했다. UI fallback이 오류를 아이콘으로 바꿔 표시해 네트워크 실패가 숨겨지기도 했다.

### 3. 원본을 썸네일 화면에서도 사용

앨범 커버, 타임라인, 관계 보기, 즐겨찾기, 관리자 표 등 작은 표시 영역도 원본 URL을 사용하는 곳이 있었다. 화면 전환 때 불필요한 이미지 바이트와 디코딩 작업이 몰렸다.

### 4. 여러 이미지에 높은 우선순위 부여

초기 두 행 전체에 `eager/high`가 적용돼 실제 LCP 후보와 나머지 이미지가 경쟁했다.

### 5. 상세 이미지의 빈 대기 화면

썸네일과 상세 이미지를 물리적으로 분리한 뒤에는 상세 WebP 첫 요청이 약 5초 걸릴 수 있었다. 모달을 즉시 열어도 고해상도 이미지가 끝날 때까지 빈 영역이 보일 위험이 있었다.

## 적용한 최적화

### 업로드 시 물리 파생본 생성

브라우저 Canvas에서 업로드 원본으로 다음 파일을 생성한다.

- thumbnail: 최대 480px, WebP quality 0.72
- display: 최대 1600px, WebP quality 0.80
- original: 원본 보존

각 파일은 충돌하지 않는 고유 경로에 저장하며 `cacheControl: 31536000`을 적용한다. 합성 fixture에서는 다음 크기가 생성됐다.

| 변형 | 크기 | 기준 JPEG 대비 |
|---|---:|---:|
| 기준 JPEG | 522,002B | - |
| thumbnail WebP | 30,496B | **94.2% 감소** |
| display WebP | 260,958B | **50.0% 감소** |

### 전달 정책

- 그리드·앨범·관계·타임라인·즐겨찾기·관리 화면: thumbnail 사용
- 모달: thumbnail을 즉시 표시한 뒤 display WebP를 비동기 교체
- 실제 첫 이미지 후보 하나만 `fetchPriority="high"`
- 첫 행 이후 이미지는 lazy loading
- 썸네일 없는 레거시 레코드: 원본 URL로 안전하게 fallback
- 과거 transform URL: public object URL로 복구
- 유료 Image Transformations 엔드포인트를 런타임 fallback으로 사용하지 않음

## 4 Golden Signals 평가

사용자가 제공한 `성능지표.md`의 Latency, Traffic, Errors, Saturation 기준으로 평가했다.

### Latency

- 평균 대신 p50/p95를 기록했다.
- 첫 사진 p95 95.5% 개선이 핵심 성과다.
- 관계/앨범의 tail latency도 각각 35.8%, 74.4% 감소했다.
- 모달 첫 시각 피드백 p95는 약 0.35초로 유지했다.

### Traffic

- 초기 후보 30장 기준 모델 바이트:
  - 기준: 약 15.66MB
  - 최적화 썸네일: 약 0.91MB
  - 감소율: 약 94.2%
- 이는 실제 전송량 계측이 아니라 관측 요청 수 × 고정 fixture 크기 모델이다.

### Errors

- 최종 이미지 표본 성공률: 100%
- 관계 보기 성공률: 100%
- 앨범 성공률: 100%
- Supabase transform 403 경로를 코드에서 제거했다.

### Saturation

- 기준은 큰 JPEG 약 30개가 초기 네트워크 큐를 점유했다.
- 최적화는 요청 개수가 같아도 개별 payload를 94.2% 줄이고 LCP 후보만 높은 우선순위로 지정했다.
- 모바일 메뉴 시간은 개선되지 않았지만 콘텐츠 전환은 개선됐다. 이는 CPU 메뉴 처리보다 이미지 네트워크/디코딩 포화가 병목이었다는 보조 증거다.

## 하네스가 수행한 일

하네스는 단순 클릭 스크립트가 아니라 다음 실험 통제를 담당했다.

- Production과 staging host 구분
- Production 세션·동시성 상한 적용
- staging이 Production Supabase ref를 호출하면 중단
- seed와 기기 분포 고정
- CPU·RTT·대역폭 에뮬레이션
- 콜드/웜 캐시 분리
- 첫 이미지, 모달 셸, 모달 이미지, 관계/앨범 전환 구간 분리
- p50/p75/p95/p99, 성공률, HTTP 오류, request failure 기록
- 기준/최적화 모드를 query parameter로 고정
- 원시 JSON 저장

## AI를 활용한 부분

AI는 다음 작업에 사용했다.

1. 기존 성능 하네스와 이미지 경로를 조사하고 falsifiable hypothesis를 세웠다.
2. 실패 테스트를 먼저 작성해 Image Transformations 의존 문제를 재현했다.
3. 업로드 파생본 생성, URL 정책, 우선순위 정책, 점진 모달 로딩을 구현했다.
4. 개인정보가 없는 고정 합성 여행 사진을 built-in image generation으로 만들었다.
5. 같은 합성 원본에서 브라우저 Canvas로 JPEG/WebP fixture를 생성했다.
6. 실험 결과를 4 Golden Signals 기준으로 분석하고 문서화했다.

AI는 결과 수치를 생성하거나 추정하지 않았다. 표의 시간 값은 Playwright가 Vercel Preview에서 기록한 JSON에서 가져왔다. 사람은 Vercel 환경변수 설정과 측정 중 Preview Authentication 해제를 담당했다.

## 하네스 자체에서 발견하고 폐기한 오류

실험 신뢰도를 위해 다음 결과는 최종 수치에서 제외했다.

1. Vercel 보호 로그인 화면을 앱으로 오인한 실행
2. 빈 staging 조회가 초기 fixture를 제거해 클릭이 실패한 실행
3. 앱 배경의 `fixed inset-0` 이미지를 모달 이미지로 오인한 실행
4. 초기 seed 이미지와 DB 교체 후 이미지 사이의 DOM 경쟁 조건이 있던 실행
5. 기준이 상세 이미지를 미리 캐시하고 최적화는 별도 상세 URL을 받는 불공정 비교

이후 fixture URL을 명시적으로 선택하고, 같은 Preview에서 A/B query mode를 제공하고, DOM `complete/naturalWidth`를 폴링하도록 하네스를 수정했다.

## 한계와 실서비스 해석

- 콜드 표본 5개에서 p95는 사실상 최댓값이다. 방향성은 강하지만 모집단 p95 추정에는 작다.
- 한 물리 runner에서 네트워크와 CPU를 에뮬레이션했다.
- 합성 사진은 실제 사용자 사진의 크기·종횡비·엔트로피 분포 전체를 대표하지 않는다.
- 초기 바이트는 fixture 크기 기반 모델이며 모든 브라우저 전송 바이트의 직접 합계가 아니다.
- 실제 서비스 성과를 주장하려면 Vercel Speed Insights 또는 별도 RUM에서 최소 수백~수천 세션의 LCP/INP p75/p95를 확인해야 한다.
- 고해상도 display WebP의 완전 교체 시간은 모달 첫 시각 피드백과 별도다. 사용자는 썸네일을 즉시 보지만 저속 환경에서 선명해지는 데 수 초가 걸릴 수 있다.

## 재현 및 원시 결과

- [이미지 기준 결과](./results/image-ab-baseline.json)
- [이미지 최적화 결과](./results/image-ab-optimized.json)
- [관계/앨범 기준 결과](./results/navigation-ab-baseline.json)
- [관계/앨범 최적화 결과](./results/navigation-ab-optimized.json)
- [가상 트래픽 하네스 설명](../../Frontend/tests/performance/README.md)
- [이미지 회귀 테스트](../../Frontend/tests/image-delivery.test.mjs)

검증 명령:

```powershell
cd Frontend
npx tsc -b
node --test tests/image-delivery.test.mjs tests/performance/virtual-traffic-policy.test.mjs
npm run build
```

최종 검증 결과: TypeScript 성공, 테스트 8/8 성공, Vite production build 성공.

## 운영 후속 작업

1. 측정 종료 후 Vercel Authentication을 다시 켠다.
2. staging에서 다양한 실제 크기의 비식별 fixture로 표본을 늘린다.
3. Production 배포 후 RUM p75/p95를 7~14일 관찰한다.
4. upload 실패 시 이미 올라간 파생 파일을 정리하는 보상 트랜잭션을 추가한다.
5. 가능하면 `srcset/sizes`로 viewport별 display 파생본을 추가한다.
