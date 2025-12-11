import { dia } from '@joint/core'
import type { ExportData, MapDataExport, Position, LightCCTV, Zone, Column, ParkingLocation, Sensor, Charger, GuideBoard, Elevator, EmergencyBell, Arrow, Line, Entrance, OnePassReader, OccupancyLight, Light } from '@/entities/schema/exportSchema'
import type { MapObject, Geometry } from '@/entities/schema/types'

/**
 * Convert JointJS graph to new ExportData JSON format with type-specific arrays
 */
export function exportGraphToJSON(
  graph: dia.Graph,
  metadata: {
    lotName: string
    lotCreated: string
    floorName: string
    floorOrder?: number
    author?: string
    description?: string
  }
): ExportData {
  const mapData = buildMapData(graph, metadata)

  return {
    data: {
      createdAt: metadata.lotCreated,
      name: metadata.lotName,
      parkingLotLevels: [
        {
          name: metadata.floorName,
          mapData
        }
      ]
    }
  }
}

/**
 * Build MapDataExport from graph with type-specific arrays
 */
function buildMapData(
  graph: dia.Graph,
  metadata: {
    lotName: string
    floorName: string
    floorOrder?: number
    author?: string
    description?: string
  }
): MapDataExport {
  const elements = graph.getElements()

  // Convert JointJS elements to MapObjects
  const objects = elements.map(element => convertElementToMapObject(element))

  // Group objects by type
  const grouped = {
    cctvs: [] as MapObject[],
    zones: [] as MapObject[],
    columns: [] as MapObject[],
    parkingLocations: [] as MapObject[],
    sensors: [] as MapObject[],
    chargers: [] as MapObject[],
    guideBoards: [] as MapObject[],
    elevators: [] as MapObject[],
    emergencyBells: [] as MapObject[],
    arrows: [] as MapObject[],
    outLines: [] as MapObject[],
    innerLines: [] as MapObject[],
    entrances: [] as MapObject[],
    onePassReaders: [] as MapObject[],
    occupancyLights: [] as MapObject[],
    lights: [] as MapObject[],
    carChargers: [] as MapObject[]
  }

  // Route objects to appropriate groups
  for (const object of objects) {
    // Try layer field first, then fallback to type if layer doesn't match
    let category = 'unknown'

    if (object.layer) {
      category = routeObjectByType(object.layer)
    }

    // If layer didn't match or wasn't provided, try type field
    if (category === 'unknown' && object.type) {
      category = routeObjectByType(object.type)
    }

    if (category === 'cctv') grouped.cctvs.push(object)
    else if (category === 'zone') grouped.zones.push(object)
    else if (category === 'column') grouped.columns.push(object)
    else if (category === 'parkingLocation') grouped.parkingLocations.push(object)
    else if (category === 'sensor') grouped.sensors.push(object)
    else if (category === 'charger') grouped.chargers.push(object)
    else if (category === 'guideBoard') grouped.guideBoards.push(object)
    else if (category === 'elevator') grouped.elevators.push(object)
    else if (category === 'emergencyBell') grouped.emergencyBells.push(object)
    else if (category === 'arrow') grouped.arrows.push(object)
    else if (category === 'outLine') grouped.outLines.push(object)
    else if (category === 'innerLine') grouped.innerLines.push(object)
    else if (category === 'entrance') grouped.entrances.push(object)
    else if (category === 'onePassReader') grouped.onePassReaders.push(object)
    else if (category === 'occupancyLight') grouped.occupancyLights.push(object)
    else if (category === 'light') grouped.lights.push(object)
    else if (category === 'carCharger') grouped.carChargers.push(object)
    else {
      console.warn(`Unknown object type/layer: ${object.layer || object.type}`, object)
    }
  }

  // Transform each group to export format
  const result: MapDataExport = {
    version: '1.0.0',
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      author: metadata?.author || 'Map Editor',
      lotName: metadata.lotName,
      floorName: metadata.floorName,
      floorOrder: metadata?.floorOrder || 1,
      description: metadata?.description
    }
  }

  // Add type-specific arrays only if they have content
  if (grouped.cctvs.length > 0) {
    result.cctvs = {
      lightCctvs: grouped.cctvs.map(transformToCCTV)
    }
  }

  if (grouped.zones.length > 0) {
    result.zones = grouped.zones.map(transformToZone)
  }

  if (grouped.columns.length > 0) {
    result.columns = grouped.columns.map(transformToColumn)
  }

  if (grouped.parkingLocations.length > 0) {
    result.parkingLocations = grouped.parkingLocations.map(transformToParkingLocation)
  }

  if (grouped.sensors.length > 0) {
    result.sensors = grouped.sensors.map(transformToSensor)
  }

  if (grouped.chargers.length > 0) {
    result.chargers = grouped.chargers.map(transformToCharger)
  }

  if (grouped.guideBoards.length > 0) {
    result.guideBoards = grouped.guideBoards.map(transformToGuideBoard)
  }

  if (grouped.elevators.length > 0) {
    result.elevators = grouped.elevators.map(transformToElevator)
  }

  if (grouped.emergencyBells.length > 0) {
    result.emergencyBells = grouped.emergencyBells.map(transformToEmergencyBell)
  }

  if (grouped.arrows.length > 0) {
    result.arrows = grouped.arrows.map(transformToArrow)
  }

  if (grouped.outLines.length > 0) {
    result.outLines = grouped.outLines.map(transformToLine)
  }

  if (grouped.innerLines.length > 0) {
    result.innerLines = grouped.innerLines.map(transformToLine)
  }

  if (grouped.entrances.length > 0) {
    result.entrances = grouped.entrances.map(transformToEntrance)
  }

  if (grouped.onePassReaders.length > 0) {
    result.onePassReaders = grouped.onePassReaders.map(transformToOnePassReader)
  }

  if (grouped.occupancyLights.length > 0) {
    result.occupancyLights = grouped.occupancyLights.map(transformToOccupancyLight)
  }

  if (grouped.lights.length > 0) {
    result.lights = grouped.lights.map(transformToLight)
  }

  if (grouped.carChargers.length > 0) {
    result.carChargers = grouped.carChargers.map(transformToCharger)
  }

  return result
}

