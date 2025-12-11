# Relationship System Analysis

**Created**: 2025-12-11
**Status**: Analysis Complete
**Priority**: High

---

## Executive Summary

This document provides a comprehensive analysis of the current relationship system implementation, identifies gaps based on user requirements, and provides recommendations for implementation.

### User Requirements Summary

1. **Fix**: When "allowDuplicates" is unchecked, duplicate relationships are still being created
2. **Duplicate Prevention**: If object A has relationship with B, no other object can have relationship with B (for that specific relationship type)
3. **Add**: Edit button in relationship tab to edit relationships per object
4. **Add**: Save functionality for relationship edits
5. **Add**: Visual display of relationships on map when object is selected

---

## 1. Current Implementation Analysis

### 1.1 Duplicate Prevention System

#### Current Status: PARTIALLY IMPLEMENTED

**File**: `/src/features/editor/lib/relationshipUtils.ts`

**Implementation Details**:
```typescript
// Lines 108-122: allowDuplicates check in autoLinkObjects()
const allowDuplicates = config.autoLink.allowDuplicates ?? false
const existingTargets = getExistingRelationships(sourceElement, config.propertyKey)

// Filter out already linked targets (unless duplicates are allowed)
if (!allowDuplicates && existingTargets.includes(el.id as string)) {
    console.log(`  ⏭️ Skipping ${el.id} - already linked (duplicates not allowed)`)
    return false
}
```

**What Works**:
- ✅ Auto-link respects `allowDuplicates` flag
- ✅ Filters out already-linked targets when `allowDuplicates = false`
- ✅ Prevents creating duplicate relationships via auto-link

**What's Missing**:
- ❌ Manual linking does NOT check `allowDuplicates` flag
- ❌ Manual linking does NOT prevent duplicates
- ❌ No global uniqueness check (if A→B exists, prevent C→B)

#### Gap Analysis

**Location**: `/src/pages/editor/components/EditorSidebar.tsx` lines 125-190

```typescript
const handleAddLink = (propertyKey: string, targetId: string) => {
    // ... implementation ...

    // ❌ Missing: Check allowDuplicates flag
    // ❌ Missing: Check if target is already linked by another object

    if (maxCount === 1) {
        newValue = targetId  // No duplicate check
    } else {
        const list = Array.isArray(value) ? [...value] : (value ? [value] : [])

        // ✅ Only checks if same source already has this target
        if (list.includes(targetId)) {
            console.log(`⚠️ Relationship already exists: ${targetId}`)
            return
        }
        // ❌ Does NOT check if another object already linked this target
    }
}
```

**Problem Scenario**:
```
Template: cctv_to_parking with allowDuplicates=false
1. User adds CCTV-1 → Parking-A (via manual link)
2. User tries to add CCTV-2 → Parking-A (should be blocked but isn't)
3. Result: Both CCTV-1 and CCTV-2 linked to Parking-A (violates rule)
```

---

### 1.2 Relationship Editing UI

#### Current Status: NOT IMPLEMENTED

**Current UI** (`RelationshipManager.tsx`):
- ✅ Shows list of linked relationships
- ✅ Shows cardinality limits (e.g., "1:5 (2/5)")
- ✅ Has "Auto" button for auto-linking
- ✅ Has unlink (×) button per relationship
- ✅ Has dropdown to add new relationships
- ❌ NO edit button
- ❌ NO way to change existing relationship target
- ❌ NO batch edit capability

**User Request**:
> "Add: Edit button in relationship tab to edit relationships per object"

**Current Workflow** (to change a relationship):
```
1. User must unlink existing relationship (click ×)
2. User must add new relationship via dropdown
3. Two separate actions required (should be one)
```

**Desired Workflow**:
```
1. User clicks edit icon next to relationship
2. Dropdown appears with current selection
3. User selects new target
4. Relationship updates (one action)
```

---

### 1.3 Relationship Persistence

#### Current Status: FULLY IMPLEMENTED

**Session Persistence**: ✅ YES
- Changes stored in `mutableRelationTypes` state (EditorPage.tsx line 91)
- Relation type edits persist during session via callbacks
- `handleUpdateRelationType()` and `handleDeleteRelationType()` implemented

**Cross-Session Persistence**: ❌ NO
- Changes lost on page refresh
- Template file not updated
- No backend persistence

**Reference**: `docs/features/relation-type-editing-persistence-fix.md`

**Implementation Status**:
```typescript
// EditorPage.tsx lines 138-153
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

**Note**: User request "Add: Save functionality for relationship edits" is ALREADY IMPLEMENTED for relation type configuration. If user meant saving individual relationship links, see section 1.4.

---

### 1.4 Individual Relationship Persistence

#### Current Status: FULLY IMPLEMENTED

**How Relationships are Stored**:
```typescript
// Element data structure
element.data = {
    typeId: "uuid-cctv",
    properties: {
        name: "CCTV-1",
        parkingSpaceIds: ["parking-1", "parking-2"]  // ← Relationships stored here
    }
}
```

**Save Flow**:
```
1. User adds/removes relationship
   ↓
2. handleAddLink() or handleUnlink() called
   ↓
3. Updates element.data.properties
   ↓
4. handleObjectUpdate() triggers setDataVersion(v => v + 1)
   ↓
5. React re-renders with updated data
   ↓
6. User clicks "Save" in header
   ↓
7. graph.toJSON() exports all element data including relationships
   ↓
8. updateFloorMapData() saves to zustand store
   ↓
9. Data persists across sessions (localStorage)
```

**Conclusion**: Individual relationship links ARE persisted. User likely wants UI feedback or confirmation.

---

### 1.5 Visual Relationship Display

#### Current Status: PARTIALLY IMPLEMENTED

**What Exists**:
- ✅ Auto-link radius circles (temporary, 3 seconds)
  - File: `relationshipUtils.ts` lines 407-450
  - Shows search radius after auto-link operation
  - Disappears after 3 seconds

**What's Missing**:
- ❌ No persistent visual lines/arrows showing relationships
- ❌ No highlighting when object is selected
- ❌ No way to see which objects are connected on canvas
- ❌ No JointJS link elements created

**User Request**:
> "Add: Visual display of relationships on map when object is selected"

**Current Behavior**:
```
User selects CCTV-1
  ↓
Relationship Manager shows:
  - parkingSpaceIds: ["parking-1", "parking-2"]

Canvas shows:
  - Nothing (no visual indication of connections)
```

**Desired Behavior**:
```
User selects CCTV-1
  ↓
Relationship Manager shows:
  - parkingSpaceIds: ["parking-1", "parking-2"]

Canvas shows:
  - Highlighted lines/arrows from CCTV-1 to Parking-1
  - Highlighted lines/arrows from CCTV-1 to Parking-2
  - Lines disappear when object deselected
```

---

## 2. Gap Summary

### 2.1 Critical Gaps

| Gap | Severity | User Impact |
|-----|----------|-------------|
| Manual linking ignores `allowDuplicates` flag | 🔴 High | Data integrity violation, wrong relationships created |
| No global uniqueness enforcement | 🔴 High | Multiple objects can link to same target when they shouldn't |
| No visual relationship display | 🟡 Medium | Poor UX, hard to understand relationships |
| No edit UI for existing relationships | 🟢 Low | Requires two clicks instead of one |

### 2.2 Already Implemented (No Action Needed)

| Feature | Status | Location |
|---------|--------|----------|
| Relation type editing | ✅ Complete | EditorPage.tsx, RelationTypeManager.tsx |
| Session persistence | ✅ Complete | mutableRelationTypes state |
| Individual relationship save | ✅ Complete | Auto-saved to graph JSON |
| Auto-link duplicate prevention | ✅ Complete | relationshipUtils.ts |
| Cardinality enforcement | ✅ Complete | parseCardinality(), getRemainingCapacity() |

---

## 3. Recommended Implementation Plan

### Phase 1: Fix Duplicate Prevention (High Priority)

**Estimated Time**: 2-3 hours

#### Task 1.1: Add Global Uniqueness Check Utility

**File**: `/src/features/editor/lib/relationshipUtils.ts`

**Add New Function**:
```typescript
/**
 * Check if a target is already linked by any other object
 * @param graph - The JointJS graph
 * @param relationConfig - The relation type configuration
 * @param targetId - The target ID to check
 * @param excludeSourceId - Source ID to exclude from check (for current object)
 * @returns { isLinked: boolean, linkedBySourceId?: string }
 */
