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
  const [cardinality, setCardinality] = useState<string>(initialData?.config.cardinality || '1:1')
  const [propertyKey, setPropertyKey] = useState(initialData?.config.propertyKey || '')
  const [isCustomPropertyKey, setIsCustomPropertyKey] = useState(false)

  // Auto-link settings
  const [enableAutoLink, setEnableAutoLink] = useState(!!initialData?.config.autoLink)
  const [maxDistance, setMaxDistance] = useState(initialData?.config.autoLink?.maxDistance || 200)
  const [allowDuplicates, setAllowDuplicates] = useState(initialData?.config.autoLink?.allowDuplicates || false)

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
      propertyKey,
      ...(enableAutoLink && {
        autoLink: {
          strategy: 'nearest' as const,
          maxDistance,
          allowDuplicates
        }
      })
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
            <input
              type="text"
              className={styles.input}
              value={cardinality}
              onChange={(e) => setCardinality(e.target.value)}
              placeholder='예: "1:1", "1:5", "N" (무제한)'
              pattern="^(N|1:\d+)$"
              title='형식: "N" (무제한) 또는 "1:숫자" (예: "1:1", "1:5")'
              required
            />
            <div className={styles.hint}>
              "N" = 무제한 | "1:1" = 최대 1개 | "1:5" = 최대 5개
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

          {/* Auto-link Configuration */}
          <div className={styles.field}>
            <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={enableAutoLink}
                onChange={(e) => setEnableAutoLink(e.target.checked)}
                style={{ width: 'auto', margin: 0 }}
              />
              자동 연결 활성화
            </label>
            <div className={styles.hint}>
              활성화하면 자동 관계 생성 기능을 사용할 수 있습니다
            </div>
          </div>

          {enableAutoLink && (
            <>
              <div className={styles.field}>
                <label className={styles.label}>
                  탐색 반경 (픽셀)
                </label>
                <input
                  type="number"
                  className={styles.input}
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(parseInt(e.target.value) || 200)}
                  min="50"
                  max="1000"
                  step="10"
                  placeholder="200"
                />
                <div className={styles.hint}>
                  자동 연결 시 이 반경 내에 있는 객체만 연결됩니다 (기본: 200px)
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={allowDuplicates}
                    onChange={(e) => setAllowDuplicates(e.target.checked)}
                    style={{ width: 'auto', margin: 0 }}
                  />
                  중복 연결 허용
                </label>
                <div className={styles.hint}>
                  이미 연결된 객체를 다시 연결할 수 있습니다 (일반적으로 비활성화)
                </div>
              </div>
            </>
          )}

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
