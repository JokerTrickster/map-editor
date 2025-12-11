# Relation Type Editing Persistence Fix

## Problem Summary

**User Report**: 사용자가 관계 설정에서 cardinality를 "1:10"에서 "1:2"로 변경했지만, 자동 관계 생성 버튼을 클릭했을 때 여전히 "1:10"을 사용하고 있었습니다.

**Root Cause**: Relation type edits were only updating local component state and never being persisted.

## Technical Investigation

### Architecture Issue

The application has the following data flow:
1. **Template Loading**: Templates are loaded from files via `useTemplate()` hook
2. **Read-Only Template**: The template object is immutable and read-only
3. **Local State Only**: EditorSidebar had local `relationTypes` state that was never synced back

### The Problem Flow

**Before Fix**:
```
1. Template loads: relationTypes = { "cctv_to_parking": { cardinality: "1:10", ... } }
2. User edits in UI: EditorSidebar local state updates to "1:2"
3. But EditorPage still uses original template: "1:10"
4. Auto-link uses EditorPage's template → still uses "1:10"
```

**Evidence**:
- `EditorSidebar.tsx` line 90-97 had `// TODO: Persist to store/backend`
- `handleAutoLink()` in EditorPage.tsx line 154 used `template.relationTypes[relationKey]`
- User's edits never propagated beyond EditorSidebar component

## Solution Implementation

### Architecture Change: Mutable Copy Pattern

Implemented a mutable copy of relationTypes in EditorPage that can be edited at runtime:

**Flow After Fix**:
```
1. Template loads → EditorPage creates mutableRelationTypes state (copy of template)
2. User edits → EditorSidebar calls handleUpdateRelationType callback
3. EditorPage updates mutableRelationTypes state
4. All components use mutableRelationTypes (not template.relationTypes)
5. Auto-link, manual add, unlink all use updated values
```

### File Changes

#### 1. `src/pages/editor/EditorPage.tsx`

**Added Import**:
```typescript
import { TemplateRelationType } from '@/entities/schema/templateSchema'
```

**Added State (line 90)**:
```typescript
// Mutable copy of relationTypes (can be edited at runtime)
const [mutableRelationTypes, setMutableRelationTypes] = useState<Record<string, TemplateRelationType>>({})
```

**Added Initialization (lines 92-107)**:
```typescript
// Initialize mutableRelationTypes from template
useEffect(() => {
  console.log('[EditorPage] Template loaded:', {
    id: currentLotData?.templateId,
    hasTemplate: !!template,
    relationTypes: template?.relationTypes
  })

  // Initialize mutable copy from template
  if (template?.relationTypes) {
    setMutableRelationTypes(template.relationTypes)
    console.log('[EditorPage] Initialized mutableRelationTypes:', template.relationTypes)
  } else {
    setMutableRelationTypes({})
  }
}, [template, currentLotData])
```

**Added Handlers (lines 134-150)**:
```typescript
// Relation Type Management Handlers
const handleUpdateRelationType = (key: string, config: TemplateRelationType) => {
  setMutableRelationTypes(prev => ({
    ...prev,
    [key]: config
  }))
  console.log(`✅ Updated relation type: ${key}`, config)
}

const handleDeleteRelationType = (key: string) => {
  setMutableRelationTypes(prev => {
    const updated = { ...prev }
    delete updated[key]
    return updated
  })
  console.log(`🗑️ Deleted relation type: ${key}`)
}
```

**Updated handleUnlink** (lines 153-160):
```typescript
// BEFORE
if (!selectedElementId || !graph || !template?.relationTypes) return
const relationConfig = template.relationTypes[relationKey]

// AFTER
if (!selectedElementId || !graph) return
const relationConfig = mutableRelationTypes[relationKey]
```

**Updated handleAutoLink** (lines 179-186):
```typescript
// BEFORE
if (!selectedElementId || !graph || !template?.relationTypes) return
const relationConfig = template.relationTypes[relationKey]

// AFTER
if (!selectedElementId || !graph) return
const relationConfig = mutableRelationTypes[relationKey]
```

**Updated EditorSidebar Props** (lines 1095-1100):
```typescript
// BEFORE
relationTypes={template?.relationTypes}
onUnlink={handleUnlink}
onAutoLink={handleAutoLink}
onAutoLinkAll={handleOpenAutoLinkModal}

// AFTER
relationTypes={mutableRelationTypes}
onUnlink={handleUnlink}
onAutoLink={handleAutoLink}
onAutoLinkAll={handleOpenAutoLinkModal}
onUpdateRelationType={handleUpdateRelationType}
onDeleteRelationType={handleDeleteRelationType}
```

#### 2. `src/pages/editor/components/EditorSidebar.tsx`

