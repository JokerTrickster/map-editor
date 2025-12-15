import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore, type ParkingLot } from '@/shared/store'
import { useObjectTypeStore } from '@/shared/store/objectTypeStore'
import ParkingLotCard from '@/widgets/dashboard/ParkingLotCard'
import CreateLotModal from '@/widgets/dashboard/CreateLotModal'
import DeleteConfirmModal from '@/widgets/dashboard/DeleteConfirmModal'
import { TemplateSelectModal, loadTemplate, type TemplateId } from '@/features/template'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { lots, createLot, updateLot, deleteLot, setCurrentLot, applyTemplate } = useProjectStore()
  const { setCurrentLot: setObjectTypeLot, addTypes, clearTypes } = useObjectTypeStore()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingLot, setEditingLot] = useState<ParkingLot | null>(null)
  const [deletingLotId, setDeletingLotId] = useState<string | null>(null)
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    navigate('/login')
  }

  const handleCreateNew = () => {
    setEditingLot(null)
    setError(null)
    setIsCreateModalOpen(true)
  }

  const handleEdit = (lot: ParkingLot) => {
    setEditingLot(lot)
    setError(null)
    setIsCreateModalOpen(true)
  }

  const handleDeleteClick = (id: string) => {
    setDeletingLotId(id)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (deletingLotId) {
      try {
        deleteLot(deletingLotId)
        setIsDeleteModalOpen(false)
        setDeletingLotId(null)
      } catch (err) {
        console.error('Failed to delete parking lot:', err)
        setError('Failed to delete parking lot. Please try again.')
      }
    }
  }

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false)
    setDeletingLotId(null)
  }

  const handleSubmit = (data: { name: string; description?: string }) => {
    try {
      if (editingLot) {
        // Update existing lot
        updateLot(editingLot.id, data)
        setIsCreateModalOpen(false)
        setEditingLot(null)
        setError(null)
      } else {
        // Create new lot and open template selection
        const newLot = createLot(data)
        setCreatedProjectId(newLot.id)
        setIsCreateModalOpen(false)
        setError(null)
        // Open template selection modal
        setIsTemplateModalOpen(true)
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    }
  }

  const handleTemplateSelect = async (templateId: string) => {
    if (!createdProjectId) return

    try {
      // Load template
      const template = await loadTemplate(templateId as TemplateId)

      // Apply template to project
      applyTemplate(createdProjectId, template)

      // Set current lot in ObjectType store
      setObjectTypeLot(createdProjectId)

      // Clear existing object types
      clearTypes()

      // Convert template object types to ObjectType format and add them
      if (template.objectTypes) {
        const objectTypesToAdd = Object.entries(template.objectTypes).map(([, typeData]) => {
          const properties = Object.entries(typeData.defaultProperties || {}).map(([propKey, propValue]) => {
            let propType: 'string' | 'number' | 'boolean' | 'array'
            if (Array.isArray(propValue)) {
              propType = 'array'
            } else {
              const valueType = typeof propValue
              propType = (valueType === 'string' || valueType === 'number' || valueType === 'boolean')
                ? valueType
                : 'string'
            }

            return {
              key: propKey,
              type: propType,
              required: false,
              defaultValue: propValue,
            }
          })

          return {
            name: typeData.displayName,
            icon: typeData.icon,
            color: typeData.defaultStyle?.color || '#000000',
            priority: (typeData as any).priority ?? 5,
            properties,
          }
        })

        addTypes(objectTypesToAdd)
      }

      // Navigate to editor
      setCurrentLot(createdProjectId)
      setIsTemplateModalOpen(false)
      setCreatedProjectId(null)
      navigate('/editor')
    } catch (err) {
      console.error('Failed to apply template:', err)
      setError('Failed to apply template. Please try again.')
      setIsTemplateModalOpen(false)
    }
  }

  const handleTemplateModalClose = () => {
    // If user closes template modal without selecting, delete the created project
    if (createdProjectId) {
      deleteLot(createdProjectId)
      setCreatedProjectId(null)
    }
    setIsTemplateModalOpen(false)
  }

  const handleSelectLot = (lotId: string) => {
    try {
      // Set current lot in project store
      setCurrentLot(lotId)

      // Set current lot in ObjectType store to load project-specific types and mappings
      setObjectTypeLot(lotId)

      navigate('/editor')
    } catch (err) {
      console.error('Failed to select parking lot:', err)
      setError('Failed to open parking lot. Please try again.')
    }
  }

  const handleViewLot = (lotId: string) => {
    navigate(`/viewer/${lotId}`)
  }

  const handleCloseModal = () => {
    setIsCreateModalOpen(false)
    setEditingLot(null)
    setError(null)
  }

  const deletingLot = deletingLotId ? lots.find((l) => l.id === deletingLotId) : null

  // Sort lots by creation date (newest first)
  const sortedLots = [...lots].sort((a, b) => {
    const dateA = new Date(a.created).getTime()
    const dateB = new Date(b.created).getTime()
    return dateB - dateA // Descending order (newest first)
  })

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z" />
          </svg>
          Map Editor
        </div>

        <nav className={styles.nav}>
          <a href="#" className={`${styles.navItem} ${styles.navItemActive}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Dashboard
          </a>
        </nav>

        <div className={styles.userProfile}>
          <div className={styles.avatar}>U</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>User</div>
            <div className={styles.userEmail}>user@example.com</div>
          </div>
          <button
            onClick={handleLogout}
            className={styles.logoutButton}
            title="Logout"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Parking Lot Projects</h1>
            <p className={styles.subtitle}>
              {lots.length === 0
                ? 'Create your first parking lot project'
                : lots.length === 1
                ? '1 project'
                : `${lots.length} projects`}
            </p>
          </div>
          <button className={styles.createButton} onClick={handleCreateNew}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Project
          </button>
        </header>

        {/* Error Message */}
        {error && !isCreateModalOpen && (
          <div className={styles.errorBanner}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
            <button onClick={() => setError(null)} className={styles.errorClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Empty State or Project Grid */}
        {lots.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z" />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>No projects yet</h2>
            <p className={styles.emptyDescription}>
              Create your first parking lot project to get started with the map editor.
            </p>
            <button className={styles.emptyButton} onClick={handleCreateNew}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {sortedLots.map((lot) => (
              <ParkingLotCard
                key={lot.id}
                lot={lot}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onSelect={handleSelectLot}
                onView={handleViewLot}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateLotModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        editingLot={editingLot}
        onSubmit={handleSubmit}
        error={error}
      />

      <TemplateSelectModal
        isOpen={isTemplateModalOpen}
        onClose={handleTemplateModalClose}
        onSelect={handleTemplateSelect}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        lotName={deletingLot?.name || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  )
}
