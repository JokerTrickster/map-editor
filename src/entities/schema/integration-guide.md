# Schema Integration Guide

This guide demonstrates how to integrate the Zod schema foundation with existing stores and features in the map editor.

## Integration with Existing Stores

### 1. Canvas Store Integration

The canvas store can use the schema for validating objects before rendering:

```typescript
// src/shared/store/canvasStore.ts
import { validateMapObject, type MapObject } from '@/entities/schema';

// When adding objects to canvas
addObject: (obj: unknown) => {
  // Validate before adding
  const validated = validateMapObject(obj);

  // Add to canvas state
  set(state => ({
    objects: [...state.objects, validated]
  }));
}
```

### 2. Floor Store Integration

The floor store can use metadata schema for floor data:

```typescript
// src/shared/store/floorStore.ts
import { type Metadata, validateMetadata } from '@/entities/schema';

interface Floor {
  id: string;
  metadata: Metadata;
  objects: MapObject[];
  assets: Asset[];
}

// When creating a floor
createFloor: (lotName: string, floorName: string, order: number) => {
  const metadata: Metadata = {
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    lotName,
    floorName,
    floorOrder: order,
  };

  // Validate metadata
  validateMetadata(metadata);

  // Create floor with validated metadata
  // ...
}
```

### 3. Project Store Integration

Export and import functionality using schema validation:

```typescript
// src/shared/store/projectStore.ts
import { validateMapData, validateMapDataSafe, type MapData } from '@/entities/schema';

interface ProjectState {
  // ... existing state

  // Export project as JSON
  exportProject: (lotId: string, floorId: string) => string;

  // Import project from JSON
  importProject: (jsonString: string) => void;
}

const store = create<ProjectState>((set, get) => ({
  // ... existing methods

  exportProject: (lotId: string, floorId: string) => {
    const lot = get().getLotById(lotId);
    const floor = get().getFloorById(floorId);

    const mapData: MapData = {
      version: '1.0.0',
      metadata: floor.metadata,
      assets: floor.assets,
      objects: floor.objects,
    };

    // Validate before export
    const validated = validateMapData(mapData);

    // Return JSON string
    return JSON.stringify(validated, null, 2);
  },

  importProject: (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      const result = validateMapDataSafe(data);

      if (!result.success) {
        throw new Error(`Invalid map data:\n${result.errors.join('\n')}`);
      }

      // Import validated data
      const mapData = result.data;
      // ... create floor from mapData

    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  },
}));
```

## Integration with Features

### 1. CSV Parser Integration

Validate objects created from CSV data:

```typescript
// src/shared/lib/csvParser.ts
import { validateMapObject, type MapObject } from '@/entities/schema';

export function convertCSVRowToObject(row: CSVRow, layer: string): MapObject {
  const obj: MapObject = {
    id: `obj-${Date.now()}-${Math.random()}`,
    type: inferTypeFromLayer(layer),
    name: row.name || `${layer}-${row.index}`,
    layer,
    entityHandle: row.handle,
    geometry: parseGeometry(row),
    style: {
      color: row.color || '#000000',
    },
    properties: {
      ...row.customProps,
    },
  };

  // Validate before returning
  return validateMapObject(obj);
}
```

### 2. Object Type Factory Integration

Use schema types in element factory:

```typescript
// src/features/editor/lib/elementFactory.ts
import { type MapObject, type Style, validateMapObject } from '@/entities/schema';

export function createCCTVElement(
  position: [number, number],
  assetId?: string
): MapObject {
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
      zIndex: 10,
    },
    properties: {
      serialNumber: generateSerialNumber(),
      status: 'active',
    },
    assetRefs: assetId ? [assetId] : undefined,
    relations: [],
  };

  // Validate before returning
  return validateMapObject(cctv);
}

export function updateObjectStyle(
  obj: MapObject,
  styleUpdates: Partial<Style>
): MapObject {
  const updated: MapObject = {
    ...obj,
    style: {
      ...obj.style,
      ...styleUpdates,
    },
  };

  // Validate updated object
  return validateMapObject(updated);
}
```

### 3. Property Panel Integration

Validate property updates in real-time:

```typescript
// src/features/editor/components/PropertyPanel.tsx
import { validateMapObject, type MapObject } from '@/entities/schema';

function PropertyPanel({ selectedObject, onUpdate }: Props) {
  const handlePropertyChange = (key: string, value: any) => {
    try {
      const updated: MapObject = {
        ...selectedObject,
        properties: {
          ...selectedObject.properties,
          [key]: value,
        },
      };

      // Validate before updating
      const validated = validateMapObject(updated);
      onUpdate(validated);

    } catch (error) {
      // Show validation error to user
      showError(`Invalid property value: ${error.message}`);
    }
  };

  // ... render UI
}
```

### 4. Relation Management Integration

Validate relations when creating connections:

