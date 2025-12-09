/**
 * RelationTypeManager Component
 * Form for adding/editing relation types
 */

import { useState, useEffect } from 'react'
import { TemplateRelationType } from '@/entities/schema/templateSchema'
import { useObjectTypeStore } from '@/shared/store/objectTypeStore'
import styles from './RelationTypeManager.module.css'

interface RelationTypeManagerProps {
  template?: any
  initialData?: {
    key: string
    config: TemplateRelationType
  }
  onSave: (key: string, config: TemplateRelationType) => void
  onCancel: () => void
}

export function RelationTypeManager({
  template,
  initialData,
  onSave,
  onCancel
}: RelationTypeManagerProps) {
  const objectTypes = useObjectTypeStore(state => state.types)

  const [key, setKey] = useState(initialData?.key || '')
  const [name, setName] = useState(initialData?.config.name || '')
  const [description, setDescription] = useState(initialData?.config.description || '')
  const [sourceType, setSourceType] = useState(initialData?.config.sourceType || '')
  const [targetType, setTargetType] = useState(initialData?.config.targetType || '')
  const [cardinality, setCardinality] = useState<'1:1' | '1:N'>(initialData?.config.cardinality || '1:N')
  const [propertyKey, setPropertyKey] = useState(initialData?.config.propertyKey || '')
  const [isCustomPropertyKey, setIsCustomPropertyKey] = useState(false)

  const isEditMode = !!initialData

  // Get available property keys from source type
  const getAvailablePropertyKeys = (): string[] => {
    if (!sourceType) return []

    const keys = new Set<string>()

    // From template objectTypes
    if (template?.objectTypes?.[sourceType]?.defaultProperties) {
      Object.keys(template.objectTypes[sourceType].defaultProperties).forEach(k => keys.add(k))
    }

    // From objectTypeStore
    const storeType = objectTypes.find(t => t.id === sourceType || t.name === template?.objectTypes?.[sourceType]?.displayName)
    if (storeType) {
      storeType.properties.forEach(p => keys.add(p.key))
    }

    return Array.from(keys).filter(k => k.trim() !== '')
  }

  const availablePropertyKeys = getAvailablePropertyKeys()

  // Get available object types from template
  const templateObjectTypes = template?.objectTypes ? Object.entries(template.objectTypes).map(([id, type]: [string, any]) => ({
    id,
    name: type.displayName || id
  })) : []

  // Auto-generate key based on inputs
  useEffect(() => {
    if (!isEditMode && sourceType && targetType) {
      const generatedKey = `${sourceType}_to_${targetType}`.toLowerCase()
      setKey(generatedKey)
    }
  }, [sourceType, targetType, isEditMode])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!key || !name || !sourceType || !targetType || !propertyKey) {
      alert('모든 필수 항목을 입력해주세요.')
      return
    }

    const config: TemplateRelationType = {
      name,
      description,
      sourceType,
      targetType,
      cardinality,
      propertyKey
    }

    onSave(key, config)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            {isEditMode ? '관계 편집' : '새 관계 추가'}
          </h3>
          <button className={styles.closeButton} onClick={onCancel}>
            ✕
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>
              관계 이름 <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: CCTV Monitoring"
              required
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>
                출발 타입 <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.select}
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                required
              >
                <option value="">선택하세요</option>
                {templateObjectTypes.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                도착 타입 <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.select}
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                required
              >
                <option value="">선택하세요</option>
                {templateObjectTypes.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Cardinality <span className={styles.required}>*</span>
            </label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="cardinality"
                  value="1:1"
                  checked={cardinality === '1:1'}
                  onChange={(e) => setCardinality(e.target.value as '1:1' | '1:N')}
                />
                <span>1:1 (하나만)</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="cardinality"
                  value="1:N"
                  checked={cardinality === '1:N'}
                  onChange={(e) => setCardinality(e.target.value as '1:1' | '1:N')}
                />
                <span>1:N (여러개)</span>
              </label>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>설명</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="관계에 대한 설명을 입력하세요"
              rows={2}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Property Key <span className={styles.required}>*</span>
            </label>
            {isCustomPropertyKey ? (
              <div>
                <input
                  type="text"
                  className={styles.input}
                  value={propertyKey}
                  onChange={(e) => setPropertyKey(e.target.value)}
                  placeholder="커스텀 키 입력"
                  required
                />
                <button
                  type="button"
                  className={styles.switchButton}
                  onClick={() => {
                    setIsCustomPropertyKey(false)
                    setPropertyKey('')
                  }}
                  style={{ marginTop: '4px', fontSize: '12px' }}
                >
                  ← 기존 속성 선택
                </button>
              </div>
            ) : (
              <select
                className={styles.select}
                value={propertyKey}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setIsCustomPropertyKey(true)
                    setPropertyKey('')
                  } else {
                    setPropertyKey(e.target.value)
                  }
                }}
                required
              >
                <option value="">선택하세요</option>
                {availablePropertyKeys.map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
                <option value="__custom__">+ 커스텀 입력</option>
              </select>
            )}
            <div className={styles.hint}>
              {sourceType ? (
                <>
                  <strong>{template?.objectTypes?.[sourceType]?.displayName || sourceType}</strong> 객체의 properties에 저장됨
                </>
              ) : (
                '출발 타입 객체의 properties에 저장될 키 이름'
              )}
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={onCancel}>
              취소
            </button>
            <button type="submit" className={styles.saveButton}>
              {isEditMode ? '저장' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
