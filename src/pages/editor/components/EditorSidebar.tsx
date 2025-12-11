/**
 * EditorSidebar Component
 * Right sidebar showing map info and object list
 */

import { useState } from 'react'
import { dia } from '@joint/core'
import styles from './EditorSidebar.module.css'

import { PropertyEditor } from './PropertyEditor'
import { RelationshipManager } from './RelationshipManager'
import { RelationTypeList } from './RelationTypeList'
import { RelationTypeManager } from './RelationTypeManager'
import { TemplateRelationType } from '@/entities/schema/templateSchema'
import { ObjectType, useObjectTypeStore } from '@/shared/store/objectTypeStore'
import { parseCardinality, isTargetLinkedGlobally } from '@/features/editor/lib/relationshipUtils'

interface EditorSidebarProps {
  loadedFileName: string | null
  elementCount: number
  zoom: number
  objectsByLayer: Map<string, dia.Element[]>
  selectedElementId: string | null
  onObjectClick: (elementId: string) => void
  onObjectUpdate?: (id: string, updates: Partial<any>) => void
  graph: dia.Graph | null
  template?: any
  relationTypes?: Record<string, TemplateRelationType>
  onUnlink: (key: string, targetId: string) => void
  onAutoLink: (key: string) => void
  onAutoLinkAll?: () => void
  onUpdateRelationType?: (key: string, config: TemplateRelationType) => void
  onDeleteRelationType?: (key: string) => void
  onRelationEditModeChange?: (editing: boolean, relationKey: string | null, availableTargetIds: string[]) => void
}