```typescript
// src/features/editor/lib/relationManager.ts
import { validateMapData, type MapData, type Relation } from '@/entities/schema';

export function addRelation(
  mapData: MapData,
  sourceId: string,
  targetId: string,
  type: 'required' | 'optional' | 'reference',
  meta?: Record<string, any>
): MapData {
  const relation: Relation = {
    targetId,
    type,
    meta,
  };

  // Update source object
  const updatedObjects = mapData.objects.map(obj => {
    if (obj.id === sourceId) {
      return {
        ...obj,
        relations: [...(obj.relations || []), relation],
      };
    }
    return obj;
  });

  const updatedMap: MapData = {
    ...mapData,
    metadata: {
      ...mapData.metadata,
      modified: new Date().toISOString(),
    },
    objects: updatedObjects,
  };

  // Validate entire map (checks that targetId exists)
  return validateMapData(updatedMap);
}
```

## Export/Import Feature Implementation

### Export Handler

```typescript
// src/features/export/exportHandler.ts
import { validateMapData, type MapData } from '@/entities/schema';

export async function exportMapToFile(
  lotName: string,
  floorName: string,
  objects: MapObject[],
  assets: Asset[]
): Promise<void> {
  const mapData: MapData = {
    version: '1.0.0',
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      lotName,
      floorName,
      floorOrder: parseFloorOrder(floorName),
      description: `Exported from Map Editor`,
    },
    assets,
    objects,
  };

  // Validate before export
  const validated = validateMapData(mapData);

  // Create blob and download
  const json = JSON.stringify(validated, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${lotName}-${floorName}-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}
```

### Import Handler

```typescript
// src/features/import/importHandler.ts
import { validateMapDataSafe, type MapData } from '@/entities/schema';

export async function importMapFromFile(file: File): Promise<MapData> {
  // Read file
  const text = await file.text();

  // Parse JSON
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error('Invalid JSON file');
  }

  // Validate with safe method
  const result = validateMapDataSafe(data);

  if (!result.success) {
    // Format errors for user display
    const errorList = result.errors.map((err, i) => `${i + 1}. ${err}`).join('\n');
    throw new Error(`Map validation failed:\n\n${errorList}`);
  }

  return result.data;
}

// Usage in component
async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const mapData = await importMapFromFile(file);

    // Load into editor
    loadMapData(mapData);

    showSuccess('Map imported successfully');
  } catch (error) {
    showError(error.message);
  }
}
```

## Viewer Integration

```typescript
// src/features/viewer/MapViewer.tsx
import { validateMapDataSafe, type MapData } from '@/entities/schema';

function MapViewer() {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const handleLoadMap = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const result = validateMapDataSafe(data);

      if (!result.success) {
        setErrors(result.errors);
        return;
      }

      setMapData(result.data);
      setErrors([]);

    } catch (error) {
      setErrors(['Invalid JSON file']);
    }
  };

  if (errors.length > 0) {
    return <ErrorDisplay errors={errors} />;
  }

  if (!mapData) {
    return <FileUploader onUpload={handleLoadMap} />;
  }

  return <MapCanvas data={mapData} />;
}
```

## Best Practices

### 1. Validate at Boundaries

Only validate when data crosses boundaries:
- User input → Validate immediately
- CSV import → Validate after parsing
- JSON import → Validate before loading
- Before export → Validate before download
- API requests → Validate before sending

### 2. Use Type-Safe Interfaces

Always use inferred types from schemas:
```typescript
import { type MapObject, type MapData } from '@/entities/schema';

// Good
function processObject(obj: MapObject) { }

// Avoid
function processObject(obj: any) { }
```

### 3. Handle Errors Gracefully

Provide clear feedback to users:
```typescript
try {
  validateMapData(data);
} catch (error) {
  if (error instanceof ZodError) {
    // Show structured validation errors
    showValidationErrors(error.errors);
  } else {
    // Show generic error
    showError('An unexpected error occurred');
  }
}
```

### 4. Use Safe Validation for User Input

Prefer `validateMapDataSafe` for user-provided data:
```typescript
// Good for user input
const result = validateMapDataSafe(userData);
if (!result.success) {
  showErrors(result.errors);
  return;
}

// Good for internal data (throw on error)
const validated = validateMapData(internalData);
```

## Migration Path

For existing code that doesn't use schemas yet:

1. **Phase 1**: Add schema imports alongside existing types
2. **Phase 2**: Validate at export/import points
3. **Phase 3**: Gradually add validation to object creation
4. **Phase 4**: Replace custom types with schema-inferred types

Example migration:
```typescript
// Before
interface CustomMapObject {
  id: string;
  type: string;
  // ... custom fields
}

// After
import { type MapObject } from '@/entities/schema';

// Use MapObject instead of CustomMapObject
```

## Testing with Schema

Test validation in component tests:
```typescript
import { validateMapDataSafe } from '@/entities/schema';

it('should handle invalid map data', async () => {
  const invalidData = { version: 'invalid' };

  render(<MapViewer data={invalidData} />);

  const result = validateMapDataSafe(invalidData);
  expect(result.success).toBe(false);

  // Check error is displayed
  expect(screen.getByText(/validation failed/i)).toBeInTheDocument();
});
```

## Summary

The schema foundation provides:
- Type safety across the entire application
- Runtime validation at data boundaries
- Clear error messages for debugging
- Single source of truth for data structure
- Easy integration with existing code

Follow this guide to integrate the schema progressively throughout the application.
