import { dia, shapes } from '@joint/core'
import { TemplateRelationType } from '@/entities/schema/templateSchema'
import { useObjectTypeStore } from '@/shared/store/objectTypeStore'

interface AutoLinkResult {
    sourceId: string
    targetIds: string[]
    relationKey: string
    maxDistance: number
    sourceCenter: { x: number; y: number }
}

/**
 * Parse cardinality string to extract max count
 * @param cardinality - "N" (unlimited) or "1:number" (e.g., "1:1", "1:5")
 * @returns max count or null for unlimited
 */
export function parseCardinality(cardinality: string): number | null {
    if (cardinality === 'N') {
        return null // unlimited
    }

    const match = cardinality.match(/^1:(\d+)$/)
    if (match) {
        return parseInt(match[1], 10)
    }

    console.warn(`Invalid cardinality format: ${cardinality}`)
    return null
}

export function autoLinkObjects(
    graph: dia.Graph,
    sourceElement: dia.Element,
    _relationKey: string,
    config: TemplateRelationType,
    uuidToTemplateType?: Map<string, string>
): string[] {
    if (!config.autoLink) return []

    const sourceCenter = sourceElement.getBBox().center()
    const candidates = graph.getElements().filter(el => {
        if (el.id === sourceElement.id) return false
        const typeId = el.get('data')?.typeId
        const templateTypeKey = uuidToTemplateType?.get(typeId) || typeId
        return templateTypeKey === config.targetType
    })

    const { strategy, maxDistance } = config.autoLink
    const linkedIds: string[] = []

    if (strategy === 'nearest') {
        // Find all candidates within range
        const inRange = candidates.filter(target => {
            const targetCenter = target.getBBox().center()
            const distance = sourceCenter.distance(targetCenter)
            return distance <= maxDistance
        })

        // Sort by distance
        inRange.sort((a, b) => {
            const distA = sourceCenter.distance(a.getBBox().center())
            const distB = sourceCenter.distance(b.getBBox().center())
            return distA - distB
        })

        const maxCount = parseCardinality(config.cardinality)

        if (maxCount === 1) {
            // Single relationship - link only nearest
            if (inRange.length > 0) {
                linkedIds.push(inRange[0].id as string)
            }
        } else if (maxCount === null) {
            // Unlimited - link all in range
            linkedIds.push(...inRange.map(el => el.id as string))
        } else {
            // Limited count - link up to maxCount nearest
            linkedIds.push(...inRange.slice(0, maxCount).map(el => el.id as string))
        }
    }

    return linkedIds
}

export function updateRelationship(
    element: dia.Element,
    propertyKey: string,
    targetId: string,
    cardinality: string,
    action: 'add' | 'remove'
) {
    const currentData = element.get('data') || {}
    const currentProps = currentData.properties || {}
    const value = currentProps[propertyKey]

    const maxCount = parseCardinality(cardinality)
    let newValue: string | string[] | undefined

    if (maxCount === 1) {
        // Single relationship (1:1)
        if (action === 'add') {
            newValue = targetId
        } else {
            newValue = undefined
        }
    } else {
        // Multiple relationships (1:N or N - unlimited)
        const list = Array.isArray(value) ? [...value] : (value ? [value] : [])

        if (action === 'add') {
            // Check max count limit
            if (maxCount !== null && list.length >= maxCount) {
                console.warn(`Cannot add more relations. Maximum limit (${maxCount}) reached.`)
                return currentData // Reject addition
            }

            if (!list.includes(targetId)) {
                list.push(targetId)
            }
        } else {
            const index = list.indexOf(targetId)
            if (index > -1) {
                list.splice(index, 1)
            }
        }
        newValue = list.length > 0 ? list : undefined
    }

    const newData = {
        ...currentData,
        properties: {
            ...currentProps,
            [propertyKey]: newValue
        }
    }

    element.set('data', newData)
    return newData
}

/**
 * Auto-link all objects based on template relation types
 */