**Updated Interface** (lines 18-34):
```typescript
interface EditorSidebarProps {
  loadedFileName: string | null
  elementCount: number
  zoom: number
  objectsByLayer: Map<string, dia.Element[]>
  selectedElementId: string | null
  onObjectClick: (elementId: string) => void
  onObjectUpdate?: (id: string, updates: Partial<any>) => void
  graph: dia.Graph | null
  template?: any
  relationTypes?: Record<string, TemplateRelationType>
  onUnlink: (key: string, targetId: string) => void
  onAutoLink: (key: string) => void
  onAutoLinkAll?: () => void
  onUpdateRelationType?: (key: string, config: TemplateRelationType) => void  // NEW
  onDeleteRelationType?: (key: string) => void                                 // NEW
}
```

**Updated Function Parameters** (lines 36-52):
```typescript
// BEFORE
relationTypes: initialRelationTypes,

// AFTER
relationTypes,
onUpdateRelationType,
onDeleteRelationType
```

**Removed Local State** (lines 53-65):
```typescript
// REMOVED (lines 51-68)
const [relationTypes, setRelationTypes] = useState<Record<string, TemplateRelationType>>(initialRelationTypes || {})

// Sync with initial relationTypes when template changes
useEffect(() => {
  if (initialRelationTypes) {
    setRelationTypes(initialRelationTypes)
  }
}, [initialRelationTypes])

// NOW USES PROP DIRECTLY
const [templateRelationKeys] = useState<Set<string>>(
  new Set(Object.keys(relationTypes || {}))
)
```

**Updated Handlers** (lines 79-91):
```typescript
// BEFORE
const handleDeleteRelation = (key: string) => {
  const updated = { ...relationTypes }
  delete updated[key]
  setRelationTypes(updated)
  // TODO: Persist to store/backend
}

const handleSaveRelation = (key: string, config: TemplateRelationType) => {
  setRelationTypes({
    ...relationTypes,
    [key]: config
  })
  setIsAddingRelation(false)
  setEditingRelation(null)
  // TODO: Persist to store/backend
}

// AFTER
const handleDeleteRelation = (key: string) => {
  if (onDeleteRelationType) {
    onDeleteRelationType(key)
  }
}

const handleSaveRelation = (key: string, config: TemplateRelationType) => {
  if (onUpdateRelationType) {
    onUpdateRelationType(key, config)
  }
  setIsAddingRelation(false)
  setEditingRelation(null)
}
```

## Benefits

1. **Session Persistence**: Relation type edits now persist for the current session
2. **Consistent State**: All components (auto-link, manual add, unlink) use the same updated values
3. **Proper Data Flow**: Clear parent → child data flow with callbacks for updates
4. **No More TODOs**: Removed "TODO: Persist to store/backend" comments

## Testing Instructions

### Manual Testing

1. **Setup**:
   - Load a map with relationship types
   - Note the current cardinality (e.g., "1:10")

2. **Edit Cardinality**:
   - Go to "관계 리스트" tab
   - Click edit icon on a relation type
   - Change cardinality from "1:10" to "1:2"
   - Click Save

3. **Verify Auto-Link Uses New Value**:
   - Select a CCTV object
   - Go to "Relationships" tab
   - Click "Auto" button
   - **Expected**: Console shows "Max links allowed: 2" (not 10)
   - **Expected**: Only 2 relationships created

4. **Verify Manual Add Uses New Value**:
   - Try to add a 3rd relationship manually via dropdown
   - **Expected**: Alert "최대 2개까지만 연결할 수 있습니다."

5. **Console Verification**:
   ```
   ✅ Updated relation type: cctv_to_parkingSpace {cardinality: "1:2", ...}
   🚀 Auto-link started for relation: cctv_to_parkingSpace
      Cardinality: 1:2
      Max links allowed: 2
   🔗 Auto-link returned 2 new relationships (max: 2)
   ```

## Limitations

**Not Persistent Across Sessions**:
- Changes are lost on page refresh
- Template file remains unchanged
- Future enhancement: Save to backend/localStorage

**Template Tracking**:
- `templateRelationKeys` still uses initial template keys
- Should be updated when new relations are added/deleted
- Currently only prevents editing of original template relations

## Future Enhancements

1. **Persistence Layer**:
   - Add API endpoint to save custom relation types
   - Store user customizations in database
   - Load customizations on template load

2. **Local Storage Fallback**:
   - Save to localStorage for offline persistence
   - Merge with template on load

3. **Template Relation Keys**:
   - Update `templateRelationKeys` when template changes
   - Properly track which relations are from template vs. user-created

## Summary

**Before**:
- Template is immutable → User edits in local state only → Auto-link uses original template → Edits ignored

**After**:
- Template loads → Mutable copy created → User edits update mutable copy → All components use mutable copy → Edits persist in session

**Impact**: Relationship cardinality edits now immediately affect auto-link, manual add, and all other relationship operations.

---

**Date**: 2025-12-11
**Issue**: Relation type editing not persisting
**Status**: ✅ RESOLVED
**Session Persistence**: ✅ YES
**Cross-Session Persistence**: ❌ NO (future enhancement)
