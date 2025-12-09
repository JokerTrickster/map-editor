import { useState, useMemo, useEffect } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { dia } from '@joint/core'
import { exportGraphToJSON, downloadJSON } from '@/features/editor/lib/exportUtils'
import styles from './ExportModal.module.css'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  graph: dia.Graph | null
  lotName?: string
  floorName?: string
  floorOrder?: number
}

export function ExportModal({
  isOpen,
  onClose,
  graph,
  lotName,
  floorName,
  floorOrder
}: ExportModalProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [jsonData, setJsonData] = useState<any>(null)

  // Update JSON data when modal opens
  useEffect(() => {
    if (isOpen && graph) {
      const data = exportGraphToJSON(graph, {
        lotName,
        floorName,
        floorOrder
      })
      setJsonData(data)
    }
  }, [isOpen, graph, lotName, floorName, floorOrder])

  const jsonString = useMemo(() => {
    if (!jsonData) return ''
    return JSON.stringify(jsonData, null, 2)
  }, [jsonData])

  const handleExport = async () => {
    if (!jsonData) return

    setIsExporting(true)

    try {
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `map-${lotName || 'export'}-${floorName || 'floor'}-${timestamp}.json`

      // Download JSON file
      downloadJSON(jsonData, filename)

      // Show success message briefly
      await new Promise(resolve => setTimeout(resolve, 500))

      onClose()
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jsonString)
      alert('JSON copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('Failed to copy to clipboard')
    }
  }

  if (!graph) return null

  const objectCount = jsonData?.objects?.length || 0
  const linkCount = graph.getLinks().length

  const footer = (
    <div className={styles.footer}>
      <div className={styles.stats}>
        <span>{objectCount} objects</span>
        <span>•</span>
        <span>{linkCount} connections</span>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.secondaryBtn}
          onClick={handleCopyToClipboard}
          disabled={isExporting}
        >
          📋 Copy JSON
        </button>
        <button
          className={styles.secondaryBtn}
          onClick={onClose}
          disabled={isExporting}
        >
          Cancel
        </button>
        <button
          className={styles.primaryBtn}
          onClick={handleExport}
          disabled={isExporting || !jsonData}
        >
          {isExporting ? 'Exporting...' : '⬇ Export JSON'}
        </button>
      </div>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Map Data"
      footer={footer}
      maxWidth="1000px"
    >
      <div className={styles.container}>
        <div className={styles.description}>
          Preview the JSON data before exporting. This will download a file containing all map objects and their properties.
        </div>

        <div className={styles.preview}>
          <div className={styles.previewHeader}>
            <span className={styles.previewTitle}>JSON Preview</span>
            <span className={styles.fileSize}>
              {(new Blob([jsonString]).size / 1024).toFixed(2)} KB
            </span>
          </div>
          <pre className={styles.jsonContent}>
            <code>{jsonString}</code>
          </pre>
        </div>
      </div>
    </Modal>
  )
}
