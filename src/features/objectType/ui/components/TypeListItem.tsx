/**
 * TypeListItem Component
 * Displays a single object type in the list
 */

import { type ObjectType } from '@/shared/store/objectTypeStore'

interface TypeListItemProps {
  type: ObjectType
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  typeItemClassName: string
  selectedClassName: string
  typeHeaderClassName: string
  typeNameClassName: string
  typeActionsClassName: string
  editButtonClassName: string
  deleteButtonClassName: string
}

export function TypeListItem({
  type,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  typeItemClassName,
  selectedClassName,
  typeHeaderClassName,
  typeNameClassName,
  typeActionsClassName,
  editButtonClassName,
  deleteButtonClassName
}: TypeListItemProps) {
  return (
    <div
      className={`${typeItemClassName} ${isSelected ? selectedClassName : ''}`}
      onClick={onSelect}
      title={type.name}
    >
      <div className={typeHeaderClassName}>
        {type.icon ? (
          <img
            src={type.icon}
            alt=""
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              objectFit: 'cover',
              background: '#000',
              border: '1px solid var(--local-border)'
            }}
          />
        ) : (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              background: type.color || 'var(--local-surface-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              color: 'white',
              border: type.color ? '1px solid rgba(255,255,255,0.2)' : 'none'
            }}
          >
            {!type.color && type.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className={typeNameClassName}>{type.name}</span>
      </div>

      <div className={typeActionsClassName} onClick={(e) => e.stopPropagation()}>
        <button onClick={onEdit} className={editButtonClassName} title="수정">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button onClick={onDelete} className={deleteButtonClassName} title="삭제">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
