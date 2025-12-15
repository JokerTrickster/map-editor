/**
 * CCTV Status Indicator Component
 * Displays real-time connection status for CCTV objects
 */

import { useCctvStatus } from '../model/statusStore';
import styles from './StatusIndicator.module.css';

interface CctvStatusIndicatorProps {
  /** Object ID of the CCTV */
  objectId: string;
  /** Optional className for styling */
  className?: string;
}

/**
 * CCTV Status Indicator
 * Shows connection status with color coding:
 * - Green badge: Connected
 * - Red badge: Disconnected
 */
export function CctvStatusIndicator({ objectId, className }: CctvStatusIndicatorProps) {
  const status = useCctvStatus(objectId);

  if (!status) {
    return null; // No status data yet
  }

  const { connected, lastUpdate, errorMessage } = status;
  const lastUpdateTime = new Date(lastUpdate).toLocaleTimeString();

  // Only show badge when disconnected for better visibility
  if (!connected) {
    return (
      <div
        className={`${styles.cctvBadge} ${className || ''}`}
        data-connected={false}
        title={`연결 끊김 (${lastUpdateTime})${errorMessage ? `\n${errorMessage}` : ''}`}
      >
        <div className={styles.badgeIcon}>⚠</div>
      </div>
    );
  }

  // Show small indicator when connected (optional)
  return null; // Hide when connected for cleaner view
}
