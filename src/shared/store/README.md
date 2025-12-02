# Zustand Store Architecture

This directory contains the centralized state management for the map editor using Zustand.

## Stores

### 1. projectStore
Manages parking lot projects.

**Storage**: localStorage (`map-editor-projects`)

**Usage**:
```typescript
import { useProjectStore } from '@/shared/store';

function MyComponent() {
  const { lots, currentLot, createLot } = useProjectStore();

  const handleCreate = () => {
    createLot({
      name: 'My Parking Lot',
      description: 'Optional description',
    });
  };

  return (
    <div>
      {lots.map(lot => (
        <div key={lot.id}>{lot.name}</div>
      ))}
    </div>
  );
}
```

### 2. floorStore
Manages floors within parking lots.

**Storage**: localStorage (`map-editor-floors`)

**Features**:
- Auto-generates floor names (B1, B2, 1F, 2F, etc.)
- Initializes empty mapData structure
- Sorts floors by order

**Usage**:
```typescript
import { useFloorStore } from '@/shared/store';

function FloorTabs() {
  const { floors, currentFloor, addFloor, getFloorsByLotId } = useFloorStore();
  const currentLotId = useProjectStore(state => state.currentLot);

  const lotFloors = getFloorsByLotId(currentLotId);

  const handleAddFloor = () => {
    addFloor(currentLotId, {});
  };

  return (
    <div>
      {lotFloors.map(floor => (
        <button key={floor.id}>{floor.name}</button>
      ))}
    </div>
  );
}
```

### 3. canvasStore
Manages JointJS graph state (runtime only, not persisted).

**Storage**: None (runtime only)

**Usage**:
```typescript
import { useCanvasStore } from '@/shared/store';
import { dia } from '@joint/core';

function CanvasEditor() {
  const { graph, setGraph, selectedElementId, setSelectedElement } = useCanvasStore();

  useEffect(() => {
    const newGraph = new dia.Graph();
    setGraph(newGraph);

    return () => {
      setGraph(null);
    };
  }, []);

  return <div>Canvas</div>;
}
```

### 4. objectTypeStore
Manages object type definitions and mappings.

**Storage**: localStorage (`map-editor-object-types`)

**Features**:
- Type name validation (no duplicates)
- Property management
- Mapping between types and CSV entities
- Prevents deletion of types in use

**Usage**:
```typescript
import { useObjectTypeStore } from '@/shared/store';

function ObjectTypePanel() {
  const { types, addType, updateType } = useObjectTypeStore();

  const handleCreateType = () => {
    addType({
      name: 'CCTV',
      icon: 'camera',
      properties: [
        { key: 'ip', type: 'string', required: true },
        { key: 'port', type: 'number', required: true },
      ],
    });
  };

  return (
    <div>
      {types.map(type => (
        <div key={type.id}>{type.name}</div>
      ))}
    </div>
  );
}
```

## Testing

Run tests:
```bash
npm test src/shared/store/__tests__/stores.test.ts
```

## Error Handling

All stores throw descriptive errors for:
- Duplicate names
- Missing required data
- Invalid operations (e.g., deleting type in use)
- localStorage failures (gracefully caught and logged)

## localStorage Schema

### map-editor-projects
```json
{
  "lots": [
    {
      "id": "uuid",
      "name": "Parking Lot Name",
      "description": "Optional",
      "created": "ISO-8601",
      "modified": "ISO-8601"
    }
  ],
  "currentLot": "uuid or null"
}
```

### map-editor-floors
```json
{
  "floors": [
    {
      "id": "uuid",
      "lotId": "uuid",
      "name": "1F",
      "order": 0,
      "mapData": {
        "metadata": {},
        "assets": [],
        "objects": []
      },
      "created": "ISO-8601",
      "modified": "ISO-8601"
    }
  ],
  "currentFloor": "uuid or null"
}
```

### map-editor-object-types
```json
{
  "types": [
    {
      "id": "uuid",
      "name": "CCTV",
      "icon": "camera",
      "properties": [
        {
          "key": "ip",
          "type": "string",
          "required": true,
          "defaultValue": "optional"
        }
      ],
      "created": "ISO-8601",
      "modified": "ISO-8601"
    }
  ],
  "mappings": [
    {
      "id": "uuid",
      "floorId": "uuid",
      "typeId": "uuid",
      "entityHandle": "csv-entity-reference",
      "created": "ISO-8601"
    }
  ]
}
```

## Best Practices

1. **Always get fresh state**: Call `useStoreHook.getState()` after mutations to get updated state
2. **Destructure actions**: Extract only the actions you need to avoid unnecessary re-renders
3. **Use selectors**: For complex computed state, use selectors
4. **Error boundaries**: Wrap components using stores in error boundaries
5. **Reset on unmount**: Clear canvas store when leaving editor

## Migration Notes

For future backend integration:
- Replace localStorage operations with API calls
- Add loading/error states
- Implement optimistic updates
- Add conflict resolution
