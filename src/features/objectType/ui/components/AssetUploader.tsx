/**
 * AssetUploader Component
 * Handles asset file upload with preview
 */

import { ChangeEvent } from 'react'

interface AssetUploaderProps {
  previewUrl: string | null
  assetFileName?: string
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void
  onRemove: (e: React.MouseEvent) => void
  fileInputRef: React.RefObject<HTMLInputElement>
}

export function AssetUploader({
  previewUrl,
  assetFileName,
  onFileChange,
  onRemove,
  fileInputRef
}: AssetUploaderProps) {
  // Check if previewUrl is an actual image URL or a color code
  const isActualImage = previewUrl && !previewUrl.startsWith('#')

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      style={{
        marginBottom: '16px',
        border: '2px dashed var(--local-border)',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center',
        cursor: 'pointer',
        background: 'var(--local-surface)'
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
      {isActualImage ? (
        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <img
            src={previewUrl}
            alt="Preview"
            style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '6px' }}
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,0,0,0.6)',
            padding: '4px 8px',
            borderRadius: '12px'
          }}>
            <span style={{ color: 'white', fontSize: '11px' }}>
              {assetFileName || '이미지'}
            </span>
            <button
              onClick={onRemove}
              style={{
                background: 'none',
                border: 'none',
                color: '#ff6b6b',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '0 4px'
              }}
            >
              ×
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          color: 'var(--local-text-secondary)',
          fontSize: '13px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '20px' }}>📁</span>
          <span>클릭하여 아이콘/이미지 업로드</span>
          <span style={{ fontSize: '11px', opacity: 0.7 }}>
            (아이콘이 없으면 색상을 선택할 수 있습니다)
          </span>
        </div>
      )}
    </div>
  )
}
