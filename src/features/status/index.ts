/**
 * Status Feature Module
 * Real-time status updates for map objects (CCTV, Parking)
 */

// Types
export type {
  CctvStatus,
  ParkingLocationStatus,
  StatusData,
  StatusMessage,
  IStatusService,
} from './types/status';

// Service
export { statusService } from './api/statusService';

// Store
export {
  useStatusStore,
  useCctvStatus,
  useParkingStatus,
  useStatusConnection,
} from './model/statusStore';

// UI Components
export { CctvStatusIndicator } from './ui/CctvStatusIndicator';
export { ParkingStatusIndicator } from './ui/ParkingStatusIndicator';
export { StatusOverlay } from './ui/StatusOverlay';
