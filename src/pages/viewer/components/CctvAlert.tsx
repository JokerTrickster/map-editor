/**
 * CCTV Disconnection Alert Component
 * Shows a warning popup when CCTVs are disconnected
 */

import { useState, useEffect } from 'react'
import { useStatusStore } from '@/features/status'
import styles from './CctvAlert.module.css'

export function CctvAlert() {
  const { cctvStatuses } = useStatusStore()
  const [isVisible, setIsVisible] = useState(false)
  const [disconnectedCctvs, setDisconnectedCctvs] = useState<Array<{ id: string; error: string }>>([])

  useEffect(() => {
    // Find all disconnected CCTVs
    const disconnected = Object.entries(cctvStatuses)
      .filter(([_, status]) => !status.connected)
      .map(([id, status]) => ({
        id,
        error: status.errorMessage || '연결 끊김'
      }))

    setDisconnectedCctvs(disconnected)
    setIsVisible(disconnected.length > 0)
  }, [cctvStatuses])

  if (!isVisible || disconnectedCctvs.length === 0) {
    return null
  }

  return (
    <div className={styles.alertContainer}>
      <div className={styles.alert}>
        <div className={styles.alertHeader}>
          <div className={styles.alertIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className={styles.alertTitle}>
            <h3>CCTV 연결 끊김</h3>
            <p>{disconnectedCctvs.length}대의 CCTV가 연결되지 않았습니다</p>
          </div>
          <button onClick={() => setIsVisible(false)} className={styles.closeButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className={styles.alertBody}>
          <ul className={styles.cctvList}>
            {disconnectedCctvs.map(({ id, error }) => (
              <li key={id} className={styles.cctvItem}>
                <div className={styles.cctvIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <div className={styles.cctvInfo}>
                  <span className={styles.cctvId}>{id}</span>
                  <span className={styles.cctvError}>{error}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
