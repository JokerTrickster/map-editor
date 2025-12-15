/**
 * Status Store - Global state management for real-time status data
 * Uses Zustand for reactive state updates
 */

import { create } from 'zustand';
import type {
  StatusData,
  CctvStatus,
  ParkingLocationStatus,
  StatusMessage,
} from '../types/status';
import { statusService } from '../api/statusService';

interface StatusStore extends StatusData {
  // Connection state
  connected: boolean;

  // Actions
  connect: () => void;
  disconnect: () => void;
  updateCctvStatus: (status: CctvStatus) => void;
  updateParkingStatus: (status: ParkingLocationStatus) => void;
  bulkUpdate: (data: StatusData) => void;

  // Selectors (computed)
  getCctvStatus: (objectId: string) => CctvStatus | undefined;
  getParkingStatus: (objectId: string) => ParkingLocationStatus | undefined;
}

/**
 * Status store instance
 */
export const useStatusStore = create<StatusStore>((set, get) => ({
  // Initial state
  cctvStatuses: {},
  parkingStatuses: {},
  connected: false,

  /**
   * Connect to status service and subscribe to updates
   */
  connect: () => {
    if (get().connected) return;

    // Subscribe to status updates
    const unsubscribe = statusService.subscribe((message: StatusMessage) => {
      switch (message.type) {
        case 'cctv_status':
          get().updateCctvStatus(message.data);
          break;
        case 'parking_status':
          get().updateParkingStatus(message.data);
          break;
        case 'bulk_update':
          get().bulkUpdate(message.data);
          break;
      }
    });

    // Connect to service
    statusService.connect();

    set({ connected: true });

    // Store unsubscribe function for cleanup
    (window as any).__statusUnsubscribe = unsubscribe;
  },

  /**
   * Disconnect from status service
   */
  disconnect: () => {
    if (!get().connected) return;

    statusService.disconnect();

    // Cleanup subscription
    const unsubscribe = (window as any).__statusUnsubscribe;
    if (unsubscribe) {
      unsubscribe();
      delete (window as any).__statusUnsubscribe;
    }

    set({ connected: false });
  },

  /**
   * Update single CCTV status
   */
  updateCctvStatus: (status: CctvStatus) => {
    set(state => ({
      cctvStatuses: {
        ...state.cctvStatuses,
        [status.objectId]: status,
      },
    }));
  },

  /**
   * Update single parking status
   */
  updateParkingStatus: (status: ParkingLocationStatus) => {
    set(state => ({
      parkingStatuses: {
        ...state.parkingStatuses,
        [status.objectId]: status,
      },
    }));
  },

  /**
   * Bulk update all statuses
   */
  bulkUpdate: (data: StatusData) => {
    set({
      cctvStatuses: data.cctvStatuses,
      parkingStatuses: data.parkingStatuses,
    });
  },

  /**
   * Get CCTV status by object ID
   */
  getCctvStatus: (objectId: string) => {
    return get().cctvStatuses[objectId];
  },

  /**
   * Get parking status by object ID
   */
  getParkingStatus: (objectId: string) => {
    return get().parkingStatuses[objectId];
  },
}));

/**
 * Hook to get CCTV status for a specific object
 */
export function useCctvStatus(objectId: string): CctvStatus | undefined {
  return useStatusStore(state => state.cctvStatuses[objectId]);
}

/**
 * Hook to get parking status for a specific object
 */
export function useParkingStatus(objectId: string): ParkingLocationStatus | undefined {
  return useStatusStore(state => state.parkingStatuses[objectId]);
}

/**
 * Hook to get connection status
 */
export function useStatusConnection() {
  return useStatusStore(state => state.connected);
}