export function isTargetLinkedGlobally(
    graph: dia.Graph,
    relationConfig: TemplateRelationType,
    targetId: string,
    excludeSourceId?: string
): { isLinked: boolean; linkedBySourceId?: string } {
    const { sourceType, propertyKey, autoLink } = relationConfig
    const allowDuplicates = autoLink?.allowDuplicates ?? false

    // If duplicates are allowed, skip check
    if (allowDuplicates) {
        return { isLinked: false }
    }

    // Find all source elements of this relation type
    const sourceElements = graph.getElements().filter(el => {
        const typeId = el.get('data')?.typeId || el.get('data')?.type
        return typeId === sourceType && el.id !== excludeSourceId
    })

    // Check if any source already has this target linked
    for (const sourceEl of sourceElements) {
        const existingTargets = getExistingRelationships(sourceEl, propertyKey)
        if (existingTargets.includes(targetId)) {
            return {
                isLinked: true,
                linkedBySourceId: sourceEl.id as string
            }
        }
    }

    return { isLinked: false }
}
```

#### Task 1.2: Update Manual Link Handler

**File**: `/src/pages/editor/components/EditorSidebar.tsx`

**Update `handleAddLink` Function** (lines 125-190):
```typescript
const handleAddLink = (propertyKey: string, targetId: string) => {
    if (!selectedElement || !onObjectUpdate || !graph) return

    console.log(`➕ Adding relationship: propertyKey=${propertyKey}, targetId=${targetId}`)

    const currentData = selectedElement.get('data') || {}
    const currentProps = currentData.properties || {}
    const value = currentProps[propertyKey]

    // Find the relation config by propertyKey
    const relationEntry = Object.entries(relationTypes).find(
        ([_, config]) => config.propertyKey === propertyKey
    )

    if (!relationEntry) {
        console.error(`❌ No relation config found for propertyKey: ${propertyKey}`)
        return
    }

    const [relationKey, relationConfig] = relationEntry
    const maxCount = parseCardinality(relationConfig.cardinality)

    // 🆕 NEW: Check global uniqueness (if allowDuplicates = false)
    const { isLinked, linkedBySourceId } = isTargetLinkedGlobally(
        graph,
        relationConfig,
        targetId,
        selectedElement.id as string
    )

    if (isLinked) {
        // Get source element info for better error message
        const sourceEl = graph.getCell(linkedBySourceId!)
        const sourceName = sourceEl?.get('data')?.properties?.name || linkedBySourceId

        alert(
            `이 객체는 이미 다른 객체(${sourceName})와 연결되어 있습니다.\n` +
            `관계 설정에서 "중복 연결 허용"이 비활성화되어 있습니다.`
        )
        console.log(`❌ Target ${targetId} already linked by ${linkedBySourceId}`)
        return
    }

    console.log(`📊 Relation: ${relationKey}, cardinality: ${relationConfig.cardinality}, maxCount: ${maxCount}`)

    // ... rest of existing code ...
}
```

**Import Required**:
```typescript
import { parseCardinality, isTargetLinkedGlobally } from '@/features/editor/lib/relationshipUtils'
```

#### Task 1.3: Add Visual Feedback

**Enhancement**: Show which object already has the target linked

**File**: `/src/pages/editor/components/RelationshipManager.tsx`

**Update Target Dropdown** (lines 160-180):
```typescript
{availableTargets.length > 0 && canAddMore ? (
    <div className={styles.addSection}>
        <select
            className={styles.targetSelect}
            onChange={(e) => {
                if (e.target.value) {
                    handleAddLink(config, e.target.value)
                    e.target.value = '' // Reset
                }
            }}
            defaultValue=""
        >
            <option value="" disabled>
                {maxCount === 1 ? 'Select connection...' : '+ Add connection...'}
            </option>
            {availableTargets.map(target => {
                // 🆕 Check if target is globally linked
                const { isLinked, linkedBySourceId } = isTargetLinkedGlobally(
                    graph!,
                    config,
                    target.id,
                    element.id as string
                )

                return (
                    <option
                        key={target.id}
                        value={target.id}
                        disabled={isLinked}
                        style={{ color: isLinked ? '#666' : undefined }}
                    >
                        {target.name}
                        {isLinked && linkedBySourceId &&
                            ` (이미 다른 객체와 연결됨)`
                        }
                    </option>
                )
            })}
        </select>
    </div>
) : ...
```

#### Task 1.4: Testing

**Manual Test Cases**:
```
Test 1: Auto-link with allowDuplicates=false
  1. Set template relation with allowDuplicates=false
  2. Run auto-link
  3. Verify no duplicate targets linked
  ✅ Expected: Pass (already working)

Test 2: Manual link with allowDuplicates=false
  1. CCTV-1 → Parking-A (manual add)
  2. Try CCTV-2 → Parking-A (manual add)
  3. Verify alert shown
  ✅ Expected: Alert "이미 다른 객체와 연결되어 있습니다"

Test 3: Manual link with allowDuplicates=true
  1. Set allowDuplicates=true
  2. CCTV-1 → Parking-A
  3. CCTV-2 → Parking-A
  4. Verify both succeed
  ✅ Expected: Both links created

Test 4: Dropdown shows disabled options
  1. CCTV-1 → Parking-A
  2. Open CCTV-2 relationship dropdown
  3. Verify Parking-A is grayed out/disabled
  ✅ Expected: Option disabled with note
```

---

### Phase 2: Add Relationship Edit UI (Medium Priority)

**Estimated Time**: 2-3 hours

#### Task 2.1: Add Edit State to RelationshipManager

**File**: `/src/pages/editor/components/RelationshipManager.tsx`

**Add State**:
```typescript
const [editingRelation, setEditingRelation] = useState<{
    relationKey: string
    targetId: string
} | null>(null)
```

**Update Linked Item UI** (lines 189-220):
```typescript
<div key={id} className={styles.linkedItem}>
    {editingRelation?.relationKey === key && editingRelation.targetId === id ? (
        // Edit mode: Show dropdown
        <select
            className={styles.editSelect}
            value={id}
            onChange={(e) => {
                if (e.target.value !== id) {
                    // Replace relationship
                    handleReplaceLink(config, id, e.target.value)
                    setEditingRelation(null)
                }
            }}
            onBlur={() => setEditingRelation(null)}
            autoFocus
        >
            <option value={id}>{targetName}</option>
            {getAvailableTargets(config).map(target => (
                <option key={target.id} value={target.id}>
                    {target.name}
                </option>
            ))}
        </select>
    ) : (
        // View mode: Show name + buttons
        <>
            <div className={styles.linkedInfo}>
                <span className={styles.targetName}>{targetName}</span>
                {targetType && (
                    <span className={styles.targetType}>{targetType}</span>
                )}
            </div>
            <div className={styles.actions}>
                <button
                    className={styles.editBtn}
                    onClick={() => setEditingRelation({ relationKey: key, targetId: id })}
                    title="Edit connection"
                >
                    ✏️
                </button>
                <button
                    className={styles.unlinkBtn}
                    onClick={() => onUnlink(key, id)}
                    title="Remove connection"
                >
                    ×
                </button>
            </div>
        </>
    )}
</div>
```

#### Task 2.2: Add Replace Handler

**File**: `/src/pages/editor/components/RelationshipManager.tsx`

```typescript
const handleReplaceLink = (
    config: TemplateRelationType,
    oldTargetId: string,
    newTargetId: string
) => {
    console.log(`🔄 Replacing relationship: ${oldTargetId} → ${newTargetId}`)

    // Remove old link
    onUnlink(config.propertyKey, oldTargetId)

    // Add new link
    handleAddLink(config, newTargetId)
}
```

#### Task 2.3: Add CSS Styles

**File**: `/src/pages/editor/components/RelationshipManager.module.css`

```css
.editSelect {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--color-primary);
    border-radius: 4px;
    background: var(--color-bg-secondary);
    color: var(--color-text);
    font-size: 13px;
}

.editBtn {
    padding: 4px 8px;
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 14px;
    opacity: 0.7;
    transition: opacity 0.2s;
}

.editBtn:hover {
    opacity: 1;
}

.actions {
    display: flex;
    gap: 4px;
    align-items: center;
}
```

---

### Phase 3: Add Visual Relationship Display (High Priority)

**Estimated Time**: 4-5 hours

#### Task 3.1: Create Relationship Visualization Utility

**File**: `/src/features/editor/lib/relationshipVisualization.ts` (NEW FILE)

```typescript
import { dia, shapes } from '@joint/core'
import { TemplateRelationType } from '@/entities/schema/templateSchema'
import { getExistingRelationships } from './relationshipUtils'

interface RelationshipLink {
    linkElement: dia.Link
    sourceId: string
    targetId: string
    relationKey: string
}

/**
 * Create visual link elements for all relationships of a selected element
 * @param graph - The JointJS graph
 * @param selectedElement - The currently selected element
 * @param relationTypes - Available relation types
 * @returns Array of created link elements
 */
export function createRelationshipLinks(
    graph: dia.Graph,
    selectedElement: dia.Element,
    relationTypes: Record<string, TemplateRelationType>
): RelationshipLink[] {
    const links: RelationshipLink[] = []
    const sourceId = selectedElement.id as string
    const elementTypeId = selectedElement.get('data')?.typeId || selectedElement.get('data')?.type

    // Find all relation types where this element is the source
    const relevantRelations = Object.entries(relationTypes).filter(
        ([_, config]) => config.sourceType === elementTypeId
    )

    // Create links for each relationship
    relevantRelations.forEach(([relationKey, config]) => {
        const targetIds = getExistingRelationships(selectedElement, config.propertyKey)

        targetIds.forEach(targetId => {
            const targetElement = graph.getCell(targetId)
            if (!targetElement || !targetElement.isElement()) return

            // Create visual link
            const link = new shapes.standard.Link({
                source: { id: sourceId },
                target: { id: targetId },
                attrs: {
                    line: {
                        stroke: '#3B82F6',
                        strokeWidth: 2,
                        strokeDasharray: '5,5',
                        targetMarker: {
                            type: 'path',
                            d: 'M 10 -5 0 0 10 5 z',
                            fill: '#3B82F6'
                        }
                    }
                },
                z: 1000 // Ensure links appear on top
            })

            // Add custom data to identify this as a temp visualization
            link.set('isRelationshipVisualization', true)
            link.set('relationKey', relationKey)

            graph.addCell(link)

            links.push({
                linkElement: link,
                sourceId,
                targetId,
                relationKey
            })
        })
    })

    console.log(`🔗 Created ${links.length} relationship visualization links`)
    return links
}

/**
 * Remove all relationship visualization links
 * @param graph - The JointJS graph
 */
export function clearRelationshipLinks(graph: dia.Graph): void {
    const links = graph.getLinks().filter(link =>
        link.get('isRelationshipVisualization') === true
    )

    links.forEach(link => link.remove())
    console.log(`🧹 Removed ${links.length} relationship visualization links`)
}

/**
 * Update relationship links when element is moved
 * This is handled automatically by JointJS, but we can add custom styling
 */
export function highlightRelationshipTargets(
    graph: dia.Graph,
    paper: dia.Paper,
    targetIds: string[]
): void {
    targetIds.forEach(targetId => {
        const targetElement = graph.getCell(targetId)
        if (targetElement && targetElement.isElement()) {
            const view = paper.findViewByModel(targetElement)
            if (view) {
                view.highlight(null, {
                    highlighter: {
                        name: 'stroke',
                        options: {
                            padding: 5,
                            rx: 5,
                            ry: 5,
                            attrs: {
                                'stroke-width': 3,
                                stroke: '#3B82F6',
                                'stroke-dasharray': '5,5'
                            }
                        }
                    }
                })
            }
        }
    })
}

/**
 * Remove highlights from all elements
 */
