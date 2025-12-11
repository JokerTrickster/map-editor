import { dia, shapes } from '@joint/core'
import { TemplateRelationType } from '@/entities/schema/templateSchema'
import { getExistingRelationships } from './relationshipUtils'

interface RelationshipLink {
    linkElement: dia.Link
    sourceId: string
    targetId: string
    relationKey: string
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

            // Create visual link
            const link = new shapes.standard.Link({
                source: { id: sourceId },
                target: { id: targetId },
                attrs: {
                    line: {
                        stroke: '#3B82F6', // Blue color
                        strokeWidth: 2,
                        strokeDasharray: '5,5', // Dashed line
                        targetMarker: {
                            type: 'path',
                            d: 'M 10 -5 0 0 10 5 z', // Arrow
                            fill: '#3B82F6'
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
                relationKey
            })

            console.log(`  ✅ Created link: ${sourceId} → ${targetId}`)
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
 * Highlight relationship target elements
 * @param graph - The JointJS graph
 * @param paper - JointJS paper
 * @param targetIds - Array of target IDs to highlight
 */
export function highlightRelationshipTargets(
    graph: dia.Graph,
    paper: dia.Paper,
    targetIds: string[]
): void {
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
                                stroke: '#3B82F6',
                                'stroke-dasharray': '5,5'
                            }
                        }
                    }
                })
            }
        }
    })

    if (targetIds.length > 0) {
        console.log(`✨ Highlighted ${targetIds.length} target elements`)
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
