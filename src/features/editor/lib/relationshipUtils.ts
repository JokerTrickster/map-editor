import { dia, shapes } from '@joint/core'
import { TemplateRelationType } from '@/entities/schema/templateSchema'
import { useObjectTypeStore } from '@/shared/store/objectTypeStore'

interface AutoLinkResult {
    sourceId: string
    targetIds: string[]
    relationKey: string
    maxDistance: number
    sourceCenter: { x: number; y: number }
    skipped?: {
        sourceIds: string[]
        reasons: Record<string, string>
    }
    existingCount?: number
    addedCount?: number
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

/**
 * Get existing relationships for an element's property
 * @param element - The source element
 * @param propertyKey - The property key that stores relationships
 * @returns Array of target IDs (empty array if none)
 */
export function getExistingRelationships(
    element: dia.Element,
    propertyKey: string
): string[] {
    const currentData = element.get('data') || {}
    const currentProps = currentData.properties || {}
    const value = currentProps[propertyKey]

    if (!value) return []
    if (Array.isArray(value)) return value
    return [value]
}

/**
 * Calculate remaining capacity for relationships
 * @param element - The source element
 * @param propertyKey - The property key that stores relationships
 * @param cardinality - The cardinality constraint
 * @returns Remaining slots (null for unlimited)
 */
export function getRemainingCapacity(
    element: dia.Element,
    propertyKey: string,
    cardinality: string
): number | null {
    const maxCount = parseCardinality(cardinality)

    // Unlimited capacity
    if (maxCount === null) return null

    const existing = getExistingRelationships(element, propertyKey)
    const remaining = maxCount - existing.length

    console.log(`  📊 Capacity check: max=${maxCount}, existing=${existing.length}, remaining=${remaining}`)
    return Math.max(0, remaining)
}

/**
 * Check if a target is already linked
 * @param element - The source element
 * @param propertyKey - The property key that stores relationships
 * @param targetId - The target ID to check
 * @returns true if already linked
 */
export function isAlreadyLinked(
    element: dia.Element,
    propertyKey: string,
    targetId: string
): boolean {
    const existing = getExistingRelationships(element, propertyKey)
    return existing.includes(targetId)
}

export function autoLinkObjects(
    graph: dia.Graph,
    sourceElement: dia.Element,
    _relationKey: string,
    config: TemplateRelationType,
    uuidToTemplateType?: Map<string, string>,
    maxLinksToCreate?: number
): string[] {
    if (!config.autoLink) return []

    const sourceCenter = sourceElement.getBBox().center()
    const allowDuplicates = config.autoLink.allowDuplicates ?? false

    // Get existing relationships to filter out duplicates (unless allowed)
    const existingTargets = getExistingRelationships(sourceElement, config.propertyKey)
    console.log(`  🔍 Existing relationships for ${sourceElement.id}:`, existingTargets)
    console.log(`  🔄 Allow duplicates: ${allowDuplicates}`)

    const candidates = graph.getElements().filter(el => {
        if (el.id === sourceElement.id) return false

        // Filter out already linked targets (unless duplicates are allowed)
        if (!allowDuplicates && existingTargets.includes(el.id as string)) {
            console.log(`  ⏭️ Skipping ${el.id} - already linked (duplicates not allowed)`)
            return false
        }

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

        // Determine the actual limit
        const maxCount = parseCardinality(config.cardinality)
        let effectiveLimit: number | null = maxCount

        // If maxLinksToCreate is provided and is more restrictive, use it
        if (maxLinksToCreate !== undefined) {
            if (effectiveLimit === null) {
                effectiveLimit = maxLinksToCreate
            } else {
                effectiveLimit = Math.min(effectiveLimit, maxLinksToCreate)
            }
        }

        console.log(`  📏 Link limits: cardinality=${maxCount}, maxLinksToCreate=${maxLinksToCreate}, effective=${effectiveLimit}`)

        if (effectiveLimit === 1) {
            // Single relationship - link only nearest
            if (inRange.length > 0) {
                linkedIds.push(inRange[0].id as string)
            }
        } else if (effectiveLimit === null) {
            // Unlimited - link all in range
            linkedIds.push(...inRange.map(el => el.id as string))
        } else {
            // Limited count - link up to effectiveLimit nearest
            linkedIds.push(...inRange.slice(0, effectiveLimit).map(el => el.id as string))
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
    const skippedSources: Record<string, { sourceIds: string[], reasons: Record<string, string> }> = {}

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

        // Initialize skip tracking for this relation type
        if (!skippedSources[key]) {
            skippedSources[key] = { sourceIds: [], reasons: {} }
        }

        // Auto-link each source element
        sourceElements.forEach(sourceElement => {
            console.log(`  🎯 Processing source element:`, sourceElement.id)

            // Calculate remaining capacity
            const remainingCapacity = getRemainingCapacity(
                sourceElement,
                config.propertyKey,
                config.cardinality
            )

            console.log(`  📊 Remaining capacity for ${sourceElement.id}: ${remainingCapacity}`)

            // Skip if already at max capacity
            if (remainingCapacity !== null && remainingCapacity === 0) {
                console.log(`  ⏭️ Skipping ${sourceElement.id} - already at max capacity`)
                skippedSources[key].sourceIds.push(sourceElement.id as string)
                skippedSources[key].reasons[sourceElement.id as string] = 'max_capacity_reached'
                return
            }

            // Get existing relationships count
            const existingCount = getExistingRelationships(sourceElement, config.propertyKey).length

            // Use adjusted distance if provided
            const configWithAdjustedDistance = adjustedDistances?.[key]
                ? { ...config, autoLink: { ...config.autoLink!, maxDistance: adjustedDistances[key] } }
                : config

            // Pass remaining capacity to autoLinkObjects
            const linkedIds = autoLinkObjects(
                graph,
                sourceElement,
                key,
                configWithAdjustedDistance,
                uuidToTemplateType,
                remainingCapacity ?? undefined
            )

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
                    sourceCenter: { x: sourceCenter.x, y: sourceCenter.y },
                    existingCount,
                    addedCount: linkedIds.length
                })
            } else if (existingCount > 0) {
                // Element has existing relationships but no new ones added
                console.log(`  ℹ️ ${sourceElement.id} has ${existingCount} existing relationships, no new ones added`)
            }
        })

        // Add skip information to results if any sources were skipped
        if (skippedSources[key].sourceIds.length > 0) {
            console.log(`  ⏭️ Skipped ${skippedSources[key].sourceIds.length} sources for ${key}:`, skippedSources[key])
        }
    })

    // Add aggregated skip information to results
    const totalSkipped = Object.values(skippedSources).reduce((sum, skip) => sum + skip.sourceIds.length, 0)
    if (totalSkipped > 0) {
        console.log(`\n⏭️ Total skipped sources: ${totalSkipped}`)
        // Add skip info to first result or create a summary result
        if (results.length > 0) {
            results[0].skipped = Object.entries(skippedSources).reduce((acc, [_key, skip]) => {
                if (skip.sourceIds.length > 0) {
                    acc.sourceIds.push(...skip.sourceIds)
                    Object.assign(acc.reasons, skip.reasons)
                }
                return acc
            }, { sourceIds: [] as string[], reasons: {} as Record<string, string> })
        }
    }

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
