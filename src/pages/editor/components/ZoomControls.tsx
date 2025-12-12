/**
 * ZoomControls Component
 * Displays zoom control buttons
 */

import styles from './ZoomControls.module.css'

interface ZoomControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onRotate: () => void
  onFitToScreen: () => void
}

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onRotate,
  onFitToScreen,
}: ZoomControlsProps) {
  return (
    <div className={styles.zoomControls}>
      <button onClick={onZoomOut} className={styles.toolButton} title="Zoom Out">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
      <button onClick={onZoomIn} className={styles.toolButton} title="Zoom In">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button onClick={onRotate} className={styles.toolButton} title="Rotate 90° (4번 클릭시 원상태)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
        </svg>
      </button>
      <button onClick={onFitToScreen} className={styles.toolButton} title="Fit to Screen">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      </button>
    </div>
  )
}
