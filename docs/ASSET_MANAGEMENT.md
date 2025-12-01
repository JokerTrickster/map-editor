# 에셋 파일 관리 가이드

> parking-map-client의 에셋 관리 방식 분석 및 적용 방법

## 📋 목차
1. [에셋 저장 위치](#1-에셋-저장-위치)
2. [에셋 사용 방식](#2-에셋-사용-방식)
3. [동적 SVG 생성](#3-동적-svg-생성)
4. [새 프로젝트 적용 방법](#4-새-프로젝트-적용-방법)

---

## 1. 에셋 저장 위치

### 1.1 정적 파일 위치

parking-map-client는 **정적 파일**을 `public/assets/` 폴더에 저장합니다.

```
parking-map-client/
├── public/
│   └── assets/              # 정적 에셋 폴더
│       ├── cctv.svg         # CCTV 아이콘
│       ├── common.svg       # 일반 주차 아이콘
│       ├── electric.svg     # 전기차 아이콘
│       ├── handicap.svg     # 장애인 주차 아이콘
│       ├── small_car.svg    # 경차 아이콘
│       ├── bike.svg         # 이륜차 아이콘
│       ├── battery.svg      # 배터리/충전 아이콘
│       ├── charger.svg      # 충전기 아이콘
│       ├── elevator.svg     # 엘리베이터 아이콘
│       ├── light.svg        # 라이트 아이콘
│       ├── warning.svg      # 경고 아이콘
│       ├── marker.svg       # 마커 아이콘
│       └── ...
```

### 1.2 빌드 후 경로

빌드 후 `dist/assets/`로 복사됩니다.

```
dist/
└── assets/
    ├── cctv.svg
    ├── electric.svg
    └── ...
```

---

## 2. 에셋 사용 방식

### 2.1 경로 기반 참조 (주요 방식)

**파일**: `src/utils/assetIcons.ts`

```typescript
export const getAssetIconPath = (asset: AssetType): string => {
  switch (asset.type) {
    case "parking":
      switch (asset.parkingType) {
        case "REGULAR":
          return "/assets/common.svg";      // ← public 폴더 기준 경로
        case "ELECTRIC":
          return "/assets/electric.svg";
        case "HANDICAPPED":
          return "/assets/handicap.svg";
        case "COMPACT":
          return "/assets/small_car.svg";
        // ...
      }
    case "cctv":
      return "/assets/cctv.svg";
    case "elevator":
      return "/assets/elevator.svg";
    // ...
    default:
      return "/assets/common.svg";
  }
};
```

**특징**:
- `/assets/` 경로는 **public 폴더**를 기준으로 함
- 빌드 시 자동으로 `dist/assets/`로 복사됨
- 브라우저에서 직접 로드 가능

### 2.2 JointJS에서 이미지 사용

**파일**: `src/lib/visual/element-generator/AdminElementGenerator.ts`

```typescript
// 예시 1: SVG 이미지 사용 (라이트)
const lightIcon = new shapes.standard.Image({
  position: { x: 100, y: 100 },
  size: { width: 30, height: 30 },
  attrs: {
    image: {
      xlinkHref: "/assets/preventionLights.svg",  // ← public 경로
    },
  },
});

// 예시 2: 마커 이미지
const marker = new shapes.standard.Image({
  position: { x: 200, y: 200 },
  size: { width: 50, height: 50 },
  attrs: {
    image: {
      xlinkHref: "/assets/marker.svg",
    },
  },
});
```

**xlinkHref 속성**:
- SVG의 `<image>` 태그의 `xlink:href` 속성
- 외부 이미지 파일 참조
- `/assets/` 경로로 직접 참조

---

## 3. 동적 SVG 생성

에셋 파일이 없을 때는 **동적으로 SVG를 생성**합니다.

### 3.1 SVG 문자열 생성

**파일**: `src/utils/assetIcons.ts`

```typescript
export const createDefaultSVG = (asset: AssetType): string => {
  const width = asset.size.width;
  const height = asset.size.height;

  switch (asset.type) {
    // CCTV 아이콘
    case "cctv":
      return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 2 - 2}"
                  fill="#FF5722" stroke="#333" stroke-width="2"/>
          <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}"
                  fill="#fff"/>
        </svg>
      `;

    // 기둥 아이콘
    case "column":
      return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${width}" height="${height}" fill="#795548" stroke="#333" stroke-width="2" rx="8"/>
          <rect x="10" y="10" width="${width - 20}" height="${height - 20}"
                fill="none" stroke="#555" stroke-width="1" rx="4"/>
        </svg>
      `;

    // 엘리베이터 아이콘
    case "elevator":
      return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${width}" height="${height}" fill="#607D8B" stroke="#333" stroke-width="2" rx="8"/>
          <rect x="20" y="20" width="${width - 40}" height="${height - 60}" fill="#333" rx="4"/>
          <text x="${width / 2}" y="${height - 20}" text-anchor="middle" font-size="12" fill="#fff">EV</text>
        </svg>
      `;

    default:
      return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${width}" height="${height}" fill="#ddd" stroke="#333" stroke-width="2" rx="4"/>
          <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-size="12" fill="#333">?</text>
        </svg>
      `;
  }
};
```

### 3.2 SVG를 Data URL로 변환

```typescript
export const svgToDataURL = (svgString: string): string => {
  const encoded = encodeURIComponent(svgString);
  return `data:image/svg+xml,${encoded}`;
};

// 사용 예시
const svgString = createDefaultSVG(asset);
const dataUrl = svgToDataURL(svgString);
// → data:image/svg+xml,%3Csvg%20width%3D%2230%22...

// JointJS에서 사용
element.attr('image/xlinkHref', dataUrl);
```

---

## 4. 새 프로젝트 적용 방법

### 4.1 폴더 구조

```
map-editor/
├── public/
│   └── assets/              # 정적 에셋 (SVG/PNG)
│       ├── cctv.svg
│       ├── parking-regular.svg
│       ├── parking-electric.svg
│       ├── column.svg
│       └── ...
│
└── src/
    ├── shared/
    │   └── lib/
    │       └── assetUtils.ts  # 에셋 유틸리티
    └── entities/
        └── constants/
            └── assetPaths.ts   # 에셋 경로 상수
```

### 4.2 에셋 경로 관리

```typescript
// src/entities/constants/assetPaths.ts
export const ASSET_PATHS = {
  CCTV: '/assets/cctv.svg',
  ParkingLocation: {
    REGULAR: '/assets/parking-regular.svg',
    ELECTRIC: '/assets/parking-electric.svg',
    HANDICAPPED: '/assets/parking-handicapped.svg',
    COMPACT: '/assets/parking-compact.svg',
  },
  Column: '/assets/column.svg',
  Elevator: '/assets/elevator.svg',
  Entrance: '/assets/entrance.svg',
} as const;

// 타입별 경로 가져오기
export function getAssetPath(type: string, subtype?: string): string {
  if (type === 'ParkingLocation' && subtype) {
    return ASSET_PATHS.ParkingLocation[subtype as keyof typeof ASSET_PATHS.ParkingLocation]
      || ASSET_PATHS.ParkingLocation.REGULAR;
  }

  return ASSET_PATHS[type as keyof typeof ASSET_PATHS] || '/assets/default.svg';
}
```

### 4.3 동적 SVG 생성 유틸리티

```typescript
// src/shared/lib/assetUtils.ts
export interface SVGIconConfig {
  width: number;
  height: number;
  type: string;
  color?: string;
}

export function createSVGIcon(config: SVGIconConfig): string {
  const { width, height, type, color = '#333' } = config;

  const templates: Record<string, string> = {
    cctv: `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 2 - 2}"
                fill="#FF5722" stroke="#333" stroke-width="2"/>
        <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}"
                fill="#fff"/>
      </svg>
    `,
    column: `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="${color}" stroke="#333" stroke-width="2" rx="8"/>
      </svg>
    `,
    elevator: `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="#607D8B" stroke="#333" stroke-width="2" rx="8"/>
        <text x="${width / 2}" y="${height / 2}" text-anchor="middle" dominant-baseline="middle"
              font-size="14" fill="#fff">EV</text>
      </svg>
    `,
    default: `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="#ddd" stroke="#333" stroke-width="2" rx="4"/>
        <text x="${width / 2}" y="${height / 2}" text-anchor="middle" dominant-baseline="middle"
              font-size="12" fill="#333">?</text>
      </svg>
    `,
  };

  return templates[type] || templates.default;
}

export function svgToDataURL(svgString: string): string {
  const encoded = encodeURIComponent(svgString);
  return `data:image/svg+xml,${encoded}`;
}

// 에셋 경로 또는 동적 SVG 반환
export function getAssetSource(type: string, size: { width: number; height: number }): string {
  // 1. 정적 파일 경로 확인
  const staticPath = getAssetPath(type);

  // 정적 파일이 있으면 경로 반환
  if (staticPath !== '/assets/default.svg') {
    return staticPath;
  }

  // 2. 없으면 동적 SVG 생성
  const svg = createSVGIcon({
    width: size.width,
    height: size.height,
    type: type.toLowerCase(),
  });

  return svgToDataURL(svg);
}
```

### 4.4 JointJS에서 사용

```typescript
// src/features/objects/services/ObjectFactory.ts
import { shapes } from '@joint/core';
import { getAssetSource } from '@/shared/lib/assetUtils';

export class ObjectFactory {
  createCCTV(data: CCTVData): dia.Element {
    const iconSource = getAssetSource('CCTV', { width: 30, height: 30 });

    return new shapes.standard.Image({
      position: data.position,
      size: { width: 30, height: 30 },
      attrs: {
        image: {
          xlinkHref: iconSource,  // "/assets/cctv.svg" 또는 Data URL
        },
      },
    });
  }

  createParkingLocation(data: ParkingData): dia.Element {
    const iconSource = getAssetSource(
      'ParkingLocation',
      { width: 40, height: 40 }
    );

    // Polygon 내부에 아이콘 표시 (선택)
    return new shapes.standard.Image({
      position: data.position,
      size: { width: 40, height: 40 },
      attrs: {
        image: {
          xlinkHref: iconSource,
        },
      },
    });
  }
}
```

---

## 5. 에셋 파일 준비

### 5.1 기본 아이콘 세트

다음 SVG 파일들을 `public/assets/`에 준비하세요:

```
필수 아이콘:
├── cctv.svg              # CCTV
├── parking-regular.svg   # 일반 주차
├── parking-electric.svg  # 전기차 주차
├── parking-handicapped.svg # 장애인 주차
├── column.svg            # 기둥
├── elevator.svg          # 엘리베이터
├── entrance.svg          # 출입구
├── exit.svg              # 출구
└── guideboard.svg        # 안내판

선택 아이콘:
├── emergency-bell.svg    # 비상벨
├── charger.svg           # 충전기
├── warning-light.svg     # 경광등
└── marker.svg            # 마커
```

### 5.2 기존 프로젝트에서 복사

```bash
# parking-map-client의 에셋 복사
cp /Users/luxrobo/project/Luzer/services/parking-map-client/public/assets/*.svg \
   /Users/luxrobo/project/map-editor/public/assets/
```

---

## 6. 두 가지 방식 비교

### 방식 1: 정적 파일 (추천)

**장점**:
- ✅ 파일 관리 용이
- ✅ 디자이너가 수정 가능
- ✅ 캐싱 효율적
- ✅ 네트워크 로딩 분산

**단점**:
- ❌ 파일 개수 증가
- ❌ 배포 크기 증가

**사용 시기**: 아이콘이 복잡하거나 자주 변경될 때

### 방식 2: 동적 SVG 생성

**장점**:
- ✅ 파일 불필요
- ✅ 프로그래밍으로 제어
- ✅ 크기/색상 동적 변경

**단점**:
- ❌ 코드로 관리 (디자이너 수정 어려움)
- ❌ 복잡한 아이콘 구현 어려움

**사용 시기**: 간단한 도형이나 텍스트 아이콘

---

## 7. 하이브리드 전략 (권장)

두 방식을 조합하여 사용:

```typescript
export function getAssetSource(type: string, options: AssetOptions): string {
  // 1. 우선 정적 파일 확인
  const staticPath = ASSET_PATHS[type];

  if (staticPath && fileExists(staticPath)) {
    return staticPath;  // "/assets/cctv.svg"
  }

  // 2. 정적 파일 없으면 동적 생성
  const svg = createSVGIcon({
    type,
    width: options.width,
    height: options.height,
    color: options.color,
  });

  return svgToDataURL(svg);  // "data:image/svg+xml,..."
}
```

**효과**:
- 중요한 아이콘은 정적 파일로 관리
- 간단한 아이콘은 동적 생성
- 파일 누락 시 fallback 보장

---

## 8. 요약

### 에셋 저장 위치
```
public/assets/           ← 정적 SVG/PNG 파일
```

### 참조 방식
```typescript
// 방법 1: 정적 파일 경로
xlinkHref: "/assets/cctv.svg"

// 방법 2: 동적 SVG (Data URL)
xlinkHref: "data:image/svg+xml,%3Csvg..."
```

### 적용 순서
1. `public/assets/` 폴더 생성
2. SVG 파일 준비 (복사 또는 제작)
3. `assetPaths.ts` 경로 상수 정의
4. `assetUtils.ts` 유틸리티 함수 작성
5. `ObjectFactory`에서 사용

---

**다음 단계**: 에셋 파일을 준비하고 ObjectFactory에 통합하기
