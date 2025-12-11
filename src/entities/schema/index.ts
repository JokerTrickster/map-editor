/**
 * Entity Schema Module
 *
 * Exports Zod schemas, TypeScript types, validation functions, and examples
 * for the parking lot map editor JSON data structure.
 */

// Export all schemas
export {
  MetadataSchema,
  AssetSchema,
  StyleSchema,
  GeometrySchema,
  RelationSchema,
  MapObjectSchema,
  MapDataSchema,
  validateMapData,
  validateMapDataSafe,
  validateMapObject,
  validateMetadata,
  validateAsset,
} from './mapSchema';

export {
  ExportDataSchema,
  ParkingLotLevelSchema,
  MapDataExportSchema,
  LightCCTVSchema,
  CCTVsSchema,
  ZoneSchema,
  ColumnSchema,
  ParkingLocationSchema,
  SensorSchema,
  ChargerSchema,
  GuideBoardSchema,
  ElevatorSchema,
  EmergencyBellSchema,
  ArrowSchema,
  LineSchema,
  EntranceSchema,
  OnePassReaderSchema,
  OccupancyLightSchema,
  LightSchema,
} from './exportSchema';

// Export all types
export type {
  Metadata,
  Asset,
  Geometry,
  Style,
  Relation,
  MapObject,
  MapData,
  PointGeometry,
  PolylineGeometry,
  PolygonGeometry,
  CCTVProperties,
  ChargerProperties,
  ParkingSpotProperties,
  SensorProperties,
} from './types';

export type {
  ExportData,
  ParkingLotLevel,
  MapDataExport,
  Position,
  LightCCTV,
  CCTVs,
  Zone,
  Column,
  ParkingLocation,
  Sensor,
  Charger,
  GuideBoard,
  Elevator,
  EmergencyBell,
  Arrow,
  Line,
  Entrance,
  OnePassReader,
  OccupancyLight,
  Light,
} from './exportSchema';

// Export type guards
export { isPointGeometry, isPolylineGeometry, isPolygonGeometry } from './types';

// Export examples
export {
  exampleMapData,
  exampleMetadata,
  exampleAssets,
  exampleObjects,
  minimalMapData,
  invalidMapDataExamples,
} from './examples';
