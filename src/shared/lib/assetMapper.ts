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
/**
 * Get fill color based on layer type
 */
export function getLayerFillColor(layer: string): string {
  if (layer.startsWith('p-parking-large-electric')) {
    return 'var(--color-map-parking-electric-fill)'
  }
  if (layer.startsWith('p-parking-large-women')) {
    return 'var(--color-map-parking-women-fill)'
  }
  if (layer.startsWith('p-parking-disable')) {
    return 'var(--color-map-parking-disable-fill)'
  }
  if (layer.startsWith('p-parking-small')) {
    return 'var(--color-map-parking-basic-fill)' // Using basic for small for now or add specific
  }
  if (layer.startsWith('p-parking-large')) {
    return 'var(--color-map-parking-basic-fill)' // Using basic for large for now or add specific
  }
  if (layer.startsWith('p-parking-basic')) {
    return 'var(--color-map-parking-basic-fill)'
  }
  if (layer.startsWith('e-elevator')) {
    return 'rgba(198, 176, 188, 0.3)' // Semi-transparent purple/pink
  }
  if (layer.startsWith('e-zone-area')) {
    return 'var(--color-map-line)' // Using line color for zones with low opacity
  }
  if (layer.startsWith('p-guideboard-area')) {
    return 'var(--color-map-line)'
  }

  // Default
  return 'var(--color-map-line)'
}

/**
 * Get stroke color based on layer type
 */
export function getLayerStrokeColor(layer: string): string {
  if (layer.startsWith('p-parking-large-electric')) {
    return 'var(--color-map-parking-electric-stroke)'
  }
  if (layer.startsWith('p-parking-large-women')) {
    return 'var(--color-map-parking-women-stroke)'
  }
  if (layer.startsWith('p-parking-disable')) {
    return 'var(--color-map-parking-disable-stroke)'
  }
  if (layer.startsWith('p-parking-small')) {
    return 'var(--color-map-parking-basic-stroke)'
  }
  if (layer.startsWith('p-parking-large')) {
    return 'var(--color-map-parking-basic-stroke)'
  }
  if (layer.startsWith('e-elevator')) {
    return '#c6b0bc' // Purple/pink border
  }
  if (layer.startsWith('e-outline')) {
    return 'var(--color-map-line)'
  }
  if (layer.startsWith('e-innerline')) {
    return 'var(--color-map-line)'
  }
  if (layer.startsWith('l-lightingline')) {
    return 'var(--color-map-line)'
  }

  // Default
  return 'var(--color-map-line)'
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
