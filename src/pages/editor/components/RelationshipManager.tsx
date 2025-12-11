import { useState } from 'react'
import { dia } from '@joint/core'
import { TemplateRelationType } from '@/entities/schema/templateSchema'
import { parseCardinality, isTargetLinkedGlobally } from '@/features/editor/lib/relationshipUtils'
import styles from './RelationshipManager.module.css'
import { ObjectType } from '@/shared/store/objectTypeStore'

// Phase 2: Status Icon Component
const StatusIcon = ({ hasConnections }: { hasConnections: boolean }) => {
    return (
        <span
            className={hasConnections ? styles.statusConnected : styles.statusEmpty}
            title={hasConnections ? "연결됨" : "연결 없음"}
            aria-label={hasConnections ? "연결됨" : "연결 없음"}
        >
            {hasConnections ? "✓" : "*"}
        </span>
    )
}

interface RelationshipManagerProps {
    element: dia.Element
    template?: any
    selectedType?: ObjectType
    relationTypes: Record<string, TemplateRelationType>
    objectTypes?: ObjectType[]
    onUnlink: (key: string, targetId: string) => void
    onAutoLink: (key: string) => void
    onAddLink: (relationKey: string, targetId: string) => void
    graph: dia.Graph | null
    onEditModeChange?: (editing: boolean, relationKey: string | null, availableTargetIds: string[]) => void
}

export function RelationshipManager({
    element,
    template,
    selectedType,
    relationTypes,
    objectTypes,
    onUnlink,
    onAutoLink: _onAutoLink,
    onAddLink,
    graph,
    onEditModeChange
}: RelationshipManagerProps) {
    // State for editing individual relation item (changing target)
    const [editingRelation, setEditingRelation] = useState<{
        relationKey: string
        targetId: string
    } | null>(null)

    // State for editing mode of entire relation type
    const [editingRelationType, setEditingRelationType] = useState<string | null>(null)

    const elementData = element.get('data') || {}
    const elementTypeId = elementData.typeId || elementData.type

    // Filter relations where this element is the source
    const relevantRelations = Object.entries(relationTypes).filter(
        ([_key, config]) => {
            // 1. Direct match (if element uses template key as ID)
            if (config.sourceType === elementTypeId) return true

            // 2. Name match (if element uses UUID but name matches template displayName)
            if (selectedType && template?.objectTypes) {
                const templateType = template.objectTypes[config.sourceType]
                if (templateType && (templateType.displayName === selectedType.name || templateType.name === selectedType.name)) {
                    return true
                }
            }

            return false
        }
    )

    // Get available targets for each relation type
    const getAvailableTargets = (config: TemplateRelationType) => {
        if (!graph) return []

        const linkedIds = elementData.properties?.[config.propertyKey]
        const linkedList = Array.isArray(linkedIds) ? linkedIds : linkedIds ? [linkedIds] : []

        // Get target template type info
        const targetTemplateType = template?.objectTypes?.[config.targetType]

        return graph.getElements()
            .filter(el => el.id !== element.id) // Not self
            .filter(el => {
                const elData = el.get('data') || {}
                const elTypeId = elData.typeId || elData.type

                // Direct type match (template key)
                if (elTypeId === config.targetType) return true

                // UUID-based typeId: lookup in objectTypes store
                if (objectTypes) {
                    const elObjectType = objectTypes.find(t => t.id === elTypeId)
                    if (elObjectType && targetTemplateType) {
                        // Match by name
                        return (
                            elObjectType.name === targetTemplateType.displayName ||
                            elObjectType.name === targetTemplateType.name
                        )
                    }
                }

                // Fallback: lookup in template objectTypes (for template-key based typeIds)
                if (template?.objectTypes && targetTemplateType) {
                    const elTemplateType = template.objectTypes[elTypeId]
                    if (elTemplateType) {
                        return (
                            targetTemplateType.displayName === elTemplateType.displayName ||
                            targetTemplateType.name === elTemplateType.name
                        )
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
        // Remove old link
        onUnlink(relationKey, oldTargetId)

        // Add new link (after a small delay to ensure removal completes)
        setTimeout(() => {
            onAddLink(config.propertyKey, newTargetId)
        }, 50)
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
                            <div className={styles.headerTop}>
                                <StatusIcon hasConnections={linkedList.length > 0} />
                                <span className={styles.relationName}>{config.name}</span>
                            </div>
                            <div className={styles.headerBottom}>
                                <span className={styles.cardinalityBadge}>
                                    {config.cardinality}
                                    {maxCount !== null && (
                                        <span
                                            className={styles.count}
                                            style={{
                                                color: linkedList.length >= maxCount ? '#f59e0b' : 'inherit'
                                            }}
                                        >
                                            {' '}({linkedList.length}/{maxCount})
                                        </span>
                                    )}
                                </span>
                                <button
                                    className={editingRelationType === key ? styles.editTypeBtnActive : styles.editTypeBtn}
                                    onClick={() => {
                                        const newEditingState = editingRelationType === key ? null : key
                                        setEditingRelationType(newEditingState)

                                        // Notify parent about edit mode change
                                        if (onEditModeChange) {
                                            const availableIds = availableTargets.map(t => t.id)
                                            onEditModeChange(newEditingState !== null, newEditingState, availableIds)
                                        }
                                    }}
                                    title={editingRelationType === key ? "완료" : "편집"}
                                    aria-label={editingRelationType === key ? "편집 완료" : "관계 편집"}
                                >
                                    {editingRelationType === key ? "완료" : "편집"}
                                </button>
                            </div>
                        </div>

                        {/* Show select dropdown in edit mode */}
                        {editingRelationType === key && availableTargets.length > 0 && canAddMore ? (
                            <div className={styles.addSection}>
                                <select
                                    className={styles.targetSelect}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleAddLink(config, e.target.value)
                                            e.target.value = ''
                                        }
                                    }}
                                    defaultValue=""
                                    aria-label={`${config.name} 연결 대상 선택`}
                                >
                                    <option value="" disabled>
                                        선택하세요...
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
                                                    aria-label={`${targetName} 연결 편집`}
                                                >
                                                    <option value={id}>{targetName}</option>
                                                    {getAvailableTargets(config).map(target => (
                                                        <option key={target.id} value={target.id}>
                                                            {target.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                // View mode: Show name + buttons (only in edit mode)
                                                <>
                                                    <div className={styles.linkedInfo}>
                                                        <span className={styles.targetName}>{targetName}</span>
                                                        {targetType && (
                                                            <span className={styles.targetType}>{targetType}</span>
                                                        )}
                                                    </div>
                                                    {/* Show remove button only when relation type is in edit mode */}
                                                    {editingRelationType === key && (
                                                        <button
                                                            className={styles.unlinkBtn}
                                                            onClick={() => onUnlink(key, id)}
                                                            title="연결 제거"
                                                            aria-label={`${targetName} 연결 제거`}
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )
                                })
                            ) : (
                                // Phase 2: Updated empty state message
                                <div className={styles.emptyState}>연결된 항목 없음</div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
