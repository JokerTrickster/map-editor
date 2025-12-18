# Bug Fix Plan: Side Panel Object Selection Persistence

## Bug Description

**Issue:** Object information disappears from right side panel after saving and reopening project

**Current Behavior:**
- User selects an object in the canvas
- Right panel displays object properties
- User saves the project
- User reloads the page or reopens the project
- Right panel reverts to "Map Info" instead of showing the previously selected object

**Expected Behavior:**
- Object selection state should persist across page reloads
- Right panel should display the last selected object's properties after reopening the project

## Root Cause Analysis

**Confirmed Root Cause:**
- `canvasStore.selectedElementId` is a runtime-only state (in-memory Zustand store)
- Not included in the MapData JSON structure that gets persisted to localStorage
- On page reload, selection state resets to `null`
- Side panel defaults to "Map Info" when no selection exists

**Related Components:**
- `src/shared/store/canvasStore.ts` - Runtime selection state
- `src/shared/store/floorStore.ts` - Persistence layer
- `src/entities/types/floor.ts` - MapData interface definition
- `src/pages/editor/EditorPage.tsx` - Save/restore orchestration

## Modification Plan

### 1. Update MapData Interface

**File:** `/src/entities/types/floor.ts`

**Changes:**
- Add optional `selectedElementId?: string | null` field to MapData interface
- This allows each floor to remember its last selected object independently

**Rationale:**
- Selection is floor-specific (different floors can have different selections)
- Optional field maintains backward compatibility with existing saved data
- `null` explicitly represents "no selection" vs `undefined` for "not set"

### 2. Update floorStore Persistence

**File:** `/src/shared/store/floorStore.ts`

**Changes:**
- Modify `updateFloorMapData` to accept and persist `selectedElementId`
- Ensure localStorage persistence includes this field in JSON serialization
- Update type definitions to include the new field

**Implementation Notes:**
- Field should be included in the mapData object passed to localStorage
- No migration needed (optional field handles missing data gracefully)

### 3. Update EditorPage Save Logic

**File:** `/src/pages/editor/EditorPage.tsx`

**Changes:**
- In `handleSave` function, read current `selectedElementId` from canvasStore
- Include it in the mapData payload when calling `updateFloorMapData`
- Ensure floor switching also persists selection before switching

**Code Location:**
- `handleSave` function (explicit save button)
- Auto-save logic (if implemented)
- Floor switching handlers

### 4. Update EditorPage Restore Logic

**File:** `/src/pages/editor/EditorPage.tsx`

**Changes:**
- After restoring graph from JSON, check if `mapData.selectedElementId` exists
- Validate that the ID still exists in the restored graph cells
- Call `canvasStore.setSelectedElementId()` to restore selection state
- Trigger side panel update

**Validation Steps:**
1. Check if `selectedElementId` is present in saved data
2. Verify the cell with that ID exists in the graph
3. Restore selection only if validation passes
4. Clear selection if ID is stale or invalid

### 5. Add Selection Validation (Edge Cases)

**Scenarios to Handle:**

**Stale References:**
- Selected object was deleted between save and reload
- **Solution:** Validate ID exists in graph, clear selection if not found

**Multi-Floor Independence:**
- Each floor maintains its own selection
- Switching floors should restore floor-specific selection
- **Solution:** Store selection per floor in MapData

**Concurrent Edits:**
- Object ID might have changed in collaborative scenarios
- **Solution:** Use stable IDs (already implemented with UUID)

**Empty Projects:**
- New projects with no objects
- **Solution:** `null` selection is valid state

### 6. Update Tests

**Test Coverage Required:**

**Unit Tests - floorStore:**
- ✅ Selection persists when updating floor map data
- ✅ Selection is included in localStorage JSON
- ✅ Selection can be null or undefined

**Integration Tests - EditorPage:**
- ✅ Selection restored after save/reload cycle
- ✅ Invalid selection ID is handled gracefully
- ✅ Multi-floor selection independence
- ✅ Floor switching preserves per-floor selection

**E2E Tests - User Workflow:**
- ✅ Import CSV → select object → save → reload → verify selection
- ✅ Multi-floor: switch floors → select different objects → reload → verify
- ✅ Delete selected object → reload → verify no crash

## Implementation Order

### Phase 1: Data Layer
1. Update MapData interface (`floor.ts`)
2. Update floorStore persistence (`floorStore.ts`)
3. Write unit tests for store changes

### Phase 2: Application Layer
4. Update save logic in EditorPage
5. Update restore logic in EditorPage
6. Add validation logic

### Phase 3: Testing
7. Write integration tests
8. Write E2E tests
9. Manual testing across scenarios

## Files to Modify