export function clearTargetHighlights(
    graph: dia.Graph,
    paper: dia.Paper
): void {
    graph.getElements().forEach(element => {
        const view = paper.findViewByModel(element)
        if (view) {
            view.unhighlight()
        }
    })
}
```

#### Task 3.2: Integrate into EditorPage

**File**: `/src/pages/editor/EditorPage.tsx`

**Add Import**:
```typescript
import {
    createRelationshipLinks,
    clearRelationshipLinks,
    highlightRelationshipTargets,
    clearTargetHighlights
} from '@/features/editor/lib/relationshipVisualization'
```

**Add State**:
```typescript
const [relationshipLinksVisible, setRelationshipLinksVisible] = useState(false)
```

**Add Effect for Selection Changes** (after line 518):
```typescript
// Show relationship visualizations when object is selected
useEffect(() => {
    if (!graph || !paper || !selectedElementId) {
        // Clear visualizations when nothing selected
        if (graph) {
            clearRelationshipLinks(graph)
            clearTargetHighlights(graph, paper!)
        }
        return
    }

    const selectedElement = graph.getCell(selectedElementId)
    if (!selectedElement || !selectedElement.isElement()) return

    // Clear previous visualizations
    clearRelationshipLinks(graph)
    clearTargetHighlights(graph, paper)

    // Create new visualizations
    const links = createRelationshipLinks(
        graph,
        selectedElement as dia.Element,
        mutableRelationTypes
    )

    // Highlight target elements
    const targetIds = links.map(link => link.targetId)
    highlightRelationshipTargets(graph, paper, targetIds)

    console.log(`✨ Showing relationships for ${selectedElementId}: ${links.length} links`)

    // Cleanup on unmount or selection change
    return () => {
        clearRelationshipLinks(graph)
        clearTargetHighlights(graph, paper)
    }
}, [selectedElementId, graph, paper, mutableRelationTypes, dataVersion])
```

#### Task 3.3: Add Toggle Control (Optional)

**File**: `/src/pages/editor/components/EditorHeader.tsx`

Add button to toggle relationship visualization on/off:

```typescript
<button
    className={styles.toolButton}
    onClick={() => setShowRelationships(!showRelationships)}
    title="Toggle Relationship Display"
>
    🔗 {showRelationships ? 'Hide' : 'Show'} Relations
</button>
```

#### Task 3.4: Add Legend (Optional)

**File**: `/src/pages/editor/components/RelationshipLegend.tsx` (NEW FILE)

```typescript
import styles from './RelationshipLegend.module.css'

export function RelationshipLegend() {
    return (
        <div className={styles.legend}>
            <h4>Relationship Colors</h4>
            <div className={styles.item}>
                <div className={styles.line} style={{ borderColor: '#3B82F6' }} />
                <span>Connected Objects</span>
            </div>
        </div>
    )
}
```

---

## 4. Testing Strategy

### 4.1 Unit Tests

**File**: `/src/features/editor/lib/__tests__/relationshipVisualization.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { dia } from '@joint/core'
import { createRelationshipLinks, clearRelationshipLinks } from '../relationshipVisualization'

describe('relationshipVisualization', () => {
    let graph: dia.Graph

    beforeEach(() => {
        graph = new dia.Graph()
    })

    it('should create links for all relationships', () => {
        // ... test implementation ...
    })

    it('should clear all visualization links', () => {
        // ... test implementation ...
    })

    it('should not affect permanent links', () => {
        // ... test implementation ...
    })
})
```

### 4.2 Integration Tests

**Manual Testing Checklist**:

```
□ Duplicate Prevention
  □ Auto-link respects allowDuplicates=false
  □ Manual link respects allowDuplicates=false
  □ Alert shown when trying to link already-linked target
  □ Dropdown shows disabled options for linked targets
  □ allowDuplicates=true allows multiple links

□ Edit UI
  □ Edit icon appears next to each relationship
  □ Click edit shows dropdown with current selection
  □ Selecting new target updates relationship
  □ Cancel (blur) without selecting keeps original
  □ Edit respects cardinality limits

□ Visual Display
  □ Links appear when object selected
  □ Links disappear when object deselected
  □ Target objects are highlighted
  □ Links update when element is moved
  □ Multiple relationships shown correctly
  □ No visual artifacts after clearing
  □ Performance acceptable with 50+ objects

□ Persistence
  □ Relationships survive save/load
  □ Export includes all relationships
  □ Reload shows correct relationships
```

---

## 5. Priority Recommendations

### Immediate (This Week)
1. **Fix duplicate prevention in manual linking** (Phase 1)
   - Critical data integrity issue
   - User explicitly reported this bug
   - 2-3 hours implementation time

2. **Add visual relationship display** (Phase 3)
   - High user value
   - Makes relationships understandable
   - 4-5 hours implementation time

### Next Iteration (Next Week)
3. **Add edit UI** (Phase 2)
   - Nice-to-have UX improvement
   - Lower priority than data integrity
   - 2-3 hours implementation time

### Future Enhancements
4. Cross-session persistence (already works via localStorage)
5. Relationship health monitoring
6. Bulk relationship editing
7. Relationship validation rules
8. Circular dependency detection

---

## 6. Implementation Risks

### Low Risk
- ✅ Relationship persistence already works
- ✅ Auto-link duplicate prevention already works
- ✅ Cardinality enforcement already works

### Medium Risk
- ⚠️ Visual links may impact performance with many objects
  - **Mitigation**: Only show for selected object
  - **Mitigation**: Use temporary links (remove on deselect)

- ⚠️ Global uniqueness check may be slow with large graphs
  - **Mitigation**: Use efficient graph.getElements() filter
  - **Mitigation**: Cache results per relation type

### High Risk
- 🔴 None identified

---

## 7. Files to Modify

### New Files
1. `/src/features/editor/lib/relationshipVisualization.ts` - Visualization utilities
2. `/src/features/editor/lib/__tests__/relationshipVisualization.test.ts` - Tests

### Modified Files
1. `/src/features/editor/lib/relationshipUtils.ts` - Add `isTargetLinkedGlobally()`
2. `/src/pages/editor/components/EditorSidebar.tsx` - Update `handleAddLink()`
3. `/src/pages/editor/components/RelationshipManager.tsx` - Add edit UI
4. `/src/pages/editor/components/RelationshipManager.module.css` - Add styles
5. `/src/pages/editor/EditorPage.tsx` - Add visualization effect

---

## 8. Conclusion

### Summary of Findings

**✅ Already Working**:
- Relation type editing and session persistence
- Individual relationship save to graph JSON
- Auto-link duplicate prevention
- Cardinality enforcement

**❌ Needs Implementation**:
- Manual link duplicate prevention (CRITICAL)
- Visual relationship display on canvas (HIGH PRIORITY)
- Edit UI for existing relationships (NICE-TO-HAVE)

### Recommended Action

**Start with Phase 1** (duplicate prevention) as it's a critical data integrity issue reported by the user. This is a 2-3 hour fix that provides immediate value.

**Then implement Phase 3** (visual display) as it greatly improves UX and helps users understand relationships. This is 4-5 hours of work.

**Finally, Phase 2** (edit UI) is optional but provides a better editing experience.

**Total Estimated Time**: 8-11 hours for all three phases.

---

**Document Version**: 1.0
**Author**: Claude Code Analysis
**Date**: 2025-12-11
**Next Review**: After Phase 1 implementation

---

## Modification Entry [2025-12-11]

### 요청된 변경사항

사용자가 relationship system 분석 문서를 기반으로 다음 세 가지 주요 기능을 구현하기 위한 상세 수정 계획을 요청:

1. **중복 방지 수정**: `allowDuplicates`가 비활성화된 경우 수동 링크에서 중복 관계 생성 차단
2. **관계 시각화 추가**: 객체 선택 시 맵에서 관계를 시각적으로 표시
3. **관계 편집 UI 추가**: 사이드바 관계 항목에 편집 버튼 추가

### 분석 결과

기존 분석 문서(위 내용)에서 이미 각 기능에 대한 상세 분석이 완료되었으며, 다음 사항이 확인됨:

**현재 구현 상태**:
- ✅ Auto-link는 `allowDuplicates` 플래그를 올바르게 준수
- ✅ 관계 타입 편집 및 세션 영속성 구현됨
- ✅ Cardinality 제한 적용 중
- ❌ 수동 링크는 `allowDuplicates` 플래그 무시 (Critical Bug)
- ❌ 관계의 시각적 표시 없음 (UX 문제)
- ❌ 관계 편집 UI 없음 (UX 개선 사항)

**구현 우선순위**:
1. Phase 1 (High Priority): 중복 방지 수정 - 데이터 무결성 이슈
2. Phase 3 (High Priority): 시각적 관계 표시 - 사용자 경험 향상
3. Phase 2 (Medium Priority): 편집 UI - UX 편의성 개선

### 상세 수정 계획

---

## Phase 1: 중복 방지 수정 (High Priority)

**예상 소요 시간**: 2-3시간
**복잡도**: 🟡 Medium
**위험도**: 🟢 Low

### 목표
수동 링크 추가 시 `allowDuplicates=false` 플래그를 준수하여 전역 고유성을 강제하고, 사용자에게 명확한 피드백 제공

### Task 1.1: 전역 고유성 검증 유틸리티 추가

**파일**: `/src/features/editor/lib/relationshipUtils.ts`
**위치**: 파일 끝부분에 새 함수 추가

**추가할 함수**:
```typescript
/**
 * 대상 객체가 다른 소스 객체에 의해 이미 링크되었는지 확인
 * @param graph - JointJS 그래프
 * @param relationConfig - 관계 타입 설정
 * @param targetId - 확인할 대상 ID
 * @param excludeSourceId - 검사에서 제외할 소스 ID (현재 객체)
 * @returns { isLinked: boolean, linkedBySourceId?: string }
 */
export function isTargetLinkedGlobally(
    graph: dia.Graph,
    relationConfig: TemplateRelationType,
    targetId: string,
    excludeSourceId?: string
): { isLinked: boolean; linkedBySourceId?: string } {
    const { sourceType, propertyKey, autoLink } = relationConfig
    const allowDuplicates = autoLink?.allowDuplicates ?? false

    // 중복이 허용되면 검사 건너뛰기
    if (allowDuplicates) {
        return { isLinked: false }
    }

    // 이 관계 타입의 모든 소스 요소 찾기
    const sourceElements = graph.getElements().filter(el => {
        const typeId = el.get('data')?.typeId || el.get('data')?.type
        return typeId === sourceType && el.id !== excludeSourceId
    })

    // 소스 중 하나라도 이 대상이 이미 링크되어 있는지 확인
    for (const sourceEl of sourceElements) {
        const existingTargets = getExistingRelationships(sourceEl, propertyKey)
        if (existingTargets.includes(targetId)) {
            return {
                isLinked: true,
                linkedBySourceId: sourceEl.id as string
            }
        }
    }

    return { isLinked: false }
}
```

**변경 사항**:
- 새로운 export 함수 추가
- 기존 `getExistingRelationships()` 함수 재사용
- `allowDuplicates` 플래그 확인
- 전역 고유성 검증 로직 구현

**테스트 시나리오**:
```typescript
// Test 1: allowDuplicates=false일 때 이미 링크된 대상 감지
const result = isTargetLinkedGlobally(graph, relationConfig, 'parking-1', 'cctv-1')
expect(result.isLinked).toBe(true)
expect(result.linkedBySourceId).toBe('cctv-2')

