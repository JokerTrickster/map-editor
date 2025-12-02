import { z } from 'zod';

/**
 * Metadata Schema
 * Represents project-level metadata for a parking lot floor map
 */
export const MetadataSchema = z.object({
  created: z.string().datetime({ message: 'Created timestamp must be a valid ISO 8601 datetime' }),
  modified: z.string().datetime({ message: 'Modified timestamp must be a valid ISO 8601 datetime' }),
  author: z.string().optional(),
  lotName: z.string().min(1, { message: 'Lot name is required' }),
  floorName: z.string().min(1, { message: 'Floor name is required' }),
  floorOrder: z.number().int({ message: 'Floor order must be an integer' }),
  description: z.string().optional(),
});

/**
 * Asset Schema
 * Represents uploaded assets (icons, images, SVGs) used in the map
 */
export const AssetSchema = z.object({
  id: z.string().min(1, { message: 'Asset ID is required' }),
  name: z.string().min(1, { message: 'Asset name is required' }),
  type: z.enum(['image', 'icon', 'svg'], {
    errorMap: () => ({ message: 'Asset type must be one of: image, icon, svg' }),
  }),
  url: z
    .string()
    .min(1, { message: 'Asset URL is required' })
    .refine(
      (url) => {
        // Allow relative URLs starting with / or absolute URLs
        if (url.startsWith('/')) return true;
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Asset URL must be a valid URL or relative path' }
    ),
  mimeType: z.string().min(1, { message: 'MIME type is required' }),
  size: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

/**
 * Style Schema
 * Visual styling properties for map objects
 */
export const StyleSchema = z.object({
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, { message: 'Color must be a valid hex color (e.g., #FF0000)' })
    .optional(),
  strokeWidth: z.number().positive().optional(),
  strokeColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, { message: 'Stroke color must be a valid hex color' })
    .optional(),
  fillColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, { message: 'Fill color must be a valid hex color' })
    .optional(),
  opacity: z
    .number()
    .min(0, { message: 'Opacity must be between 0 and 1' })
    .max(1, { message: 'Opacity must be between 0 and 1' })
    .optional(),
  zIndex: z.number().int().optional(),
});

/**
 * Geometry Schemas
 * Represents different geometric shapes for map objects
 */
const CoordinateSchema = z.tuple([z.number(), z.number()]);

const PointGeometrySchema = z.object({
  type: z.literal('point'),
  coordinates: CoordinateSchema,
});

const PolylineGeometrySchemaBase = z.object({
  type: z.literal('polyline'),
  coordinates: z.array(CoordinateSchema),
});

const PolygonGeometrySchemaBase = z.object({
  type: z.literal('polygon'),
  coordinates: z.array(CoordinateSchema),
  closed: z.boolean(),
});

export const GeometrySchema = z
  .discriminatedUnion('type', [
    PointGeometrySchema,
    PolylineGeometrySchemaBase,
    PolygonGeometrySchemaBase,
  ])
  .refine(
    (data) => {
      if (data.type === 'polyline') {
        return data.coordinates.length >= 2;
      }
      if (data.type === 'polygon') {
        return data.coordinates.length >= 3;
      }
      return true;
    },
    (data) => {
      if (data.type === 'polyline' && data.coordinates.length < 2) {
        return { message: 'Polyline must have at least 2 points' };
      }
      if (data.type === 'polygon' && data.coordinates.length < 3) {
        return { message: 'Polygon must have at least 3 points' };
      }
      return { message: 'Invalid geometry' };
    }
  );

/**
 * Relation Schema
 * Defines relationships between map objects
 */
export const RelationSchema = z.object({
  targetId: z.string().min(1, { message: 'Target ID is required' }),
  type: z.enum(['required', 'optional', 'reference'], {
    errorMap: () => ({ message: 'Relation type must be one of: required, optional, reference' }),
  }),
  meta: z.record(z.string(), z.any()).optional(),
});

