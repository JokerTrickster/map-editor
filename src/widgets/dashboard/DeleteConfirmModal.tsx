import styles from './DeleteConfirmModal.module.css'

interface DeleteConfirmModalProps {
  isOpen: boolean
  lotName: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmModal({
  isOpen,
  lotName,
  onConfirm,
  onCancel
}: DeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className={styles.title}>Delete Parking Lot</h2>
        </div>

        <div className={styles.content}>
          <p className={styles.message}>
            Are you sure you want to delete <strong>{lotName}</strong>?
          </p>
          <p className={styles.warning}>
            This action cannot be undone. All floors, objects, and data associated with this parking lot will be permanently deleted.
          </p>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.deleteButton} onClick={onConfirm}>
            Delete Parking Lot
          </button>
        </div>
      </div>
    </div>
  )
}
