/**
 * Viewer Store - Manages multi-floor viewer state
 * Handles display mode, floor selection, layout, and zoom synchronization
 */

import { create } from 'zustand';
import { storage } from '../lib/utils';

export type DisplayMode = 'single' | 'multi';
export type LayoutMode = 'grid' | 'stack' | 'side';

interface ViewerState {
  // Display mode
  displayMode: DisplayMode;

  // Floor selection
  selectedFloorIds: string[];

  // Layout (only applicable in multi mode)
  layout: LayoutMode;

  // Grid configuration
  gridColumns: number;

  // Floor visibility controls
  floorVisibility: Record<string, boolean>;

  // Zoom synchronization
  synchronizedZoom: boolean;
  masterZoom: number;

  // Actions
  setDisplayMode: (mode: DisplayMode) => void;
  toggleFloorSelection: (floorId: string) => void;
  setSelectedFloorIds: (floorIds: string[]) => void;
  clearFloorSelection: () => void;
  selectAllFloors: (floorIds: string[]) => void;
  setLayout: (layout: LayoutMode) => void;
  setGridColumns: (columns: number) => void;
  toggleFloorVisibility: (floorId: string) => void;
  setFloorVisibility: (floorId: string, visible: boolean) => void;
  setSynchronizedZoom: (enabled: boolean) => void;
  setMasterZoom: (zoom: number) => void;
  resetSelection: () => void;
}

const STORAGE_KEY = 'map-editor-viewer';
const MAX_FLOOR_SELECTION = 5;

// Load initial state from localStorage
const loadInitialState = (): Pick<ViewerState, 'displayMode' | 'layout' | 'synchronizedZoom'> => {
  const stored = storage.get<{
    displayMode: DisplayMode;
    layout: LayoutMode;
    synchronizedZoom: boolean;
  }>(STORAGE_KEY, {
    displayMode: 'single',
    layout: 'grid',
    synchronizedZoom: false,
  });
  return stored;
};

export const useViewerStore = create<ViewerState>((set, get) => {
  const initialState = loadInitialState();

  return {
    // Initial state
    displayMode: initialState.displayMode,
    selectedFloorIds: [],
    layout: initialState.layout,
    gridColumns: 2,
    floorVisibility: {},
    synchronizedZoom: initialState.synchronizedZoom,
    masterZoom: 1,

    // Set display mode and persist to localStorage
    setDisplayMode: (mode) => {
      set({ displayMode: mode });

      // Persist display mode
      storage.set(STORAGE_KEY, {
        displayMode: mode,
        layout: get().layout,
        synchronizedZoom: get().synchronizedZoom,
      });

      // If switching to single mode, keep only first selected floor
      if (mode === 'single') {
        const { selectedFloorIds } = get();
        if (selectedFloorIds.length > 1) {
          set({ selectedFloorIds: [selectedFloorIds[0]] });
        }
      }
    },

    // Toggle floor selection with max limit validation
    toggleFloorSelection: (floorId) => {
      const { selectedFloorIds } = get();
      const isSelected = selectedFloorIds.includes(floorId);

      if (isSelected) {
        // Remove from selection
        set({
          selectedFloorIds: selectedFloorIds.filter((id) => id !== floorId),
        });
      } else {
        // Add to selection with max limit check
        if (selectedFloorIds.length >= MAX_FLOOR_SELECTION) {
          console.warn(`Maximum ${MAX_FLOOR_SELECTION} floors can be selected`);
          return;
        }

        set({
          selectedFloorIds: [...selectedFloorIds, floorId],
          floorVisibility: { ...get().floorVisibility, [floorId]: true },
        });
      }
    },

    // Set selected floor IDs (with validation)
    setSelectedFloorIds: (floorIds) => {
      // Limit to MAX_FLOOR_SELECTION
      const limitedIds = floorIds.slice(0, MAX_FLOOR_SELECTION);

      // Initialize visibility for all selected floors
      const newVisibility: Record<string, boolean> = {};
      limitedIds.forEach((id) => {
        newVisibility[id] = true;
      });

      set({
        selectedFloorIds: limitedIds,
        floorVisibility: { ...get().floorVisibility, ...newVisibility },
      });

      if (floorIds.length > MAX_FLOOR_SELECTION) {
        console.warn(`Limited selection to ${MAX_FLOOR_SELECTION} floors`);
      }
    },

    // Clear all floor selections
    clearFloorSelection: () => {
      set({ selectedFloorIds: [] });
    },

    // Select all floors (with max limit)
    selectAllFloors: (floorIds) => {
      const limitedIds = floorIds.slice(0, MAX_FLOOR_SELECTION);

      const newVisibility: Record<string, boolean> = {};
      limitedIds.forEach((id) => {
        newVisibility[id] = true;
      });

      set({
        selectedFloorIds: limitedIds,
        floorVisibility: { ...get().floorVisibility, ...newVisibility },
      });

      if (floorIds.length > MAX_FLOOR_SELECTION) {
        console.warn(`Limited selection to ${MAX_FLOOR_SELECTION} floors`);
      }
    },

    // Set layout mode and persist
    setLayout: (layout) => {
      set({ layout });

      // Auto-adjust grid columns based on layout
      if (layout === 'grid') {
        const { selectedFloorIds } = get();
        const count = selectedFloorIds.length;
        let columns = 2;

        if (count === 1) columns = 1;
        else if (count === 2) columns = 2;
        else if (count <= 4) columns = 2;
        else columns = 3;

        set({ gridColumns: columns });
      }

      // Persist layout
      storage.set(STORAGE_KEY, {
        displayMode: get().displayMode,
        layout,
        synchronizedZoom: get().synchronizedZoom,
      });
    },

    // Set grid columns
    setGridColumns: (columns) => {
      set({ gridColumns: columns });
    },

    // Toggle floor visibility
    toggleFloorVisibility: (floorId) => {
      const { floorVisibility } = get();
      set({
        floorVisibility: {
          ...floorVisibility,
          [floorId]: !floorVisibility[floorId],
        },
      });
    },

    // Set floor visibility
    setFloorVisibility: (floorId, visible) => {
      const { floorVisibility } = get();
      set({
        floorVisibility: {
          ...floorVisibility,
          [floorId]: visible,
        },
      });
    },

    // Set synchronized zoom
    setSynchronizedZoom: (enabled) => {
      set({ synchronizedZoom: enabled });

      // Persist synchronizedZoom
      storage.set(STORAGE_KEY, {
        displayMode: get().displayMode,
        layout: get().layout,
        synchronizedZoom: enabled,
      });
    },

    // Set master zoom level (for synchronized zoom)
    setMasterZoom: (zoom) => {
      set({ masterZoom: zoom });
    },

    // Reset all selections and state
    resetSelection: () => {
      set({
        selectedFloorIds: [],
        floorVisibility: {},
        masterZoom: 1,
      });
    },
  };
});
