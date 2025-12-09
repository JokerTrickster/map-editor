/**
 * TypeListItem Component
 * Displays a single object type in the list
 */

import { useState, useRef, useEffect } from 'react'
import { type ObjectType } from '@/shared/store/objectTypeStore'

interface TypeListItemProps {
  type: ObjectType
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onPriorityChange?: (typeId: string, priority: number) => void
  onColorChange?: (typeId: string, color: string) => void
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
  onPriorityChange,
  onColorChange,
  typeItemClassName,
  selectedClassName,
  typeHeaderClassName,
  typeNameClassName,
  typeActionsClassName,
  editButtonClassName,
  deleteButtonClassName
}: TypeListItemProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const colorPickerRef = useRef<HTMLDivElement>(null)

  // Check if icon is a URL (starts with / or http) or a color code (starts with #)
  const isIconUrl = type.icon && (type.icon.startsWith('/') || type.icon.startsWith('http'))
  const isColorCode = type.icon && type.icon.startsWith('#')

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false)
      }
    }

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showColorPicker])

  const handleColorClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onColorChange && !isIconUrl) {
      setShowColorPicker(!showColorPicker)
    }
  }

  const handleColorChange = (color: string) => {
    if (onColorChange) {
      onColorChange(type.id, color)
      setShowColorPicker(false)
    }
  }

  return (
    <div
      className={`${typeItemClassName} ${isSelected ? selectedClassName : ''}`}
      onClick={onSelect}
      title={type.name}
    >
      <div className={typeHeaderClassName}>
        {isIconUrl ? (
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
          <div style={{ position: 'relative' }}>
            <div
              onClick={handleColorClick}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                background: isColorCode ? type.icon : (type.color || 'var(--local-surface-hover)'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                color: 'white',
                border: (isColorCode || type.color) ? '1px solid rgba(255,255,255,0.2)' : 'none',
                cursor: onColorChange ? 'pointer' : 'default',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => {
                if (onColorChange) e.currentTarget.style.transform = 'scale(1.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
              title={onColorChange ? '색상 변경' : undefined}
            >
              {!isColorCode && !type.color && type.name.charAt(0).toUpperCase()}
            </div>

            {showColorPicker && onColorChange && (
              <div
                ref={colorPickerRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  marginTop: '8px',
                  background: 'var(--local-surface)',
                  border: '1px solid var(--local-border)',
                  borderRadius: '8px',
                  padding: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  zIndex: 1000
                }}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: '6px',
                  marginBottom: '8px'
                }}>
                  {[
                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
                    '#06B6D4', '#84CC16', '#F97316', '#DC2626', '#7C3AED', '#DB2777',
                    '#0EA5E9', '#22C55E', '#FACC15', '#F87171', '#A78BFA', '#F472B6',
                    '#6366F1', '#14B8A6', '#FDE047', '#FCA5A5', '#C4B5FD', '#FBCFE8'
                  ].map(color => (
                    <div
                      key={color}
                      onClick={() => handleColorChange(color)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '4px',
                        background: color,
                        cursor: 'pointer',
                        border: type.color === color ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={type.color || '#3B82F6'}
                  onChange={(e) => handleColorChange(e.target.value)}
                  style={{
                    width: '100%',
                    height: '32px',
                    border: '1px solid var(--local-border)',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
              </div>
            )}
          </div>
        )}
        <span className={typeNameClassName}>{type.name}</span>
        {type.priority !== undefined && (
          <span style={{
            marginLeft: '8px',
            fontSize: '11px',
            color: 'var(--local-text-secondary)',
            background: 'var(--local-surface-hover)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            Z:{type.priority}
          </span>
        )}
      </div>

      <div className={typeActionsClassName} onClick={(e) => e.stopPropagation()}>
        {onPriorityChange && (
          <input
            type="number"
            min="1"
            max="9"
            value={type.priority ?? 5}
            onChange={(e) => onPriorityChange(type.id, parseInt(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '40px',
              padding: '4px',
              fontSize: '12px',
              textAlign: 'center',
              background: 'var(--local-surface)',
              border: '1px solid var(--local-border)',
              borderRadius: '4px',
              color: 'var(--local-text)'
            }}
            title="우선순위 (1=아래, 9=위)"
          />
        )}
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
