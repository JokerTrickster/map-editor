---
name: parking-lot-mvp
description: Complete parking lot map editor MVP with CSV import, object mapping, and JSON export
status: in_progress
created: 2025-12-02T08:41:59Z
synced: 2025-12-02T08:48:49Z
prd_source: docs/PRODUCT_REQUIREMENTS.md
estimated_weeks: 8
priority: P0
github:
  epic_issue: 1
  sub_issues: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
  repo: JokerTrickster/map-editor
  url: https://github.com/JokerTrickster/map-editor/issues/1
---

# Epic: Parking Lot Map Editor MVP

## Overview

Build a complete web-based map editor for parking lot floor plans with automatic CSV-based map generation, visual object editing, and standardized JSON export.

**Target Users**: Smart parking managers, IoT engineers, building operations teams

**Core Value Proposition**:
- 60-80% reduction in initial map creation time via CSV automation
- Intuitive visual editing with JointJS (no coding required)
- Standardized JSON output for digital twin, monitoring, and AI systems

## Success Metrics

- [ ] CSV with 50,000 points parses in <2 seconds
- [ ] Canvas maintains 30+ FPS during zoom/pan
- [ ] Complete user flow: Login → Upload → Map → Edit → Export → View
- [ ] E2E test coverage for critical paths
- [ ] Production deployment on Chrome 120+

## Epic Structure

This epic is organized into 4 phases aligned with the PRD milestones:

### Phase 1: Foundation (Week 1-2)
**Goal**: Core infrastructure and project management

### Phase 2: CSV & Mapping (Week 3-4)
**Goal**: Automatic map generation from CSV

### Phase 3: Editing (Week 5-6)
**Goal**: Property and relationship editing

### Phase 4: Export & Viewer (Week 7-8)
**Goal**: JSON export and visualization

---

## Phase 1: Foundation (Week 1-2)

### Issue #1: Setup Zustand Store Architecture
**Priority**: P0 | **Estimate**: 2 days

**Description**:
Create centralized state management structure using Zustand for project, floor, canvas, and object type state.

**Acceptance Criteria**:
- [ ] `projectStore`: Parking lot CRUD, persistence with localStorage
- [ ] `floorStore`: Floor management with order/selection tracking
- [ ] `canvasStore`: JointJS graph state, selected elements
- [ ] `objectTypeStore`: Type definitions with properties schema
- [ ] All stores have TypeScript types
- [ ] Store actions have proper error handling

**Technical Notes**:
```typescript
// Store structure
projectStore: { lots: ParkingLot[], currentLot: string | null }
floorStore: { floors: Floor[], currentFloor: string | null }
canvasStore: { graph: dia.Graph | null, selectedId: string | null }
objectTypeStore: { types: ObjectType[], mappings: Mapping[] }
```

**Dependencies**: None

---

### Issue #2: Implement Parking Lot CRUD (F-002)
**Priority**: P0 | **Estimate**: 3 days

**Description**:
Dashboard page with parking lot project management.

**Acceptance Criteria**:
- [ ] Create new parking lot with name validation
- [ ] Edit parking lot metadata
- [ ] Delete with confirmation modal
- [ ] List view with last selected persistence (localStorage)
- [ ] Duplicate name warning
- [ ] Empty state: "Create first project" CTA
- [ ] Error handling: name empty, duplicate, storage failure

**UI Components**:
- `ParkingLotDashboard.tsx`
- `ParkingLotCard.tsx`
- `CreateLotModal.tsx`

**Dependencies**: Issue #1 (projectStore)

---

### Issue #3: Implement Floor Management (F-003)
**Priority**: P0 | **Estimate**: 2 days

**Description**:
Floor tabs with add/delete/switch functionality.

**Acceptance Criteria**:
- [ ] Add floor with auto-naming (B1, B2, 1F, 2F...)
- [ ] Delete floor with current selection adjustment
- [ ] Tab navigation with keyboard support
- [ ] Order sorting (basement → ground → upper)
- [ ] Empty floor initializes default map_data structure
- [ ] Floor state persists across sessions

