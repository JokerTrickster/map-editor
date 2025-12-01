/**
 * CSV Parser for Banpo Map Data
 * Parses AutoCAD exported CSV with layer-based grouping
 */

export interface BanpoRow {
  x: number
  y: number
  z: number
  layer: string
  paperSpace: string
  subClasses: string
  linetype: string
  entityHandle: string
  text?: string
  style?: string
}

export interface GroupedEntity {
  layer: string
  entityHandle: string
  points: BanpoRow[]
  isPolygon: boolean
  isClosed: boolean
}

/**
 * Parse CSV text into structured data
 */
export function parseBanpoCSV(csvText: string): BanpoRow[] {
  const lines = csvText.trim().split('\n')

  // Skip header row
  const dataLines = lines.slice(1)

  const rows: BanpoRow[] = []

  dataLines.forEach((line, index) => {
    if (!line.trim()) return

    const cols = line.split(',')

    // Parse coordinates
    const x = parseFloat(cols[0])
    const y = parseFloat(cols[1])
    const z = parseFloat(cols[2])

    // Skip invalid rows
    if (isNaN(x) || isNaN(y)) {
      console.warn(`Skipping invalid row ${index + 2}:`, line)
      return
    }

    const row: BanpoRow = {
      x,
      y,
      z,
      layer: cols[3] || '',
      paperSpace: cols[4] || '',
      subClasses: cols[5] || '',
      linetype: cols[6] || '',
      entityHandle: cols[7] || '',
      text: cols[8] || undefined,
      style: cols[9] || undefined,
    }

    rows.push(row)
  })

  console.log(`Parsed ${rows.length} rows from CSV`)
  return rows
}

/**
 * Group rows by entity handle (for polygons)
 */
export function groupByEntity(rows: BanpoRow[]): GroupedEntity[] {
  const groups = new Map<string, BanpoRow[]>()

  // Group by layer + entityHandle
  rows.forEach(row => {
    const key = `${row.layer}_${row.entityHandle}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(row)
  })

  const entities: GroupedEntity[] = []

  groups.forEach((points) => {
    if (points.length === 0) return

    const layer = points[0].layer
    const entityHandle = points[0].entityHandle

    // Determine if this is a closed polygon
    const isClosed = points.length >= 3 &&
      points[0].x === points[points.length - 1].x &&
      points[0].y === points[points.length - 1].y

    // Determine if this should be rendered as polygon
    const isPolygon = isClosed && (
      layer.startsWith('p-parking-') ||
      layer.includes('area') ||
      layer === 'e-elevator'
    )

    entities.push({
      layer,
      entityHandle,
      points,
      isPolygon,
      isClosed
    })
  })

  console.log(`Grouped into ${entities.length} entities`)
  return entities
}

/**
 * Get layer statistics
 */
export function getLayerStats(rows: BanpoRow[]): Map<string, number> {
  const stats = new Map<string, number>()

  rows.forEach(row => {
    const count = stats.get(row.layer) || 0
    stats.set(row.layer, count + 1)
  })

  return stats
}

/**
 * Calculate bounds from rows
 */
export function calculateBounds(rows: BanpoRow[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  rows.forEach(row => {
    minX = Math.min(minX, row.x)
    minY = Math.min(minY, row.y)
    maxX = Math.max(maxX, row.x)
    maxY = Math.max(maxY, row.y)
  })

  return { minX, minY, maxX, maxY }
}

/**
 * Transform coordinates from AutoCAD space to canvas space
 */
export function transformCoordinates(
  x: number,
  y: number,
  options: {
    minX: number
    minY: number
    scale?: number
    flipY?: boolean
  }
): { x: number; y: number } {
  const {
    minX,
    minY,
    scale = 1.0,     // 1:1 scale (preserve original units)
    flipY = true     // Flip Y axis (AutoCAD uses negative Y)
  } = options

  let transformedX = (x - minX) * scale
  let transformedY = flipY ? Math.abs(y - minY) * scale : (y - minY) * scale

  return { x: transformedX, y: transformedY }
}

/**
 * Convert coordinate array to SVG path string
 */
export function coordsToSVGPath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return ''

  const pathParts = coords.map((point, i) =>
    i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
  )

  return pathParts.join(' ') + ' Z'  // Z = close path
}
