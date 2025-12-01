/**
 * JointJS Element Factory
 * Creates JointJS elements from CSV data
 */

import { dia, shapes } from '@joint/core'
import {
  BanpoRow,
  GroupedEntity,
  transformCoordinates,
  coordsToSVGPath
} from '@/shared/lib/csvParser'
import {
  getAssetPath,
  getLayerFillColor,
  getLayerStrokeColor,
  getIconSize,
  isPointLayer,
  isPolygonLayer,
  isLineLayer,
  isTextLayer
} from '@/shared/lib/assetMapper'

/**
 * Create elements from grouped entities
 */
/**
 * Create elements from grouped entities
 */
export function createElementsFromEntities(
  entities: GroupedEntity[],
  bounds: { minX: number; minY: number }
): dia.Element[] {
  const elements: dia.Element[] = []

  entities.forEach(entity => {
    try {
      const element = createElementFromEntity(entity, bounds)
      if (element) {
        elements.push(element)
      }
    } catch (error) {
      console.error(`Error creating element for ${entity.layer}:`, error)
    }
  })

  console.log(`Created ${elements.length} elements from ${entities.length} entities`)
  return elements
}

/**
 * Create a single element from entity
 */
function createElementFromEntity(
  entity: GroupedEntity,
  bounds: { minX: number; minY: number }
): dia.Element | null {
  const { layer, points } = entity

  // Skip empty entities
  if (points.length === 0) return null

  // Route to appropriate renderer based on layer type
  if (isPolygonLayer(layer) && entity.isPolygon) {
    return createPolygonElement(entity, bounds)
  } else if (isPointLayer(layer)) {
    return createPointElements(entity, bounds)[0] // Return first point
  } else if (isLineLayer(layer)) {
    return createLineElement(entity, bounds)
  } else if (isTextLayer(layer)) {
    return createTextElement(entity, bounds)
  }

  return null
}

/**
 * Create polygon element (parking areas, zones)
 */
function createPolygonElement(
  entity: GroupedEntity,
  bounds: { minX: number; minY: number }
): dia.Element {
  const { layer, points, entityHandle } = entity

  // Transform all coordinates
  const transformedCoords = points.map(p =>
    transformCoordinates(p.x, p.y, { minX: bounds.minX, minY: bounds.minY })
  )

  // Generate SVG path
  const pathData = coordsToSVGPath(transformedCoords)

  // Create polygon element
  return new shapes.standard.Path({
    id: `${layer}_${entityHandle}`,
    attrs: {
      body: {
        refD: pathData,
        fill: getLayerFillColor(layer),
        stroke: getLayerStrokeColor(layer),
        strokeWidth: 2,
        opacity: 0.8
      },
      label: {
        text: '',
        fill: '#ffffff',
        fontSize: 12,
        refY: '50%',
        refX: '50%',
        textAnchor: 'middle',
        textVerticalAnchor: 'middle'
      }
    },
    data: {
      layer,
      entityHandle,
      type: 'polygon'
    }
  })
}

/**
 * Create point elements (CCTV, chargers, etc.)
 */
function createPointElements(
  entity: GroupedEntity,
  bounds: { minX: number; minY: number }
): dia.Element[] {
  const { layer, points } = entity
  const elements: dia.Element[] = []

  points.forEach((point, index) => {
    const pos = transformCoordinates(point.x, point.y, { minX: bounds.minX, minY: bounds.minY })
    const size = getIconSize(layer)
    const assetPath = getAssetPath(layer)

    const element = new shapes.standard.Image({
      id: `${layer}_${point.entityHandle}_${index}`,
      position: { x: pos.x - size.width / 2, y: pos.y - size.height / 2 },
      size,
      attrs: {
        image: {
          xlinkHref: assetPath,
          opacity: 0.9
        },
        label: {
          text: point.text || '',
          fill: '#ffffff',
          fontSize: 10,
          refY: size.height + 5,
          refX: '50%',
          textAnchor: 'middle'
        }
      },
      data: {
        layer,
        entityHandle: point.entityHandle,
        type: 'point',
        originalCoords: { x: point.x, y: point.y },
        text: point.text
      }
    })

    elements.push(element)
  })

  return elements
}

/**
 * Create line element (outlines, inner lines)
 */
function createLineElement(
  entity: GroupedEntity,
  bounds: { minX: number; minY: number }
): dia.Element | null {
  const { layer, points } = entity

  if (points.length < 2) return null

  // Transform coordinates
  const transformedCoords = points.map(p =>
    transformCoordinates(p.x, p.y, { minX: bounds.minX, minY: bounds.minY })
  )

  // Create polyline using Path
  const pathData = transformedCoords
    .map((point, i) =>
      i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    )
    .join(' ')

  return new shapes.standard.Path({
    id: `${layer}_${entity.entityHandle}`,
    attrs: {
      body: {
        refD: pathData,
        fill: 'none',
        stroke: getLayerStrokeColor(layer),
        strokeWidth: entity.isClosed ? 2 : 1.5,
        opacity: 0.8
      }
    },
    data: {
      layer,
      entityHandle: entity.entityHandle,
      type: 'line'
    }
  })
}

/**
 * Create text/label element
 */
function createTextElement(
  entity: GroupedEntity,
  bounds: { minX: number; minY: number }
): dia.Element | null {
  const { layer, points } = entity

  if (points.length === 0 || !points[0].text) return null

  const point = points[0]
  const pos = transformCoordinates(point.x, point.y, { minX: bounds.minX, minY: bounds.minY })

  return new shapes.standard.Rectangle({
    id: `${layer}_${point.entityHandle}`,
    position: { x: pos.x - 20, y: pos.y - 10 },
    size: { width: 40, height: 20 },
    attrs: {
      body: {
        fill: 'rgba(0, 0, 0, 0.6)',
        stroke: '#ffffff',
        strokeWidth: 1,
        rx: 3,
        ry: 3
      },
      label: {
        text: point.text,
        fill: '#ffffff',
        fontSize: 9,
        fontFamily: 'monospace',
        textAnchor: 'middle',
        textVerticalAnchor: 'middle',
        refX: '50%',
        refY: '50%'
      }
    },
    data: {
      layer,
      entityHandle: point.entityHandle,
      type: 'text',
      text: point.text
    }
  })
}

