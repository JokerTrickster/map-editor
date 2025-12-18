/**
 * DisplayModeToggle - Toggle between single and multi-floor display modes
 */

import { DisplayMode } from '@/shared/store';
import styles from './DisplayModeToggle.module.css';

export interface DisplayModeToggleProps {
  mode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
  disabled?: boolean;
}

export function DisplayModeToggle({
  mode,
  onChange,
  disabled = false,
}: DisplayModeToggleProps) {
  return (
    <div className={styles.container}>
      <label className={styles.label}>표시 모드</label>
      <div className={styles.buttonGroup}>
        <button
          className={`${styles.button} ${mode === 'single' ? styles.active : ''}`}
          onClick={() => onChange('single')}
          disabled={disabled}
          aria-label="Single floor mode"
        >
          단일
        </button>
        <button
          className={`${styles.button} ${mode === 'multi' ? styles.active : ''}`}
          onClick={() => onChange('multi')}
          disabled={disabled}
          aria-label="Multi floor mode"
        >
          다중
        </button>
      </div>
    </div>
  );
}
