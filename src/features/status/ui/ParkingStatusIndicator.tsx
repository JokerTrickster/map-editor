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

  // Only show indicator when occupied (parking space itself turns red)
  if (!occupied) {
    return null; // Hide when available for cleaner view
  }

  return (
    <div
      className={`${styles.parkingInfo} ${className || ''}`}
      data-occupied={occupied}
      title={`주차됨 (${lastUpdateTime})${vehicleInfo?.plateNumber ? `\n${vehicleInfo.plateNumber}` : ''}${parkingDuration ? `\n주차 시간: ${parkingDuration}` : ''}`}
    >
      {vehicleInfo?.plateNumber && (
        <span className={styles.plateNumber}>{vehicleInfo.plateNumber}</span>
      )}
      {parkingDuration && (
        <span className={styles.duration}>{parkingDuration}</span>
      )}
    </div>
  );
}
