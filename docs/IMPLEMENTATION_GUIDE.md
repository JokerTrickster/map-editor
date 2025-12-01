# 맵 에디터 구현 가이드

> parking-map-client 코드를 실제로 적용하기 위한 단계별 구현 가이드

## 📋 목차
1. [필수 라이브러리 설치](#1-필수-라이브러리-설치)
2. [캔버스 초기화](#2-캔버스-초기화)
3. [도면 이미지 업로드](#3-도면-이미지-업로드)
4. [Polygon 렌더링](#4-polygon-렌더링)
5. [에셋 생성 및 배치](#5-에셋-생성-및-배치)
6. [관계 관리](#6-관계-관리)

---

## 1. 필수 라이브러리 설치

### 1.1 JointJS 설치

```bash
npm install @joint/core
# 또는 Plus 버전 (유료, 더 많은 기능)
# npm install @joint/plus
```

### 1.2 package.json 추가

```json
{
  "dependencies": {
    "@joint/core": "^4.0.0",
    "zod": "^3.22.4"
  }
}
```

---

## 2. 캔버스 초기화

### 2.1 전체 코드 (ImageBasedEditor.tsx 기반)

```typescript
// src/features/canvas/hooks/useCanvasInitializer.ts
import { useEffect, useRef, useState } from 'react';
import { dia, ui, shapes } from '@joint/core';

interface CanvasConfig {
  width?: number;
  height?: number;
  gridSize?: number;
  backgroundColor?: string;
}

export function useCanvasInitializer(
  containerRef: React.RefObject<HTMLDivElement>,
  config: CanvasConfig = {}
) {
  const [graph, setGraph] = useState<dia.Graph | null>(null);
  const [paper, setPaper] = useState<dia.Paper | null>(null);
  const [paperScroller, setPaperScroller] = useState<ui.PaperScroller | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // 컨테이너 초기화
    containerRef.current.innerHTML = '';

    // 1. Graph 생성 (데이터 모델)
    const newGraph = new dia.Graph({}, { cellNamespace: shapes });

    // 2. Paper 생성 (렌더링 레이어)
    const newPaper = new dia.Paper({
      model: newGraph,
      width: config.width || 1200,
      height: config.height || 800,
      gridSize: config.gridSize || 1,
      drawGrid: true,
      background: {
        color: config.backgroundColor || '#f8f9fa',
      },
      // 배경 이미지는 드래그 불가
      interactive: (cellView: any) => {
        const model = cellView.model as dia.Element;
        if (model?.prop('isBackground')) {
          return false; // 배경은 클릭/드래그 불가
        }
        return {
          elementMove: true, // 다른 요소는 이동 가능
          addLinkFromMagnet: false, // 연결선 비활성화
        };
      },
      cellViewNamespace: shapes,
      drawGridSize: 20,
      gridPattern: [
        { color: '#e0e0e0', thickness: 1 }, // 작은 그리드
        { color: '#cccccc', thickness: 2 }, // 큰 그리드
      ],
    });

    // 3. PaperScroller 생성 (확대/축소/패닝)
    const newPaperScroller = new ui.PaperScroller({
      paper: newPaper,
      autoResizePaper: true, // 자동 크기 조정
      scrollWhileDragging: true, // 드래그 중 스크롤
      contentOptions: {
        allowNewOrigin: 'any',
        useModelGeometry: true,
      },
      cursor: 'grab',
      padding: 50,
    });

    // 스타일 설정
    newPaperScroller.el.style.width = '100%';
    newPaperScroller.el.style.height = '100%';
    newPaperScroller.el.style.overflow = 'auto';

    // 초기 줌 레벨
    newPaperScroller.zoom(0.5, { absolute: true });
    requestAnimationFrame(() => {
      newPaperScroller.center();
    });

    // DOM에 추가
    containerRef.current.appendChild(newPaperScroller.el);

    // 상태 저장
    setGraph(newGraph);
    setPaper(newPaper);
    setPaperScroller(newPaperScroller);
    setIsReady(true);

    // Cleanup
    return () => {
      newPaper.remove();
      newGraph.clear();
    };
  }, [containerRef]);

  return {
    graph,
    paper,
    paperScroller,
    isReady,
  };
}
```

### 2.2 사용 예시

```typescript
// src/pages/editor/EditorPage.tsx
import { useRef } from 'react';
import { useCanvasInitializer } from '@/features/canvas/hooks/useCanvasInitializer';

export default function EditorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { graph, paper, paperScroller, isReady } = useCanvasInitializer(containerRef, {
    width: 1200,
    height: 800,
    backgroundColor: '#f8f9fa',
  });

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
```

---

## 3. 도면 이미지 업로드

### 3.1 이미지 업로드 훅

```typescript
// src/features/canvas/hooks/useImageUpload.ts
import { useState, useCallback } from 'react';
import { dia, shapes } from '@joint/core';

interface ImageDimensions {
  width: number;
  height: number;
}

export function useImageUpload(graph: dia.Graph | null) {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file || !file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;

        // 이미지 크기 측정
        const img = new Image();
        img.onload = () => {
          const dimensions = {
            width: img.naturalWidth,
            height: img.naturalHeight,
          };

          setImageDimensions(dimensions);
          setBackgroundImage(imageUrl);

          // 캔버스에 배경 이미지 추가
          if (graph) {
            addBackgroundToGraph(graph, imageUrl, dimensions);
          }
        };
        img.src = imageUrl;
      };

      reader.readAsDataURL(file);
    },
    [graph]
  );

  const addBackgroundToGraph = useCallback(
    (graph: dia.Graph, imageUrl: string, dimensions: ImageDimensions) => {
      // 기존 배경 이미지 제거
      const elements = graph.getElements();
      const backgroundElements = elements.filter(
        (el) => el.prop('isBackground') === true
      );
      backgroundElements.forEach((el) => el.remove());

      // 새 배경 이미지 생성
      const background = new shapes.standard.Image();
      background.position(0, 0); // 좌상단 기준
      background.resize(dimensions.width, dimensions.height);
      background.attr('image/xlinkHref', imageUrl); // Base64 Data URL
      background.attr('root/magnet', false); // 연결선 비활성화
      background.prop('isBackground', true); // 커스텀 플래그

      // 그래프에 추가
      background.addTo(graph);
      background.toBack(); // Z-index 맨 뒤로
    },
    []
  );

  const removeBackground = useCallback(() => {
    if (!graph) return;

    const elements = graph.getElements();
    const backgroundElements = elements.filter((el) => el.prop('isBackground'));
    backgroundElements.forEach((el) => el.remove());

    setBackgroundImage(null);
    setImageDimensions(null);
  }, [graph]);

  return {
    backgroundImage,
    imageDimensions,
    handleImageUpload,
    removeBackground,
  };
}
```

### 3.2 UI 컴포넌트

```typescript
// src/pages/editor/EditorPage.tsx
import { useImageUpload } from '@/features/canvas/hooks/useImageUpload';

export default function EditorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { graph, paperScroller } = useCanvasInitializer(containerRef);
  const { handleImageUpload, backgroundImage, removeBackground } = useImageUpload(graph);

  return (
    <div>
      {/* 도구 바 */}
      <div style={{ padding: '10px', background: '#fff', borderBottom: '1px solid #ddd' }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
          id="image-upload"
        />
        <label htmlFor="image-upload">
          <button type="button" onClick={() => document.getElementById('image-upload')?.click()}>
            📁 도면 업로드
          </button>
        </label>

        {backgroundImage && (
          <button onClick={removeBackground}>🗑️ 배경 제거</button>
        )}
      </div>

      {/* 캔버스 */}
      <div ref={containerRef} style={{ width: '100%', height: 'calc(100vh - 60px)' }} />
    </div>
  );
}
```

---

## 4. Polygon 렌더링

### 4.1 PointHandler 유틸리티

```typescript
// src/shared/lib/PointHandler.ts
export interface Point {
  x: number;
  y: number;
  r?: number; // 라운드 코너 반경 (옵션)
}

export class PointHandler {
  /**
   * 점 배열에서 전체 크기 계산
   */
  getSize(points: Point[]): { width: number; height: number } {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);

    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);

    return { width, height };
  }

  /**
   * 점 배열 → SVG Path 문자열 변환 (라운드 코너 지원)
   */
  pointsToPath(points: Point[]): string {
    if (points.length === 0) return '';

    let path = '';

    for (let i = 0; i < points.length; i++) {
      const currentPoint = points[i];
      const prevPoint = points[(i - 1 + points.length) % points.length];
      const nextPoint = points[(i + 1) % points.length];

      const r = currentPoint.r || 0; // 라운드 반경

      if (r === 0) {
        // 직선
        if (i === 0) {
          path += `M ${currentPoint.x} ${currentPoint.y} `;
        } else {
          path += `L ${currentPoint.x} ${currentPoint.y} `;
        }
      } else {
        // 라운드 코너 (Arc 사용)
        const vectorA = {
          x: currentPoint.x - prevPoint.x,
          y: currentPoint.y - prevPoint.y,
        };
        const vectorB = {
          x: nextPoint.x - currentPoint.x,
          y: nextPoint.y - currentPoint.y,
        };

        const angle = this.angleBetweenVectors(vectorA, vectorB);

        // Arc 시작점 계산
        const { newX: c1X, newY: c1Y } = this.calculateDistanceAndNewPoint(
          prevPoint,
          currentPoint,
          r,
          'c2'
        );

        // Arc 끝점 계산
        const { newX: c2X, newY: c2Y } = this.calculateDistanceAndNewPoint(
          currentPoint,
          nextPoint,
          r,
          'c1'
        );

        const sweepFlag = angle > 180 ? 0 : 1;

        if (i === 0) {
          path += `M ${c1X} ${c1Y} A ${r} ${r} 0 0 ${sweepFlag} ${c2X} ${c2Y} `;
        } else {
          path += `L ${c1X} ${c1Y} A ${r} ${r} 0 0 ${sweepFlag} ${c2X} ${c2Y} `;
        }
      }
    }

    path += 'Z'; // 경로 닫기
    return path;
  }

  /**
   * 단순 버전 (라운드 코너 없음)
   */
  pointsToSimplePath(points: Point[]): string {
    if (points.length === 0) return '';

    const moves = points.map((p, i) => {
      const cmd = i === 0 ? 'M' : 'L';
      return `${cmd} ${p.x} ${p.y}`;
    });

    return `${moves.join(' ')} Z`;
  }

  private angleBetweenVectors(a: Point, b: Point): number {
    const dotProduct = a.x * b.x + a.y * b.y;
    const crossProduct = a.x * b.y - a.y * b.x;

    const magnitudeA = Math.sqrt(a.x * a.x + a.y * a.y);
    const magnitudeB = Math.sqrt(b.x * b.x + b.y * b.y);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    const cosTheta = dotProduct / (magnitudeA * magnitudeB);
    if (cosTheta >= 1) return 0;

    let angle = 180 - (Math.acos(cosTheta) * 180) / Math.PI;

    if (crossProduct < 0) {
      angle = 360 - angle;
    }

    return angle;
  }

  private calculateDistanceAndNewPoint(
    c1: Point,
    c2: Point,
    r: number,
    std: 'c1' | 'c2'
  ): { distance: number; newX: number; newY: number } {
    const { x: x1, y: y1 } = c1;
    const { x: x2, y: y2 } = c2;
    const dx = x2 - x1;
    const dy = y2 - y1;

    const distance = Math.sqrt(dx * dx + dy * dy);

    const unitDx = dx / distance;
    const unitDy = dy / distance;

    let newX = 0;
    let newY = 0;

    if (std === 'c2') {
      newX = x2 - unitDx * r;
      newY = y2 - unitDy * r;
    } else {
      newX = x1 + unitDx * r;
      newY = y1 + unitDy * r;
    }

    return { distance, newX, newY };
  }
}
```

### 4.2 Polygon 렌더링 함수

```typescript
// src/features/objects/services/PolygonRenderer.ts
import { shapes } from '@joint/core';
import { PointHandler, Point } from '@/shared/lib/PointHandler';

interface PolygonData {
  id: string;
  name: string;
  position: { x: number; y: number };
  points: Point[];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export function createPolygonElement(data: PolygonData): shapes.standard.Path {
  const pointHandler = new PointHandler();

  // 1. 크기 계산
  const size = pointHandler.getSize(data.points);

  // 2. SVG Path 생성
  const pathString = pointHandler.pointsToPath(data.points);

  // 3. JointJS Path Element 생성
  const element = new shapes.standard.Path({
    position: data.position,
    size: size,
    attrs: {
      root: {
        cursor: 'move',
      },
      body: {
        refD: pathString, // SVG d 속성
        fill: data.fill || '#4CAF50',
        stroke: data.stroke || '#333',
        strokeWidth: data.strokeWidth || 2,
      },
    },
  });

  // 커스텀 데이터 저장
  element.prop('objectId', data.id);
  element.prop('objectName', data.name);

  return element;
}
```

### 4.3 사용 예시

```typescript
// 주차 구역 생성
const parkingLocation = createPolygonElement({
  id: 'parking-001',
  name: 'A-101',
  position: { x: 100, y: 100 },
  points: [
    { x: 0, y: 0, r: 5 },      // 좌상단 (라운드 코너)
    { x: 260, y: 0, r: 5 },    // 우상단
    { x: 260, y: 520, r: 5 },  // 우하단
    { x: 0, y: 520, r: 5 },    // 좌하단
  ],
  fill: '#4CAF50',
  stroke: '#2E7D32',
  strokeWidth: 2,
});

graph?.addCell(parkingLocation);
```

---

## 5. 에셋 생성 및 배치

### 5.1 에셋 타입 정의

```typescript
// src/entities/types/MapObject.ts
export interface BaseMapObject {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  angle?: number;
}

export interface CCTVObject extends BaseMapObject {
  type: 'CCTV';
  properties: {
    ipAddress?: string;
    height?: number;
    direction?: number;
    fov?: number;
  };
}

export interface ParkingLocationObject extends BaseMapObject {
  type: 'ParkingLocation';
  geometry: {
    type: 'Polygon';
    points: Array<{ x: number; y: number }>;
  };
  properties: {
    number: string;
    parkingType: 'REGULAR' | 'ELECTRIC' | 'HANDICAPPED' | 'COMPACT';
    isEmpty: boolean;
  };
}

export interface ColumnObject extends BaseMapObject {
  type: 'Column';
  geometry: {
    type: 'Polygon';
    points: Array<{ x: number; y: number }>;
  };
}

export type MapObject = CCTVObject | ParkingLocationObject | ColumnObject;
```

### 5.2 에셋 상수

```typescript
// src/entities/constants/objectConstants.ts
export const OBJECT_COLORS = {
  CCTV: '#FF5722',
  ParkingLocation: {
    REGULAR: '#4CAF50',
    ELECTRIC: '#2196F3',
    HANDICAPPED: '#FF9800',
    COMPACT: '#9C27B0',
  },
  Column: '#795548',
  Elevator: '#607D8B',
  Entrance: '#3F51B5',
} as const;

export const DEFAULT_SIZES = {
  CCTV: { width: 30, height: 30 },
  ParkingLocation: { width: 260, height: 520 },
  Column: { width: 140, height: 210 },
  Elevator: { width: 200, height: 150 },
  Entrance: { width: 100, height: 50 },
} as const;
```

### 5.3 ObjectFactory

```typescript
// src/features/objects/services/ObjectFactory.ts
import { shapes, dia } from '@joint/core';
import { MapObject, CCTVObject, ParkingLocationObject } from '@/entities/types/MapObject';
import { OBJECT_COLORS, DEFAULT_SIZES } from '@/entities/constants/objectConstants';
import { createPolygonElement } from './PolygonRenderer';

export class ObjectFactory {
  createCCTV(data: Partial<CCTVObject>): dia.Element {
    const cctv = new shapes.standard.Rectangle({
      position: data.position || { x: 0, y: 0 },
      size: data.size || DEFAULT_SIZES.CCTV,
      attrs: {
        body: {
          fill: OBJECT_COLORS.CCTV,
          stroke: '#D32F2F',
          strokeWidth: 2,
          rx: 4, // 라운드 코너
          ry: 4,
        },
        label: {
          text: data.name || 'CCTV',
          fill: '#fff',
          fontSize: 10,
          fontWeight: 'bold',
        },
      },
    });

    // 커스텀 데이터 저장
    cctv.prop('objectData', {
      id: data.id,
      type: 'CCTV',
      name: data.name,
      properties: data.properties || {},
    });

    return cctv;
  }

  createParkingLocation(data: Partial<ParkingLocationObject>): dia.Element {
    const parkingType = data.properties?.parkingType || 'REGULAR';
    const color = OBJECT_COLORS.ParkingLocation[parkingType];

    if (!data.geometry?.points) {
      throw new Error('ParkingLocation requires geometry.points');
    }

    const element = createPolygonElement({
      id: data.id || `parking-${Date.now()}`,
      name: data.name || 'Parking',
      position: data.position || { x: 0, y: 0 },
      points: data.geometry.points.map((p) => ({ ...p, r: 5 })), // 라운드 코너
      fill: color,
      stroke: '#333',
      strokeWidth: 2,
    });

    element.prop('objectData', {
      id: data.id,
      type: 'ParkingLocation',
      name: data.name,
      geometry: data.geometry,
      properties: data.properties,
    });

    return element;
  }

  createFromMapObject(object: MapObject): dia.Element {
    switch (object.type) {
      case 'CCTV':
        return this.createCCTV(object);
      case 'ParkingLocation':
        return this.createParkingLocation(object);
      default:
        throw new Error(`Unknown object type: ${object.type}`);
    }
  }
}
```

### 5.4 사용 예시

```typescript
// src/pages/editor/EditorPage.tsx
import { ObjectFactory } from '@/features/objects/services/ObjectFactory';

export default function EditorPage() {
  const { graph } = useCanvasInitializer(containerRef);
  const objectFactory = new ObjectFactory();

  const addCCTV = () => {
    if (!graph) return;

    const cctv = objectFactory.createCCTV({
      id: `cctv-${Date.now()}`,
      name: 'CCTV-01',
      position: { x: 200, y: 200 },
      properties: {
        ipAddress: '192.168.0.1',
        direction: 45,
        fov: 90,
      },
    });

    graph.addCell(cctv);
  };

  const addParkingLocation = () => {
    if (!graph) return;

    const parking = objectFactory.createParkingLocation({
      id: `parking-${Date.now()}`,
      name: 'A-101',
      position: { x: 300, y: 300 },
      geometry: {
        type: 'Polygon',
        points: [
          { x: 0, y: 0 },
          { x: 260, y: 0 },
          { x: 260, y: 520 },
          { x: 0, y: 520 },
        ],
      },
      properties: {
        number: 'A-101',
        parkingType: 'REGULAR',
        isEmpty: true,
      },
    });

    graph.addCell(parking);
  };

  return (
    <div>
      <button onClick={addCCTV}>➕ CCTV 추가</button>
      <button onClick={addParkingLocation}>➕ 주차 구역 추가</button>
      <div ref={containerRef} style={{ width: '100%', height: '600px' }} />
    </div>
  );
}
```

---

## 6. 관계 관리

### 6.1 RelationshipManager

```typescript
// src/features/relations/services/RelationshipManager.ts
export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'cctv-parking' | 'guideboard-parking' | 'custom';
  meta?: Record<string, any>;
}

export class RelationshipManager {
  private relationships: Relationship[] = [];

  addRelationship(data: Omit<Relationship, 'id'>): Relationship {
    // 유효성 검증
    if (!this.isValidRelationship(data)) {
      throw new Error('Invalid relationship');
    }

    // 중복 확인
    const exists = this.relationships.some(
      (r) => r.sourceId === data.sourceId && r.targetId === data.targetId && r.type === data.type
    );

    if (exists) {
      throw new Error('Relationship already exists');
    }

    const relationship: Relationship = {
      id: `rel-${Date.now()}-${Math.random()}`,
      ...data,
    };

    this.relationships.push(relationship);
    return relationship;
  }

  removeRelationship(id: string): boolean {
    const index = this.relationships.findIndex((r) => r.id === id);
    if (index === -1) return false;

    this.relationships.splice(index, 1);
    return true;
  }

  getRelationshipsBySource(sourceId: string): Relationship[] {
    return this.relationships.filter((r) => r.sourceId === sourceId);
  }

  getRelationshipsByTarget(targetId: string): Relationship[] {
    return this.relationships.filter((r) => r.targetId === targetId);
  }

  getAllRelationships(): Relationship[] {
    return [...this.relationships];
  }

  private isValidRelationship(data: Omit<Relationship, 'id'>): boolean {
    // sourceId와 targetId가 같으면 안됨
    if (data.sourceId === data.targetId) return false;

    // 순환 참조 검사 (선택)
    // TODO: 구현

    return true;
  }

  exportToJSON(): Relationship[] {
    return this.relationships;
  }

  importFromJSON(data: Relationship[]): void {
    this.relationships = data;
  }
}
```

### 6.2 사용 예시

```typescript
const relationshipManager = new RelationshipManager();

// CCTV와 주차 구역 연결
const rel = relationshipManager.addRelationship({
  sourceId: 'cctv-001',
  targetId: 'parking-001',
  type: 'cctv-parking',
  meta: {
    coverage: 'full',
    distance: 15.5,
  },
});

// 관계 조회
const cctvRelations = relationshipManager.getRelationshipsBySource('cctv-001');
console.log(cctvRelations); // [{ sourceId: 'cctv-001', targetId: 'parking-001', ... }]
```

---

## 7. 다음 단계

이 가이드의 코드를 순서대로 구현하면:

1. ✅ 캔버스 초기화 완료
2. ✅ 도면 업로드 기능
3. ✅ Polygon 렌더링
4. ✅ 에셋 생성 및 배치
5. ✅ 관계 관리

**추가로 구현할 것**:
- [ ] 층(Floor) 관리
- [ ] 선택/이동/삭제 기능
- [ ] Undo/Redo
- [ ] JSON Import/Export
- [ ] 속성 편집 패널

---

## 참고 파일 위치

```
원본 프로젝트: /Users/luxrobo/project/Luzer/services/parking-map-client

핵심 파일:
- ImageBasedEditor.tsx (라인 430-519: 캔버스 초기화)
- ImageBasedEditor.tsx (라인 910-957: 이미지 업로드)
- PointHandler.ts (전체: Polygon 처리)
- AdminElementGenerator.ts (에셋 생성)
```
