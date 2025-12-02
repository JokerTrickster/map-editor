/**
 * EditorHeader Component
 * Top header with logo, zoom controls, and action buttons
 */

import { ZoomControls } from './ZoomControls'
import styles from './EditorHeader.module.css'

interface EditorHeaderProps {
  loadedFileName: string | null
  zoom: number
  theme: 'light' | 'dark'
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  onFitToScreen: () => void
  onUploadClick: () => void
  onClearCanvas: () => void
  onThemeToggle: () => void
  onLogout: () => void
}

export function EditorHeader({
  loadedFileName,
  zoom,
  theme,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToScreen,
  onUploadClick,
  onClearCanvas,
  onThemeToggle,
  onLogout,
}: EditorHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z" />
        </svg>
        Map Editor
        {loadedFileName && (
          <span className={styles.fileName}>({loadedFileName})</span>
        )}
      </div>

      <div className={styles.toolbar}>
        <ZoomControls
          zoom={zoom}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onZoomReset={onZoomReset}
          onFitToScreen={onFitToScreen}
        />

        <div className={styles.divider} />

        <button onClick={onUploadClick} className={styles.toolButton} title="Upload CSV">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload CSV
        </button>

        <button onClick={onClearCanvas} className={styles.toolButton} title="Clear Canvas">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Clear
        </button>

        <div className={styles.divider} />

        <button className={`${styles.toolButton} ${styles.primaryButton}`}>Export</button>

        <div className={styles.divider} />

        <button onClick={onThemeToggle} className={styles.toolButton} title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}>
          {theme === 'light' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>

        <button onClick={onLogout} className={styles.toolButton} title="Logout">
          Logout
        </button>
      </div>
    </header>
  )
}
