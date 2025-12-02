import { useState, useEffect } from 'react'
import type { ParkingLot } from '@/shared/store'
import styles from './CreateLotModal.module.css'

interface CreateLotModalProps {
  isOpen: boolean
  onClose: () => void
  editingLot?: ParkingLot | null
  onSubmit: (data: { name: string; description?: string }) => void
  error?: string | null
}

export default function CreateLotModal({
  isOpen,
  onClose,
  editingLot,
  onSubmit,
  error
}: CreateLotModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && editingLot) {
      setName(editingLot.name)
      setDescription(editingLot.description || '')
    } else if (!isOpen) {
      setName('')
      setDescription('')
      setLocalError(null)
    }
  }, [isOpen, editingLot])

  useEffect(() => {
    if (error) {
      setLocalError(error)
    }
  }, [error])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    // Validate name
    if (!name.trim()) {
      setLocalError('Project name is required')
      return
    }

    onSubmit({ name: name.trim(), description: description.trim() || undefined })
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setLocalError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {editingLot ? 'Edit Parking Lot' : 'Create New Parking Lot'}
          </h2>
          <button className={styles.closeButton} onClick={handleClose} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.content}>
            {localError && (
              <div className={styles.errorMessage}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {localError}
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>
                Project Name <span className={styles.required}>*</span>
              </label>
              <input
                id="name"
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Building A Parking"
                autoFocus
                maxLength={100}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="description" className={styles.label}>
                Description (Optional)
              </label>
              <textarea
                id="description"
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this parking lot..."
                rows={4}
                maxLength={500}
              />
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelButton} onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitButton}>
              {editingLot ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
