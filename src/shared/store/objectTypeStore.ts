/**
 * Object Type Store - Manages object type definitions and mappings
 * Persists to localStorage: map-editor-object-types
 */

import { create } from 'zustand';
import { generateId, getCurrentTimestamp, storage } from '../lib/utils';

export interface Property {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  defaultValue?: any;
}

export interface ObjectType {
  id: string;
  name: string;
  icon?: string;
  properties: Property[];
  created: string;
  modified: string;
}

export interface Mapping {
  id: string;
  floorId: string;
  typeId: string;
  entityHandle: string; // CSV entity reference
  created: string;
}

interface ObjectTypeState {
  types: ObjectType[];
  mappings: Mapping[];

  // Type actions
  addType: (type: Omit<ObjectType, 'id' | 'created' | 'modified'>) => void;
  updateType: (id: string, updates: Partial<ObjectType>) => void;
  deleteType: (id: string) => void;
  getTypeById: (id: string) => ObjectType | undefined;

  // Mapping actions
  addMapping: (mapping: Omit<Mapping, 'id' | 'created'>) => void;
  removeMapping: (id: string) => void;
  getMappingsByFloorId: (floorId: string) => Mapping[];
}

const STORAGE_KEY = 'map-editor-object-types';

// Load initial state from localStorage
const loadInitialState = (): Pick<ObjectTypeState, 'types' | 'mappings'> => {
  const stored = storage.get<{ types: ObjectType[]; mappings: Mapping[] }>(
    STORAGE_KEY,
    { types: [], mappings: [] }
  );
  return stored;
};

export const useObjectTypeStore = create<ObjectTypeState>((set, get) => {
  const initialState = loadInitialState();

  return {
    ...initialState,

    addType: (type) => {
      const state = get();

      // Validate name uniqueness
      const nameExists = state.types.some(
        (t) => t.name.toLowerCase() === type.name.toLowerCase()
      );

      if (nameExists) {
        throw new Error(`Object type with name "${type.name}" already exists`);
      }

      const now = getCurrentTimestamp();
      const newType: ObjectType = {
        id: generateId(),
        ...type,
        created: now,
        modified: now,
      };

      const newTypes = [...state.types, newType];
      const newState = {
        types: newTypes,
        mappings: state.mappings,
      };

      // Persist to localStorage
      storage.set(STORAGE_KEY, newState);

      set({ types: newTypes });
    },

    updateType: (id, updates) => {
      const state = get();
      const type = state.types.find((t) => t.id === id);

      if (!type) {
        throw new Error(`Object type with id "${id}" not found`);
      }

      // Validate name uniqueness if name is being updated
      if (updates.name) {
        const nameExists = state.types.some(
          (t) => t.id !== id && t.name.toLowerCase() === updates.name!.toLowerCase()
        );

        if (nameExists) {
          throw new Error(`Object type with name "${updates.name}" already exists`);
        }
      }

      const updatedType: ObjectType = {
        ...type,
        ...updates,
        modified: getCurrentTimestamp(),
      };

      const newTypes = state.types.map((t) => (t.id === id ? updatedType : t));
      const newState = {
        types: newTypes,
        mappings: state.mappings,
      };

      // Persist to localStorage
      storage.set(STORAGE_KEY, newState);

      set({ types: newTypes });
    },

    deleteType: (id) => {
      const state = get();

      // Check if type is in use (has mappings)
      const typeInUse = state.mappings.some((m) => m.typeId === id);

      if (typeInUse) {
        throw new Error('Cannot delete object type that is in use. Remove all mappings first.');
      }

      const newTypes = state.types.filter((t) => t.id !== id);
      const newState = {
        types: newTypes,
        mappings: state.mappings,
      };

      // Persist to localStorage
      storage.set(STORAGE_KEY, newState);

      set({ types: newTypes });
    },

    getTypeById: (id) => {
      return get().types.find((t) => t.id === id);
    },

    addMapping: (mapping) => {
      const state = get();

      // Validate that the type exists
      const type = state.types.find((t) => t.id === mapping.typeId);
      if (!type) {
        throw new Error(`Object type with id "${mapping.typeId}" not found`);
      }

      const now = getCurrentTimestamp();
      const newMapping: Mapping = {
        id: generateId(),
        ...mapping,
        created: now,
      };

      const newMappings = [...state.mappings, newMapping];
      const newState = {
        types: state.types,
        mappings: newMappings,
      };

      // Persist to localStorage
      storage.set(STORAGE_KEY, newState);

      set({ mappings: newMappings });
    },

    removeMapping: (id) => {
      const state = get();
      const newMappings = state.mappings.filter((m) => m.id !== id);
      const newState = {
        types: state.types,
        mappings: newMappings,
      };

      // Persist to localStorage
      storage.set(STORAGE_KEY, newState);

      set({ mappings: newMappings });
    },

    getMappingsByFloorId: (floorId) => {
      return get().mappings.filter((m) => m.floorId === floorId);
    },
  };
});