export function EditorSidebar({
  loadedFileName,
  elementCount: _elementCount,
  zoom: _zoom,
  objectsByLayer,
  selectedElementId,
  onObjectClick,
  onObjectUpdate,
  graph,
  template,
  relationTypes,
  onUnlink,
  onAutoLink,
  onAutoLinkAll,
  onUpdateRelationType,
  onDeleteRelationType,
  onRelationEditModeChange
}: EditorSidebarProps) {
  const [activeTab, setActiveTab] = useState<'properties' | 'relationships'>('properties')
  const [mainTab, setMainTab] = useState<'objects' | 'relations'>('objects')
  const [isAddingRelation, setIsAddingRelation] = useState(false)
  const [editingRelation, setEditingRelation] = useState<{key: string, config: TemplateRelationType} | null>(null)
  const [selectedLayer, setSelectedLayer] = useState<string>('all')

  // Track template relation keys (cannot be edited or deleted)
  const [templateRelationKeys] = useState<Set<string>>(
    new Set(Object.keys(relationTypes || {}))
  )

  const selectedElement = selectedElementId && graph ? graph.getCell(selectedElementId) : null
  const objectTypes = useObjectTypeStore(state => state.types)

  // CRUD handlers for relation types
  const handleAddRelation = () => {
    setIsAddingRelation(true)
  }

  const handleEditRelation = (key: string) => {
    if (!relationTypes) return
    const config = relationTypes[key]
    if (config) {
      setEditingRelation({ key, config })
    }
  }

  const handleDeleteRelation = (key: string) => {
    if (onDeleteRelationType) {
      onDeleteRelationType(key)
    }
  }

  const handleSaveRelation = (key: string, config: TemplateRelationType) => {
    if (onUpdateRelationType) {
      onUpdateRelationType(key, config)
    }
    setIsAddingRelation(false)
    setEditingRelation(null)
  }

  const handleCancelRelation = () => {
    setIsAddingRelation(false)
    setEditingRelation(null)
  }

  // Helper to get selected type object for relationship matching
  const getSelectedType = (): ObjectType | undefined => {
    if (!selectedElement) return undefined
    const data = selectedElement.get('data') || {}
    const typeId = data.typeId || data.type

    // 1. Try to find in store (for UUIDs)
    const storeType = objectTypes.find(t => t.id === typeId)
    if (storeType) return storeType

    // 2. Try to find in template by ID
    if (template?.objectTypes?.[typeId]) {
      return { name: template.objectTypes[typeId].displayName } as ObjectType
    }

    // 3. Try to find in template by displayName or name
    if (template?.objectTypes) {
      const found = Object.values(template.objectTypes).find((t: any) => t.displayName === typeId || t.name === typeId)
      return found ? { name: (found as any).displayName } as ObjectType : undefined
    }

    return undefined
  }

  const selectedType = getSelectedType()

  // Handler for adding relationship links
  const handleAddLink = (propertyKey: string, targetId: string) => {
    if (!selectedElement || !onObjectUpdate || !graph) return

    console.log(`➕ Adding relationship: propertyKey=${propertyKey}, targetId=${targetId}`)

    const currentData = selectedElement.get('data') || {}
    const currentProps = currentData.properties || {}
    const value = currentProps[propertyKey]

    // Guard against undefined relationTypes
    if (!relationTypes) {
      console.error('❌ No relation types available')
      return
    }

    // Find the relation config by propertyKey
    const relationEntry = Object.entries(relationTypes).find(
      ([_, config]) => config.propertyKey === propertyKey
    )

    if (!relationEntry) {
      console.error(`❌ No relation config found for propertyKey: ${propertyKey}`)
      return
    }

    const [relationKey, relationConfig] = relationEntry
    const maxCount = parseCardinality(relationConfig.cardinality)

    // Check global uniqueness (if allowDuplicates = false)
    const { isLinked, linkedBySourceId } = isTargetLinkedGlobally(
      graph,
      relationConfig,
      targetId,
      selectedElement.id as string,
      undefined  // No UUID mapping needed for manual linking
    )

    if (isLinked) {
      // Get source element info for better error message
      const sourceEl = graph.getCell(linkedBySourceId!)
      const sourceName = sourceEl?.get('data')?.properties?.name || linkedBySourceId

      alert(
        `이 객체는 이미 다른 객체(${sourceName})와 연결되어 있습니다.\n` +
        `관계 설정에서 "중복 연결 허용"이 비활성화되어 있습니다.`
      )
      console.log(`❌ Target ${targetId} already linked by ${linkedBySourceId}`)
      return
    }

    console.log(`📊 Relation: ${relationKey}, cardinality: ${relationConfig.cardinality}, maxCount: ${maxCount}`)

    let newValue: string | string[]

    if (maxCount === 1) {
      // Single relationship
      newValue = targetId
      console.log(`✅ Setting single relationship: ${targetId}`)
    } else {
      // Multiple relationships
      const list = Array.isArray(value) ? [...value] : (value ? [value] : [])

      // Check if already exists
      if (list.includes(targetId)) {
        console.log(`⚠️ Relationship already exists: ${targetId}`)
        return
      }

      // Check max count
      if (maxCount !== null && list.length >= maxCount) {
        alert(`최대 ${maxCount}개까지만 연결할 수 있습니다. (현재: ${list.length}개)`)
        console.log(`❌ Max count reached: ${list.length}/${maxCount}`)
        return
      }

      list.push(targetId)
      newValue = list
      console.log(`✅ Added to list (${list.length}/${maxCount || '∞'}): ${targetId}`)
    }

    // Update the element
    const newData = {
      ...currentData,
      properties: {
        ...currentProps,
        [propertyKey]: newValue
      }
    }

    selectedElement.set('data', newData)

    // Trigger re-render through handleObjectUpdate
    onObjectUpdate(selectedElement.id as string, { data: newData })
  }

  // Check if there are any relevant relationships for this object type
  const hasRelationships = selectedElement && relationTypes ? Object.values(relationTypes).some(config => {
    // 1. Direct match
    const elementData = selectedElement.get('data') || {}
    const elementTypeId = elementData.typeId || elementData.type
    if (config.sourceType === elementTypeId) return true

    // 2. Name match
    if (selectedType && template?.objectTypes) {
      const templateType = template.objectTypes[config.sourceType]
      if (templateType && (templateType.displayName === selectedType.name || templateType.name === selectedType.name)) {
        return true
      }
    }
    return false
  }) : false

  // Reset to properties tab if relationships tab is active but no relationships exist
  if (activeTab === 'relationships' && !hasRelationships) {
    setActiveTab('properties')
  }

  return (
    <aside className={styles.rightSidebar}>
      {selectedElement && selectedElement.isElement() && onObjectUpdate ? (
        <>
          <div className={styles.sidebarHeader}>
            <button
              className={styles.backButton}
              onClick={() => onObjectClick('')} // Deselect
            >
              ← Back
            </button>
            Object Details
          </div>

          {/* Tab Navigation - Only show if relationships exist */}
          {hasRelationships && (
            <div className={styles.tabContainer}>
              <button
                className={`${styles.tabButton} ${activeTab === 'properties' ? styles.active : ''}`}
                onClick={() => setActiveTab('properties')}
              >
                Properties
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'relationships' ? styles.active : ''}`}
                onClick={() => setActiveTab('relationships')}
              >
                Relationships
              </button>
            </div>
          )}

          <div className={styles.sidebarContent}>
            {activeTab === 'properties' ? (
              <PropertyEditor
                element={selectedElement as dia.Element}
                onUpdate={onObjectUpdate}
                graph={graph}
              />
            ) : (
              <RelationshipManager
                element={selectedElement as dia.Element}
                template={template}
                selectedType={getSelectedType()}
                relationTypes={relationTypes || {}}
                objectTypes={objectTypes}
                onUnlink={onUnlink}
                onAutoLink={onAutoLink}
                onAddLink={handleAddLink}
                graph={graph}
                onEditModeChange={onRelationEditModeChange}
              />
            )}
          </div>
        </>
      ) : (
        <>
          <div className={styles.sidebarHeader}>Map Info</div>

          {/* Main Tab Navigation */}
          {loadedFileName && (
            <div className={styles.tabContainer}>
              <button
                className={`${styles.tabButton} ${mainTab === 'objects' ? styles.active : ''}`}
                onClick={() => setMainTab('objects')}
              >
                객체 리스트
              </button>
              <button
                className={`${styles.tabButton} ${mainTab === 'relations' ? styles.active : ''}`}
                onClick={() => setMainTab('relations')}
              >
                관계 리스트
              </button>
            </div>
          )}

          <div className={styles.sidebarContent}>
            {loadedFileName ? (
              <>
                {mainTab === 'objects' ? (
                  /* Object List by Layer */
                  <div className={styles.objectList}>
                    <div className={styles.objectListHeader}>Objects</div>

                    {/* Layer Selector */}
                    <div className={styles.layerSelector}>
                      <label className={styles.layerSelectorLabel}>레이어</label>
                      <select
                        className={styles.layerSelectorDropdown}
                        value={selectedLayer}
                        onChange={(e) => setSelectedLayer(e.target.value)}
                      >
                        <option value="all">전체 보기</option>
                        {Array.from(objectsByLayer.keys()).map(layer => (
                          <option key={layer} value={layer}>
                            {layer} ({objectsByLayer.get(layer)?.length || 0})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Object List */}
                    <div className={styles.objectListContent}>
                      {selectedLayer === 'all' ? (
                        // Show all layers
                        Array.from(objectsByLayer.entries()).map(([layer, elements]) => (
                          <details key={layer} open>
                            <summary className={styles.layerSummary}>
                              {layer} ({elements.length})
                            </summary>
                            <div className={styles.layerElements}>
                              {elements.map((element) => {
                                const elementId = element.id as string
                                const data = element.get('data')
                                const text = data?.text || data?.entityHandle || elementId.slice(0, 8)
                                const isSelected = selectedElementId === elementId

                                return (
                                  <div
                                    key={elementId}
                                    onClick={() => onObjectClick(elementId)}
                                    className={`${styles.elementItem} ${isSelected ? styles.elementItemSelected : ''}`}
                                  >
                                    {text}
                                  </div>
                                )
                              })}
                            </div>
                          </details>
                        ))
                      ) : (
                        // Show selected layer only
                        <div className={styles.singleLayerView}>
                          {objectsByLayer.get(selectedLayer)?.map((element) => {
                            const elementId = element.id as string
                            const data = element.get('data')
                            const text = data?.text || data?.entityHandle || elementId.slice(0, 8)
                            const isSelected = selectedElementId === elementId

                            return (
                              <div
                                key={elementId}
                                onClick={() => onObjectClick(elementId)}
                                className={`${styles.elementItem} ${isSelected ? styles.elementItemSelected : ''}`}
                              >
                                {text}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Relations List */
                  <RelationTypeList
                    relationTypes={relationTypes || {}}
                    template={template}
                    templateRelationKeys={templateRelationKeys}
                    onAdd={handleAddRelation}
                    onEdit={handleEditRelation}
                    onDelete={handleDeleteRelation}
                    onAutoLinkAll={onAutoLinkAll}
                  />
                )}
              </>
            ) : (
              <p className={styles.emptyMessage}>Upload a CSV file to view the map</p>
            )}
          </div>
        </>
      )}

      {/* Relation Type Add/Edit Modal */}
      {(isAddingRelation || editingRelation) && (
        <RelationTypeManager
          template={template}
          initialData={editingRelation || undefined}
          onSave={handleSaveRelation}
          onCancel={handleCancelRelation}
        />
      )}
    </aside>
  )
}