/**
 * Route object to appropriate category based on type or layer
 */
function routeObjectByType(typeOrLayer: string): string {
  // Direct type name mapping
  const typeMapping: Record<string, string> = {
    'CCTV': 'cctv',
    'Camera': 'cctv',
    'Zone': 'zone',
    'ParkingZone': 'zone',
    'Column': 'column',
    'Pillar': 'column',
    'ParkingSpot': 'parkingLocation',
    'ParkingLocation': 'parkingLocation',
    'Sensor': 'sensor',
    'Charger': 'charger',
    'EVCharger': 'charger',
    'CarCharger': 'carCharger',
    'GuideBoard': 'guideBoard',
    'Sign': 'guideBoard',
    'Elevator': 'elevator',
    'Lift': 'elevator',
    'EmergencyBell': 'emergencyBell',
    'Arrow': 'arrow',
    'OutLine': 'outLine',
    'InnerLine': 'innerLine',
    'Entrance': 'entrance',
    'OnePassReader': 'onePassReader',
    'OccupancyLight': 'occupancyLight',
    'Light': 'light'
  }

  // Check direct mapping first
  if (typeMapping[typeOrLayer]) {
    return typeMapping[typeOrLayer]
  }

  // Layer-based pattern matching (e.g., "c-cctv", "e-pillar", "p-parking-spot")
  const layerPatterns: Array<[RegExp, string]> = [
    [/^c-cctv/i, 'cctv'],
    [/^c-camera/i, 'cctv'],
    [/^e-zone/i, 'zone'],
    [/^e-parking.*zone/i, 'zone'],
    [/^e-pillar/i, 'column'],
    [/^e-column/i, 'column'],
    [/^p-parking/i, 'parkingLocation'],
    [/^c-sensor/i, 'sensor'],
    [/^e-charger/i, 'charger'],
    [/^e-carcharger/i, 'carCharger'],
    [/^p-guideboard/i, 'guideBoard'],
    [/^e-elevator/i, 'elevator'],
    [/^c-emergencybell/i, 'emergencyBell'],
    [/^e-arrow/i, 'arrow'],
    [/^e-outline/i, 'outLine'],
    [/^e-innerline/i, 'innerLine'],
    [/^e-entrance/i, 'entrance'],
    [/^c-onepassreader/i, 'onePassReader'],
    [/^c-occupancylight/i, 'occupancyLight'],
    [/^c-light/i, 'light']
  ]

  for (const [pattern, category] of layerPatterns) {
    if (pattern.test(typeOrLayer)) {
      return category
    }
  }

  return 'unknown'
}

