
import React from 'react'
import { dia } from '@joint/core'
import { TemplateRelationType } from '@/entities/schema/templateSchema'
import styles from './RelationshipManager.module.css'
import { ObjectType } from '@/shared/store/objectTypeStore'

interface RelationshipManagerProps {
    element: dia.Element
    template?: any
    selectedType?: ObjectType
    relationTypes: Record<string, TemplateRelationType>
    onStartLinking: (key: string) => void
    onUnlink: (key: string, targetId: string) => void
    onAutoLink: (key: string) => void
    isLinking: boolean
    activeRelationKey: string | null
    graph: dia.Graph
}

export function RelationshipManager({
    element,
    template,
    selectedType,
    relationTypes,
    onStartLinking,
    onUnlink,
    onAutoLink,
    isLinking,
    activeRelationKey,
    graph
}: RelationshipManagerProps) {
    const elementData = element.get('data') || {}
    const elementTypeId = elementData.typeId || elementData.type

    console.log(`[RelationshipManager] Debug: elementId = ${element.id}, typeId = ${elementData.typeId}, type = ${elementData.type}, resolvedType = ${elementTypeId} `)
    console.log(`[RelationshipManager] SelectedType: `, selectedType)

    // Filter relations where this element is the source
    const relevantRelations = Object.entries(relationTypes).filter(
        ([key, config]) => {
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

    if (relevantRelations.length === 0) return null

    return (
        <div className={styles.container}>
            <h3 className={styles.title}>Relationships</h3>

            {relevantRelations.map(([key, config]) => {
                const linkedIds = elementData.properties?.[config.propertyKey]
                const linkedList = Array.isArray(linkedIds)
                    ? linkedIds
                    : linkedIds ? [linkedIds] : []

                return (
                    <div key={key} className={styles.relationGroup}>
                        <div className={styles.header}>
                            <span className={styles.relationName}>{config.name}</span>
                            <div className={styles.actions}>
                                {config.autoLink && (
                                    <button
                                        className={styles.autoLinkBtn}
                                        onClick={() => onAutoLink(key)}
                                        title="Auto Link"
                                    >
                                        Auto
                                    </button>
                                )}
                                <button
                                    className={`${styles.linkBtn} ${isLinking && activeRelationKey === key ? styles.active : ''} `}
                                    onClick={() => onStartLinking(key)}
                                    disabled={isLinking && activeRelationKey !== key}
                                >
                                    {isLinking && activeRelationKey === key ? 'Cancel' : '+ Link'}
                                </button>
                            </div>
                        </div>

                        <div className={styles.linkedList}>
                            {linkedList.length > 0 ? (
                                linkedList.map((id: string) => {
                                    const targetCell = graph.getCell(id)
                                    const targetName = targetCell?.get('data')?.properties?.name ||
                                        targetCell?.get('data')?.text ||
                                        id.slice(0, 8)

                                    return (
                                        <div key={id} className={styles.linkedItem}>
                                            <span className={styles.targetName}>{targetName}</span>
                                            <button
                                                className={styles.unlinkBtn}
                                                onClick={() => onUnlink(key, id)}
                                                title="Unlink"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className={styles.emptyState}>No linked objects</div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
