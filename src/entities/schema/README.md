# Map Data Schema Module

This module provides comprehensive Zod schemas and TypeScript types for validating parking lot map data in the map editor.

## Overview

The schema defines a standardized JSON structure for parking lot floor plans with support for:
- Objects (CCTV, sensors, chargers, parking spots, etc.)
- Relationships between objects
- Asset management (icons, images)
- Metadata (project info, timestamps)
- Multiple geometry types (point, polyline, polygon)

## Quick Start

```typescript
import { validateMapDataSafe, type MapData } from '@/entities/schema';

// Validate map data
const result = validateMapDataSafe(unknownData);

if (result.success) {
  const mapData: MapData = result.data;
  console.log('Valid map data:', mapData);
} else {
  console.error('Validation errors:', result.errors);
}
```

## Schema Structure

### Root Schema (MapData)

```typescript
{
  version: string              // "1.0.0"
  metadata: Metadata
  assets: Asset[]
  objects: MapObject[]
}
```

### Metadata

```typescript
{
  created: string              // ISO 8601 timestamp
  modified: string             // ISO 8601 timestamp
  author?: string
  lotName: string              // Required
  floorName: string            // Required (e.g., "B1", "1F")
  floorOrder: number           // Integer (-2 for B2, 0 for 1F, etc.)
  description?: string
}
```

### Asset

```typescript
{
  id: string                   // Unique identifier
  name: string
  type: 'image' | 'icon' | 'svg'
  url: string                  // Absolute URL or relative path (/assets/...)
  mimeType: string             // e.g., "image/svg+xml"
  size?: number                // Bytes
  width?: number               // Pixels
  height?: number              // Pixels
}
```

### MapObject

```typescript
{
  id: string                   // Unique identifier
  type: string                 // "CCTV", "Charger", "ParkingSpot", etc.
  name: string
  layer: string                // CSV layer name
  entityHandle?: string        // DXF entity handle
  geometry: Geometry           // Point, Polyline, or Polygon
  style: Style
  properties: Record<string, any>
  assetRefs?: string[]         // References to Asset IDs
  relations?: Relation[]
}
```

### Geometry (Discriminated Union)

**Point:**
```typescript
{
  type: 'point'
  coordinates: [number, number]  // [x, y]
}
```

**Polyline:**
```typescript
{
  type: 'polyline'
  coordinates: Array<[number, number]>  // Min 2 points
}
```

**Polygon:**
```typescript
{
  type: 'polygon'
  coordinates: Array<[number, number]>  // Min 3 points
  closed: boolean
}
```

### Style

```typescript
{
  color?: string               // Hex color "#FF0000"
  strokeWidth?: number
  strokeColor?: string         // Hex color
  fillColor?: string           // Hex color
  opacity?: number             // 0-1
  zIndex?: number
}
```

### Relation

```typescript
{
  targetId: string             // Must reference existing object ID
  type: 'required' | 'optional' | 'reference'
  meta?: Record<string, any>
}
```

## Validation Functions

### validateMapData(data)
Validates and parses map data. Throws `ZodError` on failure.

```typescript
import { validateMapData } from '@/entities/schema';

try {
  const mapData = validateMapData(unknownData);
  // Use validated data
} catch (error) {
  // Handle validation error
}
```

### validateMapDataSafe(data)
Safely validates map data without throwing. Returns result object.

```typescript
import { validateMapDataSafe } from '@/entities/schema';

const result = validateMapDataSafe(unknownData);

if (result.success) {
  // result.data is typed as MapData
  console.log(result.data.version);
} else {
  // result.errors is string[]
  console.error(result.errors);
}
```

### validateMapObject(data)
Validates individual map object.

### validateMetadata(data)
Validates metadata only.

### validateAsset(data)
Validates individual asset.

## Type Guards

```typescript
import { isPointGeometry, isPolylineGeometry, isPolygonGeometry } from '@/entities/schema';

if (isPointGeometry(geometry)) {
  // TypeScript knows geometry.type === 'point'
  const [x, y] = geometry.coordinates;
}
```