**UI Components**:
- `FloorTabs.tsx`
- `AddFloorButton.tsx`

**Dependencies**: Issue #1 (floorStore)

---

### Issue #4: Create Zod Schema Foundation
**Priority**: P0 | **Estimate**: 2 days

**Description**:
Define and validate JSON schema for map data using Zod.

**Acceptance Criteria**:
- [ ] Root schema: `metadata`, `assets`, `objects`
- [ ] Object schema: `id`, `type`, `name`, `geometry`, `style`, `properties`, `relations`
- [ ] Relation schema: `targetId`, `type`, `meta`
- [ ] Export validation with detailed error messages
- [ ] Type definitions exported from schemas

**Files**:
- `entities/schema/mapSchema.ts`
- `entities/types/map.ts`

**Dependencies**: None

---

### Issue #5: CSV Upload UI with State Management
**Priority**: P0 | **Estimate**: 2 days

**Description**:
Drag & drop CSV uploader with state tracking (idle, uploading, parsing, parsed, error).

**Acceptance Criteria**:
- [ ] Drag & drop zone with visual feedback
- [ ] File size validation (10MB limit)
- [ ] Loading state with progress indicator
- [ ] Error state with detailed message
- [ ] Success state showing parsed group count
- [ ] Clear/reset functionality

**UI Components**:
- `CSVUploader.tsx`
- `UploadDropzone.tsx`

**States**: `idle | uploading | parsing | parsed | error`

**Dependencies**: None (UI only, parsing in Phase 2)

---

## Phase 2: CSV & Mapping (Week 3-4)

### Issue #6: CSV Parser with Layer Grouping (F-006)
**Priority**: P0 | **Estimate**: 3 days

**Description**:
Parse CSV files and group entities by layer for selection.

**Acceptance Criteria**:
- [ ] Parse CSV with required columns: Layer, Points, EntityHandle
- [ ] Group by Layer with entity count
- [ ] Handle 50,000 points in <2 seconds
- [ ] Column validation with detailed errors
- [ ] Support for various CSV formats (comma/tab separated)
- [ ] Error recovery for malformed rows

**Module**:
- `features/csv/lib/csvParser.ts`
- `features/csv/lib/layerGrouper.ts`

**Performance Target**: 50k points in <2s

**Dependencies**: Issue #5 (CSV Upload UI)

---

### Issue #7: CSV Group Selection UI (F-007)
**Priority**: P0 | **Estimate**: 2 days

**Description**:
Checkbox UI for selecting which CSV groups to render on canvas.

**Acceptance Criteria**:
- [ ] Group list with checkboxes
- [ ] Select All / Deselect All buttons
- [ ] Entity count per group
- [ ] Immediate canvas update on selection change
- [ ] Selected state persists in store
- [ ] Visual indication of rendered groups

**UI Components**:
- `CSVGroupSelector.tsx`
- `GroupCheckbox.tsx`

**Dependencies**: Issue #6 (CSV Parser)

---

### Issue #8: Object Type CRUD (F-004)
**Priority**: P0 | **Estimate**: 3 days

**Description**:
Left sidebar for defining object types with custom properties.

**Acceptance Criteria**:
- [ ] Add object type with name and icon
- [ ] Edit type name and properties
- [ ] Delete type with "in use" validation
- [ ] Add/remove properties (key, type, required)
- [ ] Property types: string, number, boolean, array
- [ ] Duplicate name prevention
- [ ] Required field validation

**UI Components**:
- `ObjectTypeSidebar.tsx`
- `TypeForm.tsx`
- `PropertyEditor.tsx`

**States**: `idle | add | edit`

**Dependencies**: Issue #1 (objectTypeStore)

---

### Issue #9: Object Type ↔ CSV Mapping (F-009)
**Priority**: P0 | **Estimate**: 4 days

**Description**:
Drag object types onto CSV entities to create mappings.

