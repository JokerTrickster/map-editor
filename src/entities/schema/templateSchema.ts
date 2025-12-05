import { z } from 'zod';

/**
 * Template Object Type Schema
 * Defines the structure for object types available in a template
 */
export const TemplateObjectTypeSchema = z.object({
  displayName: z.string(),
  icon: z.string(),
  category: z.string().optional(),
  usesAsset: z.boolean().optional(), // true if this object type uses asset references, false if rendered directly
  geometryType: z.enum(['point', 'polyline', 'polygon']).optional(), // expected geometry type
  defaultProperties: z.record(z.unknown()),
  defaultStyle: z
    .object({
      color: z.string().optional(),
      size: z.number().optional(),
      fillOpacity: z.number().optional(),
      strokeWidth: z.number().optional(),
      strokeColor: z.string().optional(),
      icon: z.string().optional(),
    })
    .optional(),
});

/**
 * Template Relation Type Schema
 * Defines allowed relationships between object types
 */
export const TemplateRelationTypeSchema = z.object({
  displayName: z.string(),
  description: z.string().optional(),
  allowedPairs: z.array(z.tuple([z.string(), z.string()])),
});

/**
 * Template Asset Schema
 * Defines assets (icons, images) provided by the template
 */
export const TemplateAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['icon', 'image', 'texture']),
  url: z.string(),
  category: z.string().optional(),
});

/**
 * Main Template Schema
 * Complete template definition including metadata, object types, relations, and assets
 */
export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  category: z.string(),
  thumbnail: z.string().optional(),
  status: z.enum(['available', 'coming-soon']),
  objectTypes: z.record(TemplateObjectTypeSchema),
  relationTypes: z.record(TemplateRelationTypeSchema).optional(),
  assets: z.array(TemplateAssetSchema).optional(),
  initialObjects: z.array(z.any()).optional(),
});

export type TemplateObjectType = z.infer<typeof TemplateObjectTypeSchema>;
export type TemplateRelationType = z.infer<typeof TemplateRelationTypeSchema>;
export type TemplateAsset = z.infer<typeof TemplateAssetSchema>;
export type Template = z.infer<typeof TemplateSchema>;
