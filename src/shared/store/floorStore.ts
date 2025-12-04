/**
 * Floor Store - Manages floors within parking lots
 * Persists to localStorage: map-editor-floors
 */

import { create } from 'zustand';
import { generateId, getCurrentTimestamp, storage } from '../lib/utils';

export interface MapData {
  // CSV data
  csvRawData?: string;
  csvFileName?: string;
  csvParsedData?: any;
  csvGroupedLayers?: any[];
  csvSelectedLayers?: string[];

  // Map data
  metadata?: Record<string, any>;
  assets?: any[];
  objects?: any[];
  graphJson?: any;
}

export interface Floor {
  id: string;
  lotId: string;
  name: string; // B1, B2, 1F, 2F, etc.
  order: number; // for sorting
  mapData: MapData | null;
  created: string;
  modified: string;
}

interface FloorState {
  floors: Floor[];
  currentFloor: string | null;

  // Actions
  addFloor: (lotId: string, floor?: Omit<Floor, 'id' | 'lotId' | 'created' | 'modified' | 'name' | 'order' | 'mapData'>) => void;
  deleteFloor: (id: string) => void;
  setCurrentFloor: (id: string | null) => void;
  getFloorsByLotId: (lotId: string) => Floor[];
  updateFloor: (id: string, updates: Partial<Floor>) => void;
  updateFloorMapData: (id: string, mapData: Partial<MapData>) => void;
  getCurrentFloorData: () => Floor | undefined;
}

const STORAGE_KEY = 'map-editor-floors';

// Load initial state from localStorage
const loadInitialState = (): Pick<FloorState, 'floors' | 'currentFloor'> => {
  const stored = storage.get<{ floors: Floor[]; currentFloor: string | null }>(
    STORAGE_KEY,
    { floors: [], currentFloor: null }
  );
  return stored;
};

/**
 * Generate floor name based on order
 * Negative order = basement (B1, B2, ...)
 * 0 = ground floor (1F)
 * Positive = upper floors (2F, 3F, ...)
 */
const generateFloorName = (order: number): string => {
  if (order < 0) {
    return `B${Math.abs(order)}`;
  } else {
    return `${order + 1}F`;
  }
};

/**
 * Calculate the next floor order for a lot
 */
const calculateNextOrder = (floors: Floor[], lotId: string): number => {
  const lotFloors = floors.filter((f) => f.lotId === lotId);
  if (lotFloors.length === 0) {
    return 0; // Start with ground floor (1F)
  }

  // Get the highest order
  const maxOrder = Math.max(...lotFloors.map((f) => f.order));
  return maxOrder + 1;
};

/**
 * Initialize empty map data structure
 */
const initializeMapData = (): MapData => ({
  metadata: {},
  assets: [],
  objects: [],
  csvRawData: undefined,
  csvFileName: undefined,
  csvParsedData: undefined,
  csvGroupedLayers: undefined,
  csvSelectedLayers: undefined,
  graphJson: undefined,
});

export const useFloorStore = create<FloorState>((set, get) => {
  const initialState = loadInitialState();

  return {
    ...initialState,

    addFloor: (lotId, floor = {}) => {
      const state = get();
      const now = getCurrentTimestamp();

      // Calculate order and name
      const order = calculateNextOrder(state.floors, lotId);
      const name = generateFloorName(order);

      const newFloor: Floor = {
        ...floor,
        id: generateId(),
        lotId,
        name,
        order,
        mapData: initializeMapData(),
        created: now,
        modified: now,
      };

      const newFloors = [...state.floors, newFloor];
      const newState = {
        floors: newFloors,
        currentFloor: newFloor.id,
      };

      // Persist to localStorage
      storage.set(STORAGE_KEY, newState);

      set(newState);
    },

    deleteFloor: (id) => {
      const state = get();
      const newFloors = state.floors.filter((f) => f.id !== id);

      // If we're deleting the current floor, clear it or select another
      let newCurrentFloor = state.currentFloor;
      if (state.currentFloor === id) {
        // Try to select the first remaining floor with the same lotId
        const deletedFloor = state.floors.find((f) => f.id === id);
        if (deletedFloor) {
          const remainingFloors = newFloors.filter((f) => f.lotId === deletedFloor.lotId);
          newCurrentFloor = remainingFloors.length > 0 ? remainingFloors[0].id : null;
        } else {
          newCurrentFloor = null;
        }
      }

      const newState = {
        floors: newFloors,
        currentFloor: newCurrentFloor,
      };

      // Persist to localStorage
      storage.set(STORAGE_KEY, newState);

      set(newState);
    },

    setCurrentFloor: (id) => {
      const state = get();

      // Validate that the floor exists
      if (id !== null && !state.floors.find((f) => f.id === id)) {
        throw new Error(`Floor with id "${id}" not found`);
      }

      // Persist to localStorage
      storage.set(STORAGE_KEY, {
        floors: state.floors,
        currentFloor: id,
      });

      set({ currentFloor: id });
    },

    getFloorsByLotId: (lotId) => {
      // Return floors sorted by order (basement floors first, then ground and upper)
      return get()
        .floors.filter((f) => f.lotId === lotId)
        .sort((a, b) => a.order - b.order);
    },

    updateFloor: (id, updates) => {
      const state = get();
      const floor = state.floors.find((f) => f.id === id);

      if (!floor) {
        throw new Error(`Floor with id "${id}" not found`);
      }

      const updatedFloor: Floor = {
        ...floor,
        ...updates,
        modified: getCurrentTimestamp(),
      };

      const newFloors = state.floors.map((f) => (f.id === id ? updatedFloor : f));

      // Persist to localStorage
      storage.set(STORAGE_KEY, {
        floors: newFloors,
        currentFloor: state.currentFloor,
      });

      set({ floors: newFloors });
    },

    updateFloorMapData: (id, mapData) => {
      const state = get();
      const floor = state.floors.find((f) => f.id === id);

      if (!floor) {
        throw new Error(`Floor with id "${id}" not found`);
      }

      const updatedFloor: Floor = {
        ...floor,
        mapData: {
          ...floor.mapData,
          ...mapData,
        },
        modified: getCurrentTimestamp(),
      };

      const newFloors = state.floors.map((f) => (f.id === id ? updatedFloor : f));

      // Persist to localStorage
      storage.set(STORAGE_KEY, {
        floors: newFloors,
        currentFloor: state.currentFloor,
      });

      set({ floors: newFloors });
    },

    getCurrentFloorData: () => {
      const state = get();
      if (!state.currentFloor) return undefined;
      return state.floors.find((f) => f.id === state.currentFloor);
    },
  };
});
