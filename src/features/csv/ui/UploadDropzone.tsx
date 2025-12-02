import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import styles from './UploadDropzone.module.css'

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
  accept?: string
}

export function UploadDropzone({ onFileSelect, disabled = false, accept = '.csv' }: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      onFileSelect(files[0])
    }
  }

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0])
    }
  }

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div
      className={`${styles.dropzone} ${isDragOver ? styles.dragOver : ''} ${disabled ? styles.disabled : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div className={styles.uploadIcon}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <div className={styles.text}>
        {isDragOver ? (
          <p className={styles.dragOverText}>Drop file to upload</p>
        ) : (
          <>
            <p className={styles.primaryText}>Drag & drop CSV file here</p>
            <p className={styles.secondaryText}>or click to browse</p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInput}
        style={{ display: 'none' }}
        disabled={disabled}
      />
    </div>
  )
}