## Validation Rules

### Required Fields
- All IDs must be non-empty strings
- Object type, name, layer are required
- Geometry type and coordinates are required
- Metadata lotName and floorName are required

### Format Validation
- Timestamps must be ISO 8601 format
- Colors must be hex format: `#RRGGBB` (case-insensitive)
- Opacity must be between 0 and 1
- Asset URLs must be valid URLs or relative paths starting with `/`

### Cross-Reference Validation
- All `assetRefs` must reference existing asset IDs
- All relation `targetId`s must reference existing object IDs
- All object IDs must be unique
- All asset IDs must be unique

### Geometry Constraints
- Point: Must have exactly 2 coordinates
- Polyline: Must have at least 2 points
- Polygon: Must have at least 3 points

## Examples

See `examples.ts` for complete working examples:

```typescript
import { exampleMapData, minimalMapData, invalidMapDataExamples } from '@/entities/schema';

// Complete example with all features
console.log(exampleMapData);

// Minimal valid example
console.log(minimalMapData);

// Invalid examples for testing
console.log(invalidMapDataExamples.duplicateObjectIds);
```

## Usage in Application

### JSON Export

```typescript
import { validateMapData } from '@/entities/schema';

function exportMapToJSON(objects: MapObject[], metadata: Metadata) {
  const mapData = {
    version: '1.0.0',
    metadata,
    assets: getAssets(),
    objects,
  };

  // Validate before exporting
  const validated = validateMapData(mapData);

  // Download as JSON
  const blob = new Blob([JSON.stringify(validated, null, 2)], {
    type: 'application/json',
  });
  downloadBlob(blob, 'map-data.json');
}
```

### JSON Import

```typescript
import { validateMapDataSafe, type MapData } from '@/entities/schema';

async function importMapFromJSON(file: File) {
  const text = await file.text();
  const data = JSON.parse(text);

  const result = validateMapDataSafe(data);

  if (!result.success) {
    throw new Error(`Invalid map data:\n${result.errors.join('\n')}`);
  }

  return result.data;
}
```

### Object Creation

```typescript
import { type MapObject, validateMapObject } from '@/entities/schema';

function createCCTV(position: [number, number]): MapObject {
  const cctv: MapObject = {
    id: `cctv-${Date.now()}`,
    type: 'CCTV',
    name: 'New Camera',
    layer: 'CCTV',
    geometry: {
      type: 'point',
      coordinates: position,
    },
    style: {
      color: '#FF0000',
      opacity: 0.9,
    },
    properties: {},
  };

  // Validate before adding to canvas
  return validateMapObject(cctv);
}
```

## Error Handling

Validation errors are detailed and include the exact path to the problem:

```typescript
const result = validateMapDataSafe(invalidData);

if (!result.success) {
  // Example error messages:
  // "objects.0.style.color: Color must be a valid hex color (e.g., #FF0000)"
  // "metadata.lotName: Lot name is required"
  // "assets.2.url: Asset URL must be a valid URL or relative path"

  result.errors.forEach(error => console.error(error));
}
```

## Testing

All schemas are comprehensively tested with 52 test cases covering:
- Valid data validation
- Required field enforcement
- Type validation
- Format validation (colors, URLs, dates)
- Geometry constraints
- Cross-reference validation
- Complex scenarios

Run tests:
```bash
npm test -- src/entities/schema/__tests__/mapSchema.test.ts
```

## Integration Points

This schema is used by:
- **JSON Export** (Phase 4.1) - Validate before exporting
- **JSON Import/Viewer** (Phase 4.2) - Validate imported data
- **Object Type Validation** (Phase 2) - Ensure object integrity
- **CSV to Object Conversion** (Phase 2) - Validate converted objects
- **Canvas State** - Type safety for canvas operations
- **API Communication** - Validate data sent to/from server

## Version History

- **1.0.0** - Initial schema with parking lot support
  - Point, polyline, polygon geometries
  - Asset management
  - Object relations
  - Comprehensive validation rules
