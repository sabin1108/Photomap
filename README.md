# PhotoMap: 여행의 기억을 데이터로 시각화하다

사용자의 사진 속에 숨겨진 GPS와 시간 데이터를 추출하여 다양한 인터랙티브 시각화로 변환해주는 프리미엄 여행 아카이빙 플랫폼입니다.

## 목차
- [개요](#개요)
- [프로젝트 정보](#프로젝트-정보)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [기술적 고도화 및 최적화](#기술적-고도화-및-최적화)
- [협업 및 업무 분담](#협업-및-업무-분담)

---

## 개요
PhotoMap은 수많은 사진 데이터를 단순히 저장하는 것을 넘어, 위치, 3D 지도, 그래프 뷰 등 다양한 시각적 정보를 통해 사용자가 자신의 여행 궤적을 직관적으로 탐색할 수 있도록 돕습니다. 버려지기 쉬운 사진 속 메타데이터(위치, 시간)를 활용하여 대규모 데이터 환경에서도 매끄러운 사용자 경험을 제공하는 고성능 프론트엔드 아키텍처를 구축하는 것을 목표로 합니다.

### 해결하려는 문제
1. 메타데이터(위치, 시간) 시각화 도구의 부재 및 탐색의 한계
- 대부분의 사진에는 위치와 시간이라는 풍부한 메타데이터가 포함되어 있으나, 이를 사용자가 접하는 상황은 극 소수이다 이를 해결하기 위해 사용자가 이 정보들을 활용할 수 있게 제작하였습니다. 
2. 다양한 시각화 도구를 사용하여 사용자의 정보 저장에 대한 목표를 제공
- 단순히 사진을 저장하는 공간을 넘어, 누적된 데이터를 3D 지도와 그래프 등 다양한 형태의 시각적 결과물로 환원하여 보여줍니다. 기록이 쌓일수록 커지는 시각적 성취감을 통해 장기적인 서비스 이탈을 방지하고, 사용자의 자발적이고 지속적인 기록을 유도합니다.
3. 부정적인 사용자 경험(UX)의 선제적 차단 및 렌더링 최적화
- 대용량 이미지와 3D 환경을 렌더링할 때 발생하는 화면 지연 현상을 해결하기 위해 렌더링 성능과 번들 사이즈를 최적화했습니다. 초기 로딩 속도를 개선하고 스크롤 시의 버벅임을 최소화하여, 사용자가 수많은 사진을 탐색할 때 느낄 수 있는 불쾌감을 없애고 쾌적한 환경을 제공합니다.

## 프로젝트 정보
* **개발 기간**: 2025/12/14 ~ 2026/04 (진행 중)
* **팀 구성**: 3인 (FrontEnd 1명, DB 1명, Unity 1명)

---


## 아키텍처 개요

현재 프로젝트는 다음과 같은 고성능 프론트엔드 아키텍처로 구성되어 있습니다:

- **Frontend (Vite + React)**: 고성능 시각화를 위한 렌더링 최적화 및 상태 관리
  - **시각화 엔진**: D3.js (물리 노드), Cobe (3D 지구본)
  - **상태 관리**: Zustand를 활용한 Selector 기반 정밀 구독 모델
  - **최적화**: @tanstack/react-virtual 기반의 대규모 데이터 가상화(Windowing)
- **Backend (Supabase/PostgreSQL)**: 서버리스 인프라 활용
  - **Auth**: 사용자와의 인증 및 권한 관리
  - **Database**: PostgreSQL 기반의 지리 데이터 및 사진 메타데이터 저장
  - **Storage**: 사진 및 미디어 에셋 저장소
- **Visual Integration**: Unity WebGL 모듈 연동을 통한 고급 3D 시각화 지원

## 프로젝트 구조

- `Frontend/` : Vite 기반 React 프론트엔드 소스 코드
  - `src/components/` : 기능별 단위 컴포넌트 (Globe, Node, Map 등)
  - `src/store/` : Zustand 기반 전역 상태 관리
  - `src/hooks/` : 시뮬레이션 및 데이터 처리 커스텀 훅
- `Backend/` : 백엔드 관련 리소스 (현재 Supabase 연동 방식)
- `Unity/` : Unity WebGL 시각화 모듈 및 에셋
- `docs/` : 프로젝트 기술 설계 및 성과 문서화
- `README.md` : 프로젝트 로드맵 및 개요 문서

## DB 설계
[![image.png](https://i.postimg.cc/MH8grFRf/image.png)](https://postimg.cc/62YH8zMB)


## 주요 기능
### 1. 메인 화면
[![meinsajin.png](https://i.postimg.cc/FFM0wQYt/meinsajin.png)](https://postimg.cc/DmcWbHQ5)
- 좌측 사이드바: 메뉴 네비게이션
- 중앙: 사진 히스토리 및 사진 위치 3D 지구본 뷰 
- 우측 하단 파일 업로드
- 기타(서능 테스트를 위한 모니터뷰)

### 2. 사진 업로드 및 관리
[![eoblodeu.gif](https://i.postimg.cc/MTs5N4yX/eoblodeu.gif)](https://postimg.cc/8J6LrZXV)
- EXIF 데이터 기반 위치 자동 추출 및 수동 위치 입력 기능을 제공 
- 업로드 전 설명 작성 및 카테고리 지정이 가능하며 기본적인 CRUD 기능을 지원

### 3. MapBox를 이용한 unity 연결 3D 지도
[![jido-jigubonsajin.png](https://i.postimg.cc/J7fjSWsy/jido-jigubonsajin.png)](https://postimg.cc/grKw6Qqd)
[![jidoabchug.gif](https://i.postimg.cc/wMLg1NcK/jidoabchug.gif)](https://postimg.cc/m1L0qt5V)
-  Unity WebGL 기반을 이용한 사진 확대 및 호버 시스템
-  3D 지도인 MapBox api를 통해 지도를 시각화


### 4. 그래프 뷰 

[![nodeu.gif](https://i.postimg.cc/HxW3SH8P/nodeu.gif)](https://postimg.cc/d7X81bB8)

- 사진으 시각적 정보를 담기 위한 D3.js를 이용한 물리적 그래프 뷰 

### 5. 카테고리 시스템
[![poldeo-wichibyeongyeong.gif](https://i.postimg.cc/BZVNCrSL/poldeo-wichibyeongyeong.gif)](https://postimg.cc/9zyGmNqC)
- 중복 방지 로직이 포함됨 커스텀 카테고리 생성, 아이콘 지정 및 다차원 정렬 기능을 추가




## 기술적 고도화 및 최적화

* **대규모 렌더링 가상화(Virtualization) 적용을 통한 렌더링 병목 해결**
  * `@tanstack/react-virtual`을 도입하여 브라우저의 DOM 과부하를 방지했습니다. **10,000건 이상의 고해상도 사진** 로드 시 화면에 보이는 DOM 노드를 200개 미만으로 유지하여, 극심한 프리즈(Freeze) 현상을 해결하고 **안정적인 60FPS 스크롤 성능**을 확보했습니다.
  
  | 개선 전 (DOM 과부하로 인한 화면 프리즈 현상) | 개선 후 (가상화 적용으로 60FPS 방어 성공) |
  | :---: | :---: |
  | [![과부하 개선전]((https://i.postimg.cc/XNzxgRjc/peulijeu-hyeonsang.gif)](https://postimg.cc/jCyzxkJL)) | [![과부하 개선후](https://i.postimg.cc/KcHQ56Gw/peulijeuhyeonsang-haegyeol.gif)](https://postimg.cc/ThnrdHWJ) |

* **상태 관리 아키텍처 개편 (Context API → Zustand)**
  * 기존 Context API의 불필요한 전역 리렌더링 문제를 파악하고 Zustand로 전환했습니다. Selector 패턴을 적용해 상태 구독 범위를 최소화하여 컴포넌트 렌더링 커밋 시간을 **약 30%(9.7ms → 6.2ms) 단축**했습니다.

* **네트워크 병렬 처리를 통한 Waterfall 병목 해결**
  * 상호 의존성이 없는 다수의 비동기 데이터 요청을 `Promise.all`로 묶어 병렬 처리 구조로 개편했습니다. 불필요한 대기 시간(Waterfall)을 차단하여 **초기 데이터 로딩 속도를 기존 대비 약 50% 이상 개선**했습니다.

* **React-D3 렌더링 제어권 분리를 통한 애니메이션 최적화**
  * D3 물리 시뮬레이션 연산 시 React의 상태(State) 업데이트를 거치지 않고, CSS 변수와 SVG 속성에 직접 좌표를 주입하도록 설계했습니다. 이를 통해 리액트 리렌더링 부하를 완전히 없애고 끊김 없는 애니메이션을 보장합니다.

* **낙관적 업데이트(Optimistic UI) 기반 심리스(Seamless) UX 구축**
  * 사용자의 액션(저장, 삭제 등)에 대한 서버 응답 대기 시간을 UI에서 제거했습니다. 에러 발생 시 원래 상태로 복구하는 롤백(Rollback) 메커니즘을 함께 구축하여, 빠르고 안정적인 인터랙션 경험을 제공합니다.
---

## 기술 스택
* **Frontend**: React, Next.js (App Router), TypeScript, Zustand, Tailwind CSS, Radix UI
* **Visualization**: D3.js (d3-force, d3-zoom), Unity WebGL, Leaflet
* **Backend**: Supabase (PostgreSQL)

---


## 협업 및 업무 분담
* **민사빈 (Frontend)**: 프론트엔드 시스템 아키텍처 설계, 전역 상태 관리 모델(Zustand) 구축, 렌더링 가상화 최적화 및 D3.js 물리 엔진 고도화.
* **양준호 (Backend)**: Supabase 스키마 설계, RLS 보안 정책 구축 및 데이터베이스 연동 API 개발.
* **최순호 (3D Visualization)**: Unity WebGL 모듈 최적화 및 시각화용 3D 그래픽 에셋 관리.
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
* 개발 일지를 통한 주 단위 진행 상황 및 기술적 이슈 해결 과정 문서화.
* 마일스톤 캘린더를 활용한 개발 일정 및 주요 데드라인 시각화.
* 디스코드를 통한 회의 및 화면 공유로 실시간 피드백 진행.
