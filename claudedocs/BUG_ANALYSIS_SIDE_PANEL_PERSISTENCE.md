# Bug Analysis: Right Side Panel Object Information Not Persisting

**Bug Description (Korean):**
버그가 있는데 대시보드에서 프로젝트 생성하고 csv 임포트 했을 때는 오른쪽 사이드 패널에 객체 정보가 있는데 저장하고 나갔다 다시 프로젝트를 들어가면 오른쪽 사이드 패널에 객체 정보가 존재하지 않는다.

**English Translation:**
There's a bug where after creating a project from the dashboard and importing CSV, the right side panel shows object information. But after saving and exiting, when re-entering the project, the object information in the right side panel doesn't exist. Make it persist.

---

## Issue Analysis

### What's Happening (Root Cause)
1. User creates a project and imports CSV data
2. During the session, objects are displayed and selected → right side panel shows property information
3. User saves and exits the project
4. User re-enters the project
5. **Right side panel is empty** - object selection state is not preserved

### Root Cause Explanation
The **selected object state is not being persisted** across sessions. The right panel displays information about the currently selected object, but when the project is reloaded, the selection information is lost.

---

## Documentation References

### 1. **FRONTEND_SPECIFICATION.md** (Primary Reference)
**Location:** `/Users/luxrobo/project/map-editor/docs/FRONTEND_SPECIFICATION.md`

**Relevant Sections:**
- **Section 3.3** - Editor Page Layout (lines 105-177)
  - Describes right panel structure and purpose
  - Shows that right panel displays selected object properties

- **Section 7.1** - Zustand Store Structure (lines 756-810)
  - **ProjectStore definition (lines 761-786)**:
    ```typescript
    interface ProjectState {
      selectedObjectIds: string[];  // ← Object selection state
      // ... other fields
      selectObject: (id: string, multi?: boolean) => void;
    }
    ```
  - This store manages `selectedObjectIds` but doesn't specify persistence strategy

- **Section 7.2** - React Query Usage (lines 814-857)
  - Shows API integration for project loading/saving
  - Does NOT include selected object ID restoration

### 2. **Zustand Store Architecture** (Implementation Details)
**Location:** `/Users/luxrobo/project/map-editor/src/shared/store/README.md`

**Key Information:**
- **projectStore** (lines 7-34):
  - Storage: `localStorage` (`map-editor-projects`)
  - Contains: lots, currentLot
  - **DOES NOT show** selected object state being persisted

- **canvasStore** (lines 70-94):
  - Storage: **None (runtime only, not persisted)**
  - Contains: `graph`, `selectedElementId`
  - **CRITICAL**: This is runtime-only storage!

- **floorStore** (lines 36-68):
  - Storage: `localStorage` (`map-editor-floors`)
  - Contains: floors with mapData (metadata, assets, objects)
  - **DOES NOT include** selected object state

### 3. **CSV Parser Implementation**
**Location:** `/Users/luxrobo/project/map-editor/docs/CSV_PARSER_IMPLEMENTATION.md`

**Relevant:**
- CSV data is parsed and stored in `csvStore`
- After import, objects are created but selection state handling is not documented
- No mention of preserving selected object IDs

---

## Data Flow Analysis

### Current Flow (What Happens)
```
Session 1: Create Project + Import CSV
├── Objects created → stored in store
├── User clicks object → selectedObjectIds updated (runtime only)
├── Right panel displays selected object info
├── User saves project → objects saved to DB/localStorage
└── Session ends

Session 2: Re-enter Project
├── Project loaded from DB/localStorage
├── Objects loaded ✅
├── selectedObjectIds = [] ❌ (NOT restored)
├── Right panel empty ❌ (no selected object to display)
└── User must manually select object again
```

### Expected Flow (What Should Happen)
```
Session 1: Create Project + Import CSV
├── Objects created → stored in store
├── User clicks object → selectedObjectIds updated
├── Right panel displays selected object info
├── User saves project
│  ├── Objects saved ✅
│  └── selectedObjectIds also saved ✅
└── Session ends

Session 2: Re-enter Project
├── Project loaded from DB/localStorage
├── Objects loaded ✅
├── selectedObjectIds restored ✅
├── Right panel automatically displays selected object info ✅
└── User sees previous selection preserved
```

---

## Component Architecture

### Right Panel Components
**From FRONTEND_SPECIFICATION.md lines 154-163:**

The right panel structure:
```
RightPanel (Widget)
├── PropertyPanel (Shows selected object properties)
│   ├── Basic properties: id, name, type
│   ├── Type-specific properties: height, direction, fov, number
│   └── Style: color, size, opacity
├── Relationship Section (Shows connected objects)
│   ├── Related objects list
│   ├── Relationship type selector
│   └── Add/Delete relationship buttons
└── JSON Preview (Shows current object JSON structure)
```

