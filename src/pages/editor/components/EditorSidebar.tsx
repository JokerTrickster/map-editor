/**
 * EditorSidebar Component
 * Right sidebar showing map info and object list
 */

import { useState } from 'react'
import { dia } from '@joint/core'
import styles from './EditorSidebar.module.css'

import { PropertyEditor } from './PropertyEditor'
import { RelationshipManager } from './RelationshipManager'
import { TemplateRelationType } from '@/entities/schema/templateSchema'
import { ObjectType, useObjectTypeStore } from '@/shared/store/objectTypeStore'

interface EditorSidebarProps {
  loadedFileName: string | null
  elementCount: number
  zoom: number
  objectsByLayer: Map<string, dia.Element[]>
  selectedElementId: string | null
  onObjectClick: (elementId: string) => void
  onObjectUpdate?: (id: string, updates: Partial<any>) => void
  graph: dia.Graph
  template?: any
  relationTypes?: Record<string, TemplateRelationType>
  onStartLinking: (key: string) => void
  onUnlink: (key: string, targetId: string) => void
  onAutoLink: (key: string) => void
  isLinking: boolean
  activeRelationKey: string | null
}

export function EditorSidebar({
  loadedFileName,
  elementCount,
  zoom,
  objectsByLayer,
  selectedElementId,
  onObjectClick,
  onObjectUpdate,
  graph,
  template,
  relationTypes,
  onStartLinking,
  onUnlink,
  onAutoLink,
  isLinking,
  activeRelationKey
}: EditorSidebarProps) {
  const [activeTab, setActiveTab] = useState<'properties' | 'relationships'>('properties')
  const selectedElement = selectedElementId && graph ? graph.getCell(selectedElementId) : null
  const objectTypes = useObjectTypeStore(state => state.types)

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
                onStartLinking={onStartLinking}
                onUnlink={onUnlink}
                onAutoLink={onAutoLink}
                isLinking={isLinking}
                activeRelationKey={activeRelationKey}
                graph={graph}
              />
            )}
          </div>
        </>
      ) : (
        <>
          <div className={styles.sidebarHeader}>Map Info</div>
          <div className={styles.sidebarContent}>
            {loadedFileName ? (
              <>
                <div className={styles.infoItem}>
                  <div className={styles.infoLabel}>File</div>
                  <div className={styles.infoValue}>{loadedFileName}</div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoLabel}>Elements</div>
                  <div className={styles.infoValue}>{elementCount}</div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoLabel}>Zoom</div>
                  <div className={styles.infoValue}>{Math.round(zoom * 100)}%</div>
                </div>

                {/* Object List by Layer */}
                <div className={styles.objectList}>
                  <div className={styles.objectListHeader}>Objects</div>
                  <div className={styles.objectListContent}>
                    {Array.from(objectsByLayer.entries()).map(([layer, elements]) => (
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
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className={styles.emptyMessage}>Upload a CSV file to view the map</p>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
