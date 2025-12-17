/**
 * SaveSuccessModal Component
 * Modal shown after successful map save with share links
 */

import { useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import styles from './SaveSuccessModal.module.css'

interface SaveSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  onViewerMode: () => void
  onDashboard: () => void
  mapId: string
  thumbnail?: string | null
  baseUrl?: string
}

export function SaveSuccessModal({
  isOpen,
  onClose,
  onViewerMode,
  onDashboard,
  mapId,
  thumbnail,
  baseUrl = window.location.origin,
}: SaveSuccessModalProps) {
  const [copiedShareLink, setCopiedShareLink] = useState(false)
  const [copiedEmbedCode, setCopiedEmbedCode] = useState(false)

  const shareUrl = `${baseUrl}/viewer/${mapId}`
  const embedUrl = `${baseUrl}/embed/${mapId}`
  const embedCode = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>`

  const copyToClipboard = async (text: string, type: 'share' | 'embed') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'share') {
        setCopiedShareLink(true)
        setTimeout(() => setCopiedShareLink(false), 2000)
      } else {
        setCopiedEmbedCode(true)
        setTimeout(() => setCopiedEmbedCode(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="540px">
      <div className={styles.container}>
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.successIcon}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className={styles.title}>저장 완료</h2>
          <p className={styles.description}>맵이 성공적으로 저장되었습니다.</p>
        </div>

        {/* Thumbnail Section */}
        {thumbnail && (
          <div className={styles.thumbnailSection}>
            <div className={styles.thumbnailWrapper}>
              <img src={thumbnail} alt="Map Thumbnail" className={styles.thumbnail} />
            </div>
          </div>
        )}

        {/* Share & Embed Section */}
        <div className={styles.linksContainer}>
          {/* Share Link */}
          <div className={styles.linkSection}>
            <label className={styles.label}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              공유 링크
            </label>
            <div className={styles.linkBox}>
              <input
                type="text"
                value={shareUrl}
                readOnly
                className={styles.linkInput}
              />
              <button
                onClick={() => copyToClipboard(shareUrl, 'share')}
                className={`${styles.copyButton} ${copiedShareLink ? styles.copied : ''}`}
              >
                {copiedShareLink ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    복사됨
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    복사
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Embed Code */}
          <div className={styles.linkSection}>
            <label className={styles.label}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              임베드 코드
            </label>
            <div className={styles.linkBox}>
              <input
                type="text"
                value={embedCode}
                readOnly
                className={styles.linkInput}
              />
              <button
                onClick={() => copyToClipboard(embedCode, 'embed')}
                className={`${styles.copyButton} ${copiedEmbedCode ? styles.copied : ''}`}
              >
                {copiedEmbedCode ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    복사됨
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    복사
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button onClick={onViewerMode} className={styles.viewerButton}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            뷰어 보기
          </button>
          <button onClick={onDashboard} className={styles.dashboardButton}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>대시보드</span>
          </button>
          <button onClick={onClose} className={styles.closeButton}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>닫기</span>
          </button>
        </div>
      </div>
    </Modal>
  )
}
