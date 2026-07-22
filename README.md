# PhotoMap: 여행의 기억을 데이터로 시각화하다

사용자의 사진 속 GPS와 시간 데이터를 바탕으로 여행 기록을 지도, 3D 지구본, 타임라인, 앨범, 노드 그래프로 탐색하는 프론트엔드 중심 시각화 프로젝트입니다.

현재 저장소는 포트폴리오 공개 데모 기준으로 정리되어 있습니다. 공개 데모는 방문자가 로그인 없이 샘플 데이터를 둘러볼 수 있는 **read-only showcase** 형태이며, 업로드, 삭제, 수정, 관리자 기능은 구현 범위에는 포함되어 있지만 공개 모드에서는 비활성화합니다.

## 목차

- [개요](#개요)
- [프로젝트 정보](#프로젝트-정보)
- [아키텍처 개요](#아키텍처-개요)
- [주요 기능](#주요-기능)
- [기술적 고도화 및 최적화](#기술적-고도화-및-최적화)
- [공개 데모 정책](#공개-데모-정책)
- [실행 방법](#실행-방법)
- [환경변수](#환경변수)
- [Vercel 배포 설정](#vercel-배포-설정)
- [협업 및 업무 분담](#협업-및-업무-분담)

---

## 개요

PhotoMap은 사진을 단순히 저장하는 것을 넘어, 사진에 포함된 위치와 시간 메타데이터를 시각화하여 사용자가 자신의 여행 궤적을 직관적으로 탐색할 수 있도록 돕습니다. 대규모 이미지 데이터와 WebGL 기반 시각화 화면을 함께 다루는 환경에서도 화면 지연을 줄이고, 지도와 그래프 중심의 탐색 경험을 제공하는 것을 목표로 했습니다.

### 해결하려는 문제

1. **사진 메타데이터 탐색의 한계**
   - 대부분의 사진에는 위치와 시간 정보가 남아 있지만, 일반적인 갤러리에서는 이 정보를 적극적으로 활용하기 어렵습니다. PhotoMap은 EXIF 기반 위치/시간 데이터를 지도, 타임라인, 지구본으로 변환해 여행 기록을 다시 탐색할 수 있게 합니다.
2. **기록이 쌓일수록 약해지는 탐색 경험**
   - 사진 수가 늘어나면 단순 목록 탐색은 빠르게 비효율적이 됩니다. 앨범, 즐겨찾기, 위치, 그래프, 지도 뷰를 분리해 사용자가 목적에 맞는 탐색 방식을 선택할 수 있도록 구성했습니다.
3. **대용량 이미지와 3D 화면의 렌더링 병목**
   - 대량 사진 피드, D3 물리 시뮬레이션, cobe 3D 지구본, Unity WebGL iframe을 함께 다루면서 생기는 초기 로딩과 스크롤 병목을 가상화, lazy loading, 렌더링 책임 분리로 개선했습니다.

## 프로젝트 정보

- **개발 기간**: 2025/12/14 ~ 2026/04
- **팀 구성**: 3인 (Frontend 1명, DB/Supabase 1명, Unity 1명)
- **담당 역할**: 프론트엔드 아키텍처 설계, Zustand 상태 관리, 이미지 렌더링 최적화, D3 시각화, Unity WebGL 연동, Vercel 배포 정리
- **배포 대상**: Vercel
- **현재 데모 상태**: 2026-07-20 KST 기준, 공개 접근 가능한 production URL은 아직 검증되지 않았습니다.

## 아키텍처 개요

```text
Frontend (Vite + React + TypeScript)
  ├─ Zustand selector 기반 전역 상태 관리
  ├─ @tanstack/react-virtual 기반 사진 피드 가상화
  ├─ D3.js force simulation / DOM 직접 갱신
  ├─ cobe 3D globe
  └─ Mapbox + Unity WebGL iframe integration

Backend / BaaS
  └─ Supabase PostgreSQL / Auth / Storage
```

## 프로젝트 구조

- `Frontend/`: Vite 기반 React 프론트엔드
- `Backend/`: Supabase 연동 및 백엔드 관련 리소스
- `Unity/`: Unity WebGL 지도 시각화 모듈 및 에셋
- `docs/`: 성능 측정, 배포 상태, 기술 기록 문서
- `README.md`: 프로젝트 개요 및 포트폴리오용 설명 문서

## 주요 기능

### 1. 메인 화면

[![meinsajin.png](https://i.postimg.cc/FFM0wQYt/meinsajin.png)](https://postimg.cc/DmcWbHQ5)

- 좌측 사이드바 기반 메뉴 탐색
- 사진 히스토리와 위치 기반 3D 지구본 뷰
- 공개 데모에서는 샘플 데이터 기반 read-only 탐색 제공
- 성능 측정용 패널은 설정값이 켜진 경우에만 노출

### 2. 사진 업로드 및 관리

[![eoblodeu.gif](https://i.postimg.cc/MTs5N4yX/eoblodeu.gif)](https://postimg.cc/8J6LrZXV)

- EXIF 데이터 기반 위치 자동 추출
- 수동 위치 입력, 설명 작성, 카테고리 지정 기능
- 로그인 기반 개발 모드에서는 기본 CRUD 흐름 확인 가능
- 공개 데모에서는 업로드, 삭제, 수정 기능 비활성화

### 3. Mapbox + Unity WebGL 지도

[![jido-jigubonsajin.png](https://i.postimg.cc/J7fjSWsy/jido-jigubonsajin.png)](https://postimg.cc/grKw6Qqd)
[![jido.gif](https://i.postimg.cc/TY50Nt1B/jido.gif)](https://postimg.cc/RN9wNQcT)

- Unity WebGL 기반 사진 확대 및 호버 인터랙션
- Mapbox API 기반 3D 지도 시각화
- iframe 준비 상태와 marker/config payload 전송 순서를 분리해 초기 race condition 완화

### 4. 그래프 뷰

[![nodeu.gif](https://i.postimg.cc/HxW3SH8P/nodeu.gif)](https://postimg.cc/d7X81bB8)

- D3.js force simulation 기반 관계 노드 그래프
- 사진, 위치, 카테고리 관계를 시각적으로 탐색
- tick 좌표 업데이트를 React state 밖으로 분리해 애니메이션 중 리렌더링 부담 감소

### 5. 카테고리 및 앨범 탐색

[![poldeo-wichibyeongyeong.gif](https://i.postimg.cc/BZVNCrSL/poldeo-wichibyeongyeong.gif)](https://postimg.cc/9zyGmNqC)

- 커스텀 카테고리 생성, 아이콘 지정, 중복 방지 로직
- 앨범, 즐겨찾기, 지도, 타임라인, 노드 그래프 기반 탐색
- 공개 데모의 좋아요 상태는 브라우저 `localStorage`에만 저장

## 기술적 고도화 및 최적화

### 대규모 렌더링 가상화

`@tanstack/react-virtual`을 도입해 사진 목록에서 화면에 보이는 요소 중심으로 DOM을 유지했습니다. 10,000건 이상 사진 탐색 시에도 DOM 노드 수를 제한해 스크롤 프리즈를 줄이는 구조로 개선했습니다.

| 개선 전 (DOM 과부하로 인한 화면 프리즈 현상) | 개선 후 (가상화 적용 후 스크롤 안정화) |
| :---: | :---: |
| [![과부하 개선전](https://i.postimg.cc/XNzxgRjc/peulijeu-hyeonsang.gif)](https://postimg.cc/jCyzxkJL) | [![과부하 개선후](https://i.postimg.cc/KcHQ56Gw/peulijeuhyeonsang-haegyeol.gif)](https://postimg.cc/ThnrdHWJ) |

### 상태 관리 아키텍처 개편

Context API 기반 전역 상태를 Zustand selector 구조로 전환했습니다. 필요한 상태 조각만 구독하도록 구성해 불필요한 전역 리렌더링을 줄였고, 기존 성능 기록에서는 React Profiler 기준 커밋 시간이 `9.7ms -> 6.2ms`로 개선되었습니다.

### 네트워크 병렬 처리

상호 의존성이 없는 Supabase 조회를 `Promise.all` 기반 병렬 요청으로 정리해 waterfall 대기 시간을 줄였습니다. 사진, 위치, 카테고리, 설명 데이터를 한 번에 수집한 뒤 프론트엔드에서 탐색 모델로 조합합니다.

### React-D3 렌더링 책임 분리

D3 물리 시뮬레이션 중 좌표 변경을 React state로 반복 반영하지 않고, SVG 속성과 DOM 갱신으로 분리했습니다. 이를 통해 노드 그래프 애니메이션 중 React 리렌더링 횟수를 줄이고 시뮬레이션 프레임 안정성을 확보했습니다.

### 초기 JS 비용 및 WebGL 초기화 지연

공개 데모 기준 초기 화면에 필요하지 않은 로그인, 업로드, 모달, 무거운 시각화 화면을 lazy loading 대상으로 분리했습니다. cobe globe 초기화는 첫 페인트 이후로 지연해 초기 렌더링 경로의 JavaScript 비용을 낮췄습니다.

### Vercel LCP 발견 지연 개선

2026-07-21 Vercel 측정에서 LCP 이미지가 초기 HTML에서 늦게 발견되는 문제가 확인되어 Supabase media origin `preconnect`, LCP 이미지 preload, public demo seed 사진을 추가했습니다. 측정 기록 기준 median LCP는 `3860ms -> 3280ms`로 개선되었지만, 목표인 `2500ms` 이하에는 아직 도달하지 않아 추가 개선 대상으로 남겨두었습니다.

### 성능 근거 관리

성능 기록은 `docs/performance/`와 저장소 외부 `E:\memory\photomap`에 분리해 보관합니다.

- Issue #10 요약: `docs/performance/issue-10-baseline.md`
- LCP 기록: `docs/performance/lcp-2026-07-21.md`
- Dev/performance React Profiler baseline: `PhotomapApp` 11 commits, max `actualDuration` 28.4ms, average `actualDuration` 9.45ms
- 공개 URL이 앱 화면을 정상 제공하지 않은 Lighthouse 값은 앱 성능 주장에 사용하지 않습니다.

## 기술 스택

- **Frontend**: React, TypeScript, Vite, Zustand, Tailwind CSS, Radix UI
- **Visualization**: D3.js, cobe, Mapbox, Unity WebGL
- **Data**: Supabase PostgreSQL, Supabase Auth, Supabase Storage
- **Performance**: React Profiler, Lighthouse, `@tanstack/react-virtual`, frame budget profiler
- **Deploy**: Vercel

## 공개 데모 정책

공개 데모 모드는 다음 환경변수로 제어합니다.

```text
VITE_PUBLIC_DEMO=true
VITE_DEMO_USER_ID=<read-only demo data owner user id>
```

공개 데모 모드에서는 다음 정책을 적용합니다.

- 로그인과 회원가입 없이 접근
- `VITE_DEMO_USER_ID` 기준 read-only Supabase query 사용
- 업로드, 삭제, 카테고리 수정, 관리자 기능 숨김 또는 비활성화
- 좋아요 상태는 브라우저 `localStorage`에만 저장
- 성능 모니터 UI는 `VITE_SHOW_PERFORMANCE_MONITOR=true`일 때만 노출

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

성능 측정용 빌드:

```powershell
cd Frontend
npm run build:perf
npm run preview:perf
```

## 환경변수

`Frontend/.env` 또는 Vercel 환경변수에 설정합니다. 실제 값은 커밋하지 않습니다.

```text
VITE_SUPABASE_URL=<Supabase project URL>
VITE_SUPABASE_ANON_KEY=<Supabase anon public key>
VITE_DEMO_USER_ID=<read-only demo data owner user id>
VITE_PUBLIC_DEMO=true
VITE_MAPBOX_TOKEN=<Mapbox public token>
VITE_KAKAO_MAP_API_KEY=<Kakao REST API key>
VITE_SHOW_PERFORMANCE_MONITOR=false
```

로그인, 업로드, 수정 흐름을 개발 환경에서 확인하려면 다음처럼 실행합니다.

```text
VITE_PUBLIC_DEMO=false
```

## Vercel 배포 설정

- Root Directory: `Frontend`
- Framework Preset: Vite
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `build`

`Frontend/vercel.json`은 Unity WebGL Brotli/WASM asset 응답 헤더를 설정합니다.

## Supabase 데모 데이터 조건

로그인 없는 공개 데모를 위해 Supabase에는 `VITE_DEMO_USER_ID`에 해당하는 read-only 샘플 데이터가 있어야 합니다.

필요 테이블:

- `media`
- `location`
- `category`
- `media_description`
- `favorites` optional

RLS를 사용하는 경우 anon role은 의도한 데모 사용자 row만 select할 수 있도록 제한해야 합니다.

## 협업 및 업무 분담

- **민사빈 (Frontend)**: 프론트엔드 시스템 아키텍처 설계, Zustand 상태 관리, 렌더링 가상화 최적화, D3 시각화, Vercel 배포 정리
- **양준호 (Backend)**: Supabase schema 설계, RLS 보안 정책, 데이터베이스 연동 API 개발
- **최순호 (Unity)**: Unity WebGL 시각화 모듈 최적화 및 3D 그래픽 에셋 관리

<div style="overflow:hidden;">
  <table>
    <tr>
      <td align="center"><strong>FrontEnd</strong></td>
      <td align="center"><strong>BackEnd</strong></td>
      <td align="center"><strong>Unity</strong></td>
    </tr>
    <tr>
      <td align="center">
        <a href="https://github.com/sabin1108">
          <img src="https://github.com/sabin1108.png" width="150px" alt="민사빈"/><br/>
          <sub><b>민사빈</b></sub>
        </a>
      </td>
      <td align="center">
        <a href="https://github.com/MidnightStar927">
          <img src="https://github.com/MidnightStar927.png" width="150px" alt="양준호"/><br/>
          <sub><b>양준호</b></sub>
        </a>
      </td>
      <td align="center">
        <a href="https://github.com/sunho-room">
          <img src="https://github.com/sunho-room.png" width="150px" alt="최순호"/><br/>
          <sub><b>최순호</b></sub>
        </a>
      </td>
    </tr>
  </table>
</div>

**협업 관리 방식**

- 개발 일지를 통한 주 단위 진행 상황 및 기술적 이슈 해결 과정 문서화
- 마일스톤 캘린더를 활용한 개발 일정 및 주요 데드라인 시각화
- 디스코드를 통한 회의 및 화면 공유로 실시간 피드백 진행
