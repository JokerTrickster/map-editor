# 프론트엔드 기획 요약

## 목표 플로우
- 로그인(구글 OAuth) → 서비스 선택(1차: 주차장) → 도면 업로드 → AI 맵 생성 결과 적용 → 맵 에디팅(오브젝트/속성/관계) → JSON 내보내기 → JSON 기반 뷰어 확인.

## 폴더 구조(제안, React+Vite+TS)
- `src/app/`: 라우팅/레이아웃/가드
- `src/pages/`: `login`, `service-select`, `editor`, `viewer`
- `src/features/`: `auth`, `project`, `canvas`, `objects`, `relations`, `ai-import`, `viewer`
- `src/entities/`: 공용 타입/스키마(`MapObject`, `Relation`, `Asset`, `ProjectMetadata`)
- `src/widgets/`: 상단바, 패널, 툴바, 히스토리바
- `src/shared/ui`: 버튼/모달/입력 등 베이스 UI
- `src/shared/lib`: 유틸(좌표 변환, 스냅, 단축키 매핑)
- `src/shared/hooks`: 공용 훅
- `src/shared/config`: 상수, 피처 플래그
- `src/shared/api`: fetch 클라이언트, React Query 키
- `src/assets/`, `src/styles/`, `tests/`

## 아키텍처 원칙
- 상태: 클라이언트 상태(Zustand) + 서버/비동기(React Query); undo/redo는 `project` 슬라이스에 기록.
- 렌더링: 지도 라이브러리(Leaflet/MapLibre) + 벡터 오버레이(Konva/SVG) 레이어 분리.
- 데이터: 단일 JSON 스키마(zod) → import/export/뷰어 동일 사용, 관계 대상 ID 검증 필수.
- 의존성: `features` → `shared`만 의존, 상위 페이지는 조립만 담당.
- 저장: 자동 저장(로컬) + 수동 저장 버튼; 내보내기 전 전체 검증.

## JSON 스키마 초안
- 루트: `metadata`(version, serviceType, createdAt), `assets`, `objects`.
- `object`: `id`, `type`, `name`, `geometry`(polygon/line/point), `style`, `properties`(커스텀 key-value), `assetRefs`, `relations`.
- `relations`: `targetId`, `type`, `weight/meta`; 없는 ID 참조 금지, 순환 허용 여부 명시.

## 뷰어 호환 전략(커스텀 오브젝트 대비)
- 최소 필수 필드만 강제: `id`, `type`, `geometry`, 필요 시 `size`(point/icon), `style`(선택), `assetRefs`(선택), `metadata.version`.
- 커스텀 필드는 `properties: Record<string, unknown>`로 두고 렌더 로직과 분리(정보 패널에서만 표시).
- 타입 레지스트리: `(type) -> 렌더 전략` 매핑. 등록되지 않은 타입은 fallback 심볼/색으로 표시.
- 누락 대체: 스타일/에셋이 없으면 기본 토큰 기반 색/아이콘으로 채워 렌더 지속성 확보.
- 검증: 좌표/geometry/z-index 충돌만 zod로 강제, 나머지는 optional. 깨진 `assetRefs`는 무시 후 기본 아이콘 사용.
- 버전: `metadata.version`으로 스키마 버전 관리, `extensions` 필드에 실험적 데이터 허용.

## 에셋 저장소 연동(사전 서명 URL, S3 계열 가정)
- `POST /assets/presign` → `{ uploadUrl, downloadUrl, id, expiresAt, contentType }`.
- 업로드 플로우: 파일 검증 → presign → `PUT uploadUrl` → `id`/`downloadUrl`를 오브젝트 `assetRefs`에 저장.
- 검증: 확장자/용량(5~10MB 권장)/MIME 화이트리스트(svg/png/jpg/webp).
- CORS: `PUT`/`GET` 허용, 만료 시 재발급 처리.
- 구현 포인트: `features/objects/useAssetUpload`, `shared/lib/upload.ts`, `project.assets` 캐시로 미리보기 재사용.

## 스타일 시스템(토큰 기반, 라이트/다크 대응)
- `styles/tokens.css`: 색/타이포/간격/반경/그림자/z-index를 CSS 변수로 중앙 관리. 예) `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--radius-md`, `--space-4`.
- `styles/global.css`: 리셋 + 기본 타이포 + 포커스 링 통일 + 스크롤바 커스텀.
- 컴포넌트: `shared/ui`에 버튼/입력/모달 등 상태/크기 일관성; 토큰 외 임의 색상 사용 금지(stylelint/ESLint rule).
- 레이아웃: 에디터는 CSS Grid(상단바/좌패널/캔버스/우패널/하단), 패널 폭 고정 + 리사이즈 핸들 옵션.
- 아이콘: 인라인 SVG, `currentColor` 사용, 16/20/24px 스케일 규칙.

## 우선 구현 순서
1) 라우팅 스켈레톤 + `auth`/`service-select`
2) `entities` 타입·zod 스키마 + `project` 스토어/undo 스택 + import/export
3) 캔버스 기본 렌더 + 오브젝트 팔레트/속성 패널
4) 관계 UI + 검증
5) AI 업로드/적용 모달(API 목업)
6) 뷰어: JSON 로드 → 동일 렌더 파이프라인 재사용
7) 스타일 토큰 적용 + 컴포넌트 통일
8) 테스트: Vitest+RTL(스토어/패널), Playwright(업로드→편집→내보내기→뷰어)

## 서비스 흐름 & 서버 연동(프로젝트 진입)
- 플로우: 구글 로그인 → 주차장 서비스 선택 → 프로젝트 생성 or 기존 프로젝트 선택 → 에디터 진입.
- API 예시(REST):
  - `GET /projects?service=parking` → 목록 `{ id, name, updatedAt, thumbnailUrl? }`.
  - `POST /projects` body `{ name, serviceType: "parking" }` → 빈 프로젝트 생성, 기본 JSON 템플릿 반환.
  - `GET /projects/:id` → 프로젝트 메타 + JSON 데이터(`objects`, `assets`, `relations`, `metadata`).
  - `PUT /projects/:id` → 전체 JSON 저장(자동/수동 저장시 호출).
  - `POST /projects/:id/thumbnail` → 캔버스 스냅샷 업로드(옵션).
- 로딩/편집 흐름:
  - 생성: 빈 JSON 템플릿으로 에디터 초기화(기본 레이어, 배경 없음).
  - 기존 열기: `GET /projects/:id` → 스키마 검증 → 에디터 스토어에 로드 → 이어서 작업.
  - 저장: 변경 시 debounced autosave(`PUT`) + 수동 저장 버튼; 저장 실패 시 토스트/재시도.
- 내보내기/미리보기:
  - `POST /projects/:id/export`(선택) 또는 클라이언트에서 JSON 직렬화 후 다운로드.
  - 뷰어 페이지에서 JSON 업로드/선택 → 동일 렌더 파이프라인으로 미리보기; 서버에 저장된 최신 버전(`GET /projects/:id`)도 바로 조회 가능.
- 인증/권한:
  - 모든 API에 액세스 토큰 전달(구글 OAuth 후 백엔드 발급 토큰).
  - 프로젝트 접근 권한(소유/공유) 체크 실패 시 선택 화면으로 되돌리기.
