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
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
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

  const handlePriorityChange = (typeId: string, priority: number) => {
    updateType(typeId, { priority })
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

  const ensureDefaultProperties = (properties: any[]): any[] => {
    const defaultProps = [
      { key: 'name', type: 'string', required: true },
      { key: 'position', type: 'string', required: true },
      { key: 'points', type: 'array', required: true },
      { key: 'description', type: 'string', required: false }
    ]

    const existingKeys = new Set(properties.map(p => p.key))
    const missingProps = defaultProps.filter(p => !existingKeys.has(p.key))

    // User properties first, then add missing default properties
    return [...properties, ...missingProps]
  }

  const convertValueToPropertyType = (value: any): 'string' | 'number' | 'boolean' | 'array' => {
    if (Array.isArray(value)) return 'array'
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    return 'string'
  }

  const handleJsonUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        let addedCount = 0
        const errors: string[] = []

        // Check if it's an object with keys (new format)
        if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
          Object.entries(json).forEach(([key, value]: [string, any]) => {
            try {
              // Skip null/undefined values
              if (value === null || value === undefined) {
                errors.push(`"${key}": 값이 null 또는 undefined입니다`)
                return
              }

              // Use object key as name if name is not provided
              const name = value.name || key

              let properties: any[] = []

              // Check if value has a 'properties' array (explicit type definition)
              if (Array.isArray(value.properties)) {
                properties = value.properties
              }
              // Otherwise, infer properties from object fields (implicit type definition)
              else if (typeof value === 'object' && !Array.isArray(value)) {
                properties = Object.entries(value)
                  .filter(([fieldKey]) => fieldKey !== 'name' && fieldKey !== 'icon' && fieldKey !== 'color')
                  .map(([fieldKey, fieldValue]) => ({
                    key: fieldKey,
                    type: convertValueToPropertyType(fieldValue),
                    required: false
                  }))
              }

              // Add default properties if missing
              const completeProperties = ensureDefaultProperties(properties)

              addType({
                name: name,
                icon: value.icon || '',
                color: value.color || '#3b82f6',
                properties: completeProperties
              })
              addedCount++
            } catch (err) {
              errors.push(`"${key}": ${err instanceof Error ? err.message : 'Unknown error'}`)
            }
          })
        }
        // Support legacy array format
        else if (Array.isArray(json)) {
          json.forEach((item, index) => {
            try {
              // Skip null/undefined items
              if (item === null || item === undefined) {
                errors.push(`Object ${index + 1}: 값이 null 또는 undefined입니다`)
                return
              }

              // For array format, use index as fallback name
              const name = item.name || `Object_${index + 1}`

              let properties: any[] = []

              // Check if item has a 'properties' array (explicit type definition)
              if (Array.isArray(item.properties)) {
                properties = item.properties
              }
              // Otherwise, infer properties from object fields (implicit type definition)
              else if (typeof item === 'object' && !Array.isArray(item)) {
                properties = Object.entries(item)
                  .filter(([fieldKey]) => fieldKey !== 'name' && fieldKey !== 'icon' && fieldKey !== 'color')
                  .map(([fieldKey, fieldValue]) => ({
                    key: fieldKey,
                    type: convertValueToPropertyType(fieldValue),
                    required: false
                  }))
              }

              // Add default properties if missing
              const completeProperties = ensureDefaultProperties(properties)

              addType({
                name: name,
                icon: item.icon || '',
                color: item.color || '#3b82f6',
                properties: completeProperties
              })
              addedCount++
            } catch (err) {
              errors.push(`Object ${index + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`)
            }
          })
        } else {
          setError('Invalid JSON format: Expected an object or array')
          if (jsonInputRef.current) jsonInputRef.current.value = ''
          return
        }

        // Show results
        if (errors.length > 0) {
          const errorMsg = `${addedCount}개 생성됨, ${errors.length}개 실패:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...외 ${errors.length - 5}개` : ''}`
          setError(errorMsg)
        } else if (addedCount > 0) {
          setSuccessMessage(`✅ ${addedCount}개의 객체 타입이 생성되었습니다`)
          setTimeout(() => setSuccessMessage(null), 3000)
        } else {
          setError('유효한 객체 타입을 찾을 수 없습니다')
        }
      } catch (err) {
        setError('Failed to parse JSON: ' + (err instanceof Error ? err.message : 'Unknown error'))
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

      {successMessage && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          background: 'rgba(34, 197, 94, 0.1)',
          color: '#4ade80',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          borderRadius: '6px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {successMessage}
        </div>
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
                onPriorityChange={handlePriorityChange}
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