export function autoLinkAllObjects(
    graph: dia.Graph,
    relationTypes: Record<string, TemplateRelationType>,
    template?: any,
    adjustedDistances?: Record<string, number>
): AutoLinkResult[] {
    const results: AutoLinkResult[] = []

    console.log('🔄 autoLinkAllObjects called with', Object.keys(relationTypes).length, 'relation types')

    // Build UUID to template type key mapping
    const uuidToTemplateType = new Map<string, string>()
    if (template?.objectTypes) {
        // Get object type store to map UUIDs
        const objectTypes = useObjectTypeStore.getState().types

        objectTypes.forEach(objType => {
            // Find matching template type by name
            const templateEntry = Object.entries(template.objectTypes).find(([_, tmplType]: [string, any]) =>
                tmplType.displayName === objType.name || tmplType.name === objType.name
            )
            if (templateEntry) {
                uuidToTemplateType.set(objType.id, templateEntry[0])
                console.log(`  🗺️ UUID mapping: ${objType.id} -> ${templateEntry[0]} (${objType.name})`)
            }
        })
    }

    // Process each relation type with autoLink config
    Object.entries(relationTypes).forEach(([key, config]) => {
        console.log(`\n📋 Processing relation: ${key}`, config)

        if (!config.autoLink) {
            console.log(`  ⏭️ Skipping ${key} - no autoLink config`)
            return
        }

        console.log(`  ✅ Has autoLink config:`, config.autoLink)

        // Find all source elements
        const sourceElements = graph.getElements().filter(el => {
            const typeId = el.get('data')?.typeId
            const templateTypeKey = uuidToTemplateType.get(typeId) || typeId
            const match = templateTypeKey === config.sourceType
            console.log(`    🔍 Element ${el.id}: typeId=${typeId}, templateType=${templateTypeKey}, sourceType=${config.sourceType}, match=${match}`)
            return match
        })

        console.log(`  📊 Found ${sourceElements.length} source elements for ${key}`)

        // Auto-link each source element
        sourceElements.forEach(sourceElement => {
            console.log(`  🎯 Processing source element:`, sourceElement.id)

            // Use adjusted distance if provided
            const configWithAdjustedDistance = adjustedDistances?.[key]
                ? { ...config, autoLink: { ...config.autoLink!, maxDistance: adjustedDistances[key] } }
                : config

            const linkedIds = autoLinkObjects(graph, sourceElement, key, configWithAdjustedDistance, uuidToTemplateType)
            console.log(`  🔗 Linked ${linkedIds.length} targets:`, linkedIds)

            if (linkedIds.length > 0) {
                // Update element properties
                const maxCount = parseCardinality(config.cardinality)

                if (maxCount === 1) {
                    // Single relationship - add only first
                    updateRelationship(
                        sourceElement,
                        config.propertyKey,
                        linkedIds[0],
                        config.cardinality,
                        'add'
                    )
                } else {
                    // Multiple relationships - add all linked IDs
                    linkedIds.forEach(targetId => {
                        updateRelationship(
                            sourceElement,
                            config.propertyKey,
                            targetId,
                            config.cardinality,
                            'add'
                        )
                    })
                }

                const sourceCenter = sourceElement.getBBox().center()
                const maxDistance = adjustedDistances?.[key] || config.autoLink!.maxDistance
                results.push({
                    sourceId: sourceElement.id as string,
                    targetIds: linkedIds,
                    relationKey: key,
                    maxDistance: maxDistance,
                    sourceCenter: { x: sourceCenter.x, y: sourceCenter.y }
                })
            }
        })
    })

    console.log(`\n✨ Total auto-link results: ${results.length}`)
    return results
}

/**
 * Create radius visualization circles for auto-link preview
 */
export function createRadiusCircles(
    paper: dia.Paper,
    results: AutoLinkResult[]
): dia.Element[] {
    const circles: dia.Element[] = []
    const colorMap = new Map<string, string>()
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
    let colorIndex = 0

    results.forEach(result => {
        // Get color for this source type
        if (!colorMap.has(result.sourceId)) {
            colorMap.set(result.sourceId, colors[colorIndex % colors.length])
            colorIndex++
        }
        const color = colorMap.get(result.sourceId)!

        // Create circle element with proper JointJS shape
        const circle = new shapes.standard.Circle({
            position: {
                x: result.sourceCenter.x - result.maxDistance,
                y: result.sourceCenter.y - result.maxDistance
            },
            size: {
                width: result.maxDistance * 2,
                height: result.maxDistance * 2
            },
            attrs: {
                body: {
                    fill: 'transparent',
                    stroke: color,
                    strokeWidth: 2,
                    strokeDasharray: '5,5',
                    opacity: 0.6
                }
            }
        })

        paper.model.addCell(circle)
        circles.push(circle)
    })

    return circles
}
