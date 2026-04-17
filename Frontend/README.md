# PhotoMap: 여행의 기억을 데이터로 시각화하다

사용자의 여행 사진 속에 숨겨진 GPS와 시간 데이터를 추출하여 다양한 인터랙티브 시각화 라이브러리로 변환해주는 프리미엄 여행 아카이빙 플랫폼입니다.

![메인 배너](https://via.placeholder.com/1200x400?text=PhotoMap+Main+Visualization+Preview)

## 목차

- [개요](#개요)
- [주요 기능](#주요-기능)
- [기술적 고도화 및 최적화](#기술적-고도화-및-최적화)
- [기술 스택](#기술-스택)
- [개발 환경 및 실행](#개발-환경-및-실행)
- [팀 및 업무 분담](#팀-및-업무-분담)

---

## 개요

PhotoMap은 수많은 사진 데이터를 단순히 저장하는 것을 넘어, 데이터 기반의 시각화 기술을 통해 사용자의 여행 궤적을 다각도로 탐색할 수 있도록 돕습니다. 3D 지구본, 노드 그래프, 지능형 챗봇 인터페이스를 통해 새로운 아카이빙 경험을 제공합니다.

### 프로젝트 목표

- 대규모 사진 데이터에 최적화된 고성능 인터페이스 구축
- 직관적인 지리 데이터 시각화 라이브러리 연동
- 비동기 데이터 처리 최적화를 통한 사용자 경험(UX) 극대화
- 다양한 화면 크기에 대응하는 반응형 디자인 구현

---

## 주요 기능

### 1. 3D Globe View
![Globe View](https://via.placeholder.com/800x400?text=3D+Globe+Visualization)
- 사용자의 전 세계 여행 기록을 3D 지구본 위에 시각화합니다.
- 터치 및 마우스 드래그를 통한 자유로운 회전, 확대, 축소를 지원합니다.

### 2. Node Graph View
![Node View](https://via.placeholder.com/800x400?text=D3.js+Node+Graph+Visualization)
- 사진 간의 관계와 카테고리를 물리 시뮬레이션 기반의 노드 그래프로 탐색합니다.
- D3.js 물리 엔진을 활용하여 유동적이고 생동감 있는 인터랙션을 제공합니다.

### 3. High-Performance Photo Feed
![Photo Feed](https://via.placeholder.com/800x400?text=Virtualization+Photo+Feed)
- 윈도우잉 가상화 기술을 적용하여 만 건 이상의 사진 데이터도 끊김 없이 로딩합니다.
- 무한 스크롤 및 지능형 그리드 배치를 통해 쾌적한 브라우징을 제공합니다.

### 4. Interactive 2D Map & Timeline
![Map and Timeline](https://via.placeholder.com/800x400?text=2D+Map+and+Timeline+Interface)
- 정확한 지리적 위치를 기반으로 한 2D 지도 탐색 기능을 제공합니다.
- 시간의 흐름에 따라 여행의 기억을 선형적으로 추적할 수 있는 타임라인 뷰를 지원합니다.

### 5. AI Chat & Search Interface
- 여행 기록과 연동된 지능형 챗봇을 통해 대화형 데이터 탐색이 가능합니다.
- 폰트 크기 조절, 실시간 시간 표시 등 사용자 편의성 기능을 포함합니다.

---

## 기술적 고도화 및 최적화

### [Optimization 1] 상태 관리 개편을 통한 렌더링 성능 향상
- **문제 지점**: Context API 사용 시 불필요한 전역 리렌더링으로 인해 커밋 시간이 **9.7ms**까지 상승.
- **해결 방안**: **Zustand**로 전환 및 Selector 기반 정밀 구독 모델 구축하여 렌더링 범위를 격리함.
- **성과**: 커밋 지연 시간을 **6.2ms로 약 30% 단축**하고 70여 개 컴포넌트의 불필요한 재생성을 방지함.

### [Optimization 2] 가상화(Virtualization)를 이용한 대규모 데이터 처리
- **문제 지점**: 수천 장의 이미지를 동시에 DOM에 렌더링할 시 레이아웃 연산 부하로 인한 브라우저 프리징 발생.
- **해결 방안**: **@tanstack/react-virtual**을 도입하여 뷰포트 내의 요소만 렌더링하는 윈도우잉 기법 적용.
- **성과**: 10,000건 이상의 데이터에서도 DOM 노드를 항상 **200개 미만**으로 유지하며 60FPS의 매끄러운 스크롤 확보.

### [Optimization 3] 비동기 Waterfall 제거 및 D3 엔진 최적화
- **해결 방안**: `Promise.all`을 이용한 병렬 데이터 페칭 및 D3 시뮬레이션의 **Direct DOM Manipulation** 적용.
- **성과**: 데이터 로딩 속도 **50% 단축** 및 리렌더링 부하 없는 실시간 물리 애니메이션 구현.

---

## 기술 스택

### Frontend
- **React, Next.js (App Router)**: 서버 컴포넌트와 SEO 최적화를 활용한 풀스택 구조 구축
- **TypeScript**: 정적 타입을 통한 코드 안정성 및 유지보수 효율 증대
- **Zustand**: 고성능 전역 상태 및 셀렉터 방식의 정밀한 상태 구독관리
- **Tailwind CSS / Radix UI**: 일관된 디자인 시스템과 유연한 UI 구축
- **D3.js / Cobe / Leaflet**: 물리 엔진, 3D 지구본 및 지도 시각화 엔진

### Backend & Infrastructure
- **Supabase**: PostgreSQL 기반 서버리스 백엔드, 인증 및 이미지 스토리지 활용

| Category | Badges |
| :--- | :--- |
| **Frontend** | ![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white) |
| **Backend** | ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white) |
| **Visualization** | ![D3.js](https://img.shields.io/badge/D3.js-F9A03C?style=for-the-badge&logo=d3.js&logoColor=white) ![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white) |

---

## 패키지 구조

```text
src/
├── components/         # UI 레이어 - 기능별 컴포넌트 (Globe, Node, Map 등)
├── hooks/              # 로직 레이어 - 시뮬레이션 및 데이터 처리 로직
├── store/              # 상태 레이어 - 중앙 집중형 전역 상태 (Zustand)
├── lib/                # 인프라 레이어 - 외부 서비스 클라이언트 설정
├── type/               # 명세 레이어 - 정적 타입 정의
└── styles/             # 스타일 레이어 - 전역 디자인 시스템
```

---

## 팀 및 업무 분담

<div style="overflow:hidden;">
<table>
  <tr>
    <td colspan="1" align="center"><strong>Frontend Architecture</strong></td>
    <td colspan="1" align="center"><strong>Backend & Data</strong></td>
    <td colspan="1" align="center"><strong>3D Visualization</strong></td>
  </tr>
  <tr>
    <td align="center">
      <img src="https://avatars.githubusercontent.com/u/67681246?v=4" width="150px" alt="민사빈"/><br/><sub><b>민사빈</b></sub>
    </td>
    <td align="center">
      <img src="https://via.placeholder.com/150" width="150px;" alt="팀원 1"/><br/><sub><b>팀원 1</b></sub>
    </td>
    <td align="center">
      <img src="https://via.placeholder.com/150" width="150px;" alt="팀원 2"/><br/><sub><b>팀원 2</b></sub>
    </td>
  </tr>
</table>

**업무 분담 상세**
- **민사빈**: 프론트엔드 시스템 아키텍처 설계, 전역 상태 관리 모델(Zustand) 구축, 렌더링 가상화 최적화 및 D3.js 물리 엔진 고도화.
- **팀원 1**: Supabase 스키마 설계, RLS 보안 정책 구축 및 데이터베이스 연동 API 개발.
- **팀원 2**: Unity WebGL 모듈 최적화 및 시각화용 3D 그래픽 에셋 관리.
</div>

---

<div align="right">
  Copyright © 2026 민사빈. All rights reserved.
</div>
