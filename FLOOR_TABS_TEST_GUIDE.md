# Floor Tabs Manual Test Guide

## Overview
This guide provides step-by-step instructions for manually testing the Floor Management (FloorTabs) feature.

## Prerequisites
1. Start the development server: `npm run dev`
2. Navigate to the editor page: `http://localhost:5173/editor`
3. Open browser console (F12 or Cmd+Option+J)

## Test Scenarios

### 1. Initial Setup - Create Test Project

**Steps:**
1. Open browser console
2. Run: `window.initTestProject()`
3. Verify: You should see the Floor Tabs bar appear below the header
4. Verify: One tab labeled "1F" should be visible (ground floor)
5. Verify: The "1F" tab should be highlighted (active)

**Expected Result:**
- Floor tabs bar is visible with "1F" tab (active/blue) and "Add Floor" button

---

### 2. Add Floors - Multiple Floor Creation

**Steps:**
1. Click the "Add Floor" button
2. Verify: A new tab "2F" appears
3. Verify: "2F" becomes the active floor (highlighted in blue)
4. Click "Add Floor" again
5. Verify: "3F" tab appears and becomes active
6. Click "Add Floor" two more times
7. Verify: "4F" and "5F" tabs appear

**Expected Result:**
- Tabs display in order: 1F, 2F, 3F, 4F, 5F
- Newest floor is always selected (active)
- Each tab has a small "×" delete button

---

### 3. Add Basement Floors - Negative Order

**Steps:**
1. Open browser console
2. Run: `useFloorStore.getState().addFloor(useProjectStore.getState().currentLot, { order: -1 })`
3. Verify: "B1" tab appears at the beginning
4. Run: `useFloorStore.getState().addFloor(useProjectStore.getState().currentLot, { order: -2 })`
5. Verify: "B2" tab appears before "B1"

**Expected Result:**
- Tabs display in order: B2, B1, 1F, 2F, 3F, 4F, 5F
- Basement floors (B2, B1) appear before ground floor (1F)

---

### 4. Switch Between Floors - Tab Selection

**Steps:**
1. Click on "1F" tab
2. Verify: "1F" becomes highlighted (blue background)
3. Click on "B1" tab
4. Verify: "B1" becomes highlighted
5. Click on "5F" tab
6. Verify: "5F" becomes highlighted
7. Verify: Previously selected floors are no longer highlighted

**Expected Result:**
- Only one floor is active at a time
- Active floor has blue background and white text
- Inactive floors have gray background

---

### 5. Keyboard Navigation - Arrow Keys

**Steps:**
1. Click on "1F" to select it
2. Press "Arrow Right" key
3. Verify: Selection moves to "2F"
4. Press "Arrow Right" key twice more
5. Verify: Selection moves to "3F", then "4F"
6. Press "Arrow Left" key
7. Verify: Selection moves back to "3F"
8. Continue pressing "Arrow Left" until you reach "B2"
9. Verify: You can navigate through all floors

**Expected Result:**
- Arrow keys navigate between floors
- Selection wraps at boundaries (no error at first/last floor)
- Focus follows keyboard navigation

---

### 6. Delete Floor - Single Deletion

**Steps:**
1. Ensure you have at least 3 floors (1F, 2F, 3F)
2. Hover over "2F" tab
3. Verify: The "×" button becomes visible/highlighted
4. Click the "×" button on "2F"
5. Verify: No confirmation dialog appears (floor has no data)
6. Verify: "2F" is removed from the tabs
7. Verify: Tabs now show: B2, B1, 1F, 3F, 4F, 5F

**Expected Result:**
- Floor is deleted without confirmation (if empty)
- Remaining floors stay in order
- If deleted floor was active, next floor becomes active

---

### 7. Delete Active Floor - Selection Adjustment

**Steps:**
1. Click on "3F" to select it
2. Click the "×" button on "3F"
3. Verify: "3F" is removed
4. Verify: Either "4F" or "1F" becomes active (next available floor)

**Expected Result:**
- Deleting active floor auto-selects another floor
- No floor is left unselected

---

### 8. Delete Last Floor - Prevented

**Steps:**
1. Delete all floors except one (keep clicking "×" on each floor)
2. When only one floor remains (e.g., "1F")
3. Try to click the "×" button on the last floor
4. Verify: No "×" button is visible on the last remaining floor

OR if "×" is visible:
5. Click the "×" button
6. Verify: Alert dialog appears: "Cannot delete the last floor. At least one floor is required."
7. Click "OK" on the alert
8. Verify: The floor is NOT deleted

**Expected Result:**
- Last floor cannot be deleted
- Alert message is shown
- Minimum 1 floor is always maintained

---

### 9. Delete Floor with Data - Confirmation

**Steps:**
1. Select a floor (e.g., "1F")
2. Simulate adding objects (in console):
   ```javascript
   const floor = useFloorStore.getState().floors.find(f => f.name === '1F')
   useFloorStore.getState().updateFloor(floor.id, {
     mapData: { metadata: {}, assets: [], objects: [{ id: '1', type: 'parking' }] }
   })
   ```
3. Click the "×" button on "1F"
4. Verify: Confirmation dialog appears: "Delete 1F? This will remove all objects on this floor."
5. Click "Cancel"
6. Verify: Floor is NOT deleted
7. Click the "×" button again
8. Click "OK" in the confirmation dialog
9. Verify: Floor IS deleted

**Expected Result:**
- Confirmation dialog appears for floors with objects
- User can cancel deletion
- Floor is only deleted if user confirms

---

### 10. Floor Persistence - Reload Test

