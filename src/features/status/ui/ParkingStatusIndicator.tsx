/**
 * Parking Status Indicator Component
 * Displays real-time occupancy status for parking locations
 */

import { useParkingStatus } from '../model/statusStore';
import styles from './StatusIndicator.module.css';

interface ParkingStatusIndicatorProps {
  /** Object ID of the parking location */
  objectId: string;
  /** Optional className for styling */
  className?: string;
}

/**
 * Parking Status Indicator
 * Shows occupancy status with color coding:
 * - Red: Occupied
 * - Green: Available
 */
export function ParkingStatusIndicator({ objectId, className }: ParkingStatusIndicatorProps) {
  const status = useParkingStatus(objectId);

  if (!status) {
    return null; // No status data yet
  }

  const { occupied, lastUpdate, vehicleInfo } = status;
  const lastUpdateTime = new Date(lastUpdate).toLocaleTimeString();

  // Calculate parking duration if occupied
  let parkingDuration = '';
  if (occupied && vehicleInfo?.entryTime) {
    const duration = Date.now() - vehicleInfo.entryTime;
    const minutes = Math.floor(duration / 60000);
    if (minutes < 60) {
      parkingDuration = `${minutes}분`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      parkingDuration = `${hours}시간 ${remainingMinutes}분`;
    }
  }

  // Only show color change on parking space itself - no overlay indicator needed
  return null;
}
