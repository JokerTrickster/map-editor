import { z } from 'zod'
import { MetadataSchema } from './mapSchema'

/**
 * Export Data Schema - Type-specific structure for JSON export
 * Uses flattened properties and type-specific arrays instead of generic objects array
 */

// Position for point-based geometries
const PositionSchema = z.object({
  x: z.number(),
  y: z.number()
})

// Points array for polygon/polyline geometries
const PointsSchema = z.array(z.tuple([z.number(), z.number()])).min(3)

/**
 * CCTV Schemas
 */
export const LightCCTVSchema = z.object({
  id: z.string().min(1),
  position: PositionSchema,
  name: z.string().optional(),
  serialNumber: z.string().optional(),
  ipAddress: z.string().optional(),
  model: z.string().optional(),
  resolution: z.string().optional(),
  controlId: z.string().optional(), // Relation to control system
  zoneId: z.string().optional() // Relation to zone
})

export const CCTVsSchema = z.object({
  lightCctvs: z.array(LightCCTVSchema)
})

/**
 * Zone Schema
 */
export const ZoneSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  points: PointsSchema,
  zoneName: z.string().optional(),
  capacity: z.number().optional(),
  handicappedSpots: z.number().optional(),
  columnIds: z.array(z.string()).optional(), // Relations to columns
  parkingLocationIds: z.array(z.string()).optional() // Relations to parking spots
})

/**
 * Column Schema
 */
export const ColumnSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  position: PositionSchema,
  zoneId: z.string().optional() // Relation to zone
})

/**
 * ParkingLocation Schema
 */
export const ParkingLocationSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  points: PointsSchema,
  spotNumber: z.string().optional(),
  spotType: z.enum(['regular', 'handicapped', 'ev', 'compact']).optional(),
  status: z.enum(['available', 'occupied', 'reserved']).optional(),
  zoneId: z.string().optional(), // Relation to zone
  chargerId: z.string().optional(), // Relation to charger
  sensorId: z.string().optional() // Relation to sensor
})

/**
 * Sensor Schema
 */
export const SensorSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  position: PositionSchema,
  sensorType: z.string().optional(),
  model: z.string().optional(),
  range: z.number().optional(),
  linkedSpotId: z.string().optional() // Relation to parking spot
})

/**
 * Charger Schema
 */
export const ChargerSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  position: PositionSchema,
  powerOutput: z.number().optional(),
  chargingType: z.string().optional(),
  connectorType: z.string().optional(),
  status: z.enum(['available', 'occupied', 'offline']).optional(),
  parkingSpotId: z.string().optional() // Relation to parking spot
})

/**
 * GuideBoard Schema
 */
export const GuideBoardSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  position: PositionSchema,
  content: z.string().optional(),
  direction: z.string().optional()
})

/**
 * Elevator Schema
 */
export const ElevatorSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  position: PositionSchema,
  floors: z.array(z.string()).optional()
})

/**
 * EmergencyBell Schema
 */
export const EmergencyBellSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  position: z.tuple([z.number(), z.number()]),
  linkedCctvId: z.string().optional()
})

/**
 * Arrow Schema
 */
export const ArrowSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  points: z.array(z.tuple([z.number(), z.number()])).min(2),
  direction: z.string().optional()
})

/**
 * OutLine/InnerLine Schema (shared)
 */
export const LineSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  points: z.array(z.tuple([z.number(), z.number()])).min(2),
  lineType: z.string().optional()
})

/**
 * Entrance Schema
 */
export const EntranceSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  position: PositionSchema,
  entranceType: z.string().optional()
})

/**
 * OnePassReader Schema
 */
export const OnePassReaderSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  position: PositionSchema,
  readerId: z.string().optional()
})

/**
 * OccupancyLight Schema
 */
export const OccupancyLightSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  position: PositionSchema,
  status: z.string().optional()
})

/**
 * Light Schema
 */
export const LightSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  position: PositionSchema,
  lightType: z.string().optional()
})

/**
 * MapData Export Schema - Type-specific arrays
 */
export const MapDataExportSchema = z.object({
  version: z.string().min(1),
  metadata: MetadataSchema,
  cctvs: CCTVsSchema.optional(),
  zones: z.array(ZoneSchema).optional(),
  columns: z.array(ColumnSchema).optional(),
  parkingLocations: z.array(ParkingLocationSchema).optional(),
  sensors: z.array(SensorSchema).optional(),
  chargers: z.array(ChargerSchema).optional(),
  guideBoards: z.array(GuideBoardSchema).optional(),
  elevators: z.array(ElevatorSchema).optional(),
  emergencyBells: z.array(EmergencyBellSchema).optional(),
  arrows: z.array(ArrowSchema).optional(),
  outLines: z.array(LineSchema).optional(),
  innerLines: z.array(LineSchema).optional(),
  entrances: z.array(EntranceSchema).optional(),
  onePassReaders: z.array(OnePassReaderSchema).optional(),
  occupancyLights: z.array(OccupancyLightSchema).optional(),
  lights: z.array(LightSchema).optional(),
  carChargers: z.array(ChargerSchema).optional()
})

/**
 * Parking Lot Level Schema
 */
export const ParkingLotLevelSchema = z.object({
  name: z.string().min(1, 'Floor name is required'),
  mapData: MapDataExportSchema
})

/**
 * Export Data Schema - Top-level wrapper
 */
export const ExportDataSchema = z.object({
  data: z.object({
    createdAt: z.string().datetime('Created timestamp must be a valid ISO 8601 datetime'),
    name: z.string().min(1, 'Project name is required'),
    parkingLotLevels: z.array(ParkingLotLevelSchema)
      .min(1, 'At least one floor is required')
  })
})

/**
 * TypeScript types inferred from schemas
 */
export type Position = z.infer<typeof PositionSchema>
export type LightCCTV = z.infer<typeof LightCCTVSchema>
export type CCTVs = z.infer<typeof CCTVsSchema>
export type Zone = z.infer<typeof ZoneSchema>
export type Column = z.infer<typeof ColumnSchema>
export type ParkingLocation = z.infer<typeof ParkingLocationSchema>
export type Sensor = z.infer<typeof SensorSchema>
export type Charger = z.infer<typeof ChargerSchema>
export type GuideBoard = z.infer<typeof GuideBoardSchema>
export type Elevator = z.infer<typeof ElevatorSchema>
export type EmergencyBell = z.infer<typeof EmergencyBellSchema>
export type Arrow = z.infer<typeof ArrowSchema>
export type Line = z.infer<typeof LineSchema>
export type Entrance = z.infer<typeof EntranceSchema>
export type OnePassReader = z.infer<typeof OnePassReaderSchema>
export type OccupancyLight = z.infer<typeof OccupancyLightSchema>
export type Light = z.infer<typeof LightSchema>
export type MapDataExport = z.infer<typeof MapDataExportSchema>
export type ParkingLotLevel = z.infer<typeof ParkingLotLevelSchema>
export type ExportData = z.infer<typeof ExportDataSchema>
