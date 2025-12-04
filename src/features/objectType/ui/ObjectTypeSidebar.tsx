/**
 * Object Type Sidebar
 * Manages object type definitions (CCTV, Charger, ParkingSpot, etc.)
 */

import { useState, useRef, ChangeEvent } from 'react'
import { useObjectTypeStore, type ObjectType, type Property } from '@/shared/store/objectTypeStore'
import { AssetUploader, ColorPicker, PropertyEditor, JsonPreview, TypeListItem } from './components'
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
    color: string
    properties: { key: string; type: Property['type']; required: boolean }[]
  }>({
    name: '',
    icon: '',
    color: '#3b82f6',
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
        color: formData.color,
        properties: formData.properties,
      })

      setFormData({ name: '', icon: '', color: '#3b82f6', properties: [] })
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
        color: formData.color,
        properties: formData.properties,
      })

      setEditingId(null)
      setFormData({ name: '', icon: '', color: '#3b82f6', properties: [] })
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
      color: type.color || '#3b82f6',
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
    setFormData({ name: '', icon: '', color: '#3b82f6', properties: [] })
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
      color: formData.color,
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
      <input
        type="text"
        placeholder="타입명 (예: CCTV)"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        className={styles.input}
      />

      <AssetUploader
        previewUrl={previewUrl}
        assetFileName={assetFile?.name}
        onFileChange={handleFileChange}
        onRemove={removeFile}
        fileInputRef={fileInputRef}
      />

      {!previewUrl && (
        <ColorPicker
          value={formData.color}
          onChange={(color) => setFormData({ ...formData, color })}
        />
      )}

      <PropertyEditor
        properties={formData.properties}
        onAdd={addProperty}
        onUpdate={updateProperty}
        onRemove={removeProperty}
        propertiesClassName={styles.properties}
        propertiesHeaderClassName={styles.propertiesHeader}
        smallButtonClassName={styles.smallButton}
        propertyClassName={styles.property}
        propertyInputClassName={styles.propertyInput}
        propertySelectClassName={styles.propertySelect}
        removeButtonClassName={styles.removeButton}
      />

      <div className={styles.formActions}>
        <button
          onClick={isEditing ? () => handleUpdate(editingId!) : handleAdd}
          className={styles.saveButton}
        >
          저장
        </button>
        <button onClick={cancelEdit} className={styles.cancelButton}>
          취소
        </button>
      </div>

      <JsonPreview
        show={showJson}
        onToggle={() => setShowJson(!showJson)}
        data={getPreviewData()}
        jsonPreviewClassName={styles.jsonPreview}
        jsonContentClassName={styles.jsonContent}
      />
    </div>
  )

  // ... (inside ObjectTypeSidebar)

  const handleShowAddForm = () => {
    setFormData({
      name: '',
      icon: '',
      color: '#3b82f6',
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

  const jsonInputRef = useRef<HTMLInputElement>(null)

  const handleJsonUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        if (Array.isArray(json)) {
          let addedCount = 0
          json.forEach(item => {
            if (item.name && Array.isArray(item.properties)) {
              addType({
                name: item.name,
                icon: item.icon || '',
                color: item.color,
                properties: item.properties
              })
              addedCount++
            }
          })
          if (addedCount > 0) {
            alert(`${addedCount} types imported successfully`)
          } else {
            setError('No valid types found in JSON')
          }
        } else {
          setError('Invalid JSON format: Expected an array')
        }
      } catch (err) {
        setError('Failed to parse JSON')
      }
      if (jsonInputRef.current) jsonInputRef.current.value = ''
    }
    reader.readAsText(file)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>객체 타입</h3>
        {!showAddForm && !editingId && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="file"
              ref={jsonInputRef}
              onChange={handleJsonUpload}
              accept=".json"
              style={{ display: 'none' }}
            />
            <button
              className={styles.addButton}
              onClick={() => jsonInputRef.current?.click()}
              style={{ backgroundColor: 'var(--local-surface-hover)', color: 'var(--local-text)' }}
              title="JSON 가져오기"
            >
              Import
            </button>
            <button
              className={styles.addButton}
              onClick={handleShowAddForm}
            >
              + 추가
            </button>
          </div>
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
          <div key={type.id}>
            {editingId === type.id ? (
              <div className={`${styles.typeItem} ${styles.selected}`}>
                {renderForm(true)}
              </div>
            ) : (
              <TypeListItem
                type={type}
                isSelected={selectedTypeId === type.id}
                onSelect={() => onSelectType?.(type)}
                onEdit={() => startEdit(type)}
                onDelete={() => handleDelete(type.id)}
                typeItemClassName={styles.typeItem}
                selectedClassName={styles.selected}
                typeHeaderClassName={styles.typeHeader}
                typeNameClassName={styles.typeName}
                typeActionsClassName={styles.typeActions}
                editButtonClassName={styles.editButton}
                deleteButtonClassName={styles.deleteButton}
              />
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
