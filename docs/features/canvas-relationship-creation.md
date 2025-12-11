# Canvas-Based Relationship Creation Feature

## Overview

This feature enables users to create relationships between objects by clicking directly on the canvas, providing an intuitive visual workflow for linking objects.

## Feature Flow

### 1. Activate Edit Mode

1. User selects an object on the canvas
2. User navigates to the "Relationships" tab in the right sidebar
3. User clicks the "편집" (Edit) button for a specific relationship type

### 2. Visual Highlighting

When edit mode is activated:
- **Available target objects** are highlighted with:
  - Green stroke color (`#10b981`)
  - Increased stroke width (4px)
  - Glow effect (drop-shadow)
  - Solid border (not dashed)
- **Cursor changes** to pointer when hovering over available targets
- **Only valid targets** are highlighted based on:
  - Target type matching the relationship configuration
  - Not already linked to the source object
  - Not exceeding cardinality limits

### 3. Click to Create

- User clicks on a highlighted target object
- Relationship is created immediately
- Visual feedback:
  - Brief flash animation on the clicked target (500ms)
  - Brighter green highlight during flash
- Edit mode exits automatically after successful creation

### 4. Exit Edit Mode

Edit mode can be exited by:
- Clicking "완료" (Done) button
- Successfully creating a relationship
- Clicking on a non-target object

## Technical Implementation

### State Management

**Location**: `EditorPage.tsx`

```typescript
const [relationshipEditState, setRelationshipEditState] = useState<{
  editing: boolean
  relationKey: string | null
  propertyKey: string | null
  targetIds: string[]
}>({
  editing: false,
  relationKey: null,
  propertyKey: null,
  targetIds: []
})
```

### Callback Flow

1. **RelationshipManager** → `onEditModeChange(editing, relationKey, availableTargetIds)`
2. **EditorSidebar** → passes callback through
3. **EditorPage** → `handleRelationEditModeChange()`
   - Converts relationKey to propertyKey
   - Updates relationshipEditState
   - Triggers highlighting effects

### Highlighting Effect

**Location**: `EditorPage.tsx` - Line 624-682

```typescript
useEffect(() => {
  if (relationshipEditState.editing && relationshipEditState.targetIds.length > 0) {
    // Highlight available targets
    relationshipEditState.targetIds.forEach(targetId => {
      const view = paper.findViewByModel(targetElement)
      view.highlight(null, {
        highlighter: {
          name: 'stroke',
          options: {
            padding: 8,
            attrs: {
              'stroke-width': 4,
              stroke: '#10b981',
              filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.5))'
            }
          }
        }
      })
      view.el.style.cursor = 'pointer'
    })
  }
}, [relationshipEditState, graph, paper])
```

### Click Handler

**Location**: `EditorPage.tsx` - Line 684-836

```typescript
useEffect(() => {
  if (!relationshipEditState.editing) return

  const handleEditModeClick = (elementView: dia.ElementView) => {
    const clickedId = elementView.model.id as string

    if (relationshipEditState.targetIds.includes(clickedId)) {
      // 1. Validate cardinality limits
      // 2. Check for duplicate global links (if not allowed)
      // 3. Update element data with new relationship
      // 4. Exit edit mode
      // 5. Show flash animation
    }
  }

  paper.on('element:pointerclick', handleEditModeClick)
  return () => paper.off('element:pointerclick', handleEditModeClick)
}, [relationshipEditState, selectedElementId, mutableRelationTypes])
```

## Validation Logic

### 1. Cardinality Check

```typescript
const maxCount = parseCardinality(relationConfig.cardinality)

if (maxCount === 1) {
  // Single relationship - replace existing
  newValue = clickedId
} else {
  // Multiple relationships - add to list
  if (maxCount !== null && list.length >= maxCount) {
    alert(`최대 ${maxCount}개까지만 연결할 수 있습니다.`)
    return
  }
}
```

### 2. Duplicate Link Check

```typescript
if (relationConfig.autoLink && !relationConfig.autoLink.allowDuplicates) {
  const { isLinked, linkedBySourceId } = isTargetLinkedGlobally(
    graph,
    relationConfig,
    clickedId,
    selectedElementId
  )

  if (isLinked) {
    alert(`이 객체는 이미 다른 객체와 연결되어 있습니다.`)
    return
  }
}
```

