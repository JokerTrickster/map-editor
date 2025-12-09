/**
 * Template Object Converter
 * Converts template initialObjects to JointJS elements
 */

import { dia, shapes } from '@joint/core'
import type { Template } from '@/entities/schema/types'

/**
 * Convert template initialObjects to JointJS elements
 */
export function convertTemplateObjectsToElements(
  initialObjects: any[],
  template: Template
): dia.Element[] {
  const elements: dia.Element[] = []

  initialObjects.forEach((obj: any) => {
    try {
      const element = convertTemplateObject(obj, template)
      if (element) {
        elements.push(element)
      }
    } catch (error) {
      console.error(`Error converting object ${obj.id}:`, error)
    }
  })

  console.log(`✅ Created ${elements.length} elements from template`)
  return elements
}

/**
 * Convert single template object to JointJS element
 */
function convertTemplateObject(obj: any, template: Template): dia.Element | null {
  const { geometry, type } = obj
  const objectType = template.objectTypes[type]

  if (!objectType) {
    console.warn(`Unknown type: ${type}`)
    return null
  }

  if (geometry.type === 'point') {
    return createPointElement(obj, objectType)
  }

  if (geometry.type === 'polygon') {
    return createPolygonElement(obj, objectType)
  }

  if (geometry.type === 'polyline') {
    return createPolylineElement(obj, objectType)
  }

  return null
}

/**
 * Create point element (CCTV, bell, etc.)
 */
function createPointElement(obj: any, objectType: any): dia.Element {
  const coords = obj.geometry.coordinates
  const size = obj.style.size || objectType.defaultStyle?.size || 32

  return new shapes.standard.Rectangle({
    id: obj.id,
    position: { x: coords[0] - size / 2, y: coords[1] - size / 2 },
    size: { width: size, height: size },
    attrs: {
      body: {
        fill: obj.style.color || objectType.defaultStyle?.color || '#3B82F6',
        stroke: 'none',
        opacity: 0.9,
        rx: size / 2,
        ry: size / 2
      },
      label: {
        text: obj.name,
        fill: '#ffffff',
        fontSize: 10,
        refY: size + 10,
        refX: '50%',
        textAnchor: 'middle'
      }
    },
    data: {
      type: obj.type,
      typeId: obj.type,
      name: obj.name,
      properties: obj.properties,
      geometryType: 'point'
    },
    objectTypeId: obj.type
  })
}

/**
 * Create polygon element (zone, parking, etc.)
 */
function createPolygonElement(obj: any, objectType: any): dia.Element {
  const coords = obj.geometry.coordinates

  // Calculate bounding box
  const xs = coords.map((c: number[]) => c[0])
  const ys = coords.map((c: number[]) => c[1])
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  const width = maxX - minX
  const height = maxY - minY

  // Convert to relative coordinates
  const relativeCoords = coords.map((c: number[]) => ({
    x: c[0] - minX,
    y: c[1] - minY
  }))

  // Generate SVG path
  const pathData = coordsToSVGPath(relativeCoords)

  return new shapes.standard.Path({
    id: obj.id,
    position: { x: minX, y: minY },
    size: { width: width || 1, height: height || 1 },
    attrs: {
      body: {
        d: pathData,
        fill: obj.style.color || objectType.defaultStyle?.color || '#10B981',
        fillOpacity: obj.style.fillOpacity ?? objectType.defaultStyle?.fillOpacity ?? 0.3,
        stroke: obj.style.strokeColor || objectType.defaultStyle?.strokeColor || '#059669',
        strokeWidth: obj.style.strokeWidth ?? objectType.defaultStyle?.strokeWidth ?? 2
      },
      label: {
        text: obj.name,
        fill: '#ffffff',
        fontSize: 12,
        refY: '50%',
        refX: '50%',
        textAnchor: 'middle',
        textVerticalAnchor: 'middle'
      }
    },
    data: {
      type: obj.type,
      typeId: obj.type,
      name: obj.name,
      properties: obj.properties,
      geometryType: 'polygon'
    },
    objectTypeId: obj.type
  })
}

/**
 * Create polyline element (arrows, lines, etc.)
 */
function createPolylineElement(obj: any, objectType: any): dia.Element {
  const coords = obj.geometry.coordinates

  const xs = coords.map((c: number[]) => c[0])
  const ys = coords.map((c: number[]) => c[1])
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  const width = maxX - minX
  const height = maxY - minY

  const relativeCoords = coords.map((c: number[]) => ({
    x: c[0] - minX,
    y: c[1] - minY
  }))

  const pathData = relativeCoords
    .map((point: any, i: number) => (i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
    .join(' ')

  return new shapes.standard.Path({
    id: obj.id,
    position: { x: minX, y: minY },
    size: { width: width || 1, height: height || 1 },
    attrs: {
      body: {
        d: pathData,
        fill: 'none',
        stroke: obj.style.color || objectType.defaultStyle?.color || '#F59E0B',
        strokeWidth: obj.style.strokeWidth ?? objectType.defaultStyle?.strokeWidth ?? 2
      }
    },
    data: {
      type: obj.type,
      typeId: obj.type,
      name: obj.name,
      properties: obj.properties,
      geometryType: 'polyline'
    },
    objectTypeId: obj.type
  })
}

/**
 * Convert coordinates to SVG path
 */
function coordsToSVGPath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return ''

  const pathSegments = coords.map((point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`
    }
    return `L ${point.x} ${point.y}`
  })

  pathSegments.push('Z') // Close path

  return pathSegments.join(' ')
}