### Data Dependency Chain
```
selectedObjectIds (Zustand state)
    ↓
PropertyPanel receives selectedObject prop
    ↓
Form displays: object.properties, object.style, object.relations
    ↓
User sees object information in right panel
```

**Current Issue:** When `selectedObjectIds` is empty after reload, PropertyPanel receives no data → right panel appears empty.

---

## Related Persistence Patterns in Codebase

### 1. **Project Store Persistence** (works correctly)
From `src/shared/store/README.md` lines 10, 152-166:
```typescript
// Persisted to localStorage: map-editor-projects
{
  "lots": [
    {
      "id": "uuid",
      "name": "Parking Lot Name",
      "created": "ISO-8601",
      "modified": "ISO-8601"
    }
  ],
  "currentLot": "uuid or null"  // ← Selected lot persists!
}
```

### 2. **Floor Store Persistence** (works correctly)
From `src/shared/store/README.md` lines 39, 168-188:
```typescript
// Persisted to localStorage: map-editor-floors
{
  "floors": [
    {
      "id": "uuid",
      "lotId": "uuid",
      "mapData": {
        "objects": []  // ← Objects persist!
      }
    }
  ],
  "currentFloor": "uuid or null"  // ← Selected floor persists!
}
```

### 3. **Canvas Store - NO Persistence** (runtime only)
From `src/shared/store/README.md` lines 71, 73:
```typescript
// Storage: None (runtime only, not persisted)
// This is where selectedElementId is stored!
```

---

## Key Findings

| Component | Persists? | Storage | Issue |
|-----------|-----------|---------|-------|
| Objects (mapData) | ✅ Yes | localStorage (floorStore) | Works correctly |
| Current Project | ✅ Yes | localStorage (projectStore) | Works correctly |
| Current Floor | ✅ Yes | localStorage (floorStore) | Works correctly |
| **Selected Object ID** | ❌ **No** | **canvasStore (runtime only)** | **← ROOT CAUSE** |
| **Right Panel State** | ❌ **No** | **Component state only** | Depends on selected ID |

---

## Solution Approach

### Option 1: Persist to canvasStore + localStorage (Recommended)
- Extend canvasStore to persist `selectedObjectIds` to localStorage
- On project load, restore the previously selected object IDs
- Advantages: Simple, follows existing patterns in codebase

### Option 2: Store in floorStore metadata
- Add `selectedObjectIds` to floor's metadata
- Advantages: Grouped with floor-specific data

### Option 3: Store in projectStore
- Add `selectedObjectIds` to project metadata
- Advantages: Project-wide selection state

---

## Required Code Changes

### 1. **canvasStore Enhancement**
- Add `selectedObjectIds: string[]` to state
- Add localStorage persistence (key: `map-editor-canvas-state`)
- Add hydration on store initialization

### 2. **Editor Page / Layout Component**
- Load canvasStore state when project loads
- Restore selectedObjectIds from localStorage
- Example trigger: When navigating to `/editor/:projectId`

### 3. **PropertyPanel Component**
- Ensure it handles empty selectedObjectIds gracefully
- Display "Select an object to view properties" message when nothing selected

---

## Testing Scenarios

### Scenario 1: Basic Selection Persistence
1. Create project with CSV import
2. Click on object A (right panel shows A's properties)
3. Save and exit
4. Re-enter project
5. ✅ Right panel should show A's properties (not empty)

### Scenario 2: Multiple Object Selection
1. Select objects A, B, C (if multi-select supported)
2. Save and exit
3. Re-enter project
4. ✅ All previously selected objects should remain selected

### Scenario 3: Invalid Selection After Deletion
1. Select object A
2. Save
3. Another user deletes object A
4. Re-enter project
5. ✅ Should handle gracefully (not crash, clear invalid selection)

---

## File Summary

### Documentation Files
| File | Purpose | Key Section |
|------|---------|-------------|
| `docs/FRONTEND_SPECIFICATION.md` | Complete system spec | Section 3.3 (Editor), 7.1 (Stores) |
| `docs/CSV_PARSER_IMPLEMENTATION.md` | CSV import details | Object creation workflow |
| `docs/IMPLEMENTATION_GUIDE.md` | Canvas implementation | JointJS setup and state management |
| `src/shared/store/README.md` | Store architecture | Store definitions and persistence |

### Related Feature Docs
| File | Covers |
|------|--------|
| `docs/features/json-export.md` | Object persistence in JSON |
| `docs/features/relationship-system-analysis.md` | Object relationships display |
| `docs/features/viewer-concrete-mockup.md` | Selection and property panel UI |

---

## Recommended Next Steps

1. **Verify current implementation**: Check actual canvasStore definition in code
2. **Implement selection persistence**: Add localStorage save/restore logic
3. **Test restoration**: Verify selection survives session reload
4. **Handle edge cases**: Deleted objects, invalid selections
5. **UI feedback**: Show "Select object to view properties" when empty