**Acceptance Criteria**:
- [ ] Drag type from sidebar to canvas object
- [ ] Visual drop target highlighting
- [ ] Create mapping in objectTypeStore
- [ ] Update canvas entity with type data
- [ ] Unmapping resets to default state
- [ ] Asset positioning adjustment on mapping
- [ ] Mapping list persistence

**Error Cases**:
- [ ] No type selected
- [ ] Target entity not found
- [ ] Duplicate mapping prevention

**Dependencies**: Issue #7 (CSV Groups), Issue #8 (Object Types)

---

### Issue #10: Canvas Rendering Pipeline
**Priority**: P0 | **Estimate**: 3 days

**Description**:
Render CSV entities on JointJS canvas with proper scaling and positioning.

**Acceptance Criteria**:
- [ ] Transform CSV coordinates to canvas space
- [ ] Render selected groups as JointJS elements
- [ ] Apply object type styling when mapped
- [ ] Handle polygons, polylines, and points
- [ ] Asset icons for point objects
- [ ] Layer-based z-index ordering
- [ ] Fit-to-screen on initial render

**Technical Notes**:
```typescript
// Coordinate transformation
const scale = TARGET_WIDTH / dataWidth
const transformedX = (x - minX) * scale
const transformedY = (maxY - y) * scale // Flip Y-axis
```

**Dependencies**: Issue #7 (Group Selection), Issue #9 (Mapping)

---

## Phase 3: Editing (Week 5-6)

### Issue #11: Property Panel (F-015)
**Priority**: P0 | **Estimate**: 3 days

**Description**:
Right sidebar for editing selected object properties.

**Acceptance Criteria**:
- [ ] Display object name, position, type
- [ ] Show all properties from object type
- [ ] Editable form fields with validation
- [ ] Type checking (string, number, boolean)
- [ ] Asset upload (PNG, SVG) with preview
- [ ] Real-time canvas update on change
- [ ] Error messages for invalid input

**UI Components**:
- `PropertyPanel.tsx`
- `PropertyForm.tsx`
- `AssetUploader.tsx`

**Dependencies**: Issue #10 (Canvas Rendering)

---

### Issue #12: Relationship Definition (F-016)
**Priority**: P0 | **Estimate**: 4 days

**Description**:
Create and manage N:N relationships between objects.

**Acceptance Criteria**:
- [ ] Select two objects to create relationship
- [ ] Choose relationship type (required/optional)
- [ ] Visual connection line on canvas
- [ ] Relationship list in property panel
- [ ] Delete relationship
- [ ] Relationship metadata editing
- [ ] N:N relationship support
- [ ] Immediate UI update on change

**UI Components**:
- `RelationshipCreator.tsx`
- `RelationshipList.tsx`

**Technical Notes**:
- Store relationships in object's `relations` array
- Render as JointJS links

**Dependencies**: Issue #11 (Property Panel)

---

### Issue #13: Enhanced Canvas Interactions
**Priority**: P1 | **Estimate**: 2 days

**Description**:
Improve existing canvas features (already partially implemented).

**Acceptance Criteria**:
- [ ] Object selection with click
- [ ] Drag to move objects
- [ ] Multi-select with Shift+Click
- [ ] Delete with keyboard (Delete/Backspace)
- [ ] Undo/Redo (Ctrl+Z, Ctrl+Y) - 50 states
- [ ] Zoom with mouse wheel
- [ ] Pan with mouse drag
- [ ] Minimap with viewport indicator
- [ ] Fit to screen button
- [ ] 30+ FPS performance

**Note**: Many features already implemented, this issue focuses on polish and completeness.

**Dependencies**: Issue #10 (Canvas Rendering)

---

## Phase 4: Export & Viewer (Week 7-8)

### Issue #14: JSON Export with Validation (F-017)
**Priority**: P0 | **Estimate**: 2 days

**Description**:
Export map data as validated JSON file.

