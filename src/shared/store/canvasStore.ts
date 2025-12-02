/**
 * Canvas Store - Manages JointJS graph state
 * NOT persisted (runtime only)
 */

import { create } from 'zustand';
import { dia } from '@joint/core';

interface CanvasState {
  graph: dia.Graph | null;
  selectedElementId: string | null;

  // Actions
  setGraph: (graph: dia.Graph | null) => void;
  setSelectedElement: (id: string | null) => void;
  clearCanvas: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  graph: null,
  selectedElementId: null,

  setGraph: (graph) => {
    set({ graph });
  },

  setSelectedElement: (id) => {
    set({ selectedElementId: id });
  },

  clearCanvas: () => {
    set({ graph: null, selectedElementId: null });
  },
}));
