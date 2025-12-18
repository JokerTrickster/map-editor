/**
 * Unit tests for viewerStore
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useViewerStore } from './viewerStore';

describe('viewerStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useViewerStore.getState();
    store.resetSelection();
    store.setDisplayMode('single');
    store.setLayout('grid');
  });

  describe('Display Mode', () => {
    it('should initialize with single mode by default', () => {
      const { displayMode } = useViewerStore.getState();
      expect(displayMode).toBe('single');
    });

    it('should change display mode', () => {
      const { setDisplayMode } = useViewerStore.getState();

      setDisplayMode('multi');
      expect(useViewerStore.getState().displayMode).toBe('multi');

      setDisplayMode('single');
      expect(useViewerStore.getState().displayMode).toBe('single');
    });

    it('should limit selected floors to 1 when switching to single mode', () => {
      const { setDisplayMode, setSelectedFloorIds } = useViewerStore.getState();

      // Select multiple floors
      setSelectedFloorIds(['floor1', 'floor2', 'floor3']);
      expect(useViewerStore.getState().selectedFloorIds.length).toBe(3);

      // Switch to single mode
      setDisplayMode('single');
      expect(useViewerStore.getState().selectedFloorIds.length).toBe(1);
      expect(useViewerStore.getState().selectedFloorIds[0]).toBe('floor1');
    });
  });

  describe('Floor Selection', () => {
    it('should toggle floor selection', () => {
      const { toggleFloorSelection } = useViewerStore.getState();

      toggleFloorSelection('floor1');
      expect(useViewerStore.getState().selectedFloorIds).toContain('floor1');

      toggleFloorSelection('floor2');
      expect(useViewerStore.getState().selectedFloorIds).toContain('floor2');

      toggleFloorSelection('floor1');
      expect(useViewerStore.getState().selectedFloorIds).not.toContain('floor1');
    });

    it('should limit selection to max 5 floors', () => {
      const { toggleFloorSelection } = useViewerStore.getState();

      // Try to select 6 floors
      toggleFloorSelection('floor1');
      toggleFloorSelection('floor2');
      toggleFloorSelection('floor3');
      toggleFloorSelection('floor4');
      toggleFloorSelection('floor5');
      toggleFloorSelection('floor6'); // Should be ignored

      expect(useViewerStore.getState().selectedFloorIds.length).toBe(5);
      expect(useViewerStore.getState().selectedFloorIds).not.toContain('floor6');
    });

    it('should set selected floor IDs', () => {
      const { setSelectedFloorIds } = useViewerStore.getState();

      setSelectedFloorIds(['floor1', 'floor2']);
      expect(useViewerStore.getState().selectedFloorIds).toEqual(['floor1', 'floor2']);
    });

    it('should limit setSelectedFloorIds to max 5 floors', () => {
      const { setSelectedFloorIds } = useViewerStore.getState();

      setSelectedFloorIds(['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7']);
      expect(useViewerStore.getState().selectedFloorIds.length).toBe(5);
    });

    it('should clear floor selection', () => {
      const { setSelectedFloorIds, clearFloorSelection } = useViewerStore.getState();

      setSelectedFloorIds(['floor1', 'floor2']);
      expect(useViewerStore.getState().selectedFloorIds.length).toBe(2);

      clearFloorSelection();
      expect(useViewerStore.getState().selectedFloorIds).toEqual([]);
    });

    it('should select all floors (with limit)', () => {
      const { selectAllFloors } = useViewerStore.getState();

      selectAllFloors(['f1', 'f2', 'f3']);
      expect(useViewerStore.getState().selectedFloorIds.length).toBe(3);

      selectAllFloors(['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7']);
      expect(useViewerStore.getState().selectedFloorIds.length).toBe(5);
    });
  });

  describe('Layout Mode', () => {
    it('should initialize with grid layout by default', () => {
      const { layout } = useViewerStore.getState();
      expect(layout).toBe('grid');
    });

    it('should change layout mode', () => {
      const { setLayout } = useViewerStore.getState();

      setLayout('stack');
      expect(useViewerStore.getState().layout).toBe('stack');

      setLayout('side');
      expect(useViewerStore.getState().layout).toBe('side');

      setLayout('grid');
      expect(useViewerStore.getState().layout).toBe('grid');
    });

    it('should auto-adjust grid columns based on floor count when layout changes', () => {
      const { setLayout, setSelectedFloorIds } = useViewerStore.getState();

      // 1 floor -> 1 column
      setSelectedFloorIds(['f1']);
      setLayout('grid');
      expect(useViewerStore.getState().gridColumns).toBe(1);

      // 2 floors -> 2 columns
      setSelectedFloorIds(['f1', 'f2']);
      setLayout('grid');
      expect(useViewerStore.getState().gridColumns).toBe(2);

      // 4 floors -> 2 columns
      setSelectedFloorIds(['f1', 'f2', 'f3', 'f4']);
      setLayout('grid');
      expect(useViewerStore.getState().gridColumns).toBe(2);

      // 5 floors -> 3 columns
      setSelectedFloorIds(['f1', 'f2', 'f3', 'f4', 'f5']);
      setLayout('grid');
      expect(useViewerStore.getState().gridColumns).toBe(3);
    });
  });

  describe('Floor Visibility', () => {
    it('should toggle floor visibility', () => {
      const { toggleFloorVisibility, setFloorVisibility } = useViewerStore.getState();

      // Initially undefined, first toggle sets to false
      setFloorVisibility('floor1', true);
      expect(useViewerStore.getState().floorVisibility['floor1']).toBe(true);

      toggleFloorVisibility('floor1');
      expect(useViewerStore.getState().floorVisibility['floor1']).toBe(false);

      toggleFloorVisibility('floor1');
      expect(useViewerStore.getState().floorVisibility['floor1']).toBe(true);
    });

    it('should set floor visibility', () => {
      const { setFloorVisibility } = useViewerStore.getState();

      setFloorVisibility('floor1', true);
      expect(useViewerStore.getState().floorVisibility['floor1']).toBe(true);

      setFloorVisibility('floor1', false);
      expect(useViewerStore.getState().floorVisibility['floor1']).toBe(false);
    });

    it('should initialize visibility when selecting floors', () => {
      const { setSelectedFloorIds } = useViewerStore.getState();

      setSelectedFloorIds(['floor1', 'floor2']);
      expect(useViewerStore.getState().floorVisibility['floor1']).toBe(true);
      expect(useViewerStore.getState().floorVisibility['floor2']).toBe(true);
    });
  });

  describe('Synchronized Zoom', () => {
    it('should toggle synchronized zoom', () => {
      const { setSynchronizedZoom } = useViewerStore.getState();

      setSynchronizedZoom(true);
      expect(useViewerStore.getState().synchronizedZoom).toBe(true);

      setSynchronizedZoom(false);
      expect(useViewerStore.getState().synchronizedZoom).toBe(false);
    });

    it('should set master zoom level', () => {
      const { setMasterZoom } = useViewerStore.getState();

      setMasterZoom(1.5);
      expect(useViewerStore.getState().masterZoom).toBe(1.5);

      setMasterZoom(0.8);
      expect(useViewerStore.getState().masterZoom).toBe(0.8);
    });
  });

  describe('Reset Selection', () => {
    it('should reset all selections and state', () => {
      const {
        setSelectedFloorIds,
        setMasterZoom,
        setFloorVisibility,
        resetSelection,
      } = useViewerStore.getState();

      // Set some state
      setSelectedFloorIds(['floor1', 'floor2']);
      setMasterZoom(1.5);
      setFloorVisibility('floor1', false);

      // Reset
      resetSelection();

      // Verify reset state
      expect(useViewerStore.getState().selectedFloorIds).toEqual([]);
      expect(useViewerStore.getState().floorVisibility).toEqual({});
      expect(useViewerStore.getState().masterZoom).toBe(1);
    });
  });
});