**Acceptance Criteria**:
- [ ] Export button triggers validation
- [ ] Zod schema validation with error details
- [ ] Required field checking
- [ ] Metadata inclusion (version, created, modified)
- [ ] File download as `{parking-lot-name}_{floor}.json`
- [ ] Success notification
- [ ] Error modal with fix suggestions

**Error Cases**:
- [ ] Unmapped objects warning
- [ ] Missing required properties
- [ ] Invalid JSON structure

**Dependencies**: Issue #4 (Zod Schema), Issue #12 (Relationships)

---

### Issue #15: Map Viewer (F-018)
**Priority**: P0 | **Estimate**: 3 days

**Description**:
Read-only viewer for exported JSON files.

**Acceptance Criteria**:
- [ ] Upload JSON file
- [ ] Render objects and relationships
- [ ] Display properties in read-only panel
- [ ] Zoom and pan controls
- [ ] Layer filtering
- [ ] Asset rendering
- [ ] Relationship visualization
- [ ] Export validation before render

**UI Components**:
- `MapViewer.tsx`
- `ViewerCanvas.tsx`
- `ViewerPropertyPanel.tsx`

**Dependencies**: Issue #14 (JSON Export)

---

### Issue #16: E2E Test Suite
**Priority**: P1 | **Estimate**: 3 days

**Description**:
Comprehensive E2E tests with Playwright.

**Test Scenarios**:

**E2E-1: Complete User Flow**
- [ ] Login with Google OAuth
- [ ] Create parking lot
- [ ] Add floor (B1)
- [ ] Upload CSV
- [ ] Select groups
- [ ] Create object type
- [ ] Map type to objects
- [ ] Edit properties
- [ ] Create relationship
- [ ] Export JSON
- [ ] Load in viewer

**E2E-2: Persistence & Recovery**
- [ ] Create project and save
- [ ] Reload page
- [ ] Verify state restored
- [ ] Make changes
- [ ] Verify localStorage sync

**E2E-3: Error Handling**
- [ ] Invalid CSV upload
- [ ] Duplicate parking lot name
- [ ] Delete object with relationships
- [ ] Export with unmapped objects

**Dependencies**: All previous issues

---

### Issue #17: Documentation & Deployment
**Priority**: P1 | **Estimate**: 2 days

**Description**:
User documentation and deployment preparation.

**Deliverables**:
- [ ] User guide (getting started, features, troubleshooting)
- [ ] Developer setup guide
- [ ] API documentation (if applicable)
- [ ] Deployment checklist
- [ ] Performance optimization review
- [ ] Browser compatibility testing
- [ ] Accessibility audit

**Dependencies**: Issue #16 (E2E Tests)

---

## Risk Management

### High Risk
- **JointJS performance with large datasets**: Mitigation: Virtual rendering, pagination
- **CSV format variations**: Mitigation: Flexible parser, error recovery
- **Backend storage uncertainty**: Mitigation: Abstracted storage layer

### Medium Risk
- **OAuth token expiration**: Mitigation: Auto-refresh implementation
- **Asset file size**: Mitigation: Image optimization, size limits

### Low Risk
- **Browser compatibility**: Mitigation: Chrome 120+ primary target
- **User learning curve**: Mitigation: Comprehensive documentation

---

## Technical Stack

**Frontend**:
- React 18 + TypeScript
- Vite (build tool)
- Zustand (state management)
- React Query (server state)
- JointJS (canvas)
- Zod (validation)
- Vitest + Playwright (testing)

**Storage**:
- MVP: localStorage
- Future: REST API + database

---

## Definition of Done

An issue is complete when:
- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Component tests for UI elements
- [ ] Code reviewed and approved
- [ ] No console errors or warnings
- [ ] Performance targets met
- [ ] Documentation updated
- [ ] Merged to main branch

---

## Next Steps

1. **Review this epic** with team/stakeholders
2. **Create GitHub issues** from each section
3. **Assign priorities** and estimates
4. **Set up project board** with phases as columns
5. **Begin Phase 1** implementation

**To create GitHub issues**: Use `/pm:epic-oneshot parking-lot-mvp` command
