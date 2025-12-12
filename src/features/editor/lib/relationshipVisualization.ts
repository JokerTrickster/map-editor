import { dia } from '@joint/core'
import { TemplateRelationType, Template } from '@/entities/schema/templateSchema'
import { ObjectType } from '@/shared/store/objectTypeStore'
import { getExistingRelationships } from './relationshipUtils'
import { routeObjectByType } from './exportUtils'

interface RelationshipLink {
    linkElement: dia.Link
    sourceId: string
    targetId: string
    relationKey: string
    relationName: string
    color: string
}

/**
 * Create visual link elements for all relationships of a selected element
 * @param graph - The JointJS graph
 * @param selectedElement - The currently selected element
 * @param relationTypes - Available relation types
 * @param template - Template configuration with object types
 * @param objectTypes - Available object types from store
 * @returns Array of created link elements
 */
export function createRelationshipLinks(
    graph: dia.Graph,
    selectedElement: dia.Element,
    relationTypes: Record<string, TemplateRelationType>,
    template?: Template,
    objectTypes?: ObjectType[]
): RelationshipLink[] {
    const links: RelationshipLink[] = []
    const sourceId = selectedElement.id as string
    const data = selectedElement.get('data') || {}
    const typeId = data?.typeId || data?.type
    const layer = data?.layer

    // Build UUID to template type key mapping (same pattern as relationshipUtils.ts)
    const uuidToTemplateType = new Map<string, string>()
    if (template?.objectTypes && objectTypes) {
        objectTypes.forEach(objType => {
            const templateEntry = Object.entries(template.objectTypes).find(([key, tmplType]: [string, any]) => {
                // First try exact match
                if (tmplType.displayName === objType.name) return true
                // Then try normalized match
                const normalizedType = routeObjectByType(objType.name)
                return key === normalizedType
            })
            if (templateEntry) {
                uuidToTemplateType.set(objType.id, templateEntry[0])
            }
        })
        console.log(`  📍 UUID mapping created: ${uuidToTemplateType.size} mappings`)
    }

    // Get template type key for the selected element
    let templateTypeKey = uuidToTemplateType.get(typeId) || typeId

    // If no typeId but has layer, try to normalize layer name
    if (!templateTypeKey && layer && /^[cep]-/i.test(layer)) {
        templateTypeKey = routeObjectByType(layer)
        console.log(`  🔄 Using layer for source: "${layer}" -> "${templateTypeKey}"`)
    }

    console.log(`🔍 Source element type resolution:`, {
        typeId,
        layer,
        templateTypeKey,
        availableRelations: Object.keys(relationTypes)
    })

    // Find all relation types where this element is the source
    const relevantRelations = Object.entries(relationTypes).filter(
        ([_, config]) => {
            const match = config.sourceType === templateTypeKey
            console.log(`  🎯 Checking relation ${_}: sourceType=${config.sourceType}, templateTypeKey=${templateTypeKey}, match=${match}`)
            return match
        }
    )

    console.log(`🔗 Creating relationship visualizations for ${sourceId}:`, {
        elementType: templateTypeKey,
        relevantRelationCount: relevantRelations.length
    })

    // Create links for each relationship (without visual link elements, just data)
    relevantRelations.forEach(([relationKey, config]) => {
        const targetIds = getExistingRelationships(selectedElement, config.propertyKey)

        console.log(`  📌 Relation ${relationKey}:`, {
            propertyKey: config.propertyKey,
            targetCount: targetIds.length,
            targets: targetIds
        })

        targetIds.forEach(targetId => {
            const targetElement = graph.getCell(targetId)
            if (!targetElement || !targetElement.isElement()) {
                console.warn(`  ⚠️ Target element not found: ${targetId}`)
                return
            }

            // Unified red color for all relationships
            const unifiedColor = '#EF4444'

            // Don't create visual link elements - just track the relationship data
            // The highlighting is done separately via highlightRelationshipTargets()
            links.push({
                linkElement: null as any, // No visual link element
                sourceId,
                targetId,
                relationKey,
                relationName: config.name,
                color: unifiedColor
            })

            console.log(`  ✅ Tracked relationship: ${sourceId} → ${targetId} (${unifiedColor})`)
        })
    })

    console.log(`🎨 Total ${links.length} relationships tracked (no visual links)`)
    return links
}