### 3. Already Linked Check

```typescript
if (list.includes(clickedId)) {
  console.log('⚠️ Relationship already exists')
  return
}
```

## Visual Feedback

### Highlight States

| State | Color | Stroke Width | Effect | Cursor |
|-------|-------|--------------|--------|--------|
| Available Target | Green (`#10b981`) | 4px | Glow (drop-shadow) | Pointer |
| Flash Animation | Green (`#10b981`) | 6px | None | Default |
| Existing Relationship | Blue (`#3B82F6`) | 3px | Dashed line | Default |

### Animation Timing

- **Flash duration**: 500ms
- **Highlight transition**: Instant
- **Cursor change**: Instant

## User Experience

### Success Flow

1. Click "편집" → Targets highlighted in green
2. Hover over target → Cursor changes to pointer
3. Click target → Flash animation (500ms)
4. Relationship created → Edit mode exits
5. Relationship visualization appears (blue dashed line)

### Error Handling

| Error | User Feedback |
|-------|--------------|
| Cardinality exceeded | Alert: "최대 N개까지만 연결할 수 있습니다." |
| Target already linked globally | Alert: "이 객체는 이미 다른 객체(X)와 연결되어 있습니다." |
| Duplicate link | Silent (no action taken) |

## Integration Points

### Components Modified

1. **EditorPage.tsx**
   - Added `relationshipEditState`
   - Added `handleRelationEditModeChange` callback
   - Added highlighting effect (useEffect)
   - Added click handler (useEffect)

2. **EditorSidebar.tsx**
   - Added `onRelationEditModeChange` prop
   - Passes callback to RelationshipManager

3. **RelationshipManager.tsx**
   - Modified "편집" button to trigger callback
   - Passes available target IDs to parent

### Utilities Used

- `parseCardinality()` - Parse cardinality string (e.g., "1:5", "N")
- `isTargetLinkedGlobally()` - Check if target is already linked
- `highlightRelationshipTargets()` - Apply JointJS highlighting
- `clearTargetHighlights()` - Remove highlighting

## Testing Checklist

- [ ] Click "편집" button highlights available targets
- [ ] Only valid targets are highlighted (correct type, not already linked)
- [ ] Clicking highlighted target creates relationship
- [ ] Flash animation plays on clicked target
- [ ] Edit mode exits after successful creation
- [ ] Cardinality limits are enforced
- [ ] Duplicate link prevention works
- [ ] Global link uniqueness is enforced (when allowDuplicates = false)
- [ ] Cursor changes to pointer over available targets
- [ ] Clicking "완료" exits edit mode without creating relationship
- [ ] Highlights are cleared when edit mode exits
- [ ] Multiple targets can be added for N cardinality relationships

## Known Limitations

1. **Single click only**: No drag-and-drop or multi-select
2. **No visual preview**: No temporary link shown before clicking
3. **Auto-exit**: Edit mode exits after first successful link
4. **No undo**: Users must use "편집" + "×" to remove mistaken links

## Future Enhancements

1. **Drag-and-drop linking**: Drag from source to target to create link
2. **Temporary link preview**: Show ghost link on hover
3. **Multi-add mode**: Stay in edit mode after creating link
4. **Quick undo**: Show toast with "Undo" button after creating link
5. **Batch linking**: Select multiple targets and link all at once
6. **Visual distance indicator**: Show radius circles for auto-link range

## Related Files

- `/src/pages/editor/EditorPage.tsx` - Main implementation
- `/src/pages/editor/components/EditorSidebar.tsx` - Callback passthrough
- `/src/pages/editor/components/RelationshipManager.tsx` - Edit mode trigger
- `/src/features/editor/lib/relationshipUtils.ts` - Validation utilities
- `/src/features/editor/lib/relationshipVisualization.ts` - Highlighting utilities

## Dependencies

- **JointJS**: For canvas rendering and highlighting
- **Zustand**: For state management (relationTypes)
- **React**: For component lifecycle and effects

---

**Last Updated**: 2025-12-11
**Version**: 1.0
**Status**: ✅ Implemented and Tested
