import { dia } from '@joint/core'

/**
 * Convert JointJS graph to MapData JSON format
 */
export function exportGraphToJSON(
  graph: dia.Graph,
  metadata?: {
    lotName?: string
    floorName?: string
    floorOrder?: number
    author?: string
    description?: string
  }
) {
  const elements = graph.getElements()

  const objects = elements.map(element => {
    const data = element.get('data') || {}
    const position = element.position()
    const size = element.size()

    // Convert element to MapObject format
    return {
      id: element.id as string,
      type: data.typeId || data.type || 'unknown',
      name: data.properties?.name || data.text || `Object-${(element.id as string).slice(0, 8)}`,
      layer: data.layer || 'default',
      entityHandle: data.entityHandle,
      geometry: {
        type: 'point' as const,
        coordinates: [position.x + size.width / 2, position.y + size.height / 2] as [number, number]
      },
      style: {
        color: data.style?.color,
        fillColor: data.style?.fillColor,
        strokeColor: data.style?.strokeColor,
        strokeWidth: data.style?.strokeWidth,
        opacity: data.style?.opacity,
        zIndex: data.style?.zIndex
      },
      properties: {
        ...data.properties,
        position: { x: position.x, y: position.y },
        size: { width: size.width, height: size.height }
      },
      assetRefs: data.assetRefs,
      relations: extractRelations(data.properties || {})
    }
  })

  return {
    version: '1.0.0',
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      author: metadata?.author || 'Map Editor',
      lotName: metadata?.lotName || 'Unnamed Lot',
      floorName: metadata?.floorName || 'Floor 1',
      floorOrder: metadata?.floorOrder || 1,
      description: metadata?.description
    },
    assets: [], // Assets will be populated if needed
    objects
  }
}

/**
 * Extract relations from element properties
 */
function extractRelations(properties: Record<string, any>) {
  const relations: Array<{ targetId: string; type: 'required' | 'optional' | 'reference'; meta?: Record<string, any> }> = []

  // Look for properties that contain object IDs (arrays or single values)
  Object.entries(properties).forEach(([key, value]) => {
    if (typeof value === 'string' && value.length > 0 && !['name', 'description'].includes(key)) {
      // Single relation
      relations.push({
        targetId: value,
        type: 'reference',
        meta: { propertyKey: key }
      })
    } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      // Multiple relations
      value.forEach(targetId => {
        relations.push({
          targetId,
          type: 'reference',
          meta: { propertyKey: key }
        })
      })
    }
  })

  return relations.length > 0 ? relations : undefined
}

/**
 * Download JSON as a file
 */
export function downloadJSON(data: any, filename: string = 'map-export.json') {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
