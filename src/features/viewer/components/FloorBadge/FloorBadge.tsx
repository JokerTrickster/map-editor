/**
 * FloorBadge - Small overlay badge displaying floor information
 * Shows floor name, object count, and status indicator
 */

import { Floor } from '@/shared/store';
import styles from './FloorBadge.module.css';

export interface FloorBadgeProps {
  floor: Floor;
  objectCount?: number;
  statusSummary?: 'ok' | 'warning' | 'error' | 'inactive';
}

export function FloorBadge({
  floor,
  objectCount,
  statusSummary = 'inactive',
}: FloorBadgeProps) {
  // Calculate object count if not provided
  const count = objectCount !== undefined
    ? objectCount
    : floor.mapData?.objects?.length || 0;

  return (
    <div className={styles.badge}>
      <div className={styles.name}>
        {floor.name}
        <span className={`${styles.statusDot} ${styles[statusSummary]}`} />
      </div>
      <div className={styles.meta}>
        {count} objects
      </div>
    </div>
  );
}
