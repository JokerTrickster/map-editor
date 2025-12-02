# Floor Tabs Visual Reference

## Component Layout

### Full Layout View
```
┌────────────────────────────────────────────────────────────────┐
│                        HEADER BAR                              │
│  🗺 Map Editor    [Zoom] [Upload] [Clear] [Export] [Theme] [Logout]  │
├────────────────────────────────────────────────────────────────┤
│                      FLOOR TABS BAR                            │
│  [B2] [B1] [1F*] [2F] [3F] [+ Add Floor]                      │
│   ×    ×    ×    ×    ×                                        │
├────────────────────────────────────────────────────────────────┤
│  L │                    CANVAS AREA                        │ R │
│  E │                                                        │ I │
│  F │                                                        │ G │
│  T │                                                        │ H │
│    │                                                        │ T │
│  S │                                                        │   │
│  I │                                                        │ S │
│  D │                                                        │ I │
│  E │                                                        │ D │
│  B │                                                        │ E │
│  A │                                                        │ B │
│  R │                                                        │ A │
│    │                                                        │ R │
└────────────────────────────────────────────────────────────────┘
```

---

## Floor Tab States

### Inactive Tab (Default State)
```
┌─────────┐
│   2F    │  ← Light gray background
│    ×    │  ← Delete button (faint)
└─────────┘
```
**Colors**:
- Background: `--color-bg` (white in light mode)
- Text: `--color-text-secondary` (gray)
- Border: `--color-border` (light gray)

---

