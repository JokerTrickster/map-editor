/**
 * Layer Grouper for CSV Entities
 *
 * Groups parsed entities by layer name and calculates metadata.
 */

import type { ParsedEntity } from './csvParser'

export interface GroupedLayer {
  layer: string
  entities: ParsedEntity[]
  count: number
  entityTypes: Set<string>
  bounds?: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
}

/**
 * Calculate bounding box from entity points
 */
function calculateBounds(
  entities: ParsedEntity[]
): { minX: number; maxX: number; minY: number; maxY: number } | undefined {
  if (entities.length === 0) {
    return undefined
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  let hasPoints = false

  entities.forEach(entity => {
    entity.points.forEach(point => {
      hasPoints = true
      minX = Math.min(minX, point.x)
      maxX = Math.max(maxX, point.x)
      minY = Math.min(minY, point.y)
      maxY = Math.max(maxY, point.y)
    })
  })

  if (!hasPoints) {
    return undefined
  }

  return { minX, maxX, minY, maxY }
}

/**
 * Sort layers by priority
 *
 * Priority order:
 * 1. OUTLINE (boundary layers)
 * 2. INNER_LINE, LINE, WALL (structural layers)
 * 3. PARKING_SPOT, PARKING (parking-related)
 * 4. CCTV, CHARGER, SENSOR (objects)
 * 5. TEXT, LABEL (annotations)
 * 6. Everything else alphabetically
 */
function sortLayersByPriority(layers: GroupedLayer[]): GroupedLayer[] {
  const priority = new Map<string, number>([
    // Boundaries first
    ['OUTLINE', 1],
    ['BOUNDARY', 1],
    ['BORDER', 1],

    // Structural elements
    ['INNER_LINE', 2],
    ['LINE', 2],
    ['WALL', 2],
    ['STRUCTURE', 2],

    // Parking areas
    ['PARKING_SPOT', 3],
    ['PARKING', 3],
    ['SPOT', 3],

    // Objects
    ['CCTV', 4],
    ['CHARGER', 4],
    ['SENSOR', 4],
    ['CAMERA', 4],
    ['EV_CHARGER', 4],

    // Annotations last
    ['TEXT', 5],
    ['LABEL', 5],
    ['ANNOTATION', 5]
  ])

  return layers.sort((a, b) => {
    const priorityA = priority.get(a.layer.toUpperCase()) ?? 99
    const priorityB = priority.get(b.layer.toUpperCase()) ?? 99

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    // Same priority: sort alphabetically
    return a.layer.localeCompare(b.layer)
  })
}

/**
 * Group entities by layer name
 *
 * @param entities - Parsed entities from CSV
 * @returns Array of grouped layers with metadata
 */
export function groupByLayer(entities: ParsedEntity[]): GroupedLayer[] {
  if (entities.length === 0) {
    return []
  }

  // Group by layer
  const layerMap = new Map<string, ParsedEntity[]>()

  entities.forEach(entity => {
    const layerName = entity.layer || 'UNKNOWN'

    if (!layerMap.has(layerName)) {
      layerMap.set(layerName, [])
    }

    layerMap.get(layerName)!.push(entity)
  })

  // Create grouped layer objects
  const groupedLayers: GroupedLayer[] = Array.from(layerMap.entries()).map(
    ([layer, layerEntities]) => {
      // Collect unique entity types
      const entityTypes = new Set<string>()
      layerEntities.forEach(entity => {
        entityTypes.add(entity.entityType)
      })

      return {
        layer,
        entities: layerEntities,
        count: layerEntities.length,
        entityTypes,
        bounds: calculateBounds(layerEntities)
      }
    }
  )

  // Sort by priority
  return sortLayersByPriority(groupedLayers)
}

/**
 * Get summary statistics from grouped layers
 */
export interface LayerSummary {
  totalLayers: number
  totalEntities: number
  layerNames: string[]
  entityTypeCount: number
  globalBounds?: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
}

export function getLayerSummary(groupedLayers: GroupedLayer[]): LayerSummary {
  const totalLayers = groupedLayers.length
  const totalEntities = groupedLayers.reduce((sum, layer) => sum + layer.count, 0)
  const layerNames = groupedLayers.map(layer => layer.layer)

  // Collect all unique entity types
  const allEntityTypes = new Set<string>()
  groupedLayers.forEach(layer => {
    layer.entityTypes.forEach(type => allEntityTypes.add(type))
  })

  // Calculate global bounds
  let globalBounds: LayerSummary['globalBounds']
  const validBounds = groupedLayers.map(l => l.bounds).filter(b => b !== undefined)

  if (validBounds.length > 0) {
    globalBounds = {
      minX: Math.min(...validBounds.map(b => b!.minX)),
      maxX: Math.max(...validBounds.map(b => b!.maxX)),
      minY: Math.min(...validBounds.map(b => b!.minY)),
      maxY: Math.max(...validBounds.map(b => b!.maxY))
    }
  }

  return {
    totalLayers,
    totalEntities,
    layerNames,
    entityTypeCount: allEntityTypes.size,
    globalBounds
  }
}
