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
  mapId: string
  baseUrl?: string
}

export function SaveSuccessModal({
  isOpen,
  onClose,
  onViewerMode,
  mapId,
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
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.successIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className={styles.title}>저장 완료</h2>
          <p className={styles.description}>맵이 성공적으로 저장되었습니다.</p>
        </div>

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
              className={styles.copyButton}
            >
              {copiedShareLink ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
              {copiedShareLink ? '복사됨' : '복사'}
            </button>
          </div>
        </div>

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
              className={styles.copyButton}
            >
              {copiedEmbedCode ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
              {copiedEmbedCode ? '복사됨' : '복사'}
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          <button onClick={onViewerMode} className={styles.viewerButton}>
            뷰어 보기
          </button>
          <button onClick={onClose} className={styles.closeButton}>
            닫기
          </button>
        </div>
      </div>
    </Modal>
  )
}