/**
 * Convert JointJS element to MapObject
 */
function convertElementToMapObject(element: dia.Element): MapObject {
  const data = element.get('data') || {}
  const position = element.position()
  const size = element.size()

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
    properties: data.properties || {},
    assetRefs: data.assetRefs,
    relations: extractRelations(data.properties || {})
  }
}

/**
 * Check if a property key represents a relationship
 * Relationship keys typically end with: Id, Ids, Ref, Refs
 */
function isRelationshipProperty(key: string): boolean {
  const relationPatterns = [
    /Id$/,      // zoneId, sensorId, controlId
    /Ids$/,     // columnIds, parkingLocationIds
    /Ref$/,     // assetRef
    /Refs$/     // assetRefs
  ]

  // Explicitly exclude known non-relationship properties
  const excludeList = ['name', 'description', 'serialNumber', 'ipAddress', 'model', 'resolution', 'powerOutput', 'chargingType', 'connectorType', 'status', 'type', 'angle', 'label', 'content', 'direction', 'floors', 'readerId', 'lightType', 'sensorType', 'range', 'spotNumber', 'spotType', 'zoneName', 'capacity', 'handicappedSpots', 'lineType', 'entranceType']

  if (excludeList.includes(key)) return false

  return relationPatterns.some(pattern => pattern.test(key))
}

/**
 * Extract relations from element properties
 */
function extractRelations(properties: Record<string, any>) {
  const relations: Array<{ targetId: string; type: 'required' | 'optional' | 'reference'; meta?: Record<string, any> }> = []

  console.log('🔍 Extracting relations from properties:', Object.keys(properties))

  Object.entries(properties).forEach(([key, value]) => {
    // Only process relationship properties
    if (!isRelationshipProperty(key)) {
      return
    }

    // Handle single ID (string)
    if (typeof value === 'string' && value.length > 0) {
      console.log(`  ✅ Found single relation: ${key} = ${value}`)
      relations.push({
        targetId: value,
        type: 'reference',
        meta: { propertyKey: key }
      })
    }
    // Handle multiple IDs (array of strings)
    else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      console.log(`  ✅ Found multi relation: ${key} = [${value.length} items]`)
      value.forEach(targetId => {
        relations.push({
          targetId,
          type: 'reference',
          meta: { propertyKey: key }
        })
      })
    }
    else {
      console.log(`  ⏭️ Skipping ${key} - empty or invalid value:`, value)
    }
  })

  console.log(`📊 Extracted ${relations.length} relations`)
  return relations.length > 0 ? relations : undefined
}

/**
 * Extract position from geometry (for point-based objects)
 */
function extractPosition(geometry: Geometry): Position {
  if (geometry.type === 'point') {
    return {
      x: geometry.coordinates[0],
      y: geometry.coordinates[1]
    }
  }

  // For non-point geometries, calculate centroid
  if (geometry.type === 'polygon' || geometry.type === 'polyline') {
    const coords = geometry.coordinates
    const centroid = calculateCentroid(coords)
    return { x: centroid[0], y: centroid[1] }
  }

  throw new Error(`Cannot extract position from geometry type: ${(geometry as any).type}`)
}

/**
 * Extract points from geometry (for polygon/polyline objects)
 */
function extractPoints(geometry: Geometry): Array<[number, number]> {
  if (geometry.type === 'polygon' || geometry.type === 'polyline') {
    return geometry.coordinates
  }

  throw new Error(`Cannot extract points from geometry type: ${(geometry as any).type}`)
}

/**
 * Calculate centroid of a polygon/polyline
 */
function calculateCentroid(points: Array<[number, number]>): [number, number] {
  const sum = points.reduce(
    (acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }),
    { x: 0, y: 0 }
  )
  return [sum.x / points.length, sum.y / points.length]
}

