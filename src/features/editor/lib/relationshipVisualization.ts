import { dia, shapes } from '@joint/core'
import { TemplateRelationType } from '@/entities/schema/templateSchema'
import { getExistingRelationships } from './relationshipUtils'

interface RelationshipLink {
    linkElement: dia.Link
    sourceId: string
    targetId: string
    relationKey: string
    relationName: string
    color: string
}

/**
 * Get color and style for relationship type
 * Based on UI/UX design: different colors for different relationship semantics
 */
function getRelationshipStyle(relationKey: string, relationName: string): {
    color: string
    strokeWidth: number
    dasharray?: string
} {
    // Normalize relation name for matching
    const nameLower = relationName.toLowerCase()
    const keyLower = relationKey.toLowerCase()

    // Monitoring relationships - Blue (observation/surveillance)
    if (nameLower.includes('모니터링') || nameLower.includes('monitor') || keyLower.includes('monitor')) {
        return { color: '#3B82F6', strokeWidth: 2 } // blue-500
    }

    // Coverage relationships - Green (protection/safety)
    if (nameLower.includes('커버') || nameLower.includes('cover') || keyLower.includes('cover')) {
        return { color: '#10B981', strokeWidth: 2 } // green-500
    }

    // Connection relationships - Purple (physical/system connection)
    if (nameLower.includes('연결') || nameLower.includes('connect') || keyLower.includes('connect') ||
        keyLower.includes('cctv_left') || keyLower.includes('cctv_right')) {
        return { color: '#8B5CF6', strokeWidth: 2 } // purple-500
    }

    // Emergency/Bell relationships - Pink (service/emergency)
    if (nameLower.includes('비상') || nameLower.includes('emergency') || nameLower.includes('bell')) {
        return { color: '#EC4899', strokeWidth: 2 } // pink-500
    }

    // Proximity relationships - Amber (attention/reference)
    if (nameLower.includes('근처') || nameLower.includes('near') || nameLower.includes('adjacent')) {
        return { color: '#F59E0B', strokeWidth: 1.5, dasharray: '4,2' } // amber-500, dashed
    }

    // Default - Gray
    return { color: '#6B7280', strokeWidth: 2 } // gray-500
}

/**
 * Create visual link elements for all relationships of a selected element
 * @param graph - The JointJS graph
 * @param selectedElement - The currently selected element
 * @param relationTypes - Available relation types
 * @returns Array of created link elements
 */
export function createRelationshipLinks(
    graph: dia.Graph,
    selectedElement: dia.Element,
    relationTypes: Record<string, TemplateRelationType>
): RelationshipLink[] {
    const links: RelationshipLink[] = []
    const sourceId = selectedElement.id as string
    const elementTypeId = selectedElement.get('data')?.typeId || selectedElement.get('data')?.type

    // Find all relation types where this element is the source
    const relevantRelations = Object.entries(relationTypes).filter(
        ([_, config]) => config.sourceType === elementTypeId
    )

    console.log(`🔗 Creating relationship visualizations for ${sourceId}:`, {
        elementType: elementTypeId,
        relevantRelationCount: relevantRelations.length
    })

    // Create links for each relationship
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

            // Get relationship-specific style
            const style = getRelationshipStyle(relationKey, config.name)

            // Create visual link with relationship-specific color
            const link = new shapes.standard.Link({
                source: { id: sourceId },
                target: { id: targetId },
                attrs: {
                    line: {
                        stroke: style.color,
                        strokeWidth: style.strokeWidth,
                        strokeDasharray: style.dasharray || '0',
                        targetMarker: {
                            type: 'path',
                            d: 'M 10 -5 0 0 10 5 z', // Arrow
                            fill: style.color
                        }
                    }
                },
                z: 1000, // Ensure links appear on top
                router: { name: 'manhattan' }, // Right-angle routing
                connector: { name: 'rounded' } // Rounded corners
            })

            // Add custom data to identify this as a temp visualization
            link.set('isRelationshipVisualization', true)
            link.set('relationKey', relationKey)

            graph.addCell(link)

            links.push({
                linkElement: link,
                sourceId,
                targetId,
                relationKey,
                relationName: config.name,
                color: style.color
            })

            console.log(`  ✅ Created link: ${sourceId} → ${targetId} (${style.color})`)
        })
    })

    console.log(`🎨 Total ${links.length} relationship links created`)
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
    // Group targets by their relationship color for efficient highlighting
    const targetsByColor = new Map<string, string[]>()

    links.forEach(link => {
        if (!targetsByColor.has(link.color)) {
            targetsByColor.set(link.color, [])
        }
        targetsByColor.get(link.color)!.push(link.targetId)
    })

    // Apply highlights with relationship-specific colors
    let highlightCount = 0
    targetsByColor.forEach((targetIds, color) => {
        targetIds.forEach(targetId => {
            const targetElement = graph.getCell(targetId)
            if (targetElement && targetElement.isElement()) {
                const view = paper.findViewByModel(targetElement)
                if (view) {
                    view.highlight(null, {
                        highlighter: {
                            name: 'stroke',
                            options: {
                                padding: 5,
                                rx: 5,
                                ry: 5,
                                attrs: {
                                    'stroke-width': 3,
                                    stroke: color,
                                    'stroke-dasharray': '5,5'
                                }
                            }
                        }
                    })
                    highlightCount++
                }
            }
        })
    })

    if (highlightCount > 0) {
        console.log(`✨ Highlighted ${highlightCount} target elements with relationship-specific colors`)
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
    graph.getElements().forEach(element => {
        const view = paper.findViewByModel(element)
        if (view) {
            view.unhighlight()
        }
    })
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
            // Apply dimming effect using CSS
            view.el.style.opacity = '0.3'
            view.el.style.filter = 'grayscale(50%)'
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
