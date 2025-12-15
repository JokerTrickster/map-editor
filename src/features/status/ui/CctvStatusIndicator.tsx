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
 * - Green: Connected
 * - Red: Disconnected
 */
export function CctvStatusIndicator({ objectId, className }: CctvStatusIndicatorProps) {
  const status = useCctvStatus(objectId);

  if (!status) {
    return null; // No status data yet
  }

  const { connected, lastUpdate, errorMessage } = status;
  const lastUpdateTime = new Date(lastUpdate).toLocaleTimeString();

  return (
    <div
      className={`${styles.statusIndicator} ${className || ''}`}
      data-connected={connected}
      title={
        connected
          ? `연결됨 (${lastUpdateTime})`
          : `연결 끊김 (${lastUpdateTime})${errorMessage ? `\n${errorMessage}` : ''}`
      }
    >
      <div className={`${styles.statusDot} ${connected ? styles.connected : styles.disconnected}`} />
      <span className={styles.statusLabel}>
        {connected ? '연결' : '끊김'}
      </span>
    </div>
  );
}
