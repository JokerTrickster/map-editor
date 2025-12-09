import { dia } from '@joint/core'
import { TemplateRelationType } from '@/entities/schema/templateSchema'
import styles from './RelationshipManager.module.css'
import { ObjectType } from '@/shared/store/objectTypeStore'

interface RelationshipManagerProps {
    element: dia.Element
    template?: any
    selectedType?: ObjectType
    relationTypes: Record<string, TemplateRelationType>
    onUnlink: (key: string, targetId: string) => void
    onAutoLink: (key: string) => void
    graph: dia.Graph | null
}

export function RelationshipManager({
    element,
    template,
    selectedType,
    relationTypes,
    onUnlink,
    onAutoLink,
    graph
}: RelationshipManagerProps) {
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
        // Use the existing linking mechanism through updating element data
        const currentData = element.get('data') || {}
        const currentProps = currentData.properties || {}
        const value = currentProps[config.propertyKey]

        let newValue: string | string[]
        if (config.cardinality === '1:1') {
            newValue = targetId
        } else {
            // 1:N
            const list = Array.isArray(value) ? [...value] : (value ? [value] : [])
            if (!list.includes(targetId)) {
                list.push(targetId)
            }
            newValue = list
        }

        const newData = {
            ...currentData,
            properties: {
                ...currentProps,
                [config.propertyKey]: newValue
            }
        }

        element.set('data', newData)
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

                return (
                    <div key={key} className={styles.relationGroup}>
                        <div className={styles.header}>
                            <div className={styles.headerLeft}>
                                <span className={styles.relationName}>{config.name}</span>
                                <span className={styles.cardinalityBadge}>{config.cardinality}</span>
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
                        {availableTargets.length > 0 && config.cardinality === '1:N' ? (
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
                                    <option value="" disabled>+ Add connection...</option>
                                    {availableTargets.map(target => (
                                        <option key={target.id} value={target.id}>
                                            {target.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : config.cardinality === '1:1' && linkedList.length === 0 && availableTargets.length > 0 ? (
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
                                >
                                    <option value="" disabled>Select connection...</option>
                                    {availableTargets.map(target => (
                                        <option key={target.id} value={target.id}>
                                            {target.name}
                                        </option>
                                    ))}
                                </select>
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

                                    return (
                                        <div key={id} className={styles.linkedItem}>
                                            <div className={styles.linkedInfo}>
                                                <span className={styles.targetName}>{targetName}</span>
                                                {targetType && (
                                                    <span className={styles.targetType}>{targetType}</span>
                                                )}
                                            </div>
                                            <button
                                                className={styles.unlinkBtn}
                                                onClick={() => onUnlink(key, id)}
                                                title="Remove connection"
                                            >
                                                ×
                                            </button>
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