/**
 * Extract relation IDs from MapObject relations
 */
interface ExtractedRelations {
  zoneId?: string
  columnIds?: string[]
  parkingLocationIds?: string[]
  controlId?: string
  chargerId?: string
  sensorId?: string
  linkedSpotId?: string
  parkingSpotId?: string
}

function extractRelationIds(object: MapObject): ExtractedRelations {
  const result: ExtractedRelations = {}

  if (!object.relations) return result

  for (const relation of object.relations) {
    const key = relation.meta?.propertyKey || ''

    // Map based on property key patterns
    if (key.toLowerCase().includes('zone')) {
      result.zoneId = relation.targetId
    } else if (key.toLowerCase().includes('column')) {
      if (!result.columnIds) result.columnIds = []
      result.columnIds.push(relation.targetId)
    } else if (key.toLowerCase().includes('control')) {
      result.controlId = relation.targetId
    } else if (key.toLowerCase().includes('charger')) {
      result.chargerId = relation.targetId
    } else if (key.toLowerCase().includes('sensor')) {
      result.sensorId = relation.targetId
    } else if (key.toLowerCase().includes('spot') || key.toLowerCase().includes('parking')) {
      if (object.type === 'Zone' || object.type === 'ParkingZone') {
        if (!result.parkingLocationIds) result.parkingLocationIds = []
        result.parkingLocationIds.push(relation.targetId)
      } else {
        result.linkedSpotId = relation.targetId
      }
    }
  }

  return result
}

/**
 * Transform MapObject to CCTV export format
 */
function transformToCCTV(object: MapObject): LightCCTV {
  const position = extractPosition(object.geometry)
  const relations = extractRelationIds(object)

  return {
    id: object.id,
    position,
    name: object.name,
    serialNumber: object.properties?.serialNumber,
    ipAddress: object.properties?.ipAddress,
    model: object.properties?.model,
    resolution: object.properties?.resolution,
    controlId: relations.controlId,
    zoneId: relations.zoneId
  }
}

/**
 * Transform MapObject to Zone export format
 */
function transformToZone(object: MapObject): Zone {
  // Try to extract points if available, otherwise create from position/size
  let points: Array<[number, number]>

  try {
    points = extractPoints(object.geometry)
  } catch {
    // Fallback: create rectangle from center position if stored in properties
    const pos = object.properties?.position || { x: 0, y: 0 }
    const size = object.properties?.size || { width: 100, height: 100 }

    points = [
      [pos.x, pos.y],
      [pos.x + size.width, pos.y],
      [pos.x + size.width, pos.y + size.height],
      [pos.x, pos.y + size.height]
    ]
  }

  const relations = extractRelationIds(object)

  return {
    id: object.id,
    name: object.name,
    points,
    zoneName: object.properties?.zoneName,
    capacity: object.properties?.capacity,
    handicappedSpots: object.properties?.handicappedSpots,
    columnIds: relations.columnIds,
    parkingLocationIds: relations.parkingLocationIds
  }
}

/**
 * Transform MapObject to Column export format
 */
function transformToColumn(object: MapObject): Column {
  const position = extractPosition(object.geometry)
  const relations = extractRelationIds(object)

  return {
    id: object.id,
    name: object.name,
    position,
    zoneId: relations.zoneId
  }
}

/**
 * Transform MapObject to ParkingLocation export format
 */
function transformToParkingLocation(object: MapObject): ParkingLocation {
  // Try to extract points if available, otherwise create from position/size
  let points: Array<[number, number]>

  try {
    points = extractPoints(object.geometry)
  } catch {
    // Fallback: create rectangle from center position if stored in properties
    const pos = object.properties?.position || { x: 0, y: 0 }
    const size = object.properties?.size || { width: 50, height: 30 }

    points = [
      [pos.x, pos.y],
      [pos.x + size.width, pos.y],
      [pos.x + size.width, pos.y + size.height],
      [pos.x, pos.y + size.height]
    ]
  }

  const relations = extractRelationIds(object)

  return {
    id: object.id,
    name: object.name,
    points,
    spotNumber: object.properties?.spotNumber,
    spotType: object.properties?.spotType,
    status: object.properties?.status,
    zoneId: relations.zoneId,
    chargerId: relations.chargerId,
    sensorId: relations.sensorId
  }
}

