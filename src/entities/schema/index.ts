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
