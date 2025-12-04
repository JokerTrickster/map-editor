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
  const elements: dia.Element[] = []
  const objectsByLayer = new Map<string, dia.Element[]>()

  // Create mapping lookup map
  const mappingMap = new Map<string, ObjectType>()
  if (typeMappings) {
    typeMappings.forEach(mapping => {
      mappingMap.set(mapping.entityHandle, mapping.type)
    })
  }

  // Calculate scale factor to fit in canvas (1000px target width)
  const dataWidth = bounds.maxX - bounds.minX
  const TARGET_WIDTH = 1000
  const scale = dataWidth > 0 ? TARGET_WIDTH / dataWidth : 1

  groupedLayers.forEach(layer => {
    const layerElements: dia.Element[] = []

    layer.entities.forEach(entity => {
      const mappedType = mappingMap.get(entity.entityHandle)
      const element = createElementFromEntity(entity, bounds, scale, layer.layer, mappedType)

      if (element) {
        elements.push(element)
        layerElements.push(element)
      }
    })

    if (layerElements.length > 0) {
      objectsByLayer.set(layer.layer, layerElements)
    }
  })

  return { elements, objectsByLayer }
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

  // Use mapped type color/icon if available
  const fillColor = mappedType?.color || getLayerFillColor(layer)
  const strokeColor = mappedType?.color || getLayerStrokeColor(layer)
  const labelText = mappedType?.name || ''

  // If type has icon, create Image element instead
  if (mappedType?.icon) {
    const image = new shapes.standard.Image({
      id: `${layer}_${entityHandle}`,
      position: { x: minX, y: minY },
      size: { width, height },
      attrs: {
        image: { xlinkHref: mappedType.icon },
        label: {
          text: labelText,
          fill: '#ffffff',
          fontSize: 12,
          refY: '100%',
          refY2: 5
        }
      },
      data: {
        layer,
        entityHandle,
        type: 'csv-entity',
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
  const element = new shapes.standard.Path({
    id: `${layer}_${entityHandle}`,
    position: { x: minX, y: minY },
    size: { width, height },
    attrs: {
      body: {
        d: pathData,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: 2,
        opacity: 0.8,
      },
      label: {
        text: labelText,
        fill: '#ffffff',
        fontSize: 12,
      },
    },
    data: {
      layer,
      entityHandle,
      type: 'csv-entity',
    },
  })

  // Store type ID for sync updates
  if (mappedType) {
    element.prop('objectTypeId', mappedType.id)
  }

  return element
}
