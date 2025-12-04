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
  hasObjectTypes: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  onFitToScreen: () => void
  onUploadClick: () => void
  onSave: () => void
  onClearCanvas: () => void
  onThemeToggle: () => void
  onLogout: () => void
  onBackToProjects: () => void
}

export function EditorHeader({
  loadedFileName,
  zoom,
  theme,
  hasObjectTypes,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToScreen,
  onUploadClick,
  onSave,
  onClearCanvas,
  onThemeToggle,
  onLogout,
  onBackToProjects,
}: EditorHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <button onClick={onBackToProjects} className={styles.backButton} title="Back to Projects">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
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

        <button onClick={onSave} className={`${styles.toolButton} ${styles.primaryButton}`} title="Save Map">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save
        </button>

        <button
          onClick={onUploadClick}
          className={styles.toolButton}
          title={hasObjectTypes ? "Upload CSV" : "객체 타입을 먼저 생성해주세요"}
          disabled={!hasObjectTypes}
          style={{
            opacity: hasObjectTypes ? 1 : 0.5,
            cursor: hasObjectTypes ? 'pointer' : 'not-allowed'
          }}
        >
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

        <button className={styles.toolButton}>Export</button>

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
