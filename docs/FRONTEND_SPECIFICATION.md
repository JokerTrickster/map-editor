# 맵 에디터 플랫폼 – 프론트엔드 사양서

> 이 문서는 맵 에디터 플랫폼 프론트엔드 개발의 모든 참고 사항을 포함합니다.

## 목차
- [1. 프로젝트 개요](#1-프로젝트-개요)
- [2. 서비스 플로우](#2-서비스-플로우)
- [3. 페이지 구성](#3-페이지-구성)
- [4. 주요 기능](#4-주요-기능)
- [5. 기술 아키텍처](#5-기술-아키텍처)
- [6. 데이터 구조 및 JSON 스키마](#6-데이터-구조-및-json-스키마)
- [7. 상태 관리](#7-상태-관리)
- [8. API 연동](#8-api-연동)
- [9. AI 통합](#9-ai-통합)
- [10. 개발 로드맵](#10-개발-로드맵)

---

## 1. 프로젝트 개요

### 1.1 목표
도면 파일(CAD/이미지 등)을 입력하면 AI가 기본 맵을 자동 생성하고, 사용자가 객체·속성·관계를 편집하여 표준 JSON 데이터를 만들 수 있는 **웹 기반 맵 에디터 & 뷰어 플랫폼** 구축

### 1.2 V1 범위
- **지원 서비스**: 주차장 도면만 지원
- **핵심 기능**: 도면 업로드 → AI 맵 생성 → 오브젝트 편집 → JSON Export → Viewer
- **인증**: Google OAuth 로그인

### 1.3 핵심 가치
- AI 자동화를 통한 초기 맵 생성 시간 단축
- 표준화된 JSON 포맷으로 데이터 호환성 확보
- 직관적인 UI/UX로 비개발자도 사용 가능

---

## 2. 서비스 플로우

```
[1] Google 로그인
       ↓
[2] 도면 파일 업로드 (SVG/JPG/PNG/PDF)
       ↓
[3] AI 맵 분석 → 기본 레이아웃 자동 생성
       ↓
[4] 맵 에디터
   - 오브젝트 배치 (드래그 앤 드롭)
   - 오브젝트 커스텀 생성 (CCTV, ParkingLocation, Column, Custom 등)
   - 다각형/라인 그리기
   - 속성 편집 (우측 패널)
   - 관계 설정 (관계도 생성)
   - JSON 미리보기
       ↓
[5] JSON Export (검증 및 다운로드)
       ↓
[6] Viewer에서 JSON 기반 렌더링 확인
```

**V1 플로우 특징**:
- 서비스 선택/프로젝트 선택 화면 없음 (주차장 도면만 지원)
- 로그인 성공 후 바로 도면 업로드 페이지로 이동
- 템플릿 선택 기능 없음 (V2 이후 추가 예정)

---

## 3. 페이지 구성

### 3.1 로그인 페이지 (`/login`)

**목적**: 사용자 인증

**기능**:
- Google OAuth 로그인 버튼
- 로그인 성공 시 `/upload`로 이동 (바로 도면 업로드 페이지)

**구현 참고**:
- `features/auth/` 모듈 사용
- 토큰은 `localStorage` 또는 `httpOnly cookie` 저장
- 로그인 상태 확인은 `AuthGuard` 컴포넌트로 보호

**구현 상태**: ✅ 완료

---

### 3.2 도면 업로드 페이지 (`/upload`) - **시작 페이지**

**목적**: 도면 파일 업로드 및 AI 분석 요청

**기능**:
- 파일 업로드 (드래그 앤 드롭 또는 파일 선택)
  - 지원 포맷: SVG, JPG, PNG, PDF
  - 파일 크기 제한: 10MB
- 파일 미리보기
- "AI 분석" 버튼 클릭 시:
  - `POST /ai/import`로 도면 전송
  - 로딩 상태 표시
  - 분석 완료 시 `/editor/:projectId`로 이동

**구현 참고**:
- `features/ai-import/` 모듈
- 업로드는 S3 Presigned URL 방식
- 진행 상태: `pending → uploading → analyzing → complete`

---

### 3.3 맵 에디터 페이지 (`/editor/:projectId`) ⭐ **핵심**

**목적**: 맵 객체 배치 및 편집

#### 레이아웃 구조
```
┌─────────────────────────────────────────┐
│         Top Bar (상단바)                 │
├───────┬─────────────────────┬───────────┤
│       │                     │           │
│ Left  │   Canvas            │  Right    │
│ Panel │   (캔버스)          │  Panel    │
│       │                     │           │
│       │                     │           │
├───────┴─────────────────────┴───────────┤
│         Bottom Bar (옵션)                │
└─────────────────────────────────────────┘
```

#### 좌측 패널 (Left Panel)
- **오브젝트 팔레트**: 배치 가능한 객체 목록
  - CCTV
  - ParkingLocation (주차구역)
  - Column (기둥)
  - Elevator
  - GuideBoard (안내판)
  - Entrance/Exit
  - 커스텀 오브젝트
- **에셋 목록**: 업로드된 이미지/아이콘
- **레이어 선택**: 층별/레이어별 필터링

#### 중앙 캔버스 (Canvas)
- **도면 배경**: AI 분석 결과 또는 업로드된 도면
- **오브젝트 렌더링**:
  - Point: 아이콘/심볼
  - Line: 경로/벽체
  - Polygon: 영역/구역
- **상호작용**:
  - 드래그 앤 드롭으로 오브젝트 배치
  - 클릭으로 선택 → 우측 패널에서 속성 편집
  - 다각형/라인 그리기 도구
  - 확대/축소 (Zoom)
  - 그리드 표시
  - 스냅 기능 (Snap to Grid/Object)
- **단축키**:
  - `Ctrl+Z`: Undo
  - `Ctrl+Shift+Z`: Redo
  - `Delete`: 선택 객체 삭제

#### 우측 패널 (Right Panel)
- **속성 편집**: 선택된 객체의 속성 폼
  - 기본 속성: id, name, type
  - 타입별 속성: height, direction, fov, number 등
  - 스타일: color, size, opacity
- **관계 설정**:
  - 연결된 객체 목록
  - 관계 추가/삭제
  - 관계 타입 선택
- **JSON 미리보기**: 현재 선택된 객체의 JSON 구조

#### 상단바 (Top Bar)
- 프로젝트 이름
- 저장 버튼 (Auto-save 상태 표시)
- Undo/Redo 버튼
- Export 버튼
- 설정 메뉴

**구현 참고**:
- 캔버스 렌더링: Konva.js 또는 Fabric.js 추천
- 지도 라이브러리: Leaflet 또는 MapLibre GL (좌표계 필요 시)
- 상태 관리: Zustand + React Query
- Undo/Redo: 히스토리 스택 관리

---

### 3.4 JSON Export 페이지 (`/export/:projectId` 또는 모달)

**목적**: 프로젝트 JSON 출력 및 다운로드

**기능**:
- 현재 프로젝트 JSON 표시 (포맷팅)
- JSON 검증 (Zod 스키마)
- 다운로드 버튼
- 복사 버튼
- 검증 에러 표시

**구현 참고**:
- `entities/schema.ts`에서 Zod 스키마 정의
- 검증 실패 시 에러 메시지와 함께 수정 유도

---

### 3.5 Viewer 페이지 (`/viewer` 또는 `/viewer/:projectId`)

**목적**: JSON 기반 맵 렌더링 (읽기 전용)

**기능**:
- JSON 파일 업로드 또는 프로젝트 ID로 로드
- 맵 렌더링 (에디터와 동일한 렌더 파이프라인)
- 객체 클릭 시 상세 정보 표시 (모달 또는 패널)
- 층/레이어 토글
- 확대/축소

**구현 참고**:
- `features/viewer/` 모듈
- 에디터와 렌더링 로직 공유 (`shared/lib/renderer.ts`)
- 편집 기능 비활성화

---

## 4. 주요 기능

### 4.1 오브젝트 배치 기능

**지원 오브젝트 타입**:

| 타입 | 설명 | Geometry |
|------|------|----------|
| CCTV | CCTV 카메라 | Point |
| ParkingLocation | 주차 구역 | Polygon |
| Column | 기둥 | Point |
| Elevator | 엘리베이터 | Point |
| GuideBoard | 안내판 | Point |
| Entrance | 입구 | Point |
| Exit | 출구 | Point |
| Wall | 벽체 | Line |
| Custom | 사용자 정의 | Point/Line/Polygon |

**배치 방법**:
1. 좌측 팔레트에서 객체 선택
2. 캔버스에 클릭 (Point) 또는 드래그 (Polygon/Line)
3. 자동으로 고유 ID 생성
4. 기본 속성 자동 설정

---

### 4.2 오브젝트 속성 정의

각 객체는 **공통 속성 + 타입별 속성**을 가집니다.

#### 공통 속성
```typescript
{
  id: string;           // 고유 ID (UUID)
  type: string;         // 객체 타입
  name: string;         // 객체 이름
  geometry: Geometry;   // 좌표/도형
  style?: Style;        // 색상, 크기 등
  properties?: Record<string, any>; // 커스텀 속성
  assetRefs?: string[]; // 에셋 ID 참조
  relations?: Relation[]; // 관계 목록
}
```

#### 타입별 속성 예시

**CCTV**:
```typescript
{
  type: "CCTV",
  properties: {
    height: number;        // 설치 높이 (m)
    direction: number;     // 방향 (0~360°)
    fov: number;           // 시야각 (°)
    linkedLocations: string[]; // 연결된 주차구역 ID
  }
}
```

**GuideBoard**:
```typescript
{
  type: "GuideBoard",
  properties: {
    direction: string;     // 안내 방향 (예: "좌측", "우측")
    linkedLocations: string[]; // 연결된 주차구역 ID
    scale: number;         // 크기
  },
  assetRefs: ["asset-id-123"] // 안내판 이미지
}
```

**ParkingLocation**:
```typescript
{
  type: "ParkingLocation",
  geometry: {
    type: "Polygon",
    coordinates: [[x1, y1], [x2, y2], ...]
  },
  properties: {
    number: string;        // 구역 번호 (예: "A-101")
    parkingType: "normal" | "disabled" | "ev" | "compact";
    level: string;         // 층 정보 (예: "B1", "1F")
    aiTag?: string;        // AI 태깅 정보
  }
}
```

---

### 4.3 오브젝트 관계도 생성

**관계 타입**:
- `coverage`: CCTV ↔ ParkingLocation (CCTV가 커버하는 구역)
- `guidance`: GuideBoard ↔ ParkingLocation (안내판이 가리키는 구역)
- `connection`: ParkingLocation ↔ ParkingLocation (인접 구역)
- `contains`: Level ↔ Layer (층에 포함된 레이어)

**관계 데이터 구조**:
```typescript
interface Relation {
  targetId: string;      // 대상 객체 ID
  type: string;          // 관계 타입
  meta?: {               // 추가 정보
    weight?: number;
    distance?: number;
    [key: string]: any;
  };
}
```

**UI 구현**:
- 우측 패널에서 "관계 추가" 버튼
- 대상 객체 선택 (드롭다운 또는 캔버스 클릭)
- 관계 타입 선택
- 관계 목록에 표시 (삭제 가능)
- 캔버스에 관계선 표시 (선택 시)

---

### 4.4 JSON Export 기능

**내보내기 포함 항목**:
- 전체 객체 목록 (`objects[]`)
- 객체 좌표 및 속성
- 관계도 (`relations[]`)
- 에셋 파일 경로 (`assets[]`)
- 메타데이터 (`metadata`)

**검증 항목**:
- 필수 필드 존재 여부
- ID 중복 검사
- 관계 대상 ID 존재 여부
- Geometry 좌표 유효성
- 순환 참조 검사 (선택)

**다운로드 형식**:
- 파일명: `{projectName}_{timestamp}.json`
- 포맷: JSON (들여쓰기 2칸)

---

### 4.5 JSON Import Viewer

**기능**:
- 저장된 JSON 파일 업로드 또는 프로젝트 ID로 로드
- 스키마 검증
- 정확한 렌더링 (에디터와 동일한 로직)
- 객체 클릭 시 상세 정보 패널
- 레이어 필터링
- 확대/축소/팬

**호환성 전략**:
- 최소 필수 필드만 강제: `id`, `type`, `geometry`
- 커스텀 필드는 `properties`로 수용
- 누락된 스타일/에셋은 기본값으로 대체
- 알 수 없는 타입은 fallback 아이콘 표시
- 버전 관리: `metadata.version`으로 스키마 버전 추적

---

### 4.6 에셋 업로드 기능

**지원 포맷**: SVG, PNG, JPG, WebP

**업로드 플로우**:
1. 파일 선택
2. 클라이언트 검증 (확장자, 용량, MIME 타입)
3. `POST /assets/presign` 요청 → `{ uploadUrl, downloadUrl, id }`
4. `PUT uploadUrl`로 파일 업로드 (S3)
5. `id`, `downloadUrl`을 객체 `assetRefs`에 저장

**검증 규칙**:
- 용량 제한: 5~10MB
- MIME 화이트리스트: `image/svg+xml`, `image/png`, `image/jpeg`, `image/webp`
- CORS 설정: `PUT`, `GET` 허용

**UI**:
- 좌측 패널의 "에셋" 탭
- 썸네일 목록
- 업로드 버튼
- 삭제 버튼 (사용 중인 에셋은 경고)

**구현 참고**:
- `features/objects/useAssetUpload.ts` 훅
- `shared/lib/upload.ts` 유틸리티
- `project.assets` 스토어에 캐시

---

## 5. 기술 아키텍처

### 5.1 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | React 18 | 컴포넌트 재사용성, 생태계 |
| 빌드 도구 | Vite | 빠른 개발 서버, HMR |
| 언어 | TypeScript | 타입 안정성, 개발 경험 |
| 상태 관리 | Zustand | 간결한 API, Devtools 지원 |
| 서버 상태 | React Query | 캐싱, 자동 동기화 |
| 라우팅 | React Router v6 | 표준 라우터 |
| 스타일링 | CSS Modules + Tokens | 스코프 분리, 일관성 |
| 캔버스 | Konva.js 또는 Fabric.js | 벡터 렌더링, 상호작용 |
| 지도 (옵션) | Leaflet 또는 MapLibre GL | 좌표계 필요 시 |
| 검증 | Zod | 런타임 타입 검증 |
| 테스트 | Vitest + React Testing Library + Playwright | 단위/통합/E2E |

---

### 5.2 폴더 구조 (Feature-Sliced Design)

```
src/
├── app/                      # 애플리케이션 설정
│   ├── router/               # 라우팅 설정
│   ├── layouts/              # 레이아웃 컴포넌트
│   └── guards/               # 인증 가드
│
├── pages/                    # 페이지 컴포넌트
│   ├── login/                # 로그인 페이지
│   ├── upload/               # 도면 업로드 페이지
│   ├── editor/               # 에디터 페이지
│   ├── export/               # Export 페이지
│   └── viewer/               # Viewer 페이지
│
├── features/                 # 기능 모듈
│   ├── auth/                 # 인증 (로그인, 로그아웃)
│   │   ├── api/
│   │   ├── hooks/
│   │   └── components/
│   ├── project/              # 프로젝트 관리 (생성, 저장, 불러오기)
│   │   ├── store/
│   │   ├── api/
│   │   └── hooks/
│   ├── canvas/               # 캔버스 렌더링 및 상호작용
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── objects/              # 오브젝트 배치 및 편집
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── relations/            # 관계 설정 및 관리
│   │   ├── components/
│   │   └── hooks/
│   ├── ai-import/            # AI 도면 분석 및 적용
│   │   ├── api/
│   │   └── components/
│   └── viewer/               # Viewer 전용 기능
│       ├── components/
│       └── hooks/
│
├── entities/                 # 도메인 엔티티
│   ├── types/                # 공통 타입 정의
│   │   ├── MapObject.ts
│   │   ├── Relation.ts
│   │   ├── Asset.ts
│   │   └── ProjectMetadata.ts
│   ├── schema/               # Zod 스키마
│   │   └── mapSchema.ts
│   └── constants/            # 객체 타입, 관계 타입 상수
│
├── widgets/                  # 조합된 UI 블록
│   ├── TopBar/               # 상단바
│   ├── LeftPanel/            # 좌측 패널
│   ├── RightPanel/           # 우측 패널
│   ├── ObjectPalette/        # 오브젝트 팔레트
│   └── PropertyPanel/        # 속성 패널
│
├── shared/                   # 공유 리소스
│   ├── ui/                   # 기본 UI 컴포넌트
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Select/
│   │   └── Toast/
│   ├── lib/                  # 유틸리티 함수
│   │   ├── coordinates.ts    # 좌표 변환
│   │   ├── snap.ts           # 스냅 기능
│   │   ├── shortcuts.ts      # 단축키 매핑
│   │   ├── upload.ts         # 파일 업로드
│   │   └── renderer.ts       # 공통 렌더링 로직
│   ├── hooks/                # 공용 훅
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   └── useKeyboardShortcut.ts
│   ├── config/               # 설정 파일
│   │   ├── constants.ts
│   │   └── featureFlags.ts
│   └── api/                  # API 클라이언트
│       ├── client.ts         # Fetch 클라이언트
│       └── queryKeys.ts      # React Query 키
│
├── assets/                   # 정적 에셋
│   ├── icons/
│   └── images/
│
├── styles/                   # 글로벌 스타일
│   ├── tokens.css            # 디자인 토큰
│   ├── global.css            # 글로벌 스타일
│   └── reset.css             # CSS Reset
│
└── tests/                    # 테스트 파일
    ├── unit/
    ├── integration/
    └── e2e/
```

---

### 5.3 아키텍처 원칙

#### 의존성 규칙
- `features` → `entities`, `shared` (O)
- `pages` → `features`, `widgets`, `shared` (O)
- `entities` → `shared` (O)
- **역방향 의존 금지**: `shared` → `features` (X)

#### 컴포넌트 설계
- **단일 책임**: 하나의 컴포넌트는 하나의 역할
- **Props Drilling 최소화**: 상태 관리 라이브러리 활용
- **재사용성**: `shared/ui`에 기본 컴포넌트 배치

#### 데이터 흐름
- 클라이언트 상태: Zustand (오브젝트, 캔버스 상태)
- 서버 상태: React Query (프로젝트, AI 요청, 에셋)
- 폼 상태: React Hook Form (속성 편집)

#### 렌더링 최적화
- `React.memo`로 불필요한 리렌더링 방지
- 가상화 (Virtualization): 많은 오브젝트 렌더링 시
- Canvas Layer 분리: 배경 / 오브젝트 / UI 레이어

---

## 6. 데이터 구조 및 JSON 스키마

### 6.1 JSON 스키마 (Root)

```typescript
interface MapProject {
  metadata: ProjectMetadata;
  assets: Asset[];
  objects: MapObject[];
}
```

---

### 6.2 ProjectMetadata

```typescript
interface ProjectMetadata {
  version: string;          // 스키마 버전 (예: "1.0.0")
  serviceType: "parking" | "construction" | "other";
  createdAt: string;        // ISO 8601
  updatedAt?: string;
  name?: string;            // 프로젝트 이름
  description?: string;
  author?: string;
  extensions?: Record<string, any>; // 실험적 데이터
}
```

---

### 6.3 Asset

```typescript
interface Asset {
  id: string;               // 고유 ID (UUID)
  name: string;             // 파일명
  url: string;              // 다운로드 URL (S3 등)
  contentType: string;      // MIME 타입 (예: "image/svg+xml")
  size?: number;            // 파일 크기 (bytes)
  uploadedAt?: string;      // 업로드 시각
}
```

---

### 6.4 MapObject

```typescript
interface MapObject {
  id: string;               // 고유 ID (UUID)
  type: string;             // 객체 타입 (예: "CCTV", "ParkingLocation")
  name: string;             // 객체 이름
  geometry: Geometry;       // Point, Line, Polygon
  style?: Style;            // 색상, 크기 등
  properties?: Record<string, any>; // 타입별 커스텀 속성
  assetRefs?: string[];     // 참조하는 에셋 ID 목록
  relations?: Relation[];   // 관계 목록
  metadata?: {              // 추가 메타데이터
    layer?: string;         // 레이어 이름
    level?: string;         // 층 정보 (예: "B1", "1F")
    zIndex?: number;        // 렌더링 순서
    visible?: boolean;      // 가시성
    locked?: boolean;       // 편집 잠금
  };
}
```

---

### 6.5 Geometry

```typescript
type Geometry = PointGeometry | LineGeometry | PolygonGeometry;

interface PointGeometry {
  type: "Point";
  coordinates: [number, number]; // [x, y]
}

interface LineGeometry {
  type: "Line";
  coordinates: [number, number][]; // [[x1, y1], [x2, y2], ...]
}

interface PolygonGeometry {
  type: "Polygon";
  coordinates: [number, number][][]; // [외부 링, 내부 링(옵션)]
}
```

---

### 6.6 Style

```typescript
interface Style {
  color?: string;           // 색상 (예: "#FF0000", "rgba(255,0,0,0.5)")
  fillColor?: string;       // 채우기 색상
  strokeColor?: string;     // 테두리 색상
  strokeWidth?: number;     // 테두리 두께
  opacity?: number;         // 투명도 (0~1)
  size?: number;            // 크기 (Point 객체)
  icon?: string;            // 아이콘 이름 또는 URL
  fontSize?: number;        // 텍스트 크기
  fontFamily?: string;      // 폰트
}
```

---

### 6.7 Relation

```typescript
interface Relation {
  targetId: string;         // 대상 객체 ID
  type: string;             // 관계 타입 (예: "coverage", "guidance")
  meta?: {                  // 추가 정보
    weight?: number;        // 가중치
    distance?: number;      // 거리
    [key: string]: any;
  };
}
```

---

### 6.8 Zod 스키마 예시

```typescript
import { z } from 'zod';

const PointGeometrySchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
});

const LineGeometrySchema = z.object({
  type: z.literal('Line'),
  coordinates: z.array(z.tuple([z.number(), z.number()])),
});

const PolygonGeometrySchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
});

const GeometrySchema = z.union([
  PointGeometrySchema,
  LineGeometrySchema,
  PolygonGeometrySchema,
]);

const RelationSchema = z.object({
  targetId: z.string().uuid(),
  type: z.string(),
  meta: z.record(z.any()).optional(),
});

const MapObjectSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  name: z.string(),
  geometry: GeometrySchema,
  style: z.record(z.any()).optional(),
  properties: z.record(z.any()).optional(),
  assetRefs: z.array(z.string().uuid()).optional(),
  relations: z.array(RelationSchema).optional(),
  metadata: z.object({
    layer: z.string().optional(),
    level: z.string().optional(),
    zIndex: z.number().optional(),
    visible: z.boolean().optional(),
    locked: z.boolean().optional(),
  }).optional(),
});

const MapProjectSchema = z.object({
  metadata: z.object({
    version: z.string(),
    serviceType: z.enum(['parking', 'construction', 'other']),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    author: z.string().optional(),
    extensions: z.record(z.any()).optional(),
  }),
  assets: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    url: z.string().url(),
    contentType: z.string(),
    size: z.number().optional(),
    uploadedAt: z.string().datetime().optional(),
  })),
  objects: z.array(MapObjectSchema),
});

export type MapProject = z.infer<typeof MapProjectSchema>;
```

---

## 7. 상태 관리

### 7.1 Zustand Store 구조

#### Project Store (`features/project/store/projectStore.ts`)
```typescript
interface ProjectState {
  // 프로젝트 데이터
  projectId: string | null;
  metadata: ProjectMetadata;
  assets: Asset[];
  objects: MapObject[];

  // 선택 상태
  selectedObjectIds: string[];

  // 히스토리 (Undo/Redo)
  history: {
    past: MapObject[][];
    future: MapObject[][];
  };

  // Actions
  setProject: (project: MapProject) => void;
  addObject: (object: MapObject) => void;
  updateObject: (id: string, updates: Partial<MapObject>) => void;
  deleteObject: (id: string) => void;
  selectObject: (id: string, multi?: boolean) => void;
  undo: () => void;
  redo: () => void;
}
```

#### Canvas Store (`features/canvas/store/canvasStore.ts`)
```typescript
interface CanvasState {
  // 뷰포트
  zoom: number;
  pan: { x: number; y: number };

  // 설정
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;

  // 도구
  activeTool: 'select' | 'move' | 'draw-polygon' | 'draw-line';

  // Actions
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  toggleGrid: () => void;
  setActiveTool: (tool: string) => void;
}
```

---

### 7.2 React Query 사용

```typescript
// features/project/api/projectApi.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: string) => [...projectKeys.lists(), { filters }] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// 프로젝트 목록 조회
export function useProjects(serviceType: string) {
  return useQuery({
    queryKey: projectKeys.list(serviceType),
    queryFn: () => fetchProjects(serviceType),
  });
}

// 프로젝트 상세 조회
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => fetchProject(id),
    enabled: !!id,
  });
}

// 프로젝트 저장
export function useSaveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; project: MapProject }) =>
      saveProject(data.id, data.project),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(projectKeys.detail(variables.id));
    },
  });
}
```

---

### 7.3 Undo/Redo 구현

```typescript
// features/project/store/projectStore.ts
const useProjectStore = create<ProjectState>((set) => ({
  objects: [],
  history: { past: [], future: [] },

  addObject: (object) => set((state) => {
    const newObjects = [...state.objects, object];
    return {
      objects: newObjects,
      history: {
        past: [...state.history.past, state.objects],
        future: [],
      },
    };
  }),

  undo: () => set((state) => {
    if (state.history.past.length === 0) return state;

    const previous = state.history.past[state.history.past.length - 1];
    const newPast = state.history.past.slice(0, -1);

    return {
      objects: previous,
      history: {
        past: newPast,
        future: [state.objects, ...state.history.future],
      },
    };
  }),

  redo: () => set((state) => {
    if (state.history.future.length === 0) return state;

    const next = state.history.future[0];
    const newFuture = state.history.future.slice(1);

    return {
      objects: next,
      history: {
        past: [...state.history.past, state.objects],
        future: newFuture,
      },
    };
  }),
}));
```

---

## 8. API 연동

### 8.1 API 엔드포인트

**Base URL**: `https://api.example.com/v1`

| Method | Endpoint | 설명 | Request | Response |
|--------|----------|------|---------|----------|
| POST | `/auth/google` | Google OAuth 로그인 | `{ token }` | `{ accessToken, user }` |
| GET | `/projects` | 프로젝트 목록 조회 | `?serviceType=parking` | `Project[]` |
| POST | `/projects` | 프로젝트 생성 | `{ name, serviceType }` | `Project` |
| GET | `/projects/:id` | 프로젝트 상세 조회 | - | `MapProject` |
| PUT | `/projects/:id` | 프로젝트 저장 | `MapProject` | `{ success: true }` |
| DELETE | `/projects/:id` | 프로젝트 삭제 | - | `{ success: true }` |
| POST | `/projects/:id/thumbnail` | 썸네일 업로드 | `FormData` | `{ thumbnailUrl }` |
| POST | `/assets/presign` | 에셋 업로드 URL 발급 | `{ filename, contentType }` | `{ uploadUrl, downloadUrl, id }` |
| POST | `/ai/import` | 도면 AI 분석 | `{ fileUrl, serviceType }` | `{ objects: MapObject[] }` |

---

### 8.2 API 클라이언트

```typescript
// shared/api/client.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}
```

---

### 8.3 에셋 업로드 플로우

```typescript
// shared/lib/upload.ts
export async function uploadAsset(file: File): Promise<Asset> {
  // 1. Presigned URL 요청
  const { uploadUrl, downloadUrl, id } = await apiFetch<{
    uploadUrl: string;
    downloadUrl: string;
    id: string;
  }>('/assets/presign', {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
    }),
  });

  // 2. S3에 파일 업로드
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  // 3. 에셋 정보 반환
  return {
    id,
    name: file.name,
    url: downloadUrl,
    contentType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };
}
```

---

## 9. AI 통합

### 9.1 AI 분석 단계별 발전

#### V1 (현재 목표)
- **입력**: 도면 이미지 (SVG/JPG/PNG/PDF)
- **출력**: 기본 레이아웃 (선, 기둥, 벽체)
- **기능**:
  - 벽체 인식 → Line 객체
  - 기둥 인식 → Point 객체 (Column 타입)

#### V2 (고도화)
- **추가 인식**:
  - 출입구/엘리베이터 → Point 객체
  - 주차구역 → Polygon 객체 (자동 번호 할당)
- **개선**:
  - 인식 정확도 향상
  - 다양한 도면 포맷 지원

#### V3 (완전 자동화)
- **고급 기능**:
  - CCTV 시야각 자동 추정
  - 관계도 자동 생성 (CCTV ↔ 주차구역)
  - 레벨/층 자동 분리
- **AI 추천**:
  - 최적 CCTV 배치 위치 제안
  - 안내판 위치 추천

---

### 9.2 AI API 연동

```typescript
// features/ai-import/api/aiApi.ts
export interface AiImportRequest {
  fileUrl: string;          // 도면 파일 URL (S3 등)
  serviceType: string;      // "parking"
  options?: {
    detectWalls?: boolean;
    detectColumns?: boolean;
    detectParkingSlots?: boolean;
  };
}

export interface AiImportResponse {
  objects: MapObject[];     // AI가 인식한 객체 목록
  confidence?: number;      // 신뢰도 (0~1)
  metadata?: {
    processingTime?: number;
    detectedCount?: Record<string, number>;
  };
}

export async function importFromAi(
  request: AiImportRequest
): Promise<AiImportResponse> {
  return apiFetch<AiImportResponse>('/ai/import', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
```

---

### 9.3 AI 분석 결과 적용

```typescript
// features/ai-import/hooks/useAiImport.ts
export function useAiImport() {
  const addObjects = useProjectStore((state) => state.addObjects);

  const mutation = useMutation({
    mutationFn: importFromAi,
    onSuccess: (response) => {
      // AI 결과를 프로젝트에 추가
      addObjects(response.objects);

      toast.success(`${response.objects.length}개 객체 인식 완료`);
    },
    onError: (error) => {
      toast.error('AI 분석 실패: ' + error.message);
    },
  });

  return mutation;
}
```

---

## 10. 개발 로드맵

### 10.1 MVP (V1) - 필수 기능

**Phase 1: 기본 구조 (Week 1-2)**
- [x] 프로젝트 초기화 (Vite + React + TypeScript)
- [ ] 폴더 구조 구성 (Feature-Sliced Design)
- [ ] 라우팅 설정 (React Router)
- [ ] 인증 플로우 (Google OAuth)
- [ ] 서비스 선택 페이지

**Phase 2: 데이터 및 상태 (Week 2-3)**
- [ ] 타입 정의 (`entities/types/`)
- [ ] Zod 스키마 (`entities/schema/`)
- [ ] Zustand Store (project, canvas)
- [ ] React Query 설정
- [ ] JSON Import/Export 기능

**Phase 3: 캔버스 및 오브젝트 (Week 3-5)**
- [ ] 캔버스 렌더링 (Konva.js)
- [ ] 오브젝트 팔레트
- [ ] 드래그 앤 드롭 배치
- [ ] 속성 패널
- [ ] 오브젝트 CRUD
- [ ] Undo/Redo

**Phase 4: 관계 및 에셋 (Week 5-6)**
- [ ] 관계 UI
- [ ] 관계 검증
- [ ] 에셋 업로드 (S3 Presigned URL)
- [ ] 에셋 미리보기

**Phase 5: AI 연동 (Week 6-7)**
- [ ] 도면 업로드 페이지
- [ ] AI API 연동
- [ ] AI 분석 결과 적용
- [ ] 로딩 상태 UI

**Phase 6: Viewer (Week 7-8)**
- [ ] Viewer 페이지
- [ ] JSON 로드
- [ ] 렌더링 (에디터와 동일한 로직)
- [ ] 상세 정보 패널

**Phase 7: 스타일 및 UX (Week 8-9)**
- [ ] 디자인 토큰 적용
- [ ] 컴포넌트 통일
- [ ] 반응형 레이아웃
- [ ] 다크 모드 (선택)

**Phase 8: 테스트 및 최적화 (Week 9-10)**
- [ ] 단위 테스트 (Vitest)
- [ ] 통합 테스트 (RTL)
- [ ] E2E 테스트 (Playwright)
- [ ] 성능 최적화

---

### 10.2 V2 - 고도화

- [ ] 공사 현장 서비스 추가
- [ ] AI 인식 고도화 (주차구역, 출입구)
- [ ] 협업 기능 (다중 사용자)
- [ ] 버전 관리 (프로젝트 히스토리)
- [ ] 템플릿 기능

---

### 10.3 V3 - 완전 자동화

- [ ] AI 관계도 자동 생성
- [ ] AI 최적 배치 추천
- [ ] 레벨/층 자동 분리
- [ ] 3D 뷰어 (선택)
- [ ] 모바일 앱

---

## 부록

### A. 디자인 토큰 예시

```css
/* styles/tokens.css */
:root {
  /* Colors */
  --color-bg: #ffffff;
  --color-surface: #f5f5f5;
  --color-text: #1a1a1a;
  --color-text-secondary: #666666;
  --color-accent: #0066cc;
  --color-border: #e0e0e0;
  --color-error: #d32f2f;
  --color-success: #388e3c;
  --color-warning: #f57c00;

  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-sm: 12px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

  /* Z-index */
  --z-base: 0;
  --z-dropdown: 1000;
  --z-modal: 2000;
  --z-toast: 3000;
}

[data-theme="dark"] {
  --color-bg: #1a1a1a;
  --color-surface: #2d2d2d;
  --color-text: #ffffff;
  --color-text-secondary: #b0b0b0;
  --color-border: #404040;
}
```

---

### B. 객체 타입 상수

```typescript
// entities/constants/objectTypes.ts
export const OBJECT_TYPES = {
  CCTV: 'CCTV',
  PARKING_LOCATION: 'ParkingLocation',
  COLUMN: 'Column',
  ELEVATOR: 'Elevator',
  GUIDE_BOARD: 'GuideBoard',
  ENTRANCE: 'Entrance',
  EXIT: 'Exit',
  WALL: 'Wall',
  CUSTOM: 'Custom',
} as const;

export type ObjectType = typeof OBJECT_TYPES[keyof typeof OBJECT_TYPES];

export const OBJECT_TYPE_LABELS: Record<ObjectType, string> = {
  [OBJECT_TYPES.CCTV]: 'CCTV',
  [OBJECT_TYPES.PARKING_LOCATION]: '주차 구역',
  [OBJECT_TYPES.COLUMN]: '기둥',
  [OBJECT_TYPES.ELEVATOR]: '엘리베이터',
  [OBJECT_TYPES.GUIDE_BOARD]: '안내판',
  [OBJECT_TYPES.ENTRANCE]: '입구',
  [OBJECT_TYPES.EXIT]: '출구',
  [OBJECT_TYPES.WALL]: '벽체',
  [OBJECT_TYPES.CUSTOM]: '사용자 정의',
};
```

---

### C. 관계 타입 상수

```typescript
// entities/constants/relationTypes.ts
export const RELATION_TYPES = {
  COVERAGE: 'coverage',
  GUIDANCE: 'guidance',
  CONNECTION: 'connection',
  CONTAINS: 'contains',
} as const;

export type RelationType = typeof RELATION_TYPES[keyof typeof RELATION_TYPES];

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  [RELATION_TYPES.COVERAGE]: 'CCTV 커버리지',
  [RELATION_TYPES.GUIDANCE]: '안내판 가이드',
  [RELATION_TYPES.CONNECTION]: '구역 연결',
  [RELATION_TYPES.CONTAINS]: '포함 관계',
};
```

---

## 마치며

이 문서는 맵 에디터 플랫폼 프론트엔드 개발의 모든 측면을 다룹니다. 개발 중 참고하여 일관성 있는 코드를 작성하시기 바랍니다.

**주요 원칙**:
1. 타입 안정성 (TypeScript + Zod)
2. 재사용 가능한 컴포넌트 (Feature-Sliced Design)
3. 일관된 상태 관리 (Zustand + React Query)
4. 표준화된 JSON 스키마
5. AI 자동화를 통한 사용자 경험 향상

**문서 업데이트**:
- 이 문서는 프로젝트 진행에 따라 지속적으로 업데이트됩니다.
- 변경 사항이 있을 경우 팀과 공유하고 문서를 갱신하세요.
