/**
 * Object Type Sidebar
 * Manages object type definitions (CCTV, Charger, ParkingSpot, etc.)
 */

import { useState, useRef, ChangeEvent } from 'react'
import { useObjectTypeStore, type ObjectType, type Property } from '@/shared/store/objectTypeStore'
import styles from './ObjectTypeSidebar.module.css'

interface ObjectTypeSidebarProps {
  onObjectCreate?: (data: any) => void // Keeping generic for now or remove if unused
  onSelectType?: (type: ObjectType | null) => void
  selectedTypeId?: string | null
}

export function ObjectTypeSidebar({ onSelectType, selectedTypeId }: ObjectTypeSidebarProps) {
  const types = useObjectTypeStore(state => state.types)
  const addType = useObjectTypeStore(state => state.addType)
  const updateType = useObjectTypeStore(state => state.updateType)
  const deleteType = useObjectTypeStore(state => state.deleteType)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState<{
    name: string
    icon: string
    properties: { key: string; type: Property['type']; required: boolean }[]
  }>({
    name: '',
    icon: '',
    properties: [
      { key: 'position', type: 'string', required: false },
      { key: 'description', type: 'string', required: false },
      { key: 'points', type: 'array', required: false },
    ],
  })
  const [assetFile, setAssetFile] = useState<File | undefined>(undefined)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showJson, setShowJson] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setAssetFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setFormData(prev => ({ ...prev, icon: URL.createObjectURL(file) }))
    }
  }

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setAssetFile(undefined)
    setPreviewUrl(null)
    setFormData(prev => ({ ...prev, icon: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAdd = () => {
    try {
      setError(null)
      if (!formData.name.trim()) {
        setError('타입명을 입력하세요')
        return
      }

      addType({
        name: formData.name.trim(),
        icon: formData.icon,
        properties: formData.properties,
      })

      setFormData({ name: '', icon: '', properties: [] })
      setAssetFile(undefined)
      setPreviewUrl(null)
      setShowAddForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '타입 추가 실패')
    }
  }

  const handleUpdate = (id: string) => {
    try {
      setError(null)
      if (!formData.name.trim()) {
        setError('타입명을 입력하세요')
        return
      }

      updateType(id, {
        name: formData.name.trim(),
        icon: formData.icon,
        properties: formData.properties,
      })

      setEditingId(null)
      setFormData({ name: '', icon: '', properties: [] })
      setAssetFile(undefined)
      setPreviewUrl(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '타입 수정 실패')
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('이 객체 타입을 삭제하시겠습니까?')) {
      deleteType(id)
    }
  }

  const startEdit = (type: ObjectType) => {
    setEditingId(type.id)
    setFormData({
      name: type.name,
      icon: type.icon || '',
      properties: [...type.properties],
    })
    if (type.icon) {
      setPreviewUrl(type.icon)
    } else {
      setPreviewUrl(null)
    }
    setAssetFile(undefined)
    setShowAddForm(false)
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setShowAddForm(false)
    setFormData({ name: '', icon: '', properties: [] })
    setAssetFile(undefined)
    setPreviewUrl(null)
    setError(null)
  }

  const addProperty = () => {
    setFormData({
      ...formData,
      properties: [
        ...formData.properties,
        { key: '', type: 'string', required: false },
      ],
    })
  }

  const updateProperty = (index: number, updates: Partial<Property>) => {
    const newProperties = [...formData.properties]
    newProperties[index] = { ...newProperties[index], ...updates }
    setFormData({ ...formData, properties: newProperties })
  }

  const removeProperty = (index: number) => {
    setFormData({
      ...formData,
      properties: formData.properties.filter((_, i) => i !== index),
    })
  }

  const getZeroValue = (type: Property['type']) => {
    switch (type) {
      case 'string': return ""
      case 'number': return 0
      case 'boolean': return false
      case 'array': return []
      default: return null
    }
  }

  const getPreviewData = () => {
    const preview: Record<string, any> = {
      name: formData.name,
      icon: formData.icon ? '(Asset URL)' : '',
    }

    formData.properties.forEach(prop => {
      if (prop.key) {
        preview[prop.key] = getZeroValue(prop.type)
      }
    })

    return preview
  }

  const renderForm = (isEditing: boolean) => (
    <div className={styles.form}>
      {/* ... (existing inputs) ... */}
      <input
        type="text"
        placeholder="타입명 (예: CCTV)"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        className={styles.input}
      />

      {/* Asset Upload Area */}
      <div
        className={styles.fileUploadArea}
        onClick={() => fileInputRef.current?.click()}
        style={{ marginBottom: '16px', border: '2px dashed var(--local-border)', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: 'var(--local-surface)' }}
      >
        <input
          type="file"
          ref={fileInputRef}
          className={styles.fileInput}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: 'none' }}
        />
        {previewUrl ? (
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '6px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '12px' }}>
              <span style={{ color: 'white', fontSize: '11px' }}>{assetFile?.name || '이미지'}</span>
              <button
                onClick={removeFile}
                style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}
              >
                ×
              </button>
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--local-text-secondary)', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📁</span>
            <span>클릭하여 아이콘/이미지 업로드</span>
          </div>
        )}
      </div>

      {/* Properties */}
      <div className={styles.properties}>
        <div className={styles.propertiesHeader}>
          <span>속성</span>
          <button onClick={addProperty} className={styles.smallButton}>
            + 속성 추가
          </button>
        </div>

        {formData.properties.map((prop, index) => (
          <div key={index} className={styles.property}>
            <input
              type="text"
              placeholder="키"
              value={prop.key}
              onChange={(e) =>
                updateProperty(index, { key: e.target.value })
              }
              className={styles.propertyInput}
            />
            <select
              value={prop.type}
              onChange={(e) =>
                updateProperty(index, {
                  type: e.target.value as Property['type'],
                })
              }
              className={styles.propertySelect}
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="array">Array</option>
            </select>
            <button
              onClick={() => removeProperty(index)}
              className={styles.removeButton}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className={styles.formActions}>
        <button onClick={isEditing ? () => handleUpdate(editingId!) : handleAdd} className={styles.saveButton}>
          저장
        </button>
        <button onClick={cancelEdit} className={styles.cancelButton}>
          취소
        </button>
      </div>

      {/* JSON Preview Toggle */}
      <div style={{ marginTop: '16px' }}>
        <button
          onClick={() => setShowJson(!showJson)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--local-primary)',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '0'
          }}
        >
          {showJson ? '▼' : '▶'} JSON 미리보기
        </button>

        {showJson && (
          <div className={styles.jsonPreview}>
            <pre className={styles.jsonContent}>
              {JSON.stringify(getPreviewData(), null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )

  // ... (inside ObjectTypeSidebar)

  const handleShowAddForm = () => {
    setFormData({
      name: '',
      icon: '',
      properties: [
        { key: 'position', type: 'string', required: false },
        { key: 'description', type: 'string', required: false },
        { key: 'points', type: 'array', required: false },
      ],
    })
    setAssetFile(undefined)
    setPreviewUrl(null)
    setShowAddForm(true)
    setError(null)
  }

  // ... (keep other handlers)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>객체 타입</h3>
        {!showAddForm && !editingId && (
          <button
            className={styles.addButton}
            onClick={handleShowAddForm}
          >
            + 추가
          </button>
        )}
      </div>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {/* Add Form */}
      {showAddForm && renderForm(false)}

      {/* Type List */}
      <div className={styles.typeList}>
        {types.map((type) => (
          <div
            key={type.id}
            className={`${styles.typeItem} ${selectedTypeId === type.id ? styles.selected : ''}`}
            onClick={() => onSelectType?.(type)}
            style={{ cursor: 'pointer', borderColor: selectedTypeId === type.id ? 'var(--local-primary)' : undefined }}
          >
            {editingId === type.id ? (
              renderForm(true)
            ) : (
              /* View Mode */
              <div className={styles.typeHeader} style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {type.icon ? (
                    <img src={type.icon} alt="" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover', background: '#000' }} />
                  ) : (
                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: 'var(--local-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                      T
                    </div>
                  )}
                  <span className={styles.typeName}>{type.name}</span>
                </div>
                <div className={styles.typeActions} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => startEdit(type)}
                    className={styles.editButton}
                    title="수정"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(type.id)}
                    className={styles.deleteButton}
                    title="삭제"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {types.length === 0 && !showAddForm && (
        <div className={styles.empty}>
          객체 타입이 없습니다.<br />
          + 추가 버튼을 눌러 타입을 생성하세요.
        </div>
      )}
    </div>
  )
}
