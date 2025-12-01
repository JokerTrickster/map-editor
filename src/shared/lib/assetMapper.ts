/**
 * Asset Type Mapping
 * Maps layer types to SVG asset file paths
 */

export const ASSET_TYPE_TO_PATH: Record<string, string> = {
  // CCTV
  'c-cctv': '/assets/cctv.svg',
  'c-cctv-ip': '/assets/cctv.svg',
  'c-cctv-id': '/assets/cctv.svg',

  // Emergency
  'c-emergencybell': '/assets/warning.svg',

  // Chargers & Electric
  'e-charger': '/assets/charger.svg',
  'p-parking-large-electric': '/assets/electric.svg',
  'p-parking-electric': '/assets/electric.svg',

  // Parking Types
  'p-parking-basic': '/assets/common.svg',
  'p-parking-large': '/assets/common.svg',
  'p-parking-large-women': '/assets/common.svg',
  'p-parking-small': '/assets/small_car.svg',
  'p-parking-disable': '/assets/handicap.svg',
  'p-parking-disabled': '/assets/handicap.svg',

  // Facilities
  'e-elevator': '/assets/elevator.svg',
  'e-entrance': '/assets/marker.svg',
  'e-onepassreader': '/assets/marker.svg',

  // Lighting
  'l-occupancylight': '/assets/light.svg',
  'l-preventionlight': '/assets/preventionLights.svg',

  // Default fallback
  'default': '/assets/common.svg'
}

/**
 * Get asset path for a given layer type
 */
export function getAssetPath(layer: string): string {
  // Direct match
  if (ASSET_TYPE_TO_PATH[layer]) {
    return ASSET_TYPE_TO_PATH[layer]
  }

  // Partial match (prefix)
  for (const [key, path] of Object.entries(ASSET_TYPE_TO_PATH)) {
    if (layer.startsWith(key)) {
      return path
    }
  }

  // Default fallback
  return ASSET_TYPE_TO_PATH['default']
}

/**
 * Get fill color based on layer type
 */
export function getLayerFillColor(layer: string): string {
  if (layer.startsWith('p-parking-large-electric')) {
    return 'rgba(34, 197, 94, 0.2)'  // Green for electric
  }
  if (layer.startsWith('p-parking-large-women')) {
    return 'rgba(236, 72, 153, 0.2)'  // Pink for women
  }
  if (layer.startsWith('p-parking-disable')) {
    return 'rgba(239, 68, 68, 0.2)'  // Red for disabled
  }
  if (layer.startsWith('p-parking-small')) {
    return 'rgba(245, 158, 11, 0.2)'  // Orange for small cars
  }
  if (layer.startsWith('p-parking-large')) {
    return 'rgba(191, 155, 222, 0.2)'  // Purple for large
  }
  if (layer.startsWith('p-parking-basic')) {
    return 'rgba(59, 130, 246, 0.2)'  // Blue for basic
  }
  if (layer.startsWith('e-zone-area')) {
    return 'rgba(156, 163, 175, 0.15)'  // Gray for zones
  }
  if (layer.startsWith('p-guideboard-area')) {
    return 'rgba(251, 191, 36, 0.15)'  // Yellow for guideboards
  }

  // Default
  return 'rgba(156, 163, 175, 0.2)'
}

/**
 * Get stroke color based on layer type
 */
export function getLayerStrokeColor(layer: string): string {
  if (layer.startsWith('p-parking-large-electric')) {
    return '#22c55e'  // Green
  }
  if (layer.startsWith('p-parking-large-women')) {
    return '#ec4899'  // Pink
  }
  if (layer.startsWith('p-parking-disable')) {
    return '#ef4444'  // Red
  }
  if (layer.startsWith('p-parking-small')) {
    return '#f59e0b'  // Orange
  }
  if (layer.startsWith('p-parking-large')) {
    return '#bf9bde'  // Purple
  }
  if (layer.startsWith('e-outline')) {
    return '#ffffff'  // White for outlines
  }
  if (layer.startsWith('e-innerline')) {
    return '#6b7280'  // Gray for inner lines
  }
  if (layer.startsWith('l-lightingline')) {
    return '#fbbf24'  // Yellow for lighting
  }

  // Default
  return '#9ca3af'
}

/**
 * Get icon size based on layer type
 */
export function getIconSize(layer: string): { width: number; height: number } {
  if (layer.startsWith('c-cctv')) {
    return { width: 30, height: 30 }
  }
  if (layer.startsWith('e-charger')) {
    return { width: 25, height: 25 }
  }
  if (layer.startsWith('c-emergencybell')) {
    return { width: 20, height: 20 }
  }
  if (layer.startsWith('e-elevator')) {
    return { width: 35, height: 35 }
  }
  if (layer.startsWith('l-occupancylight')) {
    return { width: 15, height: 15 }
  }
  if (layer.startsWith('e-entrance')) {
    return { width: 25, height: 25 }
  }

  // Default
  return { width: 20, height: 20 }
}

/**
 * Check if layer should be rendered as point (icon)
 */
export function isPointLayer(layer: string): boolean {
  const pointPrefixes = [
    'c-cctv',
    'c-emergencybell',
    'e-charger',
    'e-pillar',
    'l-occupancylight',
    'e-entrance',
    'e-onepassreader'
  ]

  return pointPrefixes.some(prefix => layer.startsWith(prefix))
}

/**
 * Check if layer should be rendered as polygon
 */
export function isPolygonLayer(layer: string): boolean {
  const polygonPrefixes = [
    'p-parking-',
    'e-zone-area',
    'p-guideboard-area',
    'e-elevator'
  ]

  return polygonPrefixes.some(prefix => layer.startsWith(prefix))
}

/**
 * Check if layer should be rendered as line
 */
export function isLineLayer(layer: string): boolean {
  const linePrefixes = [
    'e-outline',
    'e-innerline',
    'l-lightingline',
    'e-drivewayline'
  ]

  return linePrefixes.some(prefix => layer.startsWith(prefix))
}

/**
 * Check if layer is text/label
 */
export function isTextLayer(layer: string): boolean {
  const textPrefixes = [
    'l-lightinglineframe',
    'p-parking-cctvid',
    'c-cctv-ip',
    'c-cctv-id',
    'e-zone-nametext'
  ]

  return textPrefixes.some(prefix => layer.startsWith(prefix))
}
