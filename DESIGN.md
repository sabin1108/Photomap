# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-09-12
- Primary product surfaces: 사진 피드, 지도, 앨범, 관계 그래프, 즐겨찾기.
- Evidence reviewed: README.md, Frontend/src/App.tsx, PhotoFeed.tsx, AlbumsView.tsx, ui/photo-modal.tsx, tests/demo-recovery.spec.js; E:/memory/photomap/2026-09-11-demo-recovery-frontend-handoff.md.
- Existing standalone design brief: absent. Existing image assets and responsive Tailwind layouts define the visual baseline; screenshot verification follows implementation.

## Brand
- Personality: 차분한 여행 사진 아카이브. 사진이 주인공.
- Trust signals: 예시 위치 명시, 읽기 전용 범위와 브라우저 저장 설명.
- Avoid: 제품 화면의 기술 자랑, 입증하지 않은 성능 수치.

## Product goals
- Goals: 장소·태그로 사진 발견, 상세 확인, 즐겨찾기, 다른 화면 방문 후 탐색 재개.
- Non-goals: 새 백엔드, 데이터 수집, Unity 재작성, 운영 배포.
- Success signals: 키보드만으로 상세 조작; 뒤로가기·새로고침으로 탐색 조건 복원; 빈 검색에서 복구 가능.

## Personas and jobs
- Primary personas: 여행 사진을 둘러보는 방문자; 구현 근거를 검토하는 프론트엔드 리뷰어.
- User jobs: 사진 찾기·위치 확인·마음에 드는 사진 보관·이전 탐색 재개.
- Key contexts: 로그인 없는 데스크톱/모바일 공개 데모. 기술 설명은 README와 QA 문서에서 제공.

## Information architecture
- Primary navigation: 기존 사이드바 유지.
- Core screens: 전체 사진, 지도, 관계, 타임라인, 즐겨찾기, 앨범.
- Content hierarchy: 무엇을 할 수 있는지 → 탐색 행동 → 사진 결과 → 상세.

## Design principles
- 기존 PhotoSearch, PhotoFeed, PhotoModal의 책임을 강화한다.
- 공유 사진/즐겨찾기는 Zustand, 복원할 탐색 조건은 URL, 임시 편집 UI는 로컬 상태.
- Tradeoffs: 지도와 앨범의 필터 의미는 분리. 범용 필터 프레임워크나 새 의존성은 만들지 않는다.

## Visual language
- Color: 기존 크림 배경, stone 텍스트, 테라코타 강조 유지.
- Typography: 기존 sans 및 제목 계층 유지.
- Spacing/layout rhythm: 기존 4px 기반 Tailwind 간격.
- Shape/radius/elevation: 사진 중심 카드와 둥근 패널 유지.
- Motion: 키보드 포커스는 즉시 표시; reduced-motion 환경에서 불필요한 전환 억제.
- Imagery/iconography: 기존 데모 이미지와 lucide 아이콘.

## Components
- Reuse: PhotoSearch, PhotoFeed, PhotoModal, Button, 기존 Radix dialog.
- Changed: 사진/앨범 카드 접근성, 공통 모달, URL 탐색 상태, 빈 결과 복구.
- Variants/states: 읽기 전용, 선택 모드, 로딩/빈 결과/조회 실패, 즐겨찾기 토글.
- Ownership: 화면별 필터 의미는 해당 화면, 공통 탐색 저장은 hook, 모달 상호작용은 PhotoModal.

## Accessibility
- Target: 수정한 흐름의 키보드 접근과 WCAG 2.2 AA 관련 동작 검증; 사이트 전체 인증을 주장하지 않는다.
- Keyboard/focus: 카드 Enter/Space, 명확한 포커스, 모달 포커스 제한/Escape/복귀.
- Contrast/readability: 사진 오버레이와 텍스트 대비 유지; 포커스를 색 변화만으로 표시하지 않는다.
- Screen reader: 버튼 이름, 현재 탐색/필터 상태, 결과 안내.
- Reduced motion: 사용자의 reduced-motion 설정 존중.

## Responsive behavior
- Devices: 390px 모바일, 1280px 데스크톱 검증.
- Layout: 기존 모바일 메뉴·세로 모달/데스크톱 가로 모달 유지.
- Touch/hover: 필수 조작은 hover 없이도 발견 가능.

## Interaction states
- Loading: 기존 skeleton/spinner 유지.
- Empty: 결과 없음 설명과 검색 초기화 행동.
- Error: 기존 DB 실패 시 예시 16장 fallback 유지.
- Success: 즐겨찾기 상태 즉시 반영, 저장 후 새로고침 유지.
- Disabled: 공개 모드 쓰기 기능 숨김 유지.
- Offline/slow network: 로컬 예시 유지; 원본 이미지 준비 중 thumbnail 유지.

## Content voice
- Tone: 짧고 구체적인 한국어.
- Terminology: 탐색, 장소, 태그, 앨범, 좋아요. 실제 EXIF와 예시 좌표 구분.
- Microcopy: 사용자 행동과 결과 설명; 기술 용어는 개발 문서로 이동.

## Implementation constraints
- React 18, TypeScript, Vite, Tailwind, Zustand; 새 의존성 없음.
- 기존 스타일 확장; 전면 토큰 치환은 범위 밖.
- 가상화와 lazy loading 보존. 좋아요 변경으로 원본 이미지 재로딩하지 않음.
- 성능 preview 6장/일반 데모 16장/가상화 벤치마크 조건 분리 유지.
- Tests: 기존 demo 회귀 먼저 실행, 변경 동작 browser 회귀, typecheck/build/diff 검증, 모바일/데스크톱 캡처.

## Open questions
- 실제 대량 사진 실험은 Commons 429 해소와 별도 측정 필요. 이번 수치 개선 주장 없음.

## Implementation and cleanup plan
1. 기존 demo 회귀를 실행해 동작 기준 확보.
2. 공유 PhotoModal 접근성 회귀를 먼저 추가하고 기존 Radix로 동작 보강; 이미지 의존성만 최소 변경.
3. URL 화면/탐색 조건 복원과 browser history 회귀 추가. 기존 UI와 성능 실험 파라미터 보존.
4. 사진/앨범 카드 키보드 조작, 빈 결과 초기화, 명확한 진입 행동 구현.
5. 별도 리뷰 후 browser 회귀·TypeScript·build 검증. README에 문제/해결/검증/한계를 연결.
