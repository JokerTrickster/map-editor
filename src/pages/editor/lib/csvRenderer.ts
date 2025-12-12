/**
 * CSV to JointJS Renderer
 * Converts grouped CSV layers to JointJS elements
 */

import { dia, shapes } from '@joint/core'
import type { GroupedLayer } from '@/features/csv'
import type { ObjectType } from '@/shared/store/objectTypeStore'

interface RenderResult {
  elements: dia.Element[]
  objectsByLayer: Map<string, dia.Element[]>
}

interface TypeMapping {
  entityHandle: string
  type: ObjectType
}

/**
 * Get fill color for layer
 */
function getLayerFillColor(layer: string): string {
  const layerLower = layer.toLowerCase()

  // Stroke-only layers
  if (layerLower.includes('lightinglineframe')) {
    return 'none'
  }
  if (layerLower.includes('parking') || layerLower.includes('주차')) {
    return '#4CAF50'
  }
  if (layerLower.includes('outline') || layerLower.includes('외곽')) {
    return 'none'
  }
  if (layerLower.includes('inner') || layerLower.includes('내부')) {
    return 'none'
  }

  return '#9E9E9E'
}

/**
 * Get stroke color for layer
 */
function getLayerStrokeColor(layer: string): string {
  const layerLower = layer.toLowerCase()

  // Special stroke colors
  if (layerLower.includes('lightinglineframe')) {
    return '#FBBF24' // Yellow for lighting frame
  }
  if (layerLower.includes('outline') || layerLower.includes('외곽')) {
    return '#000000'
  }
  if (layerLower.includes('inner') || layerLower.includes('내부')) {
    return '#666666'
  }

  return '#333333'
}

/**
 * Create elements from grouped layers with type mappings
 */
