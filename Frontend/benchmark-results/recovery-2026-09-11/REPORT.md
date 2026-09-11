# 중단 작업 복구 기록 — 2026-09-11

상태: 로컬 코드 복구 완료. 실제 사진 본 실험은 외부 데이터 수집 제한으로 미완료.

## 발견한 작업

`../real-ux-2026-09-10/protocol.md` 및 `source/requested-design.md`에 실제 사진 1,000개 가상화 A/B 검증이 계획돼 있었다. 본 실험 원시 결과와 최종 보고서는 없었으며, fixture manifest도 생성되지 않았다.

## 이번 수정

- `src/App.tsx`: 기존 한글 문구와 손상된 JSX 닫기 태그 복원. 기존 benchmarkMode 변경 보존.
- `scripts/build-real-ux-fixtures.mjs`: Commons의 전체 continuation 객체를 다음 요청에 전달. 기존 코드는 `gcmcontinue`만 읽어 imageinfo가 제공한 45개에서 종료했다. 페이지 요청 간 1.1초 대기 추가. 오류 문구를 실제 허용 라이선스 범위와 일치시킴.
- `src/virtualization-benchmark.tsx`, `tests/performance/real-ux-performance.mjs`, `tests/performance/real-visual.mjs`: 생성기가 쓰는 `/real-fixtures/v1/fixture-manifest.json` 및 `fixtures[]`로 소비 계약 통일.
- `tests/performance/real-ux-performance.mjs`: warm만 지원하도록 명시. 현재 준비 절차가 스크롤 경로를 예열하고 Playwright routing이 HTTP 캐시를 비활성화하므로 cold라는 이름으로 실행하지 못하게 함. warm은 측정 페이지에서 준비된 이미지 경로를 뜻하며 HTTP warm-cache 결과가 아님.
- `tests/performance/real-fixture-contract.test.mjs`: 실제 수집 CLI를 mock API로 실행해 imageinfo continuation 보존 검증. cold 실행 조기 거부 검증.

## 검증

- 일반 Vite 프로덕션 빌드 통과. 수정 전 App.tsx JSX 오류로 실패한 동일 명령을 재실행했다.
- 독립 벤치마크 빌드 통과.
- `npx tsc --noEmit` 통과.
- 성능/fixture 회귀 테스트 7개 통과.
- 기존 load 계약 테스트 10개 및 `load:check` 통과.
- `git diff --check` 통과. 별도 lint 명령은 package.json에 없음.
- 모바일/데스크톱 SVG 1,000개 A/B 구조·사진 선택 검증 결과: `svg-smoke/summary.csv`, 원시 관측: `svg-smoke/raw-runs.json`. 개발 서버 기능 검증이며 성능 비교 자료로 사용하지 않는다.

## 남은 제한과 재개 조건

실제 Commons 요청은 continuation 수정 후 HTTP 429로 실패했다. 요청 간격을 1.1초로 낮춘 재시도도 429로 실패했다. 실제 사진을 반복 SVG로 대체하거나 표본 수를 줄여 완료한 것으로 처리하지 않았다. fixture 미확보로 실제 사진 파일럿/100쌍 본 실험/시각 캡처는 실행하지 않았다. 실기기·참여자 평가도 미실시다.

수집 제한 해제 후 Frontend에서:

```powershell
node scripts/build-real-ux-fixtures.mjs --count 1000
```

manifest의 1,000개 항목, 파일 해시, 라이선스, EXIF 제거를 확인하고 실제 이미지 smoke부터 시작한다. 본 실험은 프로덕션 벤치마크 빌드와 fixture를 함께 제공하는 로컬 서버에서 수행해야 한다. `vite.benchmark.config.ts`는 public 파일을 복사하지 않으므로 fixture 제공을 별도 확인해야 한다. 기존 설계의 기본 셀은 count=1000, cpu=1, cache=warm, scenarios=click,scroll; 확장 셀은 count=3000, cpu=4, cache=warm, scenario=click이다. 서로 다른 output 디렉터리로 smoke, pilot, main을 분리한다.

최종 성능 개선 수치·사용자 체감 개선은 이번 복구에서 입증하지 않았다. paired CI는 summary.json에 있고 현재 summary.csv에는 모드별 통계만 있다. 전체 앱 재현 경로 및 cold/네트워크 제한 조건은 추가 구현·검증이 필요하다.

검증 후 기록: 네 가지 브라우저 실행은 모두 valid=true로 완료됐다. 보고서 작성 시 개발 서버 파일 감시기가 REPORT.md에서 EBUSY로 종료됐다. 서버는 남아 있지 않으며, 이 개발 환경 파일 잠금 문제는 수정하지 않았다.