/**
 * MapObject Schema
 * Core schema for individual map objects (CCTV, sensors, parking spots, etc.)
 */
export const MapObjectSchema = z.object({
  id: z.string().min(1, { message: 'Object ID is required' }),
  type: z.string().min(1, { message: 'Object type is required' }),
  name: z.string().min(1, { message: 'Object name is required' }),
  layer: z.string().min(1, { message: 'Layer name is required' }),
  entityHandle: z.string().optional(),
  geometry: GeometrySchema,
  style: StyleSchema,
  properties: z.record(z.string(), z.any()),
  assetRefs: z.array(z.string()).optional(),
  relations: z.array(RelationSchema).optional(),
});

/**
 * Root MapData Schema
 * Top-level schema for the entire map export
 */
export const MapDataSchema = z
  .object({
    version: z.string().min(1, { message: 'Version is required' }),
    metadata: MetadataSchema,
    assets: z.array(AssetSchema),
    objects: z.array(MapObjectSchema),
  })
  .refine(
    (data) => {
      // Validate that all assetRefs reference existing assets
      const assetIds = new Set(data.assets.map((asset) => asset.id));
      for (const obj of data.objects) {
        if (obj.assetRefs) {
          for (const assetRef of obj.assetRefs) {
            if (!assetIds.has(assetRef)) {
              return false;
            }
          }
        }
      }
      return true;
    },
    {
      message: 'All asset references must point to existing assets',
    }
  )
  .refine(
    (data) => {
      // Validate that all relation targetIds reference existing objects
      const objectIds = new Set(data.objects.map((obj) => obj.id));
      for (const obj of data.objects) {
        if (obj.relations) {
          for (const relation of obj.relations) {
            if (!objectIds.has(relation.targetId)) {
              return false;
            }
          }
        }
      }
      return true;
    },
    {
      message: 'All relation targetIds must reference existing objects',
    }
  )
  .refine(
    (data) => {
      // Validate that all object IDs are unique
      const ids = data.objects.map((obj) => obj.id);
      return ids.length === new Set(ids).size;
    },
    {
      message: 'All object IDs must be unique',
    }
  )
  .refine(
    (data) => {
      // Validate that all asset IDs are unique
      const ids = data.assets.map((asset) => asset.id);
      return ids.length === new Set(ids).size;
    },
    {
      message: 'All asset IDs must be unique',
    }
  );

/**
 * Validation Functions
 */

/**
 * Validates map data and throws detailed error on validation failure
 * @param data - Unknown data to validate
 * @returns Validated MapData
 * @throws ZodError with detailed validation errors
 */
export function validateMapData(data: unknown): z.infer<typeof MapDataSchema> {
  return MapDataSchema.parse(data);
}

/**
 * Safely validates map data without throwing
 * @param data - Unknown data to validate
 * @returns Result object with success status and data or errors
 */
export function validateMapDataSafe(
  data: unknown
): { success: true; data: z.infer<typeof MapDataSchema> } | { success: false; errors: string[] } {
  const result = MapDataSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map((err) => {
      const path = err.path.length > 0 ? `${err.path.join('.')}` : 'root';
      return `${path}: ${err.message}`;
    }),
  };
}

/**
 * Validates individual map object
 * @param data - Unknown data to validate
 * @returns Validated MapObject
 */
export function validateMapObject(data: unknown): z.infer<typeof MapObjectSchema> {
  return MapObjectSchema.parse(data);
}

/**
 * Validates metadata
 * @param data - Unknown data to validate
 * @returns Validated Metadata
 */
export function validateMetadata(data: unknown): z.infer<typeof MetadataSchema> {
  return MetadataSchema.parse(data);
}

/**
 * Validates asset
 * @param data - Unknown data to validate
 * @returns Validated Asset
 */
export function validateAsset(data: unknown): z.infer<typeof AssetSchema> {
  return AssetSchema.parse(data);
}