**Steps:**
1. Create multiple floors (B1, 1F, 2F, 3F)
2. Select "2F" as the active floor
3. Refresh the page (F5 or Cmd+R)
4. Wait for page to reload
5. Verify: All floors (B1, 1F, 2F, 3F) are still present
6. Verify: "2F" is still the active floor (highlighted)

**Expected Result:**
- Floor data persists in localStorage
- Active floor selection persists
- Floor order is maintained

---

### 11. No Project Selected - Empty State

**Steps:**
1. Open browser console
2. Run: `window.clearTestData()`
3. Refresh the page
4. Verify: Floor tabs bar shows "No project selected" message
5. Verify: No floor tabs are visible

**Expected Result:**
- Empty state message is displayed
- No tabs or "Add Floor" button visible
- Clean, centered text display

---

### 12. Hover Effects - Visual Feedback

**Steps:**
1. Ensure you have multiple floors
2. Hover over an inactive floor tab
3. Verify: Tab background changes (lighter color)
4. Verify: Tab border becomes blue
5. Verify: Tab slightly lifts up (translateY animation)
6. Hover over the "Add Floor" button
7. Verify: Button turns blue with white text
8. Verify: "+" icon rotates 90 degrees

**Expected Result:**
- Clear hover states on all interactive elements
- Smooth transitions (no flickering)
- Visual hierarchy is clear

---

### 13. Responsive Layout - Window Resize

**Steps:**
1. Start with browser window at full width
2. Slowly resize browser window to be narrower
3. Verify: Floor tabs wrap to multiple rows if needed
4. Verify: Tab sizes remain consistent
5. Continue resizing to mobile width (< 768px)
6. Verify: Tabs and buttons adjust padding (smaller)
7. Verify: Font sizes adjust appropriately

**Expected Result:**
- Layout is responsive to window size
- No overlapping elements
- Readable at all sizes

---

### 14. Focus States - Accessibility

**Steps:**
1. Click on a floor tab
2. Tab through elements using "Tab" key
3. Verify: Focus ring (blue outline) appears on focused tab
4. Verify: Focused tab can be activated with "Enter" key
5. Verify: Delete button can be focused and activated with keyboard

**Expected Result:**
- All interactive elements are keyboard accessible
- Focus states are clearly visible
- Keyboard navigation works smoothly

---

## Cleanup

After testing, clear test data:

```javascript
window.clearTestData()
```

Then refresh the page.

---

## Common Issues & Troubleshooting

### Issue: Floor tabs not visible
- **Solution**: Ensure a project is created using `window.initTestProject()`

### Issue: "window.initTestProject is not defined"
- **Solution**: Ensure you're on the editor page and testHelpers.ts is imported

### Issue: Floors not persisting after reload
- **Solution**: Check localStorage in DevTools (Application > Local Storage)
- **Check**: Keys `map-editor-projects` and `map-editor-floors` should exist

### Issue: Delete button not appearing
- **Solution**: Only one floor remains (minimum 1 floor required)

### Issue: Keyboard navigation not working
- **Solution**: Click on a floor tab first to set focus

---

## Browser Console Commands

Useful commands for testing:

```javascript
// Create test project
window.initTestProject()

// Clear all data
window.clearTestData()

// Get current state
useProjectStore.getState()
useFloorStore.getState()

// Get floors for current lot
const lot = useProjectStore.getState().currentLot
useFloorStore.getState().getFloorsByLotId(lot)

// Add basement floor
useFloorStore.getState().addFloor(useProjectStore.getState().currentLot, { order: -1 })

// Add upper floor
useFloorStore.getState().addFloor(useProjectStore.getState().currentLot, { order: 5 })

// Check localStorage
localStorage.getItem('map-editor-projects')
localStorage.getItem('map-editor-floors')
```

---

## Test Checklist

Use this checklist to track testing progress:

- [ ] 1. Initial Setup - Create Test Project
- [ ] 2. Add Floors - Multiple Floor Creation
- [ ] 3. Add Basement Floors - Negative Order
- [ ] 4. Switch Between Floors - Tab Selection
- [ ] 5. Keyboard Navigation - Arrow Keys
- [ ] 6. Delete Floor - Single Deletion
- [ ] 7. Delete Active Floor - Selection Adjustment
- [ ] 8. Delete Last Floor - Prevented
- [ ] 9. Delete Floor with Data - Confirmation
- [ ] 10. Floor Persistence - Reload Test
- [ ] 11. No Project Selected - Empty State
- [ ] 12. Hover Effects - Visual Feedback
- [ ] 13. Responsive Layout - Window Resize
- [ ] 14. Focus States - Accessibility

---

## Expected UI Appearance

```
┌─────────────────────────────────────────────────────────┐
│  Header (Logo, Tools, Theme, Logout)                    │
├─────────────────────────────────────────────────────────┤
│  [B2] [B1] [1F*] [2F] [3F] [+ Add Floor]              │  ← Floor Tabs
├─────────────────────────────────────────────────────────┤
│  Left │                                     │ Right     │
│  Bar  │        Canvas Area                  │ Sidebar  │
│       │                                     │          │
└─────────────────────────────────────────────────────────┘

* = Active floor (blue background, white text)
× = Delete button (visible on hover, except last floor)
```

---

## Success Criteria

The feature is working correctly if:

1. ✅ Floors can be added dynamically
2. ✅ Floor names follow the pattern (B2, B1, 1F, 2F, 3F...)
3. ✅ Floors are sorted by order (basement → ground → upper)
4. ✅ Floor selection works (click and keyboard)
5. ✅ Floor deletion works with confirmation
6. ✅ Last floor cannot be deleted
7. ✅ Active floor auto-adjusts after deletion
8. ✅ Floor data persists across page reloads
9. ✅ Empty state is displayed when no project
10. ✅ UI is responsive and accessible