/**
 * Remove all relationship visualization links
 * @param graph - The JointJS graph
 */
export function clearRelationshipLinks(graph: dia.Graph): void {
    const links = graph.getLinks().filter(link =>
        link.get('isRelationshipVisualization') === true
    )

    links.forEach(link => link.remove())

    if (links.length > 0) {
        console.log(`🧹 Removed ${links.length} relationship visualization links`)
    }
}

/**
 * Highlight relationship target elements with relationship-specific colors
 * @param graph - The JointJS graph
 * @param paper - JointJS paper
 * @param links - Array of relationship links with color information
 */
export function highlightRelationshipTargets(
    graph: dia.Graph,
    paper: dia.Paper,
    links: RelationshipLink[]
): void {
    const targetIds = new Set(links.map(link => link.targetId))

    // Apply CSS class-based highlights to all relationship targets
    let highlightCount = 0
    targetIds.forEach(targetId => {
        const targetElement = graph.getCell(targetId)
        if (targetElement && targetElement.isElement()) {
            const view = paper.findViewByModel(targetElement)
            if (view && view.el) {
                // Add CSS class for relationship highlight
                view.el.classList.add('relationship-target-highlight')
                highlightCount++
            }
        }
    })

    if (highlightCount > 0) {
        console.log(`✨ Highlighted ${highlightCount} target elements with red CSS class`)
    }
}

/**
 * Remove highlights from all elements
 * @param graph - The JointJS graph
 * @param paper - JointJS paper
 */
export function clearTargetHighlights(
    graph: dia.Graph,
    paper: dia.Paper
): void {
    let clearedCount = 0
    graph.getElements().forEach(element => {
        const view = paper.findViewByModel(element)
        if (view && view.el) {
            // Remove CSS class for relationship highlight
            if (view.el.classList.contains('relationship-target-highlight')) {
                view.el.classList.remove('relationship-target-highlight')
                clearedCount++
            }
        }
    })
    if (clearedCount > 0) {
        console.log(`🧹 Cleared red highlights from ${clearedCount} elements`)
    }
}

/**
 * Dim non-related elements to make relationships stand out
 * @param graph - The JointJS graph
 * @param paper - JointJS paper
 * @param selectedElementId - The currently selected element
 * @param relatedElementIds - Array of element IDs that are related (targets)
 */
export function dimNonRelatedElements(
    graph: dia.Graph,
    paper: dia.Paper,
    selectedElementId: string,
    relatedElementIds: string[]
): void {
    const relatedSet = new Set([selectedElementId, ...relatedElementIds])
    let dimmedCount = 0

    graph.getElements().forEach(element => {
        const elementId = element.id as string

        // Skip if this element is the selected one or a related target
        if (relatedSet.has(elementId)) return

        const view = paper.findViewByModel(element)
        if (view && view.el) {
            // Apply strong dimming effect using CSS
            view.el.style.opacity = '0.15'
            view.el.style.filter = 'grayscale(100%) blur(1px)'
            dimmedCount++
        }
    })

    if (dimmedCount > 0) {
        console.log(`🌑 Dimmed ${dimmedCount} non-related elements`)
    }
}

/**
 * Remove dimming from all elements
 * @param graph - The JointJS graph
 * @param paper - JointJS paper
 */
export function clearElementDimming(
    graph: dia.Graph,
    paper: dia.Paper
): void {
    graph.getElements().forEach(element => {
        const view = paper.findViewByModel(element)
        if (view && view.el) {
            view.el.style.opacity = ''
            view.el.style.filter = ''
        }
    })
}
