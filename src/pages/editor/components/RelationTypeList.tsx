/**
 * RelationTypeList Component
 * Displays and manages relation types with CRUD operations
 */

import { useState } from 'react'
import { TemplateRelationType } from '@/entities/schema/templateSchema'
import styles from './RelationTypeList.module.css'

interface RelationTypeListProps {
  relationTypes: Record<string, TemplateRelationType>
  template?: any
  templateRelationKeys: Set<string>
  onAdd: () => void
  onEdit: (key: string) => void
  onDelete: (key: string) => void
}

export function RelationTypeList({
  relationTypes,
  template,
  templateRelationKeys,
  onAdd,
  onEdit,
  onDelete
}: RelationTypeListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleDelete = (key: string) => {
    if (deleteConfirm === key) {
      onDelete(key)
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(key)
      // Auto-cancel after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  if (!relationTypes || Object.keys(relationTypes).length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyMessage}>관계 타입이 없습니다</p>
        <button className={styles.addButton} onClick={onAdd}>
          + 새 관계 추가
        </button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>관계 리스트</span>
        <button className={styles.addButton} onClick={onAdd}>
          + 새 관계
        </button>
      </div>

      <div className={styles.list}>
        {Object.entries(relationTypes).map(([key, config]) => {
          const sourceTypeName = template?.objectTypes?.[config.sourceType]?.displayName || config.sourceType
          const targetTypeName = template?.objectTypes?.[config.targetType]?.displayName || config.targetType
          const relationName = config.name || config.description || key
          const isDeleting = deleteConfirm === key
          const isTemplate = templateRelationKeys.has(key)

          return (
            <div key={key} className={styles.relationCard}>
              <div className={styles.relationMain}>
                <div className={styles.relationFlow}>
                  <span className={styles.sourceType}>{sourceTypeName}</span>
                  <span className={styles.arrow}>→</span>
                  <span className={styles.targetType}>{targetTypeName}</span>
                  {isTemplate && (
                    <span className={styles.templateBadge}>템플릿</span>
                  )}
                </div>
                <div className={styles.relationInfo}>
                  <span className={styles.relationName}>{relationName}</span>
                  {config.cardinality && (
                    <span className={styles.cardinality}>{config.cardinality}</span>
                  )}
                </div>
                {config.description && (
                  <div className={styles.description}>{config.description}</div>
                )}
              </div>

              {!isTemplate && (
                <div className={styles.actions}>
                  <button
                    className={styles.editButton}
                    onClick={() => onEdit(key)}
                    title="편집"
                  >
                    ✏️
                  </button>
                  <button
                    className={`${styles.deleteButton} ${isDeleting ? styles.deleteConfirm : ''}`}
                    onClick={() => handleDelete(key)}
                    title={isDeleting ? '다시 클릭하여 삭제 확인' : '삭제'}
                  >
                    {isDeleting ? '확인?' : '🗑️'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
