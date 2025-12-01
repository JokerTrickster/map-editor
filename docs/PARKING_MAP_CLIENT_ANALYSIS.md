# Parking Map Client 분석 보고서

> 기존 프로젝트(`/Users/luxrobo/project/Luzer/services/parking-map-client`)의 맵 에디터 구현 분석

## 📋 목차
1. [프로젝트 구조](#1-프로젝트-구조)
2. [핵심 기술 스택](#2-핵심-기술-스택)
3. [아키텍처 분석](#3-아키텍처-분석)
4. [도면 업로드 및 렌더링 플로우](#4-도면-업로드-및-렌더링-플로우)
5. [에셋 관리 시스템](#5-에셋-관리-시스템)
6. [JSON 데이터 구조](#6-json-데이터-구조)
7. [적용 가능한 핵심 패턴](#7-적용-가능한-핵심-패턴)

---

## 1. 프로젝트 구조

### 1.1 폴더 구조 (Feature-Sliced Design 변형)

```
src/
├── components/
│   └── AssetEditor/               # 맵 에디터 핵심 모듈
│       ├── pages/                 # 페이지 레벨 컴포넌트
│       │   ├── ImageBasedEditor/  # 이미지 기반 에디터 (3,300줄)
│       │   └── ServerDataEditor/  # 서버 데이터 에디터 (2,100줄)
│       ├── widgets/               # 도메인별 복잡한 UI 블록
│       │   ├── ParkingEditor/     # 주차 스탬프 도구
│       │   ├── RelationshipEditor/# 관계 관리 위젯
│       │   ├── TemplateEditor/    # 템플릿 속성 위젯
│       │   └── FloorEditor/       # 층 관리 위젯
│       ├── services/              # 비즈니스 로직 (순수 TS)
│       │   ├── cctv/              # CCTV 연결 관리
│       │   ├── relationship/      # 관계 관리
│       │   ├── template/          # 템플릿 속성 관리
│       │   ├── editor/            # 에디터 전역 제어
│       │   ├── validation/        # 검증 서비스
│       │   └── exporter/          # JSON 내보내기
│       ├── components/            # 재사용 가능한 단순 컴포넌트
│       │   └── CSVImporter.tsx
│       ├── lib/                   # 유틸리티 & 훅
│       │   └── hooks/
│       └── assets/
│           └── map_template.json  # JSON 템플릿
│
├── lib/
│   └── visual/
│       ├── element-generator/     # 에셋 렌더링 생성기
│       │   └── AdminElementGenerator.ts
│       └── utils/
│           └── PointHandler.ts    # 좌표 계산 유틸
│
└── types/
    └── AssetTypes.ts              # 에셋 타입 정의
```

### 1.2 의존성 규칙

```
pages/
  ↓
widgets/  →  services/
  ↓            ↓
components/  ←
  ↓
lib/
```

- **Pages**: 모든 레이어 사용 가능
- **Widgets**: services, lib만 사용 (Widget 간 직접 의존 금지)
- **Services**: lib만 사용 (순수 TypeScript)
- **Components**: lib만 사용

---

## 2. 핵심 기술 스택

### 2.1 캔버스 렌더링

**라이브러리**: `@joint/plus` (JointJS Plus)
- **dia.Graph**: 에셋 데이터 그래프 관리
- **dia.Paper**: 캔버스 렌더링
- **ui.PaperScroller**: 확대/축소/패닝
- **shapes.standard**: 기본 도형 (Image, Path, Rectangle 등)

### 2.2 주요 기능

| 기능 | 구현 방법 |
|------|----------|
| 배경 이미지 | `shapes.standard.Image` |
| 주차 구역 (Polygon) | `shapes.standard.Path` (커스텀 경로) |
| CCTV/기둥 (Point) | `shapes.standard.Rectangle` 또는 커스텀 |
| 드래그 앤 드롭 | JointJS 이벤트 핸들러 |
| 확대/축소 | `ui.PaperScroller.zoom()` |
| 스냅 가이드 | `SnapGuideManager` 서비스 |

---

## 3. 아키텍처 분석

### 3.1 Manager 패턴 (서비스 레이어)

모든 비즈니스 로직은 Manager 클래스로 분리:

```typescript
// services/relationship/RelationshipManager.ts
export class RelationshipManager {
  addRelationship(data: RelationshipData) {
    // 관계 추가 로직
  }

  removeRelationship(id: string) {
    // 관계 제거 로직
  }

  validateRelationship(data: RelationshipData): boolean {
    // 검증 로직
  }
}
```

**사용된 Manager들**:
- `EditorController`: 전역 에디터 상태
- `SelectionManager`: 선택 관리
- `ToolController`: 도구 전환
- `SnapGuideManager`: 스냅 가이드
- `RelationshipManager`: 관계 관리
- `TemplatePropertyManager`: 템플릿 속성
- `ValidationService`: 검증
- `ExportOrchestrator`: JSON 내보내기

### 3.2 Hook 기반 상태 관리

```typescript
// lib/hooks/useFloorManager.ts
export function useFloorManager() {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [currentFloorIndex, setCurrentFloorIndex] = useState(0);

  const switchToFloor = (index: number) => {
    // 층 전환 로직
  };

  return {
    floors,
    currentFloorIndex,
    switchToFloor,
    addFloor,
    removeFloor,
  };
}
```

**커스텀 훅들**:
- `useFloorManager`: 층 관리
- `useKeyboardMovement`: 키보드 이동
- `useRelationshipEditor`: 관계 편집
- `useEditorEvents`: 에디터 이벤트

---

## 4. 도면 업로드 및 렌더링 플로우

### 4.1 이미지 업로드 프로세스

```typescript
// ImageBasedEditor.tsx:910
const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];

  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const imageUrl = e.target?.result as string; // Base64 Data URL

      // 1. 이미지 크기 측정
      const img = new Image();
      img.onload = () => {
        const dimensions = {
          width: img.naturalWidth,
          height: img.naturalHeight,
        };

        // 2. 상태 업데이트
        setBackgroundImageDimensions(dimensions);
        setBackgroundImage(imageUrl);

        // 3. 층 데이터 업데이트
        updateCurrentFloor({
          backgroundImage: imageUrl,
          backgroundImageDimensions: dimensions,
        });

        // 4. 캔버스에 추가
        if (graph) {
          addBackgroundImage(graph, imageUrl);

          // 5. 자동 줌 조정
          if (paperScroller) {
            requestAnimationFrame(() => {
              paperScroller.zoom(0.2, { absolute: true });
              paperScroller.center();
            });
          }
        }
      };
      img.src = imageUrl;
    };

    reader.readAsDataURL(file); // Base64 변환
  }
};
```

**핵심 포인트**:
1. `FileReader.readAsDataURL()` - 파일을 Base64 Data URL로 변환
2. `Image.naturalWidth/Height` - 원본 이미지 크기 측정
3. 층(Floor) 단위로 이미지 저장
4. 자동 줌/센터링

### 4.2 배경 이미지 렌더링

```typescript
// ImageBasedEditor.tsx:606
const addBackgroundImage = useCallback(
  (graph: dia.Graph, imageUrl: string) => {
    // 1. 기존 배경 이미지 제거
    const elements = graph.getElements();
    const backgroundElements = elements.filter(
      (el) => el.get("type") === "standard.Image" && el.prop("isBackground")
    );
    backgroundElements.forEach((el) => el.remove());

    // 2. 이미지 크기 설정
    const imageWidth = backgroundImageDimensions?.width || 1200;
    const imageHeight = backgroundImageDimensions?.height || 800;

    // 3. JointJS Image 엘리먼트 생성
    const background = new shapes.standard.Image();
    background.position(0, 0); // 좌상단 기준
    background.resize(imageWidth, imageHeight);
    background.attr("image/xlinkHref", imageUrl); // SVG xlink:href
    background.attr("root/magnet", false); // 연결선 비활성화
    background.prop("isBackground", true); // 커스텀 플래그

    // 4. 그래프에 추가 및 맨 뒤로 배치
    background.addTo(graph);
    background.toBack(); // Z-index 맨 뒤

    // 5. 뷰포트 조정
    if (paperScroller) {
      const img = new Image();
      img.onload = () => {
        requestAnimationFrame(() => {
          paperScroller.center();

          // 컨테이너 크기에 맞춰 자동 줌 계산
          const containerWidth = containerRef.current?.clientWidth || 1200;
          const containerHeight = containerRef.current?.clientHeight || 800;

          const scaleX = (containerWidth * 0.4) / imageWidth;
          const scaleY = (containerHeight * 0.4) / imageHeight;
          const targetZoom = Math.min(scaleX, scaleY, 0.3);

          paperScroller.zoom(Math.max(targetZoom, 0.1), { absolute: true });
        });
      };
      img.src = imageUrl;
    }
  },
  [backgroundImageDimensions, paperScroller, containerRef]
);
```

**렌더링 전략**:
- `shapes.standard.Image` 사용
- `isBackground: true` 플래그로 배경 구분
- `toBack()` 으로 Z-index 맨 뒤 배치
- 자동 줌 레벨 계산 (컨테이너 크기의 40%)

---

## 5. 에셋 관리 시스템

### 5.1 에셋 타입 정의

```typescript
// types/AssetTypes.ts
export interface BaseAsset {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  angle?: number;
}

export interface ParkingSpaceAsset extends BaseAsset {
  type: "parking";
  parkingType: "REGULAR" | "ELECTRIC" | "HANDICAPPED" | "COMPACT" | ...;
  isEmpty: boolean;
  name: string;
}

export interface CCTVAsset extends BaseAsset {
  type: "cctv";
  name: string;
  ipAddress?: string;
}

export type AssetType =
  | ParkingSpaceAsset
  | CCTVAsset
  | ColumnAsset
  | EmergencyBellAsset
  | PreventionLightAsset
  | WarningLightAsset
  | CarChargerAsset
  | OnePassReaderAsset
  | ElevatorAsset
  | EntranceAsset;
```

### 5.2 에셋 색상 및 크기 상수

```typescript
// types/AssetTypes.ts
export const ASSET_COLORS = {
  parking: {
    REGULAR: "#4CAF50",
    ELECTRIC: "#2196F3",
    HANDICAPPED: "#FF9800",
    COMPACT: "#9C27B0",
    // ...
  },
  cctv: "#FF5722",
  column: "#795548",
  // ...
};

export const DEFAULT_SIZES = {
  parking: { width: 260, height: 520 },
  cctv: { width: 30, height: 30 },
  column: { width: 140, height: 210 },
  // ...
};
```

### 5.3 ElementGenerator 패턴

```typescript
// lib/visual/element-generator/AdminElementGenerator.ts
export class AdminElementGenerator implements ElementGeneratorStrategy {
  // Polygon (Path) 생성
  getPathElement({ points, position, id, name, fill }) {
    const { height, width } = this.pointHandler.getSize(points);
    const refD = this.pointHandler.pointsToPath(points); // SVG path 변환

    return new shapes.standard.Path({
      position: position,
      name: name,
      size: { width, height },
      outlineId: id,
      attrs: {
        body: {
          refD: refD,
          fill: fill,
          stroke: stroke,
          strokeWidth: strokeWidth,
        },
      },
    });
  }

  // 주차 구역 렌더링
  getParkingLocations(assets: ParkingLocationAssetModel[], referenceLength: number) {
    return assets.map((asset) => {
      const { position, points, id, name, type, isEmpty } = asset;

      // 크기 계산
      const { height, width } = this.pointHandler.getSize(points);

      // SVG Path 생성 (라운드 코너 적용)
      const refD = this.pointHandler.pointsToPath(
        points.map((point) => ({ ...point, r: borderRadius }))
      );

      return new shapes.standard.Path({
        position,
        name,
        size: { width, height },
        attrs: {
          body: {
            refD: refD,
            fill: getColorByType(type),
            stroke: isEmpty ? "gray" : "black",
          },
        },
      });
    });
  }
}
```

**패턴 요약**:
- `PointHandler`: 좌표 → SVG Path 변환
- `ElementGenerator`: 타입별 JointJS Element 생성
- Strategy 패턴으로 Admin/Client 버전 분리

---

## 6. JSON 데이터 구조

### 6.1 전체 구조

```json
{
  "data": {
    "createdAt": "2025-04-01T13:00:00.123Z",
    "name": "P1",
    "parkingLotLevels": [
      {
        "code": "B2",
        "mapData": {
          "cctv": { "light_cctv": [...], "warning_cctv": [...] },
          "zone": [...],
          "guideBoard": [...],
          "parkingLocation": [...],
          "arrow": [...],
          "column": [...],
          "outLine": [...],
          "elevator": [...],
          "entrance": [...],
          "innerLine": [...],
          "carCharger": [...],
          "emergencyBell": [...],
          "onePassReader": [...],
          "occupancyLight": [...]
        }
      }
    ]
  }
}
```

### 6.2 주요 객체 스키마

#### CCTV (Light CCTV)
```json
{
  "id": "P1_B2_1_3",
  "position": [120.5, 340.0],
  "ip_address": "172.168.0.95",
  "column": 3,
  "left_cctv_id": ["P1_B2_1_2"],
  "right_cctv_id": ["P1_B2_1_4"],
  "upper_cctv_id": ["P1_B2_0_3"],
  "lower_cctv_id": ["P1_B2_2_3"],
  "occupied_light": { "id": "ol-1" },
  "linked_emergency_bell": ["eb-1", "eb-2"],
  "linked_parkingLocation": ["pl-11", "pl-12"]
}
```

#### ParkingLocation
```json
{
  "id": "pl-11",
  "type": "parkingLocation",
  "angle": 90,
  "position": [280.0, 180.0],
  "points": [[270.0, 160.0], [290.0, 160.0], [290.0, 200.0], [270.0, 200.0]]
}
```

#### GuideBoard
```json
{
  "id": "gb-13",
  "ip_address": "172.12.12.0",
  "linkedParkingLocations": [
    {
      "name": "1",
      "points": [[400.0, 120.0], [460.0, 120.0], [460.0, 160.0], [400.0, 160.0]],
      "position": [430.0, 140.0],
      "linked_parkingLocation_id": ["pl-21", "pl-22"]
    }
  ]
}
```

### 6.3 데이터 특징

1. **층(Level) 기반 구조**: `parkingLotLevels` 배열로 다층 지원
2. **좌표 시스템**: `[x, y]` 배열 또는 `{ x, y }` 객체
3. **Polygon 표현**: `points` 배열로 다각형 정의
4. **관계 표현**: ID 참조 방식 (`linked_*`, `*_id` 접미사)
5. **IP 주소**: 하드웨어 연동을 위한 IP 정보

---

## 7. 적용 가능한 핵심 패턴

### 7.1 도면 업로드 & 렌더링

**적용 방법**:
```typescript
// 1. FileReader로 Base64 변환
const reader = new FileReader();
reader.readAsDataURL(file);

// 2. Image 객체로 크기 측정
const img = new Image();
img.onload = () => {
  const dimensions = {
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
  // 상태 저장
};

// 3. JointJS shapes.standard.Image로 렌더링
const background = new shapes.standard.Image();
background.position(0, 0);
background.resize(width, height);
background.attr("image/xlinkHref", base64Url);
background.toBack();
```

### 7.2 에셋 타입 시스템

**적용 방법**:
```typescript
// entities/types/MapObject.ts
interface BaseMapObject {
  id: string;
  type: string;
  geometry: Geometry;
  style?: Style;
}

interface CCTVObject extends BaseMapObject {
  type: "CCTV";
  properties: {
    height: number;
    direction: number;
    fov: number;
  };
}

type MapObject = CCTVObject | ParkingLocationObject | ColumnObject | ...;

// entities/constants/objectTypes.ts
export const OBJECT_COLORS = {
  CCTV: "#FF5722",
  ParkingLocation: "#4CAF50",
  // ...
};

export const DEFAULT_SIZES = {
  CCTV: { width: 30, height: 30 },
  ParkingLocation: { width: 260, height: 520 },
  // ...
};
```

### 7.3 Manager 패턴 (서비스 레이어)

**적용 방법**:
```typescript
// features/canvas/services/CanvasManager.ts
export class CanvasManager {
  private graph: dia.Graph | null = null;
  private paper: dia.Paper | null = null;

  initialize(container: HTMLElement) {
    this.graph = new dia.Graph();
    this.paper = new dia.Paper({
      el: container,
      model: this.graph,
      width: '100%',
      height: '100%',
    });
  }

  addObject(object: MapObject) {
    // 객체 추가 로직
  }

  removeObject(id: string) {
    // 객체 제거 로직
  }
}

// features/objects/services/ObjectFactory.ts
export class ObjectFactory {
  createCCTV(data: CCTVData): dia.Element {
    return new shapes.standard.Rectangle({
      position: data.position,
      size: DEFAULT_SIZES.CCTV,
      attrs: {
        body: { fill: OBJECT_COLORS.CCTV },
      },
    });
  }
}
```

### 7.4 층(Floor) 관리 패턴

**적용 방법**:
```typescript
// features/canvas/hooks/useFloorManager.ts
interface Floor {
  code: string; // "B1", "B2", "1F"
  backgroundImage: string | null;
  backgroundImageDimensions: { width: number; height: number } | null;
  objects: MapObject[];
}

export function useFloorManager() {
  const [floors, setFloors] = useState<Floor[]>([
    { code: "B1", backgroundImage: null, backgroundImageDimensions: null, objects: [] }
  ]);
  const [currentFloorIndex, setCurrentFloorIndex] = useState(0);

  const switchFloor = (index: number) => {
    // 현재 층 저장
    saveCurrentFloor();
    // 층 전환
    setCurrentFloorIndex(index);
    // 새 층 로드
    loadFloor(floors[index]);
  };

  return { floors, currentFloorIndex, switchFloor, addFloor, removeFloor };
}
```

### 7.5 Polygon 렌더링

**적용 방법**:
```typescript
// shared/lib/pointHandler.ts
export class PointHandler {
  // 점 배열 → SVG Path 변환
  pointsToPath(points: Point[]): string {
    if (points.length === 0) return '';

    const commands = points.map((point, index) => {
      const cmd = index === 0 ? 'M' : 'L';
      return `${cmd} ${point.x} ${point.y}`;
    });

    return `${commands.join(' ')} Z`; // Z = closepath
  }

  // 점 배열에서 크기 계산
  getSize(points: Point[]): { width: number; height: number } {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);

    return {
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }
}

// features/objects/services/PolygonRenderer.ts
export function createPolygon(data: PolygonData): dia.Element {
  const pathHandler = new PointHandler();
  const pathString = pathHandler.pointsToPath(data.points);
  const size = pathHandler.getSize(data.points);

  return new shapes.standard.Path({
    position: data.position,
    size: size,
    attrs: {
      body: {
        refD: pathString,
        fill: data.fill,
        stroke: data.stroke,
      },
    },
  });
}
```

### 7.6 관계(Relationship) 관리

**적용 방법**:
```typescript
// features/relations/services/RelationshipManager.ts
interface Relationship {
  sourceId: string;
  targetId: string;
  type: string; // "cctv-parking", "guideboard-parking", etc.
  meta?: Record<string, any>;
}

export class RelationshipManager {
  private relationships: Relationship[] = [];

  addRelationship(data: Relationship) {
    // 유효성 검증
    if (!this.validateRelationship(data)) {
      throw new Error('Invalid relationship');
    }

    this.relationships.push(data);
  }

  getRelationshipsBySource(sourceId: string): Relationship[] {
    return this.relationships.filter(r => r.sourceId === sourceId);
  }

  removeRelationship(sourceId: string, targetId: string) {
    this.relationships = this.relationships.filter(
      r => !(r.sourceId === sourceId && r.targetId === targetId)
    );
  }

  validateRelationship(data: Relationship): boolean {
    // 순환 참조 방지
    // 타입 호환성 검증
    // ID 존재 여부 확인
    return true;
  }
}
```

### 7.7 JSON Export

**적용 방법**:
```typescript
// features/project/services/ExportService.ts
export class ExportService {
  exportToJSON(floors: Floor[], metadata: ProjectMetadata): string {
    const data = {
      metadata: {
        version: "1.0.0",
        serviceType: "parking",
        createdAt: new Date().toISOString(),
        ...metadata,
      },
      floors: floors.map(floor => ({
        code: floor.code,
        backgroundImage: floor.backgroundImage,
        objects: floor.objects.map(obj => ({
          id: obj.id,
          type: obj.type,
          geometry: obj.geometry,
          style: obj.style,
          properties: obj.properties,
          relations: obj.relations,
        })),
      })),
    };

    return JSON.stringify(data, null, 2);
  }

  importFromJSON(jsonString: string): { floors: Floor[]; metadata: ProjectMetadata } {
    const data = JSON.parse(jsonString);

    // Zod 스키마 검증
    const validated = MapProjectSchema.parse(data);

    return {
      metadata: validated.metadata,
      floors: validated.floors,
    };
  }
}
```

---

## 8. 새 프로젝트 적용 체크리스트

### 8.1 필수 구현 항목

- [ ] **JointJS 통합**
  - [ ] `dia.Graph` 초기화
  - [ ] `dia.Paper` 렌더링
  - [ ] `ui.PaperScroller` 확대/축소

- [ ] **도면 업로드**
  - [ ] `<input type="file" accept="image/*">`
  - [ ] `FileReader.readAsDataURL()`
  - [ ] `Image` 객체로 크기 측정
  - [ ] `shapes.standard.Image` 배경 렌더링

- [ ] **에셋 시스템**
  - [ ] 타입 정의 (BaseAsset 인터페이스)
  - [ ] 색상/크기 상수
  - [ ] ElementFactory 패턴

- [ ] **관리자 패턴**
  - [ ] CanvasManager
  - [ ] ObjectManager
  - [ ] RelationshipManager
  - [ ] FloorManager

- [ ] **JSON 스키마**
  - [ ] Zod 스키마 정의
  - [ ] Import/Export 서비스

### 8.2 선택적 고급 기능

- [ ] 층(Floor) 관리
- [ ] CSV Import
- [ ] 템플릿 시스템
- [ ] 자동 관계 연결
- [ ] 스냅 가이드
- [ ] 키보드 단축키

---

## 9. 주요 차이점 및 개선 방향

### 9.1 기존 프로젝트의 한계

1. **단일 파일 비대화**: ImageBasedEditor.tsx 3,300줄
2. **JointJS 종속성**: 특정 라이브러리에 강하게 결합
3. **복잡한 JSON 구조**: 중첩이 깊고 타입별로 분리

### 9.2 새 프로젝트 개선 방향

1. **컴포넌트 분리**: 300-500줄 이하로 파일 분할
2. **Canvas 추상화**: JointJS를 Service Layer에서 감싸기
3. **단순화된 JSON**: Flat한 `objects[]` 구조
4. **TypeScript 강화**: Strict mode, Zod 검증

---

## 10. 핵심 요약

### 기술 스택
- **캔버스**: JointJS (`@joint/plus`)
- **상태 관리**: React Hooks + Manager 패턴
- **아키텍처**: Layer-based (Pages → Widgets → Services)

### 도면 업로드
1. `FileReader.readAsDataURL()` → Base64
2. `Image.naturalWidth/Height` → 크기 측정
3. `shapes.standard.Image` → 배경 렌더링

### 에셋 렌더링
- **Point**: `shapes.standard.Rectangle`
- **Polygon**: `shapes.standard.Path` (SVG refD)
- **관계**: ID 참조 + Manager 클래스

### JSON 구조
- 층(Level) 기반
- 객체별 타입 분리 (cctv, parkingLocation, column 등)
- 관계는 ID 참조 (`linked_*_id`)

---

**다음 단계**: 이 분석을 기반으로 새 맵 에디터 프로젝트의 구체적인 설계 및 구현 시작
