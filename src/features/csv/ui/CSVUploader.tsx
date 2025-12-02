import { useCSVStore } from '../model/csvStore'
import { UploadDropzone } from './UploadDropzone'
import styles from './CSVUploader.module.css'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size exceeds 10MB limit' }
  }
  if (!file.name.endsWith('.csv')) {
    return { valid: false, error: 'Only CSV files are allowed' }
  }
  return { valid: true }
}

export function CSVUploader() {
  const { uploadState, setFile, setUploadState, clearFile, parseFile } = useCSVStore()

  const handleFileSelect = async (file: File) => {
    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      setUploadState({
        status: 'error',
        message: validation.error || 'Invalid file',
      })
      return
    }

    // Set file and start upload
    setFile(file)
    setUploadState({ status: 'uploading', progress: 0 })

    // Simulate upload progress (since we're reading locally)
    await new Promise(resolve => setTimeout(resolve, 300))
    setUploadState({ status: 'uploading', progress: 50 })
    await new Promise(resolve => setTimeout(resolve, 300))
    setUploadState({ status: 'uploading', progress: 100 })

    // Parse file
    await parseFile()
  }

  const handleClear = () => {
    clearFile()
  }

  const handleRetry = () => {
    setUploadState({ status: 'idle' })
  }

  // Idle state - show dropzone
  if (uploadState.status === 'idle') {
    return (
      <div className={styles.container}>
        <UploadDropzone onFileSelect={handleFileSelect} />
        <div className={styles.info}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>Maximum file size: 10MB</span>
        </div>
      </div>
    )
  }

  // Uploading state - show progress
  if (uploadState.status === 'uploading') {
    return (
      <div className={styles.container}>
        <div className={styles.statusCard}>
          <div className={styles.spinner} />
          <div className={styles.statusText}>
            <p className={styles.statusTitle}>Uploading file...</p>
            <p className={styles.statusDescription}>Please wait</p>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // Parsing state - show spinner
  if (uploadState.status === 'parsing') {
    return (
      <div className={styles.container}>
        <div className={styles.statusCard}>
          <div className={styles.spinner} />
          <div className={styles.statusText}>
            <p className={styles.statusTitle}>Parsing CSV data...</p>
            <p className={styles.statusDescription}>This may take a moment</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state - show error message
  if (uploadState.status === 'error') {
    return (
      <div className={styles.container}>
        <div className={`${styles.statusCard} ${styles.errorCard}`}>
          <div className={styles.errorIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className={styles.statusText}>
            <p className={styles.statusTitle}>Upload Failed</p>
            <p className={styles.statusDescription}>{uploadState.message}</p>
          </div>
          <button onClick={handleRetry} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Parsed state - show success message
  if (uploadState.status === 'parsed') {
    return (
      <div className={styles.container}>
        <div className={`${styles.statusCard} ${styles.successCard}`}>
          <div className={styles.successIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="9 12 12 15 16 10" />
            </svg>
          </div>
          <div className={styles.statusText}>
            <p className={styles.statusTitle}>CSV Loaded Successfully</p>
            <p className={styles.statusDescription}>
              {uploadState.fileName} - {uploadState.rowCount} rows
            </p>
          </div>
          <button onClick={handleClear} className={styles.clearButton}>
            Clear and Upload Another
          </button>
        </div>
      </div>
    )
  }

  return null
}