// Test 2: allowDuplicates=true일 때 항상 false 반환
const result = isTargetLinkedGlobally(graph, relationConfigWithDuplicates, 'parking-1', 'cctv-1')
expect(result.isLinked).toBe(false)

// Test 3: 링크되지 않은 대상
const result = isTargetLinkedGlobally(graph, relationConfig, 'parking-999', 'cctv-1')
expect(result.isLinked).toBe(false)
```

---

### Task 1.2: 수동 링크 핸들러 업데이트

**파일**: `/src/pages/editor/components/EditorSidebar.tsx`
**위치**: 라인 125-190 `handleAddLink` 함수

**Import 추가**:
```typescript
// 기존 import 수정 (라인 16)
import { parseCardinality, isTargetLinkedGlobally } from '@/features/editor/lib/relationshipUtils'
```

**함수 수정**:
```typescript
const handleAddLink = (propertyKey: string, targetId: string) => {
    if (!selectedElement || !onObjectUpdate || !graph) return

    console.log(`➕ 관계 추가 중: propertyKey=${propertyKey}, targetId=${targetId}`)

    const currentData = selectedElement.get('data') || {}
    const currentProps = currentData.properties || {}
    const value = currentProps[propertyKey]

    // propertyKey로 관계 설정 찾기
    const relationEntry = Object.entries(relationTypes).find(
        ([_, config]) => config.propertyKey === propertyKey
    )

    if (!relationEntry) {
        console.error(`❌ propertyKey에 대한 관계 설정을 찾을 수 없음: ${propertyKey}`)
        return
    }

    const [relationKey, relationConfig] = relationEntry
    const maxCount = parseCardinality(relationConfig.cardinality)

    // 🆕 NEW: 전역 고유성 검사 (allowDuplicates = false인 경우)
    const { isLinked, linkedBySourceId } = isTargetLinkedGlobally(
        graph,
        relationConfig,
        targetId,
        selectedElement.id as string
    )

    if (isLinked) {
        // 더 나은 오류 메시지를 위해 소스 요소 정보 가져오기
        const sourceEl = graph.getCell(linkedBySourceId!)
        const sourceName = sourceEl?.get('data')?.properties?.name || linkedBySourceId

        alert(
            `이 객체는 이미 다른 객체(${sourceName})와 연결되어 있습니다.\n` +
            `관계 설정에서 "중복 연결 허용"이 비활성화되어 있습니다.`
        )
        console.log(`❌ 대상 ${targetId}이(가) 이미 ${linkedBySourceId}에 의해 링크됨`)
        return
    }

    console.log(`📊 관계: ${relationKey}, cardinality: ${relationConfig.cardinality}, maxCount: ${maxCount}`)

    // ... 나머지 기존 코드 유지 ...
}
```

**변경 위치**: 라인 146 이후 (maxCount 계산 다음)

**변경 내용**:
- `isTargetLinkedGlobally()` 호출 추가
- 이미 링크된 경우 alert로 사용자 알림
- 소스 객체 이름 표시로 더 명확한 오류 메시지 제공
- Early return으로 중복 링크 차단

**예상 동작**:
```
사용자 시나리오:
1. CCTV-1 → Parking-A 연결 (성공)
2. CCTV-2 → Parking-A 연결 시도
   ↓
Alert: "이 객체는 이미 다른 객체(CCTV-1)와 연결되어 있습니다.
관계 설정에서 '중복 연결 허용'이 비활성화되어 있습니다."
   ↓
3. 연결 실패, 기존 관계 유지
```

---

### Task 1.3: 드롭다운에서 시각적 피드백 추가

**파일**: `/src/pages/editor/components/RelationshipManager.tsx`
**위치**: 라인 160-180 (대상 선택 드롭다운)

**Import 추가**:
```typescript
import {
    parseCardinality,
    getRemainingCapacity,
    isTargetLinkedGlobally
} from '@/features/editor/lib/relationshipUtils'
```

**드롭다운 옵션 수정**:
```typescript
{availableTargets.length > 0 && canAddMore ? (
    <div className={styles.addSection}>
        <select
            className={styles.targetSelect}
            onChange={(e) => {
                if (e.target.value) {
                    handleAddLink(config, e.target.value)
                    e.target.value = '' // 초기화
                }
            }}
            defaultValue=""
        >
            <option value="" disabled>
                {maxCount === 1 ? '연결 선택...' : '+ 연결 추가...'}
            </option>
            {availableTargets.map(target => {
                // 🆕 대상이 전역적으로 링크되어 있는지 확인
                const { isLinked, linkedBySourceId } = isTargetLinkedGlobally(
                    graph!,
                    config,
                    target.id,
                    element.id as string
                )

                return (
                    <option
                        key={target.id}
                        value={target.id}
                        disabled={isLinked}
                        style={{
                            color: isLinked ? '#666' : undefined,
                            fontStyle: isLinked ? 'italic' : undefined
                        }}
                    >
                        {target.name}
                        {isLinked && ' (이미 다른 객체와 연결됨)'}
                    </option>
                )
            })}
        </select>
    </div>
) : ...
```

**CSS 추가** (`RelationshipManager.module.css`):
```css
.targetSelect option:disabled {
    color: #64748b;
    font-style: italic;
    background-color: #1e293b;
}
```

**변경 내용**:
- 각 옵션에 대해 `isTargetLinkedGlobally()` 호출
- 이미 링크된 옵션은 `disabled` 처리
- 회색 텍스트 + italic 스타일로 시각적 구분
- 툴팁 텍스트 추가: "(이미 다른 객체와 연결됨)"

---

### Task 1.4: 테스트 계획

**수동 테스트 체크리스트**:
```
□ Test 1: Auto-link (allowDuplicates=false)
  1. 관계 타입에서 allowDuplicates=false 설정
  2. Auto-link 실행
  3. 중복 대상이 링크되지 않았는지 확인
  ✅ 예상: 통과 (이미 작동 중)

□ Test 2: 수동 링크 (allowDuplicates=false)
  1. CCTV-1 → Parking-A (수동 추가)
  2. CCTV-2 → Parking-A 시도 (수동 추가)
  3. Alert 표시 확인
  ✅ 예상: Alert "이미 다른 객체와 연결되어 있습니다"

□ Test 3: 수동 링크 (allowDuplicates=true)
  1. allowDuplicates=true 설정
  2. CCTV-1 → Parking-A
  3. CCTV-2 → Parking-A
  4. 두 링크 모두 성공 확인
  ✅ 예상: 두 링크 모두 생성됨

□ Test 4: 드롭다운 비활성화 옵션
  1. CCTV-1 → Parking-A
  2. CCTV-2 관계 드롭다운 열기
  3. Parking-A가 회색으로 비활성화되었는지 확인
  ✅ 예상: 옵션 비활성화 + 노트 표시

□ Test 5: 링크 해제 후 재사용 가능
  1. CCTV-1 → Parking-A
  2. CCTV-1에서 Parking-A 링크 해제
  3. CCTV-2 → Parking-A 가능한지 확인
  ✅ 예상: 링크 성공

□ Test 6: Cardinality 제한과 중복 방지 조합
  1. 관계 타입: cardinality="1:2", allowDuplicates=false
  2. CCTV-1 → Parking-A, Parking-B
  3. CCTV-2 → Parking-A 시도
  ✅ 예상: 차단됨 (Parking-A 이미 사용 중)
  4. CCTV-2 → Parking-C
  ✅ 예상: 성공 (C는 사용 가능)
```

**단위 테스트 파일**: `/src/features/editor/lib/__tests__/relationshipUtils.test.ts`
```typescript
describe('isTargetLinkedGlobally', () => {
    it('allowDuplicates=false일 때 이미 링크된 대상 감지', () => {
        // Setup: CCTV-1 → Parking-A
        // Test: CCTV-2에서 Parking-A 확인
        // Expect: { isLinked: true, linkedBySourceId: 'cctv-1' }
    })

    it('allowDuplicates=true일 때 항상 false 반환', () => {
        // Test: 동일 시나리오, allowDuplicates=true
        // Expect: { isLinked: false }
    })

    it('현재 소스는 검사에서 제외', () => {
        // Test: CCTV-1이 자신의 링크 확인
        // Expect: { isLinked: false }
    })
})
```

**추정 복잡도**: 🟡 Medium
- 새 함수 구현: 간단 (기존 유틸 재사용)
- 기존 로직 수정: 중간 (여러 파일 수정)
- 테스트 범위: 중간 (엣지 케이스 고려 필요)

---

## Phase 2: 관계 편집 UI 추가 (Medium Priority)

**예상 소요 시간**: 2-3시간
**복잡도**: 🟢 Low
**위험도**: 🟢 Low

### 목표
기존 관계 항목에 편집 버튼을 추가하여 사용자가 링크 해제 + 재추가 없이 대상을 직접 변경할 수 있도록 함

### Task 2.1: 편집 상태 추가

**파일**: `/src/pages/editor/components/RelationshipManager.tsx`
**위치**: 컴포넌트 시작 부분

**State 추가**:
```typescript
const [editingRelation, setEditingRelation] = useState<{
    relationKey: string
    targetId: string
} | null>(null)
```

**위치**: 라인 20 근처 (다른 useState 선언 아래)

---

### Task 2.2: 링크된 항목 UI 수정

**파일**: `/src/pages/editor/components/RelationshipManager.tsx`
**위치**: 라인 189-220 (linkedItem 렌더링 부분)

**기존 코드 교체**:
```typescript
<div key={id} className={styles.linkedItem}>
    {editingRelation?.relationKey === key && editingRelation.targetId === id ? (
        // 편집 모드: 드롭다운 표시
        <select
            className={styles.editSelect}
            value={id}
            onChange={(e) => {
                if (e.target.value !== id) {
                    // 관계 교체
                    handleReplaceLink(config, id, e.target.value)
                    setEditingRelation(null)
                }
            }}
            onBlur={() => setEditingRelation(null)}
            autoFocus
        >
            <option value={id}>{targetName}</option>
            {getAvailableTargets(config).map(target => (
                <option key={target.id} value={target.id}>
                    {target.name}
                </option>
            ))}
        </select>
    ) : (
        // 보기 모드: 이름 + 버튼 표시
        <>
            <div className={styles.linkedInfo}>
                <span className={styles.targetName}>{targetName}</span>
                {targetType && (
                    <span className={styles.targetType}>{targetType}</span>
                )}
            </div>
            <div className={styles.actions}>
                <button
                    className={styles.editBtn}
                    onClick={() => setEditingRelation({ relationKey: key, targetId: id })}
                    title="연결 편집"
                >
                    ✏️
                </button>
                <button
                    className={styles.unlinkBtn}
                    onClick={() => onUnlink(key, id)}
                    title="연결 제거"
                >
                    ×
                </button>
            </div>
        </>
    )}
</div>
```

**변경 내용**:
- 조건부 렌더링: 편집 모드 vs 보기 모드
- 편집 모드: 드롭다운으로 대상 변경
- 보기 모드: 기존 UI + 새 편집 버튼
- `autoFocus`로 드롭다운 자동 포커스
- `onBlur`로 편집 모드 취소

---

### Task 2.3: 관계 교체 핸들러 추가

**파일**: `/src/pages/editor/components/RelationshipManager.tsx`
**위치**: 컴포넌트 함수 내부 (다른 핸들러 아래)

**새 함수 추가**:
```typescript
const handleReplaceLink = (
    config: TemplateRelationType,
    oldTargetId: string,
    newTargetId: string
) => {
    console.log(`🔄 관계 교체 중: ${oldTargetId} → ${newTargetId}`)

    // 기존 링크 제거
    onUnlink(config.propertyKey, oldTargetId)

    // 새 링크 추가
    handleAddLink(config, newTargetId)

    console.log(`✅ 관계 교체 완료: ${oldTargetId} → ${newTargetId}`)
}
```

**위치**: `handleAddLink` 함수 아래

**동작 방식**:
1. 기존 `onUnlink()` 재사용하여 이전 링크 제거
2. 기존 `handleAddLink()` 재사용하여 새 링크 추가
3. Phase 1의 중복 검증도 자동 적용됨

---

### Task 2.4: CSS 스타일 추가

**파일**: `/src/pages/editor/components/RelationshipManager.module.css`
**위치**: 파일 끝부분

**새 스타일 추가**:
```css
/* 편집 모드 드롭다운 */
.editSelect {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--color-primary);
    border-radius: 4px;
    background: var(--color-bg-secondary);
    color: var(--color-text);
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
}

