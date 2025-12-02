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
export function createElementsFromEntities(
  entities: GroupedEntity[],
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
): dia.Element[] {
  const elements: dia.Element[] = []

  // Calculate scale factor to make the map fit well in canvas
  // CAD coordinates are typically in mm, so we need to scale for pixel display
  const dataWidth = bounds.maxX - bounds.minX
  const dataHeight = Math.abs(bounds.maxY - bounds.minY)

  // Target width in pixels (e.g., 1000px) to ensure 100% zoom fits the screen
  const TARGET_WIDTH = 1000
  const baseScale = TARGET_WIDTH / dataWidth

  console.log(`📏 Data bounds: ${dataWidth.toFixed(0)} x ${dataHeight.toFixed(0)}`)
  console.log(`📏 Target width: ${TARGET_WIDTH}`)
  console.log(`📏 Scale factor: ${baseScale.toFixed(4)}`)
  console.log(`📏 Scaled size: ${(dataWidth * baseScale).toFixed(0)} x ${(dataHeight * baseScale).toFixed(0)}`)

  const transformBounds = {
    ...bounds,
    scale: baseScale
  }

  entities.forEach(entity => {
    try {
      const element = createElementFromEntity(entity, transformBounds)
      if (element) {
        elements.push(element)
      }
    } catch (error) {
      console.error(`Error creating element for ${entity.layer}:`, error)
    }
  })

  console.log(`✅ Created ${elements.length} elements from ${entities.length} entities`)
  return elements
}

/**
 * Calculate centroid of a polygon
 */
function calculateCentroid(points: BanpoRow[]): { x: number; y: number } {
  let sumX = 0
  let sumY = 0

  points.forEach(point => {
    sumX += point.x
    sumY += point.y
  })

  return {
    x: sumX / points.length,
    y: sumY / points.length
  }
}

/**
 * Create a single element from entity
 */
function createElementFromEntity(
  entity: GroupedEntity,
  bounds: { minX: number; minY: number; scale: number }
): dia.Element | null {
  const { layer, points } = entity

  // Skip empty entities
  if (points.length === 0) return null

  // IMPORTANT: Point layers should render as icons/assets, not polygons
  // Even if they have multiple coordinates forming a closed shape
  if (isPointLayer(layer)) {
    // For point layers with closed polygons (like e-onepassreader),
    // calculate the centroid and place the asset there
    return createPointElementFromPolygon(entity, bounds)
  }

  // Text layers (labels)
  if (isTextLayer(layer)) {
    return createTextElement(entity, bounds)
  }

  // Polygon layers (parking spots, zones)
  if (isPolygonLayer(layer) && entity.isPolygon) {
    return createPolygonElement(entity, bounds)
  }

  // Line layers (outlines, inner lines)
  if (isLineLayer(layer)) {
    return createLineElement(entity, bounds)
  }

  // Fallback: if entity is a closed polygon but not classified, render as line
  if (entity.isClosed && points.length >= 3) {
    return createLineElement(entity, bounds)
  }

  return null
}

/**
 * Create polygon element (parking areas, zones)
 */
function createPolygonElement(
  entity: GroupedEntity,
  bounds: { minX: number; minY: number; scale: number }
): dia.Element {
  const { layer, points, entityHandle } = entity

  // Transform all coordinates
  const transformedCoords = points.map(p =>
    transformCoordinates(p.x, p.y, { minX: bounds.minX, minY: bounds.minY, scale: bounds.scale })
  )

  // Calculate bounding box for positioning
  const xs = transformedCoords.map(p => p.x)
  const ys = transformedCoords.map(p => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  const width = maxX - minX
  const height = maxY - minY

  // Convert to relative coordinates for the path
  const relativeCoords = transformedCoords.map(p => ({
    x: p.x - minX,
    y: p.y - minY
  }))

  // Generate SVG path using relative coordinates
  const pathData = coordsToSVGPath(relativeCoords)

  // Create polygon element with explicit position and size
  return new shapes.standard.Path({
    id: `${layer}_${entityHandle}`,
    position: { x: minX, y: minY },
    size: { width: width || 1, height: height || 1 },
    attrs: {
      body: {
        d: pathData,
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
 * Create point element from polygon (e.g., e-onepassreader)
 * Places asset icon at the centroid of the closed shape
 */
function createPointElementFromPolygon(
  entity: GroupedEntity,
  bounds: { minX: number; minY: number; scale: number }
): dia.Element {
  const { layer, points, entityHandle } = entity

  // Calculate centroid of the polygon
  const centroid = calculateCentroid(points)
  const pos = transformCoordinates(centroid.x, centroid.y, { minX: bounds.minX, minY: bounds.minY, scale: bounds.scale })

  const size = getIconSize(layer)
  const assetPath = getAssetPath(layer)

  return new shapes.standard.Image({
    id: `${layer}_${entityHandle}`,
    position: { x: pos.x - size.width / 2, y: pos.y - size.height / 2 },
    size,
    attrs: {
      image: {
        xlinkHref: assetPath,
        opacity: 0.9
      },
      label: {
        text: points[0].text || '',
        fill: '#ffffff',
        fontSize: 10,
        refY: size.height + 5,
        refX: '50%',
        textAnchor: 'middle'
      }
    },
    data: {
      layer,
      entityHandle,
      type: 'point',
      originalCoords: { x: centroid.x, y: centroid.y },
      text: points[0].text
    }
  })
}


/**
 * Create line element (outlines, inner lines)
 */
function createLineElement(
  entity: GroupedEntity,
  bounds: { minX: number; minY: number; scale: number }
): dia.Element | null {
  const { layer, points } = entity

  if (points.length < 2) return null

  // Transform coordinates
  const transformedCoords = points.map(p =>
    transformCoordinates(p.x, p.y, { minX: bounds.minX, minY: bounds.minY, scale: bounds.scale })
  )

  // Calculate bounding box
  const xs = transformedCoords.map(p => p.x)
  const ys = transformedCoords.map(p => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  const width = maxX - minX
  const height = maxY - minY

  // Convert to relative coordinates
  const relativeCoords = transformedCoords.map(p => ({
    x: p.x - minX,
    y: p.y - minY
  }))

  // Create polyline using relative coordinates
  const pathData = relativeCoords
    .map((point, i) =>
      i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    )
    .join(' ')

  // Create line element with explicit position and size
  return new shapes.standard.Path({
    id: `${layer}_${entity.entityHandle}`,
    position: { x: minX, y: minY },
    size: { width: width || 1, height: height || 1 },
    attrs: {
      body: {
        d: pathData,
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
  bounds: { minX: number; minY: number; scale: number }
): dia.Element | null {
  const { layer, points } = entity

  if (points.length === 0 || !points[0].text) return null

  const point = points[0]
  const pos = transformCoordinates(point.x, point.y, { minX: bounds.minX, minY: bounds.minY, scale: bounds.scale })

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

