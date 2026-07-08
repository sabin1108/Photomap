# PhotoMap

사진의 EXIF 위치/시간 데이터를 바탕으로 여행 기록을 지도, 3D 지구본, 타임라인, 앨범, 노드 그래프로 탐색하는 프론트엔드 중심 시각화 프로젝트입니다.

이 저장소는 포트폴리오 데모용으로 정리 중이며, 공개 데모는 안정적인 확인을 위해 **로그인 없는 read-only showcase** 형태로 운영합니다. 업로드, 삭제, 카테고리 수정, 관리자 기능은 구현 범위에는 포함되어 있지만 공개 데모에서는 비활성화합니다.

## 프로젝트 정보

- 개발 기간: 2025.12 ~ 2026.04
- 팀 구성: Frontend 1명, DB/Supabase 1명, Unity 1명
- 역할: 프론트엔드 구조 설계, Zustand 상태 관리, 대량 이미지 렌더링 최적화, D3 시각화, Unity WebGL 연동 화면 통합

## 주요 기능

- EXIF 기반 사진 위치/시간 데이터 탐색
- Supabase에 저장된 사진 메타데이터 조회
- Cobe 기반 3D Globe View
- Mapbox + Unity WebGL 기반 지도 시각화
- D3.js 기반 관계 노드 그래프
- 앨범/태그/위치 기반 탐색
- `@tanstack/react-virtual` 기반 대량 사진 피드 가상화
- 공개 데모용 local-only 좋아요 인터랙션

## 공개 데모 정책

공개 데모는 면접관이나 포트폴리오 방문자가 프로젝트 성격을 빠르게 파악할 수 있도록 구성합니다.

- 로그인 없이 접근
- Supabase read 기반 샘플 데이터 사용
- 업로드/삭제/수정 기능 비활성화
- 좋아요는 브라우저 localStorage에만 저장
- 성능 측정용 패널은 `VITE_SHOW_PERFORMANCE_MONITOR=true`일 때만 노출

## 아키텍처

```text
Frontend (Vite + React + TypeScript)
  ├─ Zustand selector 기반 전역 상태 관리
  ├─ @tanstack/react-virtual 기반 사진 피드 가상화
  ├─ D3.js force simulation / DOM 직접 갱신
  ├─ Cobe 3D globe
  └─ Mapbox + Unity WebGL iframe integration

Backend / BaaS
  └─ Supabase PostgreSQL / Auth / Storage
```

## 기술 스택

- Frontend: React, TypeScript, Vite, Zustand, Tailwind CSS, Radix UI
- Visualization: D3.js, Cobe, Mapbox, Unity WebGL
- Data: Supabase PostgreSQL, Supabase Storage
- Performance: React Profiler, Lighthouse, `@tanstack/react-virtual`
- Deploy: Vercel

## 성능 개선 요약

포트폴리오와 이력서에 기재한 성능 수치는 React Profiler와 별도 성능 리포트 기준입니다.

- Context API 기반 전역 상태를 Zustand selector 구조로 전환하여 리렌더링 범위 축소
- React Profiler 기준 커밋 시간 `9.7ms -> 6.2ms` 개선
- D3 tick 좌표 업데이트를 React state 밖으로 분리하여 리렌더링 횟수 `370회 -> 25회` 수준으로 감소
- 10,000건 이상 사진 탐색 시 DOM 노드를 약 200개 수준으로 유지하도록 가상화 적용
- Globe/Map/Timeline/Node 등 무거운 화면은 route-level lazy loading 적용

## 실행 방법

```powershell
cd Frontend
npm install
npm run dev
```

프로덕션 빌드:

```powershell
cd Frontend
npm run build
```

## 환경변수

`Frontend/.env` 또는 Vercel 환경변수에 설정합니다.

```text
VITE_SUPABASE_URL=<Supabase project URL>
VITE_SUPABASE_ANON_KEY=<Supabase anon public key>
VITE_DEMO_USER_ID=<read-only demo data owner user id>
VITE_PUBLIC_DEMO=true
VITE_MAPBOX_TOKEN=<Mapbox public token>
VITE_KAKAO_MAP_API_KEY=<Kakao REST API key>
VITE_SHOW_PERFORMANCE_MONITOR=false
```

기존 로그인/업로드 흐름을 개발 환경에서 확인하려면 `VITE_PUBLIC_DEMO=false`로 실행합니다.

## Vercel 배포 설정

- Root Directory: `Frontend`
- Framework Preset: Vite
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `build`

`Frontend/vercel.json`은 Unity WebGL의 Brotli/WASM 응답 헤더를 설정합니다.

## Supabase 데모 데이터 조건

로그인 없는 공개 데모를 위해 Supabase에는 `VITE_DEMO_USER_ID`에 해당하는 샘플 데이터가 있어야 합니다.

필요 테이블:

- `media`
- `location`
- `category`
- `media_description`
- `favorites` optional

공개 데모에서는 클라이언트가 `VITE_DEMO_USER_ID` 기준으로 read query를 수행합니다. RLS를 사용하는 경우 anon role이 해당 데모 사용자 row만 select할 수 있도록 정책을 제한해야 합니다.

## 협업 및 업무 분담

- 민사빈: 프론트엔드 아키텍처, Zustand 상태 관리, 렌더링 가상화, D3 시각화, Vercel 배포 정리
- DB 담당: Supabase schema, RLS 정책, 데이터 연동
- Unity 담당: Unity WebGL 시각화 모듈 및 에셋 관리
