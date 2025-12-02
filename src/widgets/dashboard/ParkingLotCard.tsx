import type { ParkingLot } from '@/shared/store'
import styles from './ParkingLotCard.module.css'

interface ParkingLotCardProps {
  lot: ParkingLot
  onEdit: (lot: ParkingLot) => void
  onDelete: (id: string) => void
  onSelect: (id: string) => void
}

export default function ParkingLotCard({
  lot,
  onEdit,
  onDelete,
  onSelect
}: ParkingLotCardProps) {
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(lot)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(lot.id)
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className={styles.card} onClick={() => onSelect(lot.id)}>
      <div className={styles.cardImage}>
        <div className={styles.placeholder}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z" />
          </svg>
        </div>
      </div>

      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{lot.name}</h3>
        </div>

        {lot.description && (
          <p className={styles.cardDescription}>{lot.description}</p>
        )}

        <div className={styles.cardMeta}>
          <span className={styles.cardDate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Created {formatDate(lot.created)}
          </span>
        </div>

        <div className={styles.cardFooter}>
          <button
            className={styles.editButton}
            onClick={handleEdit}
            title="Edit parking lot"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
          <button
            className={styles.deleteButton}
            onClick={handleDelete}
            title="Delete parking lot"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
