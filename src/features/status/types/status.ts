/**
 * Real-time status types for map objects
 * These types represent live status data that will be received via WebSocket
 */

/**
 * CCTV connection status
 */
export interface CctvStatus {
  /** Object ID matching the MapObject id */
  objectId: string;
  /** Connection status */
  connected: boolean;
  /** Last update timestamp */
  lastUpdate: number;
  /** Optional error message if disconnected */
  errorMessage?: string;
}

/**
 * Parking location occupancy status
 */
export interface ParkingLocationStatus {
  /** Object ID matching the MapObject id */
  objectId: string;
  /** Whether the parking spot is occupied */
  occupied: boolean;
  /** Last update timestamp */
  lastUpdate: number;
  /** Vehicle information if occupied */
  vehicleInfo?: {
    plateNumber?: string;
    entryTime?: number;
  };
}

/**
 * Combined status data for all objects
 */
export interface StatusData {
  cctvStatuses: Record<string, CctvStatus>;
  parkingStatuses: Record<string, ParkingLocationStatus>;
}

/**
 * WebSocket message types
 */
export type StatusMessage =
  | { type: 'cctv_status'; data: CctvStatus }
  | { type: 'parking_status'; data: ParkingLocationStatus }
  | { type: 'bulk_update'; data: StatusData };

/**
 * Status service interface
 * This abstraction allows easy switching between mock and real WebSocket
 */
export interface IStatusService {
  /** Connect to status updates */
  connect: () => void;
  /** Disconnect from status updates */
  disconnect: () => void;
  /** Subscribe to status updates */
  subscribe: (callback: (message: StatusMessage) => void) => () => void;
  /** Check if connected */
  isConnected: () => boolean;
}