/**
 * Transform MapObject to Sensor export format
 */
function transformToSensor(object: MapObject): Sensor {
  const position = extractPosition(object.geometry)
  const relations = extractRelationIds(object)

  return {
    id: object.id,
    name: object.name,
    position,
    sensorType: object.properties?.sensorType,
    model: object.properties?.model,
    range: object.properties?.range,
    linkedSpotId: relations.linkedSpotId
  }
}

/**
 * Transform MapObject to Charger export format
 */
function transformToCharger(object: MapObject): Charger {
  const position = extractPosition(object.geometry)
  const relations = extractRelationIds(object)

  return {
    id: object.id,
    name: object.name,
    position,
    powerOutput: object.properties?.powerOutput,
    chargingType: object.properties?.chargingType,
    connectorType: object.properties?.connectorType,
    status: object.properties?.status,
    parkingSpotId: relations.parkingSpotId || relations.linkedSpotId
  }
}

/**
 * Transform MapObject to GuideBoard export format
 */
function transformToGuideBoard(object: MapObject): GuideBoard {
  const position = extractPosition(object.geometry)

  return {
    id: object.id,
    name: object.name,
    position,
    content: object.properties?.content,
    direction: object.properties?.direction
  }
}

/**
 * Transform MapObject to Elevator export format
 */
function transformToElevator(object: MapObject): Elevator {
  const position = extractPosition(object.geometry)

  return {
    id: object.id,
    name: object.name,
    position,
    floors: object.properties?.floors
  }
}

/**
 * Transform MapObject to EmergencyBell export format
 */
function transformToEmergencyBell(object: MapObject): EmergencyBell {
  const position = extractPosition(object.geometry)
  const relations = extractRelationIds(object)

  return {
    id: object.id,
    name: object.name,
    position: [position.x, position.y] as [number, number],
    linkedCctvId: relations.controlId
  }
}

/**
 * Transform MapObject to Arrow export format
 */
function transformToArrow(object: MapObject): Arrow {
  let points: Array<[number, number]>

  try {
    points = extractPoints(object.geometry)
  } catch {
    const pos = object.properties?.position || { x: 0, y: 0 }
    points = [
      [pos.x, pos.y],
      [pos.x + 50, pos.y]
    ]
  }

  return {
    id: object.id,
    name: object.name,
    points,
    direction: object.properties?.direction
  }
}

/**
 * Transform MapObject to Line export format (for OutLine/InnerLine)
 */
function transformToLine(object: MapObject): Line {
  let points: Array<[number, number]>

  try {
    points = extractPoints(object.geometry)
  } catch {
    const pos = object.properties?.position || { x: 0, y: 0 }
    points = [
      [pos.x, pos.y],
      [pos.x + 100, pos.y]
    ]
  }

  return {
    id: object.id,
    name: object.name,
    points,
    lineType: object.properties?.lineType
  }
}

/**
 * Transform MapObject to Entrance export format
 */
function transformToEntrance(object: MapObject): Entrance {
  const position = extractPosition(object.geometry)

  return {
    id: object.id,
    name: object.name,
    position,
    entranceType: object.properties?.entranceType
  }
}

/**
 * Transform MapObject to OnePassReader export format
 */
function transformToOnePassReader(object: MapObject): OnePassReader {
  const position = extractPosition(object.geometry)

  return {
    id: object.id,
    name: object.name,
    position,
    readerId: object.properties?.readerId
  }
}

/**
 * Transform MapObject to OccupancyLight export format
 */
function transformToOccupancyLight(object: MapObject): OccupancyLight {
  const position = extractPosition(object.geometry)

  return {
    id: object.id,
    name: object.name,
    position,
    status: object.properties?.status
  }
}

/**
 * Transform MapObject to Light export format
 */
function transformToLight(object: MapObject): Light {
  const position = extractPosition(object.geometry)

  return {
    id: object.id,
    name: object.name,
    position,
    lightType: object.properties?.lightType
  }
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