| File Path | Changes Required | Priority |
|-----------|-----------------|----------|
| `/src/entities/types/floor.ts` | Add `selectedElementId` to MapData interface | HIGH |
| `/src/shared/store/floorStore.ts` | Update persistence logic | HIGH |
| `/src/pages/editor/EditorPage.tsx` | Save/restore selection state | HIGH |
| `/src/shared/store/canvasStore.ts` | Verify no changes needed (runtime only) | LOW |
| `/src/tests/floorStore.test.ts` | Add selection persistence tests | MEDIUM |
| `/src/tests/EditorPage.test.tsx` | Add selection restoration tests | MEDIUM |

## Expected Outcomes

### Functional Outcomes
- ✅ User clicks object → selection persists across save/reload
- ✅ Right panel shows same object properties after reopening project
- ✅ Each floor remembers its own selection independently
- ✅ Graceful handling of invalid/deleted object references

### Technical Outcomes
- ✅ MapData JSON includes `selectedElementId` field
- ✅ localStorage contains selection state
- ✅ No performance impact (trivial data addition)
- ✅ Backward compatible with existing saved projects

### User Experience Outcomes
- ✅ Seamless workflow continuation after reload
- ✅ No unexpected state changes
- ✅ Predictable behavior across floor switches

## Testing Scenarios

### Scenario 1: Basic Persistence
**Steps:**
1. Import CSV floor plan
2. Select an object (e.g., parking spot)
3. Verify right panel shows object properties
4. Click "저장" (Save)
5. Reload the page
6. Verify same object is selected
7. Verify right panel shows same properties

**Expected:** Selection and panel state fully restored

### Scenario 2: Multi-Floor Independence
**Steps:**
1. Create multi-floor project (or import multiple floors)
2. Select object A on Floor 1
3. Switch to Floor 2
4. Select object B on Floor 2
5. Save project
6. Reload page
7. Verify Floor 2 shows object B selected
8. Switch to Floor 1
9. Verify Floor 1 shows object A selected

**Expected:** Each floor maintains independent selection

### Scenario 3: Invalid Reference Handling
**Steps:**
1. Select object X
2. Save project
3. Manually edit localStorage to reference non-existent ID
4. Reload page
5. Verify no crash occurs
6. Verify selection is cleared (or defaults to safe state)
7. Verify right panel shows "Map Info"

**Expected:** Graceful degradation, no errors

### Scenario 4: Deleted Object Handling
**Steps:**
1. Select object Y
2. Save project
3. Delete object Y
4. Save project again
5. Reload page
6. Verify no crash
7. Verify selection is cleared

**Expected:** System handles missing object reference

### Scenario 5: Empty Project
**Steps:**
1. Create new empty floor
2. Save (no objects, no selection)
3. Reload page
4. Verify "Map Info" is shown
5. Add object
6. Select it
7. Save and reload
8. Verify object selection restored

**Expected:** Handles null selection and transition to first selection

## Rollback Plan

**If implementation causes issues:**

1. **Immediate Rollback:**
   - Revert changes to `floor.ts`, `floorStore.ts`, `EditorPage.tsx`
   - Selection will reset on reload (original behavior)
   - No data loss (feature is additive)

2. **Data Migration:**
   - Not required (field is optional)
   - Existing projects work without `selectedElementId`
   - New saves automatically include the field

3. **Feature Flag:**
   - Could add feature flag to disable selection persistence
   - Toggle via environment variable if needed

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Stale object references | Medium | Low | Validation before restore |
| Performance impact | Low | Low | Minimal data addition |
| Backward compatibility | Low | Medium | Optional field design |
| Multi-floor edge cases | Medium | Medium | Comprehensive testing |
| localStorage quota | Low | Low | Field adds ~20 bytes |

## Success Metrics

**Definition of Done:**
- [ ] All tests pass (unit, integration, E2E)
- [ ] Manual testing covers all scenarios
- [ ] No console errors on reload
- [ ] Performance benchmarks unchanged
- [ ] Code review approved
- [ ] Documentation updated

**Acceptance Criteria:**
- [ ] Selection persists after page reload (100% success rate)
- [ ] Multi-floor selection independence verified
- [ ] Invalid ID handling tested and working
- [ ] No regression in existing functionality
- [ ] Right panel displays correct information post-reload

## Timeline Estimate

- **Phase 1 (Data Layer):** 2-3 hours
- **Phase 2 (Application Layer):** 3-4 hours
- **Phase 3 (Testing):** 4-5 hours
- **Code Review & QA:** 2 hours
- **Total:** 11-14 hours (1.5-2 days)

## Notes

- Selection persistence is floor-specific, not project-wide
- UUID-based IDs ensure stability across sessions
- Optional field maintains backward compatibility
- No backend changes required (frontend-only feature)
- Consider future enhancement: persist undo/redo state similarly

---

**Document Version:** 1.0
**Last Updated:** 2025-12-18
**Status:** Ready for Implementation
