import { z } from 'zod';
import * as schemas from './mapSchema';
import * as templateSchemas from './templateSchema';

/**
 * TypeScript types inferred from Zod schemas
 * These types are automatically kept in sync with validation schemas
 */

export type Metadata = z.infer<typeof schemas.MetadataSchema>;

export type Asset = z.infer<typeof schemas.AssetSchema>;

export type Geometry = z.infer<typeof schemas.GeometrySchema>;

export type Style = z.infer<typeof schemas.StyleSchema>;

export type Relation = z.infer<typeof schemas.RelationSchema>;

export type MapObject = z.infer<typeof schemas.MapObjectSchema>;

export type MapData = z.infer<typeof schemas.MapDataSchema>;

/**
 * Helper types for specific geometry types
 */
export type PointGeometry = Extract<Geometry, { type: 'point' }>;
export type PolylineGeometry = Extract<Geometry, { type: 'polyline' }>;
export type PolygonGeometry = Extract<Geometry, { type: 'polygon' }>;

/**
 * Type guards for geometry discrimination
 */
export function isPointGeometry(geometry: Geometry): geometry is PointGeometry {
  return geometry.type === 'point';
}

export function isPolylineGeometry(geometry: Geometry): geometry is PolylineGeometry {
  return geometry.type === 'polyline';
}

export function isPolygonGeometry(geometry: Geometry): geometry is PolygonGeometry {
  return geometry.type === 'polygon';
}

/**
 * Common property types used in MapObject properties field
 */
export interface CCTVProperties {
  serialNumber?: string;
  ipAddress?: string;
  model?: string;
  resolution?: string;
  [key: string]: unknown;
}

export interface ChargerProperties {
  powerOutput?: number;
  chargingType?: string;
  connectorType?: string;
  status?: 'available' | 'occupied' | 'offline';
  [key: string]: unknown;
}

export interface ParkingSpotProperties {
  spotNumber?: string;
  spotType?: 'regular' | 'handicapped' | 'ev' | 'compact';
  status?: 'available' | 'occupied' | 'reserved';
  [key: string]: unknown;
}

export interface SensorProperties {
  sensorType?: string;
  model?: string;
  range?: number;
  [key: string]: unknown;
}

/**
 * Template types
 */
export type Template = z.infer<typeof templateSchemas.TemplateSchema>;
export type TemplateObjectType = z.infer<typeof templateSchemas.TemplateObjectTypeSchema>;
export type TemplateRelationType = z.infer<typeof templateSchemas.TemplateRelationTypeSchema>;
export type TemplateAsset = z.infer<typeof templateSchemas.TemplateAssetSchema>;
