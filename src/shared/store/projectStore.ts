/**
 * Project Store - Manages Parking Lot projects
 * Persists to localStorage: map-editor-projects
 */

import { create } from 'zustand';
import { generateId, getCurrentTimestamp, storage } from '../lib/utils';
import type { Template } from '@/entities/schema/types';

export interface ParkingLot {
  id: string;
  name: string;
  description?: string;
  created: string;
  modified: string;
  templateId?: string;
  templateVersion?: string;
  availableObjectTypes?: Template['objectTypes'];
  relationTypes?: Template['relationTypes'];
  assets?: Template['assets'];
  initialObjects?: Template['initialObjects'];
}

interface ProjectState {
  lots: ParkingLot[];
  currentLot: string | null;

  // Actions
  createLot: (lot: Omit<ParkingLot, 'id' | 'created' | 'modified'>) => ParkingLot;
  updateLot: (id: string, updates: Partial<ParkingLot>) => void;
  deleteLot: (id: string) => void;
  setCurrentLot: (id: string | null) => void;
  getLotById: (id: string) => ParkingLot | undefined;
  applyTemplate: (id: string, template: Template) => void;
}

const STORAGE_KEY = 'map-editor-projects';

// Load initial state from localStorage
const loadInitialState = (): Pick<ProjectState, 'lots' | 'currentLot'> => {
  const stored = storage.get<{ lots: ParkingLot[]; currentLot: string | null }>(
    STORAGE_KEY,
    { lots: [], currentLot: null }
  );
  return stored;
};

export const useProjectStore = create<ProjectState>((set, get) => {
  const initialState = loadInitialState();

  return {
    ...initialState,

    createLot: (lot) => {
      const state = get();

      // Validate name uniqueness
      const nameExists = state.lots.some(
        (l) => l.name.toLowerCase() === lot.name.toLowerCase()
      );

      if (nameExists) {
        throw new Error(`Parking lot with name "${lot.name}" already exists`);
      }

      const now = getCurrentTimestamp();
      const newLot: ParkingLot = {
        id: generateId(),
        ...lot,
        created: now,
        modified: now,
      };

      const newLots = [...state.lots, newLot];
      const newState = {
        lots: newLots,
        currentLot: newLot.id,
      };

      // Persist to localStorage
      storage.set(STORAGE_KEY, newState);

      set(newState);

      return newLot;
    },

    updateLot: (id, updates) => {
      const state = get();
      const lot = state.lots.find((l) => l.id === id);

      if (!lot) {
        throw new Error(`Parking lot with id "${id}" not found`);
      }

      // Validate name uniqueness if name is being updated
      if (updates.name) {
        const nameExists = state.lots.some(
          (l) => l.id !== id && l.name.toLowerCase() === updates.name!.toLowerCase()
        );

        if (nameExists) {
          throw new Error(`Parking lot with name "${updates.name}" already exists`);
        }
      }

      const updatedLot: ParkingLot = {
        ...lot,
        ...updates,
        modified: getCurrentTimestamp(),
      };

      const newLots = state.lots.map((l) => (l.id === id ? updatedLot : l));
      const newState = { ...state, lots: newLots };

      // Persist to localStorage
      storage.set(STORAGE_KEY, {
        lots: newState.lots,
        currentLot: newState.currentLot,
      });

      set({ lots: newLots });
    },

    deleteLot: (id) => {
      const state = get();
      const newLots = state.lots.filter((l) => l.id !== id);

      // If we're deleting the current lot, clear it
      const newCurrentLot = state.currentLot === id ? null : state.currentLot;

      const newState = {
        lots: newLots,
        currentLot: newCurrentLot,
      };

      // Persist to localStorage
      storage.set(STORAGE_KEY, newState);

      set(newState);
    },

    setCurrentLot: (id) => {
      const state = get();

      // Validate that the lot exists
      if (id !== null && !state.lots.find((l) => l.id === id)) {
        throw new Error(`Parking lot with id "${id}" not found`);
      }

      // Persist to localStorage
      storage.set(STORAGE_KEY, {
        lots: state.lots,
        currentLot: id,
      });

      set({ currentLot: id });
    },

    getLotById: (id) => {
      return get().lots.find((l) => l.id === id);
    },

    applyTemplate: (id, template) => {
      const state = get();
      const lot = state.lots.find((l) => l.id === id);

      if (!lot) {
        throw new Error(`Parking lot with id "${id}" not found`);
      }

      const updatedLot: ParkingLot = {
        ...lot,
        templateId: template.id,
        templateVersion: template.version,
        availableObjectTypes: template.objectTypes,
        relationTypes: template.relationTypes,
        assets: template.assets,
        initialObjects: template.initialObjects,
        modified: getCurrentTimestamp(),
      };

      const newLots = state.lots.map((l) => (l.id === id ? updatedLot : l));
      const newState = { ...state, lots: newLots };

      // Persist to localStorage
      storage.set(STORAGE_KEY, {
        lots: newState.lots,
        currentLot: newState.currentLot,
      });

      set({ lots: newLots });
    },
  };
});
