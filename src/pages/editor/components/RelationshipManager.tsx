import { useState } from 'react'
import { dia } from '@joint/core'
import { TemplateRelationType } from '@/entities/schema/templateSchema'
import { parseCardinality, isTargetLinkedGlobally } from '@/features/editor/lib/relationshipUtils'
import styles from './RelationshipManager.module.css'
import { ObjectType } from '@/shared/store/objectTypeStore'

interface RelationshipManagerProps {
    element: dia.Element
    template?: any
    selectedType?: ObjectType
    relationTypes: Record<string, TemplateRelationType>
    onUnlink: (key: string, targetId: string) => void
    onAutoLink: (key: string) => void
    onAddLink: (relationKey: string, targetId: string) => void
    graph: dia.Graph | null
}

export function RelationshipManager({
    element,
    template,
    selectedType,
    relationTypes,
    onUnlink,
    onAutoLink,
    onAddLink,
    graph
}: RelationshipManagerProps) {
    const [editingRelation, setEditingRelation] = useState<{
        relationKey: string
        targetId: string
    } | null>(null)

    const elementData = element.get('data') || {}
    const elementTypeId = elementData.typeId || elementData.type

    console.log(`[RelationshipManager] Debug: elementId = ${element.id}, typeId = ${elementData.typeId}, type = ${elementData.type}, resolvedType = ${elementTypeId} `)
    console.log(`[RelationshipManager] SelectedType: `, selectedType)

    // Filter relations where this element is the source
    const relevantRelations = Object.entries(relationTypes).filter(
        ([_key, config]) => {
            // 1. Direct match (if element uses template key as ID)
            if (config.sourceType === elementTypeId) return true

            // 2. Name match (if element uses UUID but name matches template displayName)
            if (selectedType && template?.objectTypes) {
                const templateType = template.objectTypes[config.sourceType]
                if (templateType && (templateType.displayName === selectedType.name || templateType.name === selectedType.name)) {
                    console.log(`[RelationshipManager] Match found via name: ${config.sourceType} -> ${selectedType.name} `)
                    return true
                }
            }

            return false
        }
    )

    console.log('Relevant Relations:', relevantRelations)

    // Get available targets for each relation type
    const getAvailableTargets = (config: TemplateRelationType) => {
        if (!graph) return []

        const linkedIds = elementData.properties?.[config.propertyKey]
        const linkedList = Array.isArray(linkedIds) ? linkedIds : linkedIds ? [linkedIds] : []

        return graph.getElements()
            .filter(el => el.id !== element.id) // Not self
            .filter(el => {
                const elData = el.get('data') || {}
                const elTypeId = elData.typeId || elData.type

                // Check if element type matches target type
                if (elTypeId === config.targetType) return true

                // Also check by name
                if (template?.objectTypes) {
                    const templateType = template.objectTypes[config.targetType]
                    if (templateType && elData.properties?.name) {
                        // This is a simple check, might need more robust matching
                        return true
                    }
                }

                return false
            })
            .filter(el => !linkedList.includes(el.id as string)) // Not already linked
            .map(el => {
                const elData = el.get('data') || {}
                return {
                    id: el.id as string,
                    name: elData.properties?.name || elData.text || (el.id as string).slice(0, 8),
                    type: elData.typeId || elData.type
                }
            })
    }

    const handleAddLink = (config: TemplateRelationType, targetId: string) => {
        // Check cardinality limits before calling callback
        const currentData = element.get('data') || {}
        const currentProps = currentData.properties || {}
        const value = currentProps[config.propertyKey]

        const maxCount = parseCardinality(config.cardinality)

        if (maxCount !== 1) {
            // For multiple relationships, check max count limit
            const list = Array.isArray(value) ? [...value] : (value ? [value] : [])

            if (maxCount !== null && list.length >= maxCount) {
                alert(`최대 ${maxCount}개까지만 연결할 수 있습니다.`)
                return
            }
        }

        // Call the callback to let EditorSidebar handle the update
        // This ensures proper state flow through handleObjectUpdate
        onAddLink(config.propertyKey, targetId)
    }

    const handleReplaceLink = (
        relationKey: string,
        config: TemplateRelationType,
        oldTargetId: string,
        newTargetId: string
    ) => {
        console.log(`🔄 Replacing relationship: ${oldTargetId} → ${newTargetId}`)

        // Remove old link
        onUnlink(relationKey, oldTargetId)

        // Add new link (after a small delay to ensure removal completes)
        setTimeout(() => {
            onAddLink(config.propertyKey, newTargetId)
        }, 50)

        console.log(`✅ Relationship replaced`)
    }

    if (relevantRelations.length === 0) return null

    return (
        <div className={styles.container}>
            <h3 className={styles.title}>Relationships</h3>

            {relevantRelations.map(([key, config]) => {
                const linkedIds = elementData.properties?.[config.propertyKey]
                const linkedList = Array.isArray(linkedIds)
                    ? linkedIds
                    : linkedIds ? [linkedIds] : []
                const availableTargets = getAvailableTargets(config)

                const maxCount = parseCardinality(config.cardinality)
                const canAddMore = maxCount === null || linkedList.length < maxCount

                return (
                    <div key={key} className={styles.relationGroup}>
                        <div className={styles.header}>
                            <div className={styles.headerLeft}>
                                <span className={styles.relationName}>{config.name}</span>
                                <span className={styles.cardinalityBadge}>
                                    {config.cardinality}
                                    {maxCount !== null && (
                                        <span className={styles.count}>
                                            {' '}({linkedList.length}/{maxCount})
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className={styles.actions}>
                                {config.autoLink && (
                                    <button
                                        className={styles.autoLinkBtn}
                                        onClick={() => onAutoLink(key)}
                                        title="Auto Link"
                                    >
                                        🔗 Auto
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Dropdown for adding connections */}
                        {availableTargets.length > 0 && canAddMore ? (
                            <div className={styles.addSection}>
                                <select
                                    className={styles.targetSelect}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleAddLink(config, e.target.value)
                                            e.target.value = '' // Reset
                                        }
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>
                                        {maxCount === 1 ? 'Select connection...' : '+ Add connection...'}
                                    </option>
                                    {availableTargets.map(target => {
                                        // Check if target is globally linked
                                        const { isLinked, linkedBySourceId } = graph
                                            ? isTargetLinkedGlobally(
                                                graph,
                                                config,
                                                target.id,
                                                element.id as string,
                                                undefined  // No UUID mapping needed for manual linking
                                            )
                                            : { isLinked: false, linkedBySourceId: undefined }

                                        let linkedSourceName = ''
                                        if (isLinked && linkedBySourceId) {
                                            const sourceEl = graph?.getCell(linkedBySourceId)
                                            linkedSourceName = sourceEl?.get('data')?.properties?.name || linkedBySourceId
                                        }

                                        return (
                                            <option
                                                key={target.id}
                                                value={target.id}
                                                disabled={isLinked}
                                                style={{
                                                    color: isLinked ? '#666' : undefined,
                                                    fontStyle: isLinked ? 'italic' : undefined
                                                }}
                                            >
                                                {target.name}
                                                {isLinked && ` (${linkedSourceName}와 연결됨)`}
                                            </option>
                                        )
                                    })}
                                </select>
                            </div>
                        ) : !canAddMore && maxCount !== null ? (
                            <div className={styles.maxReachedInfo}>
                                최대 {maxCount}개 연결됨
                            </div>
                        ) : null}

                        {/* Linked objects list */}
                        <div className={styles.linkedList}>
                            {linkedList.length > 0 ? (
                                linkedList.map((id: string) => {
                                    const targetCell = graph?.getCell(id)
                                    const targetData = targetCell?.get('data') || {}
                                    const targetName = targetData.properties?.name ||
                                        targetData.text ||
                                        id.slice(0, 8)
                                    const targetType = targetData.typeId || targetData.type

                                    const isEditing = editingRelation?.relationKey === key && editingRelation.targetId === id

                                    return (
                                        <div key={id} className={styles.linkedItem}>
                                            {isEditing ? (
                                                // Edit mode: Show dropdown
                                                <select
                                                    className={styles.editSelect}
                                                    value={id}
                                                    onChange={(e) => {
                                                        if (e.target.value !== id) {
                                                            // Replace relationship
                                                            handleReplaceLink(key, config, id, e.target.value)
                                                            setEditingRelation(null)
                                                        }
                                                    }}
                                                    onBlur={() => setEditingRelation(null)}
                                                    autoFocus
                                                >
                                                    <option value={id}>{targetName}</option>
                                                    {getAvailableTargets(config).map(target => (
                                                        <option key={target.id} value={target.id}>
                                                            {target.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                // View mode: Show name + buttons
                                                <>
                                                    <div className={styles.linkedInfo}>
                                                        <span className={styles.targetName}>{targetName}</span>
                                                        {targetType && (
                                                            <span className={styles.targetType}>{targetType}</span>
                                                        )}
                                                    </div>
                                                    <div className={styles.actions}>
                                                        <button
                                                            className={styles.editBtn}
                                                            onClick={() => setEditingRelation({ relationKey: key, targetId: id })}
                                                            title="Edit connection"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            className={styles.unlinkBtn}
                                                            onClick={() => onUnlink(key, id)}
                                                            title="Remove connection"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )
                                })
                            ) : (
                                <div className={styles.emptyState}>No connections</div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
