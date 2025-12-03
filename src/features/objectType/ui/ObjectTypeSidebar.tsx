/**
 * Object Type Sidebar
 * Manages object type definitions (CCTV, Charger, ParkingSpot, etc.)
 */

import { useState } from 'react'
import { useObjectTypeStore, type ObjectType, type Property } from '@/shared/store/objectTypeStore'
import styles from './ObjectTypeSidebar.module.css'

export function ObjectTypeSidebar() {
  const types = useObjectTypeStore(state => state.types)
  const addType = useObjectTypeStore(state => state.addType)
  const updateType = useObjectTypeStore(state => state.updateType)
  const deleteType = useObjectTypeStore(state => state.deleteType)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    properties: [] as Property[],
  })
  const [error, setError] = useState<string | null>(null)

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

      // Reset form
      setFormData({ name: '', icon: '', properties: [] })
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
    setShowAddForm(false)
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setShowAddForm(false)
    setFormData({ name: '', icon: '', properties: [] })
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>객체 타입</h3>
        {!showAddForm && !editingId && (
          <button
            className={styles.addButton}
            onClick={() => setShowAddForm(true)}
          >
            + 추가
          </button>
        )}
      </div>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className={styles.form}>
          <input
            type="text"
            placeholder="타입명 (예: CCTV)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={styles.input}
          />
          <input
            type="text"
            placeholder="아이콘 (선택사항)"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            className={styles.input}
          />

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
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={prop.required}
                    onChange={(e) =>
                      updateProperty(index, { required: e.target.checked })
                    }
                  />
                  필수
                </label>
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
            <button onClick={handleAdd} className={styles.saveButton}>
              저장
            </button>
            <button onClick={cancelEdit} className={styles.cancelButton}>
              취소
            </button>
          </div>
        </div>
      )}

      {/* Type List */}
      <div className={styles.typeList}>
        {types.map((type) => (
          <div key={type.id} className={styles.typeItem}>
            {editingId === type.id ? (
              /* Edit Form */
              <div className={styles.form}>
                <input
                  type="text"
                  placeholder="타입명"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className={styles.input}
                />
                <input
                  type="text"
                  placeholder="아이콘"
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  className={styles.input}
                />

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
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={prop.required}
                          onChange={(e) =>
                            updateProperty(index, { required: e.target.checked })
                          }
                        />
                        필수
                      </label>
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
                  <button
                    onClick={() => handleUpdate(type.id)}
                    className={styles.saveButton}
                  >
                    저장
                  </button>
                  <button onClick={cancelEdit} className={styles.cancelButton}>
                    취소
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <>
                <div className={styles.typeHeader}>
                  <span className={styles.typeName}>{type.name}</span>
                  <div className={styles.typeActions}>
                    <button
                      onClick={() => startEdit(type)}
                      className={styles.editButton}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(type.id)}
                      className={styles.deleteButton}
                    >
                      삭제
                    </button>
                  </div>
                </div>
                {type.properties.length > 0 && (
                  <div className={styles.propertyList}>
                    {type.properties.map((prop, index) => (
                      <div key={index} className={styles.propertyItem}>
                        <span className={styles.propertyKey}>{prop.key}</span>
                        <span className={styles.propertyType}>
                          ({prop.type}
                          {prop.required && ', 필수'})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
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