export function createElementsFromCSV(
  groupedLayers: GroupedLayer[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  typeMappings?: TypeMapping[]
): RenderResult {
  const objectsByLayer = new Map<string, dia.Element[]>()

  // Create mapping lookup map
  const mappingMap = new Map<string, ObjectType>()
  if (typeMappings) {
    typeMappings.forEach(mapping => {
      mappingMap.set(mapping.entityHandle, mapping.type)
    })
    console.log(`📌 Type mappings created: ${mappingMap.size} entities mapped`)
    // Log first few mappings
    const firstMappings = Array.from(mappingMap.entries()).slice(0, 3)
    firstMappings.forEach(([handle, type]) => {
      console.log(`  ${handle} → ${type.name} (priority: ${type.priority})`)
    })
  } else {
    console.log('⚠️ No type mappings provided!')
  }

  // Calculate scale factor to fit in canvas (1000px target width)
  const dataWidth = bounds.maxX - bounds.minX
  const TARGET_WIDTH = 1000
  const scale = dataWidth > 0 ? TARGET_WIDTH / dataWidth : 1

  // Collect all elements with their priorities first
  const elementsWithPriority: Array<{ element: dia.Element; priority: number; layer: string }> = []

  groupedLayers.forEach(layer => {
    const layerElements: dia.Element[] = []

    layer.entities.forEach(entity => {
      const mappedType = mappingMap.get(entity.entityHandle)

      if (!mappedType) {
        console.warn(`⚠️ No type mapping for entity ${entity.entityHandle} in layer ${layer.layer}`)
      }

      const element = createElementFromEntity(entity, bounds, scale, layer.layer, mappedType)

      if (element) {
        const priority = mappedType?.priority ?? 5
        elementsWithPriority.push({ element, priority, layer: layer.layer })
        layerElements.push(element)
      }
    })

    if (layerElements.length > 0) {
      objectsByLayer.set(layer.layer, layerElements)
    }
  })

  // Sort by priority (higher priority first, so they get higher z-index)
  // Elements added later get higher z-index in JointJS
  elementsWithPriority.sort((a, b) => b.priority - a.priority)

  // Extract sorted elements
  const sortedElements = elementsWithPriority.map(item => item.element)

  console.log('🎨 Element rendering order (by priority):')
  elementsWithPriority.slice(0, 5).forEach(item => {
    const type = item.element.prop('objectTypeId')
    console.log(`  Priority ${item.priority}: ${item.layer} (type: ${type})`)
  })

  return { elements: sortedElements, objectsByLayer }
}

/**
 * Create a single JointJS element from entity
 */
function createElementFromEntity(
  entity: any,
  bounds: { minX: number; minY: number },
  scale: number,
  layer: string,
  mappedType?: ObjectType
): dia.Element | null {
  const { points, entityHandle } = entity

  if (!points || points.length === 0) {
    return null
  }

  // Transform coordinates
  const transformedPoints = points.map((p: { x: number; y: number }) => ({
    x: (p.x - bounds.minX) * scale,
    y: (p.y - bounds.minY) * scale,
  }))

  // Calculate bounding box
  const xs = transformedPoints.map((p: { x: number }) => p.x)
  const ys = transformedPoints.map((p: { y: number }) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  const width = maxX - minX || 1
  const height = maxY - minY || 1

  // Determine colors based on mapped type
  let fillColor: string
  let strokeColor: string

  if (mappedType) {
    // If icon is a color code (starts with #), use it as fill color
    if (mappedType.icon && mappedType.icon.startsWith('#')) {
      fillColor = mappedType.icon
      strokeColor = mappedType.icon
    } else if (mappedType.color) {
      fillColor = mappedType.color
      strokeColor = mappedType.color
    } else {
      fillColor = getLayerFillColor(layer)
      strokeColor = getLayerStrokeColor(layer)
    }
  } else {
    fillColor = getLayerFillColor(layer)
    strokeColor = getLayerStrokeColor(layer)
  }

  // Check if icon is an actual asset file (from /assets/parking/)
  // Only use Image element for actual SVG/image files, not color codes
  const isActualAsset = mappedType?.icon &&
    (mappedType.icon.startsWith('/assets/parking/') ||
     mappedType.icon.startsWith('http'))

  // If type has an actual asset icon, create Image element
  if (isActualAsset) {
    // Determine icon size based on object type (CCTV is smaller)
    const isCCTV = mappedType?.name?.includes('CCTV')
    const iconSize = isCCTV ? 20 : 32
    const zIndex = mappedType?.priority ?? 5 // Default priority 5

    const image = new shapes.standard.Image({
      id: `${layer}_${entityHandle}`,
      position: { x: minX + (width - iconSize) / 2, y: minY + (height - iconSize) / 2 }, // Center icon
      size: { width: iconSize, height: iconSize },
      z: zIndex,
      attrs: {
        image: { xlinkHref: mappedType!.icon },
        label: {
          text: '', // No label
        }
      },
      data: {
        layer,
        entityHandle,
        type: 'csv-entity',
        typeId: mappedType?.id, // Store typeId in data for PropertyEditor
        properties: {
          name: entityHandle || '', // Use entityHandle as default name
        }, // Initialize properties with name
      }
    })

    // Store type ID for sync updates
    if (mappedType) {
      image.prop('objectTypeId', mappedType.id)
    }

    return image
  }

  // Convert to relative coordinates for SVG path
  const relativePoints = transformedPoints.map((p: { x: number; y: number }) => ({
    x: p.x - minX,
    y: p.y - minY,
  }))

  // Generate SVG path
  const pathData = relativePoints
    .map((p: { x: number; y: number }, i: number) =>
      i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
    )
    .join(' ')

  // Create path element
  const zIndex = mappedType?.priority ?? 5 // Default priority 5

  const element = new shapes.standard.Path({
    id: `${layer}_${entityHandle}`,
    position: { x: minX, y: minY },
    size: { width, height },
    z: zIndex,
    attrs: {
      body: {
        d: pathData,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: 2,
        opacity: 0.8,
      },
      label: {
        text: '', // No label
      },
    },
    data: {
      layer,
      entityHandle,
      type: 'csv-entity',
      typeId: mappedType?.id, // Store typeId in data for PropertyEditor
      properties: {
        name: entityHandle || '', // Use entityHandle as default name
      }, // Initialize properties with name
    },
  })

  // Store type ID for sync updates
  if (mappedType) {
    element.prop('objectTypeId', mappedType.id)
  }

  return element
}