.editSelect:focus {
    outline: none;
    border-color: var(--color-primary-light);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

/* 편집 버튼 */
.editBtn {
    padding: 4px 8px;
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 14px;
    opacity: 0.7;
    transition: opacity 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.editBtn:hover {
    opacity: 1;
    transform: scale(1.1);
}

.editBtn:active {
    transform: scale(0.95);
}

/* 액션 버튼 컨테이너 */
.actions {
    display: flex;
    gap: 4px;
    align-items: center;
}

/* 링크 정보 컨테이너 */
.linkedInfo {
    flex: 1;
    min-width: 0; /* 텍스트 오버플로우 처리 */
}

/* 기존 linkedItem 수정 (flex 레이아웃) */
.linkedItem {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px;
    background: var(--color-bg-tertiary);
    border-radius: 4px;
    gap: 8px;
}
```

**변경 내용**:
- `.editSelect`: 드롭다운 스타일 (primary 색상 강조)
- `.editBtn`: 편집 버튼 스타일 (호버 시 확대)
- `.actions`: 버튼들을 수평으로 정렬
- `.linkedInfo`: 텍스트 영역 (flex-grow)
- `.linkedItem`: flex 레이아웃으로 수정

---

### Task 2.5: 테스트 계획

**수동 테스트 체크리스트**:
```
□ Test 1: 편집 버튼 표시
  1. 관계가 있는 객체 선택
  2. 각 관계 항목에 연필(✏️) 아이콘 확인
  ✅ 예상: 모든 항목에 편집 버튼 표시

□ Test 2: 편집 모드 진입
  1. 편집 버튼 클릭
  2. 드롭다운으로 전환 확인
  3. 현재 대상이 선택되어 있는지 확인
  4. 포커스가 드롭다운에 있는지 확인
  ✅ 예상: 즉시 편집 가능 상태

□ Test 3: 관계 교체
  1. CCTV-1 → Parking-A
  2. 편집 버튼 클릭
  3. Parking-B 선택
  4. 관계가 Parking-A → Parking-B로 변경되었는지 확인
  ✅ 예상: 관계 업데이트 성공

□ Test 4: 편집 취소 (Blur)
  1. 편집 버튼 클릭
  2. 드롭다운 외부 클릭
  3. 보기 모드로 복귀 확인
  4. 기존 관계 유지 확인
  ✅ 예상: 변경 없이 복귀

□ Test 5: Cardinality 제한 준수
  1. 1:1 관계에서 편집
  2. 다른 대상 선택
  ✅ 예상: 기존 대상 교체 (추가 아님)

□ Test 6: 중복 방지와 함께 작동
  1. allowDuplicates=false 설정
  2. CCTV-1 → Parking-A
  3. CCTV-2 → Parking-B
  4. CCTV-2 편집하여 Parking-A로 변경 시도
  ✅ 예상: Phase 1의 alert 표시, 편집 실패

□ Test 7: 다중 관계 편집
  1. 1:N 관계에서 여러 링크 생성
  2. 각 링크의 편집 버튼 독립적으로 작동하는지 확인
  ✅ 예상: 각 항목 개별 편집 가능
```

**UI/UX 검증**:
```
□ 버튼 크기 적절
□ 호버 효과 부드러움
□ 편집 모드 전환 즉각 반응
□ 드롭다운 목록 가독성
□ 색상 대비 충분 (접근성)
```

**추정 복잡도**: 🟢 Low
- UI 변경만 필요
- 기존 핸들러 재사용
- 리스크 낮음 (기존 기능 영향 없음)

---

## Phase 3: 시각적 관계 표시 (High Priority)

**예상 소요 시간**: 4-5시간
**복잡도**: 🔴 High
**위험도**: 🟡 Medium

### 목표
객체 선택 시 해당 객체의 모든 관계를 맵에서 시각적으로 표시 (선, 화살표, 대상 하이라이트)

### Task 3.1: 관계 시각화 유틸리티 생성

**새 파일**: `/src/features/editor/lib/relationshipVisualization.ts`

**전체 코드**:
```typescript
import { dia, shapes } from '@joint/core'
import { TemplateRelationType } from '@/entities/schema/templateSchema'
import { getExistingRelationships } from './relationshipUtils'

interface RelationshipLink {
    linkElement: dia.Link
    sourceId: string
    targetId: string
    relationKey: string
}

/**
 * 선택된 요소의 모든 관계에 대한 시각적 링크 요소 생성
 * @param graph - JointJS 그래프
 * @param selectedElement - 현재 선택된 요소
 * @param relationTypes - 사용 가능한 관계 타입
 * @returns 생성된 링크 요소 배열
 */
export function createRelationshipLinks(
    graph: dia.Graph,
    selectedElement: dia.Element,
    relationTypes: Record<string, TemplateRelationType>
): RelationshipLink[] {
    const links: RelationshipLink[] = []
    const sourceId = selectedElement.id as string
    const elementTypeId = selectedElement.get('data')?.typeId || selectedElement.get('data')?.type

    // 이 요소가 소스인 모든 관계 타입 찾기
    const relevantRelations = Object.entries(relationTypes).filter(
        ([_, config]) => config.sourceType === elementTypeId
    )

    console.log(`🔗 Creating relationship visualizations for ${sourceId}:`, {
        elementType: elementTypeId,
        relevantRelationCount: relevantRelations.length
    })

    // 각 관계에 대한 링크 생성
    relevantRelations.forEach(([relationKey, config]) => {
        const targetIds = getExistingRelationships(selectedElement, config.propertyKey)

        console.log(`  📌 Relation ${relationKey}:`, {
            propertyKey: config.propertyKey,
            targetCount: targetIds.length,
            targets: targetIds
        })

        targetIds.forEach(targetId => {
            const targetElement = graph.getCell(targetId)
            if (!targetElement || !targetElement.isElement()) {
                console.warn(`  ⚠️ Target element not found: ${targetId}`)
                return
            }

            // 시각적 링크 생성
            const link = new shapes.standard.Link({
                source: { id: sourceId },
                target: { id: targetId },
                attrs: {
                    line: {
                        stroke: '#3B82F6', // 파란색
                        strokeWidth: 2,
                        strokeDasharray: '5,5', // 점선
                        targetMarker: {
                            type: 'path',
                            d: 'M 10 -5 0 0 10 5 z', // 화살표
                            fill: '#3B82F6'
                        }
                    }
                },
                z: 1000, // 링크가 최상위에 표시되도록
                router: { name: 'manhattan' }, // 직각 경로
                connector: { name: 'rounded' } // 둥근 모서리
            })

            // 시각화 임시 표시임을 나타내는 커스텀 데이터 추가
            link.set('isRelationshipVisualization', true)
            link.set('relationKey', relationKey)

            graph.addCell(link)

            links.push({
                linkElement: link,
                sourceId,
                targetId,
                relationKey
            })

            console.log(`  ✅ Created link: ${sourceId} → ${targetId}`)
        })
    })

    console.log(`🎨 Total ${links.length} relationship links created`)
    return links
}

/**
 * 모든 관계 시각화 링크 제거
 * @param graph - JointJS 그래프
 */
export function clearRelationshipLinks(graph: dia.Graph): void {
    const links = graph.getLinks().filter(link =>
        link.get('isRelationshipVisualization') === true
    )

    links.forEach(link => link.remove())

    if (links.length > 0) {
        console.log(`🧹 Removed ${links.length} relationship visualization links`)
    }
}

/**
 * 관계 대상 요소들 하이라이트
 * @param graph - JointJS 그래프
 * @param paper - JointJS paper
 * @param targetIds - 하이라이트할 대상 ID 배열
 */
export function highlightRelationshipTargets(
    graph: dia.Graph,
    paper: dia.Paper,
    targetIds: string[]
): void {
    targetIds.forEach(targetId => {
        const targetElement = graph.getCell(targetId)
        if (targetElement && targetElement.isElement()) {
            const view = paper.findViewByModel(targetElement)
            if (view) {
                view.highlight(null, {
                    highlighter: {
                        name: 'stroke',
                        options: {
                            padding: 5,
                            rx: 5,
                            ry: 5,
                            attrs: {
                                'stroke-width': 3,
                                stroke: '#3B82F6',
                                'stroke-dasharray': '5,5'
                            }
                        }
                    }
                })
            }
        }
    })

    if (targetIds.length > 0) {
        console.log(`✨ Highlighted ${targetIds.length} target elements`)
    }
}

/**
 * 모든 요소의 하이라이트 제거
 * @param graph - JointJS 그래프
 * @param paper - JointJS paper
 */
export function clearTargetHighlights(
    graph: dia.Graph,
    paper: dia.Paper
): void {
    graph.getElements().forEach(element => {
        const view = paper.findViewByModel(element)
        if (view) {
            view.unhighlight()
        }
    })
}
```

**주요 기능**:
1. **createRelationshipLinks**: 선택된 객체의 모든 관계를 JointJS Link로 생성
2. **clearRelationshipLinks**: 시각화 링크만 선택적으로 제거
3. **highlightRelationshipTargets**: 대상 객체에 파란색 점선 테두리 추가
4. **clearTargetHighlights**: 모든 하이라이트 제거

**스타일링**:
- 파란색 (`#3B82F6`) 점선 (`5,5`)
- 화살표 마커 (방향 표시)
- Manhattan 라우터 (직각 경로)
- z-index 1000 (최상위)

---

### Task 3.2: EditorPage에 통합

**파일**: `/src/pages/editor/EditorPage.tsx`

**Import 추가** (라인 42 근처):
```typescript
import {
    createRelationshipLinks,
    clearRelationshipLinks,
    highlightRelationshipTargets,
    clearTargetHighlights
} from '@/features/editor/lib/relationshipVisualization'
```

**Effect 추가** (라인 518 이후, 기존 하이라이트 effect 다음):
```typescript
// 객체 선택 시 관계 시각화 표시
useEffect(() => {
    if (!graph || !paper || !selectedElementId) {
        // 선택 해제 시 시각화 제거
        if (graph && paper) {
            clearRelationshipLinks(graph)
            clearTargetHighlights(graph, paper)
        }
        return
    }

    const selectedElement = graph.getCell(selectedElementId)
    if (!selectedElement || !selectedElement.isElement()) return

    console.log(`👁️ Showing relationships for selected element: ${selectedElementId}`)

    // 이전 시각화 제거
    clearRelationshipLinks(graph)
    clearTargetHighlights(graph, paper)

    // 새 시각화 생성
    const links = createRelationshipLinks(
        graph,
        selectedElement as dia.Element,
        mutableRelationTypes
    )

    // 대상 요소 하이라이트
    const targetIds = links.map(link => link.targetId)
    highlightRelationshipTargets(graph, paper, targetIds)

    console.log(`✨ 관계 표시 중 ${selectedElementId}: ${links.length}개 링크`)

    // Cleanup: 선택 해제 또는 컴포넌트 언마운트 시
    return () => {
        clearRelationshipLinks(graph)
        clearTargetHighlights(graph, paper)
    }
}, [selectedElementId, graph, paper, mutableRelationTypes, dataVersion])
```

**의존성 배열**:
- `selectedElementId`: 선택 변경 시
- `graph`, `paper`: 초기화 시
- `mutableRelationTypes`: 관계 타입 변경 시
- `dataVersion`: 관계 데이터 업데이트 시

**동작 흐름**:
```
1. 사용자가 객체 선택
   ↓
2. useEffect 트리거
   ↓
3. 이전 시각화 제거 (cleanup)
   ↓
4. 새 관계 링크 생성
   ↓
5. 대상 객체 하이라이트
   ↓
6. 선택 해제 시 모두 제거
```

---

### Task 3.3: 성능 최적화 (선택 사항)

**파일**: `/src/features/editor/lib/relationshipVisualization.ts`

**캐싱 추가**:
```typescript
// 링크 생성 결과 캐싱
const linkCache = new Map<string, RelationshipLink[]>()

export function createRelationshipLinks(
    graph: dia.Graph,
    selectedElement: dia.Element,
    relationTypes: Record<string, TemplateRelationType>
): RelationshipLink[] {
    const cacheKey = `${selectedElement.id}_${JSON.stringify(relationTypes)}`

    // 캐시 확인
    if (linkCache.has(cacheKey)) {
        console.log('📦 Using cached relationship links')
        return linkCache.get(cacheKey)!
    }

    // ... 기존 생성 로직 ...

    // 캐시 저장
    linkCache.set(cacheKey, links)
    return links
}

// 캐시 무효화 함수 추가
export function invalidateLinkCache(): void {
    linkCache.clear()
}
```

**사용 시점**:
- 관계 데이터 변경 시 `invalidateLinkCache()` 호출
- 50개 이상 객체에서 성능 향상

---

### Task 3.4: 토글 컨트롤 추가 (선택 사항)

**파일**: `/src/pages/editor/components/EditorHeader.tsx`

**State 추가** (EditorPage.tsx):
```typescript
const [showRelationships, setShowRelationships] = useState(true)
```

**버튼 추가** (EditorHeader.tsx):
```typescript
<button
    className={styles.toolButton}
    onClick={() => setShowRelationships(!showRelationships)}
    title={showRelationships ? "관계 숨기기" : "관계 표시"}
>
    🔗 {showRelationships ? '관계 숨김' : '관계 표시'}
</button>
```

**Effect 수정** (EditorPage.tsx):
```typescript
// 시각화 생성 전에 showRelationships 확인
if (showRelationships) {
    const links = createRelationshipLinks(...)
    // ...
}
```

---

### Task 3.5: 테스트 계획

**수동 테스트 체크리스트**:
```
□ Test 1: 기본 시각화
  1. 관계가 있는 객체 선택
  2. 파란색 점선이 대상으로 향하는지 확인
  3. 화살표 마커 확인
  ✅ 예상: 모든 관계가 시각적으로 표시됨

□ Test 2: 대상 하이라이트
  1. 객체 선택
  2. 연결된 대상 객체들에 파란색 테두리 확인
  ✅ 예상: 대상 객체 강조됨

□ Test 3: 선택 해제 시 제거
  1. 객체 선택 (시각화 표시)
  2. 빈 공간 클릭 (선택 해제)
  3. 모든 링크와 하이라이트 사라지는지 확인
  ✅ 예상: 즉시 제거됨

□ Test 4: 다른 객체 선택
  1. 객체 A 선택 (관계 표시)
  2. 객체 B 선택
  3. A의 시각화가 제거되고 B의 시각화가 표시되는지 확인
  ✅ 예상: 부드러운 전환

□ Test 5: 다중 관계
  1. 여러 관계(1:N)가 있는 객체 선택
  2. 모든 대상으로 링크가 그려지는지 확인
  ✅ 예상: 모든 링크 표시

□ Test 6: 관계 없는 객체
  1. 관계가 없는 객체 선택
  2. 아무 링크도 생성되지 않는지 확인
  ✅ 예상: 시각화 없음 (에러 없음)

□ Test 7: 관계 업데이트 후 반영
  1. 객체 선택 (시각화 표시)
  2. 관계 추가/제거
  3. 시각화가 자동 업데이트되는지 확인
  ✅ 예상: dataVersion 변경으로 자동 갱신

□ Test 8: 성능 테스트
  1. 50개 이상 객체 생성
  2. 다중 관계(1:10)가 있는 객체 선택
  3. 렌더링 지연 확인
  ✅ 예상: 500ms 이내 렌더링

□ Test 9: 링크와 기존 객체 겹침
  1. 밀집된 영역의 객체 선택
  2. 링크가 다른 객체 위에 표시되는지 확인
  ✅ 예상: z-index=1000으로 최상위 표시

□ Test 10: 요소 이동 시
  1. 객체 선택 (시각화 표시)
  2. 객체 또는 대상 이동
  3. 링크가 자동으로 따라가는지 확인
  ✅ 예상: JointJS가 자동 업데이트
```

**성능 벤치마크**:
```
- 10개 관계: <100ms
- 50개 관계: <500ms
- 100개 관계: <1000ms

메모리:
- 100개 링크: ~5MB 추가
```

**단위 테스트 파일**: `/src/features/editor/lib/__tests__/relationshipVisualization.test.ts`
```typescript
describe('relationshipVisualization', () => {
    let graph: dia.Graph

    beforeEach(() => {
        graph = new dia.Graph()
    })

    it('모든 관계에 대한 링크 생성', () => {
        // Setup: 소스 + 3개 대상 생성
        // Test: createRelationshipLinks()
        // Expect: 3개 링크 생성
    })

    it('시각화 링크만 제거', () => {
        // Setup: 일반 링크 + 시각화 링크 생성
        // Test: clearRelationshipLinks()
        // Expect: 시각화 링크만 제거, 일반 링크 유지
    })

    it('영구 링크는 영향 받지 않음', () => {
        // Setup: 영구 링크 생성
        // Test: clearRelationshipLinks()
        // Expect: 영구 링크 그대로 유지
    })
})
```

**추정 복잡도**: 🔴 High
- JointJS API 이해 필요
- 성능 고려사항
- 많은 엣지 케이스
- 시각적 QA 필요

**위험도**: 🟡 Medium
- 기존 그래프에 영향 가능성 (z-index)
- 성능 저하 가능성 (많은 객체)
- 메모리 누수 주의 (cleanup 필수)

---

## 파일 수정 요약

### 새로 생성할 파일
1. `/src/features/editor/lib/relationshipVisualization.ts` - 시각화 유틸리티 (Phase 3)
2. `/src/features/editor/lib/__tests__/relationshipVisualization.test.ts` - 테스트 파일 (Phase 3)

### 수정할 파일

**Phase 1: 중복 방지 수정**
1. `/src/features/editor/lib/relationshipUtils.ts`
   - 라인: 끝부분
   - 변경: `isTargetLinkedGlobally()` 함수 추가
   - 복잡도: 🟢 Low

2. `/src/pages/editor/components/EditorSidebar.tsx`
   - 라인: 16 (import), 125-190 (handleAddLink)
   - 변경: 전역 고유성 검증 추가
   - 복잡도: 🟡 Medium

3. `/src/pages/editor/components/RelationshipManager.tsx`
   - 라인: import, 160-180 (드롭다운)
   - 변경: 비활성화 옵션 표시
   - 복잡도: 🟢 Low

4. `/src/pages/editor/components/RelationshipManager.module.css`
   - 라인: 끝부분
   - 변경: 비활성화 옵션 스타일 추가
   - 복잡도: 🟢 Low

**Phase 2: 편집 UI 추가**
1. `/src/pages/editor/components/RelationshipManager.tsx`
   - 라인: 20 (state), 189-220 (linkedItem), 새 핸들러
   - 변경: 편집 모드 + 교체 핸들러
   - 복잡도: 🟢 Low

2. `/src/pages/editor/components/RelationshipManager.module.css`
   - 라인: 끝부분
   - 변경: 편집 UI 스타일 추가
   - 복잡도: 🟢 Low

**Phase 3: 시각화 추가**
1. `/src/pages/editor/EditorPage.tsx`
   - 라인: 42 (import), 518 이후 (새 effect)
   - 변경: 시각화 effect 추가
   - 복잡도: 🟡 Medium

---

## 구현 순서 및 타임라인

### Week 1: Phase 1 (중복 방지)
**Day 1-2**:
- ✅ Task 1.1: `isTargetLinkedGlobally()` 구현
- ✅ Task 1.2: `handleAddLink()` 업데이트
- ✅ 단위 테스트 작성

**Day 3**:
- ✅ Task 1.3: 드롭다운 비활성화 UI
- ✅ 통합 테스트
- ✅ Bug fix 및 리뷰

**결과물**:
- 수동 링크 중복 방지 완전 구현
- Alert 및 UI 피드백
- 테스트 커버리지 80%+

---

### Week 2: Phase 3 (시각화)
**Day 1-2**:
- ✅ Task 3.1: `relationshipVisualization.ts` 구현
- ✅ 기본 링크 생성 및 제거 로직
- ✅ 단위 테스트

**Day 3-4**:
- ✅ Task 3.2: EditorPage 통합
- ✅ 하이라이트 기능 추가
- ✅ 성능 최적화
- ✅ 통합 테스트

**Day 5**:
- ✅ 시각적 QA
- ✅ 성능 벤치마크
- ✅ Bug fix

**결과물**:
- 관계 시각화 완전 구현
- 50개 객체에서 안정적 성능
- 테스트 커버리지 70%+

---

### Week 3: Phase 2 (편집 UI) + 최종 통합
**Day 1-2**:
- ✅ Task 2.1-2.4: 편집 UI 구현
- ✅ 스타일링 및 UX 개선

**Day 3**:
- ✅ 전체 통합 테스트
- ✅ 세 Phase 간 상호작용 검증
- ✅ 회귀 테스트

**Day 4-5**:
- ✅ 문서 업데이트
- ✅ 최종 QA
- ✅ 프로덕션 배포 준비

**결과물**:
- 모든 Phase 완료
- 통합 문서
- 배포 가능 상태

---

## 위험 관리

### 🟢 Low Risk (Phase 1, Phase 2)
**완화 전략**:
- 기존 로직 재사용 최대화
- 단계별 테스트 철저히 수행
- 코드 리뷰 필수

### 🟡 Medium Risk (Phase 3)
**잠재적 문제**:
1. **성능 저하**: 많은 객체/관계에서 렌더링 지연
   - **완화**: 캐싱, 가상화, 토글 컨트롤
2. **메모리 누수**: Cleanup 미흡
   - **완화**: useEffect cleanup 철저히
3. **UI 충돌**: 기존 그래프 요소와 z-index 충돌
   - **완화**: z-index 전략 명확히

### 🔴 High Risk
**없음** - 모든 변경사항이 격리되어 있고 기존 기능 영향 최소화

---

## 성공 지표

### Phase 1 완료 기준
- ✅ `allowDuplicates=false`일 때 수동 링크 중복 100% 차단
- ✅ Alert 메시지 명확하고 사용자 친화적
- ✅ 드롭다운에서 비활성화 옵션 시각적으로 구분
- ✅ 테스트 통과율 100%
- ✅ 회귀 버그 0건

### Phase 2 완료 기준
- ✅ 모든 관계 항목에 편집 버튼 표시
- ✅ 클릭 1회로 관계 대상 변경 가능
- ✅ 편집 취소 (blur) 정상 작동
- ✅ UX 부드럽고 직관적
- ✅ 기존 링크 해제 기능 정상 작동

### Phase 3 완료 기준
- ✅ 객체 선택 시 모든 관계 시각화
- ✅ 대상 객체 하이라이트 명확
- ✅ 선택 해제 시 즉시 제거
- ✅ 50개 객체에서 500ms 이내 렌더링
- ✅ 메모리 누수 없음
- ✅ 기존 그래프 기능 영향 없음

---

## 롤백 계획

각 Phase는 독립적으로 롤백 가능:

**Phase 1 롤백**:
```bash
git revert <commit-hash>
# relationshipUtils.ts의 isTargetLinkedGlobally() 제거
# EditorSidebar.tsx의 검증 로직 제거
```

**Phase 2 롤백**:
```bash
git revert <commit-hash>
# RelationshipManager.tsx의 편집 UI 제거
# 기존 보기 모드만 유지
```

**Phase 3 롤백**:
```bash
git revert <commit-hash>
# relationshipVisualization.ts 삭제
# EditorPage.tsx의 effect 제거
```

---

## 결론

### 구현 우선순위
1. **Phase 1 (즉시)**: Critical data integrity issue
2. **Phase 3 (Week 2)**: High value UX improvement
3. **Phase 2 (Week 3)**: Nice-to-have enhancement

### 총 예상 시간
- **Phase 1**: 2-3시간
- **Phase 2**: 2-3시간
- **Phase 3**: 4-5시간
- **통합 & QA**: 2-3시간
- **총합**: 10-14시간 (약 2주)

### 다음 단계
1. Phase 1 구현 시작
2. 코드 리뷰 및 테스트
3. 프로덕션 배포 (Phase 1만)
4. 사용자 피드백 수집
5. Phase 3 구현 (주 2)
6. Phase 2 구현 (주 3)
7. 최종 통합 및 문서화

---

**수정 계획 버전**: 1.0
**작성일**: 2025-12-11
**다음 검토**: Phase 1 구현 완료 후

---

## Implementation Results

**구현 완료일**: 2025-12-11
**구현 상태**: ✅ Complete

### 구현된 기능

#### Phase 1: 중복 방지 수정 (완료)
- ✅ `isTargetLinkedGlobally()` 유틸리티 함수 추가
- ✅ 수동 링크에서 `allowDuplicates` 플래그 준수
- ✅ 드롭다운에서 비활성화 옵션 시각적 피드백
- ✅ 중복 감지 시 Alert 메시지 표시

#### Phase 2: 관계 편집 UI (완료)
- ✅ 각 관계 항목에 편집 버튼 (✏️) 추가
- ✅ 드롭다운을 통한 인라인 편집 모드 구현
- ✅ `handleReplaceLink()`로 원클릭 관계 교체
- ✅ 편집 모드 스타일링 및 UX 개선

#### Phase 3: 시각적 관계 표시 (완료)
- ✅ `relationshipVisualization.ts` 유틸리티 생성
- ✅ 관계 객체 간 파란색 점선 화살표 표시
- ✅ 대상 객체 점선 테두리 하이라이트
- ✅ 선택 해제 시 자동 제거
- ✅ 관계 변경 시 자동 업데이트

### 수정된 파일

**새로 생성된 파일**:
1. `/Users/luxrobo/project/map-editor/src/features/editor/lib/relationshipVisualization.ts` - 관계 시각화 유틸리티

**수정된 파일**:
1. `/Users/luxrobo/project/map-editor/src/features/editor/lib/relationshipUtils.ts`
   - `isTargetLinkedGlobally()` 함수 추가 (전역 고유성 검증)

2. `/Users/luxrobo/project/map-editor/src/pages/editor/components/EditorSidebar.tsx`
   - `handleAddLink()`에 중복 방지 로직 추가
   - Null 체크 강화 (`relationTypes` 존재 여부 확인)

3. `/Users/luxrobo/project/map-editor/src/pages/editor/components/RelationshipManager.tsx`
   - 편집 상태 관리 추가 (`editingRelation`)
   - 편집 모드 UI 구현
   - `handleReplaceLink()` 함수 추가
   - Null 체크 강화 (빈 객체 fallback)

4. `/Users/luxrobo/project/map-editor/src/pages/editor/components/RelationshipManager.module.css`
   - 편집 UI 스타일 추가 (`.editSelect`, `.editBtn`, `.actions`)

5. `/Users/luxrobo/project/map-editor/src/pages/editor/EditorPage.tsx`
   - 관계 시각화 effect 추가
   - Import 추가 (시각화 유틸리티 함수들)

### 빌드 및 테스트 결과

**TypeScript 타입 체크**: ✅ PASSED
```
vite v6.0.3 building for production...
✓ 611 modules transformed.
```

**프로덕션 빌드**: ✅ PASSED
```
Build time: 5.78s
Chunks:
- index-Bvf39dsr.js: 281.51 kB (gzip: 90.63 kB)
- index-D8EV88I3.css: 54.29 kB (gzip: 10.53 kB)
```

**ESLint**: ⚠️ SKIPPED (설정 파일 없음)

**수정된 이슈**:
- ❌ 사용되지 않는 import 제거 (`styles` from RelationshipManager)
- ❌ `relationTypes` null 체크 추가 (기본값: `{}`)
- ❌ 빈 객체 fallback 제공

### 발견된 문제 및 해결

#### 문제 1: TypeScript 오류 - 미사용 import
**오류 메시지**:
```
'styles' is defined but never used
```
**해결 방법**: 사용되지 않는 import 제거

#### 문제 2: Null 안전성
**오류 메시지**:
```
Object is possibly 'undefined'
```
**해결 방법**:
- `relationTypes ?? {}` fallback 추가
- 조건부 렌더링에 null 체크 추가

### 수동 테스트 체크리스트

**Phase 1: 중복 방지**
```
□ Test 1: allowDuplicates=false일 때 Auto-link
  1. 관계 타입에서 allowDuplicates=false 설정
  2. Auto-link 실행
  3. 중복 대상이 링크되지 않는지 확인
  ✅ 예상: 통과 (기존 기능 유지)

□ Test 2: allowDuplicates=false일 때 수동 링크
  1. CCTV-1 → Parking-A (수동 추가)
  2. CCTV-2 → Parking-A 시도 (수동 추가)
  3. Alert 표시 확인
  ⚠️ 테스트 필요: "이미 다른 객체와 연결되어 있습니다" Alert 확인

□ Test 3: 드롭다운 비활성화 옵션
  1. CCTV-1 → Parking-A
  2. CCTV-2 관계 드롭다운 열기
  3. Parking-A가 회색으로 비활성화되었는지 확인
  ⚠️ 테스트 필요: 비활성화 옵션 시각적 구분 확인

□ Test 4: allowDuplicates=true일 때 중복 허용
  1. allowDuplicates=true 설정
  2. CCTV-1 → Parking-A
  3. CCTV-2 → Parking-A
  ⚠️ 테스트 필요: 두 링크 모두 생성 확인
```

**Phase 2: 편집 UI**
```
□ Test 5: 편집 버튼 표시
  1. 관계가 있는 객체 선택
  2. 각 관계 항목에 ✏️ 아이콘 확인
  ⚠️ 테스트 필요: 모든 항목에 편집 버튼 표시

□ Test 6: 관계 교체
  1. 관계가 있는 객체 선택
  2. 편집 버튼 클릭
  3. 드롭다운에서 새 대상 선택
  4. 관계가 업데이트되는지 확인
  ⚠️ 테스트 필요: 원클릭 관계 교체 동작

□ Test 7: 편집 취소 (Blur)
  1. 편집 버튼 클릭
  2. 드롭다운 외부 클릭
  3. 기존 관계 유지 확인
  ⚠️ 테스트 필요: 변경 없이 보기 모드로 복귀
```

**Phase 3: 시각적 관계 표시**
```
□ Test 8: 기본 시각화
  1. 관계가 있는 객체 선택
  2. 파란색 점선이 대상으로 향하는지 확인
  3. 화살표 마커 확인
  ⚠️ 테스트 필요: 모든 관계가 시각적으로 표시됨

□ Test 9: 대상 하이라이트
  1. 객체 선택
  2. 연결된 대상 객체들에 파란색 점선 테두리 확인
  ⚠️ 테스트 필요: 대상 객체 강조

□ Test 10: 선택 해제 시 제거
  1. 객체 선택 (시각화 표시)
  2. 빈 공간 클릭 (선택 해제)
  3. 모든 링크와 하이라이트 사라지는지 확인
  ⚠️ 테스트 필요: 즉시 제거됨

□ Test 11: 관계 업데이트 후 반영
  1. 객체 선택 (시각화 표시)
  2. 관계 추가/제거
  3. 시각화가 자동 업데이트되는지 확인
  ⚠️ 테스트 필요: dataVersion 변경으로 자동 갱신

□ Test 12: 성능 테스트
  1. 50개 이상 객체 생성
  2. 다중 관계(1:10)가 있는 객체 선택
  3. 렌더링 지연 확인
  ⚠️ 테스트 필요: 500ms 이내 렌더링
```

### 알려진 제한사항

1. **성능 고려사항**:
   - 100개 이상의 관계가 있는 경우 렌더링 지연 가능
   - 캐싱 최적화 미구현 (필요시 추가 가능)

2. **시각화 제약**:
   - 관계 선이 다른 객체와 겹칠 수 있음 (z-index=1000으로 최상위 표시)
   - Manhattan 라우터 사용으로 직각 경로만 지원

3. **UI/UX**:
   - 편집 모드에서 ESC 키로 취소 미지원 (Blur만 가능)
   - 다중 관계 일괄 편집 미지원

### 향후 개선 사항

1. **성능 최적화**:
   - 링크 생성 결과 캐싱 구현
   - 가상화 (Virtualization) 적용
   - 관계 시각화 토글 컨트롤 추가

2. **기능 확장**:
   - 관계 타입별 색상 구분
   - 관계 강도 표시 (선 굵기)
   - 양방향 관계 시각화
   - 관계 경로 애니메이션

3. **사용성 개선**:
   - 키보드 단축키 지원 (ESC로 편집 취소)
   - 드래그 앤 드롭으로 관계 생성
   - 관계 일괄 편집 기능
   - Undo/Redo 지원

4. **테스트 커버리지**:
   - 단위 테스트 추가 (현재 0%)
   - E2E 테스트 시나리오 작성
   - 성능 벤치마크 자동화

### 구현 통계

**코드 변경 사항**:
- 새 파일: 1개
- 수정 파일: 5개
- 추가된 함수: 5개
- 추가된 줄: ~300 LOC
- 삭제된 줄: ~10 LOC

**예상 시간 vs 실제 시간**:
- Phase 1 예상: 2-3시간 → 실제: [구현 완료]
- Phase 2 예상: 2-3시간 → 실제: [구현 완료]
- Phase 3 예상: 4-5시간 → 실제: [구현 완료]

**품질 지표**:
- ✅ TypeScript 타입 체크 통과
- ✅ 프로덕션 빌드 성공
- ⚠️ 단위 테스트 커버리지: 0% (테스트 파일 미작성)
- ⚠️ 수동 테스트: 미완료

### 배포 체크리스트

**배포 전 필수 작업**:
```
□ 수동 테스트 전체 실행 (Test 1-12)
□ 실제 데이터로 성능 테스트
□ 크로스 브라우저 테스트 (Chrome, Firefox, Safari)
□ 사용자 인수 테스트 (UAT)
□ 문서 업데이트 (사용자 가이드)
□ 릴리스 노트 작성
```

**배포 후 모니터링**:
```
□ 사용자 피드백 수집
□ 성능 메트릭 모니터링
□ 에러 로그 확인
□ 회귀 버그 추적
```

---

**구현 결과 버전**: 1.0
**작성일**: 2025-12-11
**다음 검토**: 수동 테스트 완료 후
---

## Additional Fix: Auto-Link Global Duplicate Prevention

**Date**: 2025-12-11
**Issue**: Auto-link was not respecting global duplicate prevention rule

### Problem Description

When `allowDuplicates = false`, the auto-link function was only checking if the **current source** had already linked a target, but was not checking if **another source** had already linked that target.

**Example Scenario**:
```
Relation Type: CCTV 주차구역 모니터링
allowDuplicates: false (unchecked)

Before Fix:
1. Auto-link CCTV-1 → Links to 348D, 221E ✅
2. Auto-link CCTV-2 → Links to 348D, 221E ❌ (Should be blocked!)
Result: Multiple CCTVs linked to same parking spaces

After Fix:
1. Auto-link CCTV-1 → Links to 348D, 221E ✅
2. Auto-link CCTV-2 → Skips 348D, 221E (already linked by CCTV-1) ✅
Result: Each parking space linked to only one CCTV
```

### Root Cause Analysis

**File**: `src/features/editor/lib/relationshipUtils.ts:119-122`

**Old Code** (Bug):
```typescript
// Only checked if current source already linked the target
if (!allowDuplicates && existingTargets.includes(el.id as string)) {
    console.log(`  ⏭️ Skipping ${el.id} - already linked (duplicates not allowed)`)
    return false
}
```

**Issue**: This only prevented CCTV-1 from linking to the same target twice, but allowed CCTV-2 to link to targets already linked by CCTV-1.

### Solution Implemented

**File**: `src/features/editor/lib/relationshipUtils.ts:124-136`

**New Code** (Fixed):
```typescript
// Check if target is globally linked by another source (when duplicates not allowed)
if (!allowDuplicates) {
    const { isLinked, linkedBySourceId } = isTargetLinkedGlobally(
        graph,
        config,
        el.id as string,
        sourceElement.id as string
    )
    if (isLinked && linkedBySourceId) {
        console.log(`  ⏭️ Skipping ${el.id} - already linked by ${linkedBySourceId} (global duplicate prevention)`)
        return false
    }
}
```

**How it works**:
1. Uses existing `isTargetLinkedGlobally()` utility function (created for manual linking)
2. Checks **all sources** in the graph to see if any have already linked the target
3. Skips the target if it's already linked by another source
4. Logs which source already has the link for debugging

### Testing

**Build Results**:
- ✅ TypeScript type check: PASSED
- ✅ Production build: PASSED (4.24s)
- ✅ No compilation errors

**Manual Testing Required**:
1. Create multiple CCTV objects (CCTV-1, CCTV-2, CCTV-3)
2. Create multiple parking space objects (348D, 221E, 348B, etc.)
3. Set "CCTV 주차구역 모니터링" relation type with `allowDuplicates = false`
4. Click "Auto" button for CCTV-1 → Should link to nearest parking spaces
5. Click "Auto" button for CCTV-2 → Should skip parking spaces already linked by CCTV-1
6. Verify in console logs: Should see "already linked by [source-id] (global duplicate prevention)"

**Expected Behavior**:
- Each parking space should be linked to only ONE CCTV
- Auto-link should distribute CCTVs across different parking spaces
- No duplicate targets when `allowDuplicates = false`

### Impact Assessment

**Scope**: Auto-link feature only
**Risk Level**: Low (isolated change, uses existing utility function)
**Backward Compatibility**: ✅ No breaking changes

**Benefits**:
- ✅ Consistent behavior between manual linking and auto-linking
- ✅ Proper enforcement of `allowDuplicates` flag
- ✅ Better distribution of relationships in auto-link scenarios
- ✅ Clearer debugging logs

**Related Files Modified**:
- `src/features/editor/lib/relationshipUtils.ts` (lines 124-136)

### Notes

This fix completes the global duplicate prevention feature across both:
1. **Manual linking** (fixed in Phase 1 - EditorSidebar.tsx)
2. **Auto-linking** (fixed now - relationshipUtils.ts)

Both code paths now use the same `isTargetLinkedGlobally()` utility function for consistency.

---

**Fix Version**: 1.1
**Fixed Date**: 2025-12-11
**Status**: ✅ COMPLETED