### Active Tab (Selected State)
```
┌─────────┐
│   1F    │  ← Blue background
│    ×    │  ← White delete button
└═════════┘  ← Bottom border (darker blue)
     ^
   Active
```
**Colors**:
- Background: `--color-primary` (blue #2563eb)
- Text: white
- Border: `--color-primary`
- Shadow: `var(--shadow-glow)` (subtle blue glow)

---

### Tab on Hover
```
┌─────────┐
│   3F    │  ← Slightly elevated (1px up)
│    ×    │  ← Delete button more visible
└─────────┘  ← Blue border
```
**Effects**:
- Background: `--color-surface-hover`
- Border: `--color-primary` (blue)
- Transform: `translateY(-1px)`
- Cursor: pointer

---

### Delete Button Hover (Non-Active Tab)
```
┌─────────┐
│   2F    │
│   [×]   │  ← Red background on hover
└─────────┘
```
**Colors**:
- Background: `rgba(239, 68, 68, 0.1)` (red tint)
- Icon color: `--color-error` (red)
- Scale: 1.1x

---

### Add Floor Button (Default)
```
┌───────────────┐
│  + Add Floor  │  ← Dashed border
└───────────────┘
```
**Colors**:
- Background: transparent
- Text: `--color-text-secondary` (gray)
- Border: dashed `--color-border`

---

### Add Floor Button (Hover)
```
┌───────────────┐
│  ⊕ Add Floor  │  ← Solid blue, rotated icon
└───────────────┘
```
**Effects**:
- Background: `--color-primary` (blue)
- Text: white
- Border: solid blue
- Icon rotation: 90 degrees
- Transform: `translateY(-1px)`

---

## Floor Naming Examples

### Basement Floors (Negative Order)
```
Order: -3 → Name: B3
Order: -2 → Name: B2
Order: -1 → Name: B1
```

### Ground and Upper Floors (0 and Positive Order)
```
Order:  0 → Name: 1F  (Ground floor)
Order:  1 → Name: 2F
Order:  2 → Name: 3F
Order:  3 → Name: 4F
Order:  4 → Name: 5F
```

### Mixed Example (Full Building)
```
┌──────────────────────────────────────────────────────────┐
│  [B3] [B2] [B1] [1F*] [2F] [3F] [4F] [+ Add Floor]     │
│   ×    ×    ×    ×    ×    ×    ×                       │
└──────────────────────────────────────────────────────────┘
   └─────┬──────┘ └──┬──┘ └────────┬─────────┘
  Basement Floors  Ground    Upper Floors
```

---

## Empty State

### No Project Selected
```
┌────────────────────────────────────────────────────────────┐
│                   No project selected                      │
└────────────────────────────────────────────────────────────┘
```
**Style**:
- Centered italic text
- Gray color (`--color-text-tertiary`)
- No tabs or buttons visible

---

## Responsive Behavior

### Desktop (> 768px)
```
[B2] [B1] [1F] [2F] [3F] [4F] [5F] [6F] [7F] [+ Add Floor]
 ×    ×    ×    ×    ×    ×    ×    ×    ×
```
- All tabs in single row (wraps if too many)
- Standard padding and font size

### Mobile (< 768px)
```
[B2] [B1] [1F] [2F] [3F]
 ×    ×    ×    ×    ×
[4F] [5F] [+ Add Floor]
 ×    ×
```
- Tabs wrap to multiple rows
- Reduced padding and font size
- Touch-friendly button sizes

---

## Keyboard Focus States

### Tab Focused (via keyboard)
```
┌─────────┐
│   2F    │  ← Blue outline ring
│    ×    │
└─────────┘
    ▼
```
**Effect**:
- Box shadow: `0 0 0 3px rgba(37, 99, 235, 0.1)`
- Clear focus indicator for accessibility

---

## Dark Mode Variations

### Light Mode
```
Background: White/Light Gray
Active Tab: Blue (#2563eb)
Text: Dark Gray (#0f172a)
Border: Light Gray (#e2e8f0)
```

### Dark Mode
```
Background: Dark Blue (#151b2b)
Active Tab: Bright Blue (#3b82f6)
Text: Light Gray (#f8fafc)
Border: Dark Gray (#1e293b)
```

---

## Animation Timings

### Hover Effects
- Duration: 150ms
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`
- Properties: background, border, transform

### Icon Rotation (Add Button)
- Duration: 150ms
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`
- Rotation: 0deg → 90deg

### Tab Selection
- Instant (no animation)
- Background/color change happens immediately

---

## Spacing & Dimensions

### Tab Dimensions
```
Height: auto (min-height from padding)
Padding: 8px 16px (vertical horizontal)
Gap between tabs: 8px
Border radius: 8px
```

### Add Button Dimensions
```
Height: auto (matches tabs)
Padding: 8px 16px
Gap between icon and text: 8px
Border: 1px dashed
```

### Container
```
Height: 52px (min-height)
Padding: 12px 24px
Background: var(--color-surface)
Border-bottom: 1px solid var(--color-border)
```

---

## Accessibility Features

### ARIA Attributes
```html
<div role="tab" aria-selected="true">1F</div>
<button aria-label="Delete 1F">×</button>
<button aria-label="Add new floor">+ Add Floor</button>
```

### Keyboard Navigation
```
Tab       → Focus next element
Shift+Tab → Focus previous element
←         → Select previous floor
→         → Select next floor
Delete    → Delete focused floor
Enter     → Activate focused tab
```

---

## Color Reference

### Primary Colors
```
Blue (Primary): #2563eb
Blue Hover:     #1d4ed8
Red (Error):    #ef4444
Green (Success): #10b981
```

### Semantic Colors
```
Text:           #0f172a (light) / #f8fafc (dark)
Text Secondary: #475569 (light) / #94a3b8 (dark)
Border:         #e2e8f0 (light) / #1e293b (dark)
Background:     #ffffff (light) / #151b2b (dark)
```

---

## Component Hierarchy

```
FloorTabs (container)
└── tabs (flex row)
    ├── tab (floor item)
    │   ├── tabName (text)
    │   └── deleteBtn (button)
    │       └── × icon (svg)
    └── addBtn (button)
        ├── + icon (svg)
        └── "Add Floor" text
```

---

## CSS Class Structure

```css
.container     → Main wrapper
.tabs          → Flex container for tabs
.tab           → Individual floor tab
.tab.active    → Active floor tab
.tabName       → Floor name text
.deleteBtn     → Delete button (×)
.addBtn        → Add floor button
.emptyState    → No project selected state
.emptyText     → Empty state text
```

---

## Interactive States Matrix

| State | Background | Text | Border | Cursor | Transform |
|-------|-----------|------|--------|--------|-----------|
| Default | `--color-bg` | Gray | Light | pointer | none |
| Hover | `--color-surface-hover` | Dark | Blue | pointer | translateY(-1px) |
| Active | `--color-primary` | White | Blue | pointer | none |
| Active+Hover | `--color-primary-hover` | White | Blue | pointer | none |
| Focus | (inherit) | (inherit) | Blue | pointer | none (+ shadow) |
| Disabled | N/A | N/A | N/A | N/A | N/A |

---

## Confirmation Dialogs

### Delete Empty Floor
```
No dialog - direct deletion
```

### Delete Floor with Objects
```
┌────────────────────────────────────┐
│  Delete 1F?                        │
│  This will remove all objects on   │
│  this floor.                       │
│                                    │
│         [Cancel]  [OK]            │
└────────────────────────────────────┘
```

### Delete Last Floor
```
┌────────────────────────────────────┐
│  Cannot delete the last floor.     │
│  At least one floor is required.   │
│                                    │
│              [OK]                  │
└────────────────────────────────────┘
```

---

**Last Updated**: December 2, 2025
**Component**: FloorTabs
**Version**: 1.0.0
