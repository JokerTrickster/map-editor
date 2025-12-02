import { describe, it, expect } from 'vitest';
import {
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
} from '../mapSchema';
import {
  exampleMapData,
  exampleMetadata,
  exampleAssets,
  exampleObjects,
  minimalMapData,
  invalidMapDataExamples,
} from '../examples';
import type { MapData, MapObject } from '../types';

describe('MetadataSchema', () => {
  it('should validate valid metadata', () => {
    const result = MetadataSchema.safeParse(exampleMetadata);
    expect(result.success).toBe(true);
  });

  it('should require lotName and floorName', () => {
    const invalid = { ...exampleMetadata, lotName: '' };
    const result = MetadataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should validate ISO 8601 datetime strings', () => {
    const invalid = { ...exampleMetadata, created: 'not-a-date' };
    const result = MetadataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should require floorOrder to be an integer', () => {
    const invalid = { ...exampleMetadata, floorOrder: 1.5 };
    const result = MetadataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should allow optional fields', () => {
    const minimal = {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      lotName: 'Test',
      floorName: '1F',
      floorOrder: 0,
    };
    const result = MetadataSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });
});

describe('AssetSchema', () => {
  it('should validate valid assets', () => {
    exampleAssets.forEach((asset) => {
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });
  });

  it('should validate asset type enum', () => {
    const invalid = { ...exampleAssets[0], type: 'invalid' };
    const result = AssetSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should require valid URL', () => {
    const invalid = { ...exampleAssets[0], url: 'not-a-url' };
    const result = AssetSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should require non-empty id and name', () => {
    const invalidId = { ...exampleAssets[0], id: '' };
    const invalidName = { ...exampleAssets[0], name: '' };

    expect(AssetSchema.safeParse(invalidId).success).toBe(false);
    expect(AssetSchema.safeParse(invalidName).success).toBe(false);
  });

  it('should allow optional size, width, height', () => {
    const minimal = {
      id: 'asset-1',
      name: 'test',
      type: 'icon' as const,
      url: 'http://example.com/icon.svg',
      mimeType: 'image/svg+xml',
    };
    const result = AssetSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });
});

describe('StyleSchema', () => {
  it('should validate valid styles', () => {
    const validStyles = [
      { color: '#FF0000' },
      { strokeColor: '#00FF00', fillColor: '#0000FF' },
      { opacity: 0.5 },
      { strokeWidth: 2, zIndex: 10 },
    ];

    validStyles.forEach((style) => {
      const result = StyleSchema.safeParse(style);
      expect(result.success).toBe(true);
    });
  });

  it('should validate hex color format', () => {
    const invalidColors = [
      { color: 'red' },
      { color: '#FF' },
      { color: '#GGGGGG' },
      { strokeColor: 'blue' },
    ];

    invalidColors.forEach((style) => {
      const result = StyleSchema.safeParse(style);
      expect(result.success).toBe(false);
    });
  });

  it('should validate opacity range 0-1', () => {
    expect(StyleSchema.safeParse({ opacity: 0 }).success).toBe(true);
    expect(StyleSchema.safeParse({ opacity: 1 }).success).toBe(true);
    expect(StyleSchema.safeParse({ opacity: 0.5 }).success).toBe(true);
    expect(StyleSchema.safeParse({ opacity: -0.1 }).success).toBe(false);
    expect(StyleSchema.safeParse({ opacity: 1.1 }).success).toBe(false);
  });

  it('should allow empty style object', () => {
    const result = StyleSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('GeometrySchema', () => {
  it('should validate point geometry', () => {
    const point = {
      type: 'point' as const,
      coordinates: [100, 200] as [number, number],
    };
    const result = GeometrySchema.safeParse(point);
    expect(result.success).toBe(true);
  });

  it('should validate polyline geometry', () => {
    const polyline = {
      type: 'polyline' as const,
      coordinates: [[0, 0], [10, 10], [20, 20]] as Array<[number, number]>,
    };
    const result = GeometrySchema.safeParse(polyline);
    expect(result.success).toBe(true);
  });

  it('should validate polygon geometry', () => {
    const polygon = {
      type: 'polygon' as const,
      coordinates: [[0, 0], [10, 0], [10, 10], [0, 10]] as Array<[number, number]>,
      closed: true,
    };
    const result = GeometrySchema.safeParse(polygon);
    expect(result.success).toBe(true);
  });

  it('should require at least 2 points for polyline', () => {
    const invalid = {
      type: 'polyline' as const,
      coordinates: [[0, 0]] as Array<[number, number]>,
    };
    const result = GeometrySchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('at least 2 points');
    }
  });

  it('should require at least 3 points for polygon', () => {
    const invalid = {
      type: 'polygon' as const,
      coordinates: [[0, 0], [10, 10]] as Array<[number, number]>,
      closed: true,
    };
    const result = GeometrySchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('at least 3 points');
    }
  });

  it('should reject invalid geometry types', () => {
    const invalid = {
      type: 'circle',
      coordinates: [0, 0],
    };
    const result = GeometrySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('RelationSchema', () => {
  it('should validate valid relations', () => {
    const relations = [
      { targetId: 'obj-1', type: 'required' as const },
      { targetId: 'obj-2', type: 'optional' as const },
      { targetId: 'obj-3', type: 'reference' as const, meta: { key: 'value' } },
    ];

    relations.forEach((relation) => {
      const result = RelationSchema.safeParse(relation);
      expect(result.success).toBe(true);
    });
  });

  it('should require non-empty targetId', () => {
    const invalid = { targetId: '', type: 'required' as const };
    const result = RelationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should validate relation type enum', () => {
    const invalid = { targetId: 'obj-1', type: 'invalid' };
    const result = RelationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should allow optional meta field', () => {
    const withMeta = { targetId: 'obj-1', type: 'required' as const, meta: { foo: 'bar' } };
    const withoutMeta = { targetId: 'obj-1', type: 'required' as const };

    expect(RelationSchema.safeParse(withMeta).success).toBe(true);
    expect(RelationSchema.safeParse(withoutMeta).success).toBe(true);
  });
});

describe('MapObjectSchema', () => {
  it('should validate valid map objects', () => {
    exampleObjects.forEach((obj) => {
      const result = MapObjectSchema.safeParse(obj);
      expect(result.success).toBe(true);
    });
  });

  it('should require all mandatory fields', () => {
    const mandatoryFields = ['id', 'type', 'name', 'layer', 'geometry', 'style', 'properties'];
    const validObj = exampleObjects[0];

    mandatoryFields.forEach((field) => {
      const invalid = { ...validObj };
      delete (invalid as any)[field];
      const result = MapObjectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  it('should allow optional fields', () => {
    const minimal: MapObject = {
      id: 'obj-1',
      type: 'CCTV',
      name: 'Camera',
      layer: 'CCTV',
      geometry: { type: 'point', coordinates: [0, 0] },
      style: {},
      properties: {},
    };
    const result = MapObjectSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('should accept any properties in properties field', () => {
    const obj = {
      ...exampleObjects[0],
      properties: {
        customField1: 'string',
        customField2: 123,
        customField3: true,
        customField4: { nested: 'object' },
      },
    };
    const result = MapObjectSchema.safeParse(obj);
    expect(result.success).toBe(true);
  });
});

describe('MapDataSchema', () => {
  it('should validate complete valid map data', () => {
    const result = MapDataSchema.safeParse(exampleMapData);
    expect(result.success).toBe(true);
  });

  it('should validate minimal map data', () => {
    const result = MapDataSchema.safeParse(minimalMapData);
    expect(result.success).toBe(true);
  });

  it('should reject missing version', () => {
    const result = MapDataSchema.safeParse(invalidMapDataExamples.missingVersion);
    expect(result.success).toBe(false);
  });

  it('should reject invalid metadata', () => {
    const result = MapDataSchema.safeParse(invalidMapDataExamples.invalidMetadata);
    expect(result.success).toBe(false);
  });

  it('should reject duplicate object IDs', () => {
    const result = MapDataSchema.safeParse(invalidMapDataExamples.duplicateObjectIds);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('unique');
    }
  });

  it('should reject invalid asset references', () => {
    const result = MapDataSchema.safeParse(invalidMapDataExamples.invalidAssetRef);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('asset');
    }
  });

  it('should reject invalid relation targetIds', () => {
    const result = MapDataSchema.safeParse(invalidMapDataExamples.invalidRelationTargetId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('relation');
    }
  });

  it('should validate asset ID uniqueness', () => {
    const dataWithDuplicateAssets: MapData = {
      version: '1.0.0',
      metadata: exampleMetadata,
      assets: [
        { id: 'dup', name: 'Asset 1', type: 'icon', url: 'http://example.com/1.svg', mimeType: 'image/svg+xml' },
        { id: 'dup', name: 'Asset 2', type: 'icon', url: 'http://example.com/2.svg', mimeType: 'image/svg+xml' },
      ],
      objects: [],
    };
    const result = MapDataSchema.safeParse(dataWithDuplicateAssets);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('asset IDs must be unique');
    }
  });
});

describe('Validation Functions', () => {
  describe('validateMapData', () => {
    it('should return validated data for valid input', () => {
      const result = validateMapData(exampleMapData);
      expect(result).toEqual(exampleMapData);
    });

    it('should throw ZodError for invalid input', () => {
      expect(() => validateMapData(invalidMapDataExamples.missingVersion)).toThrow();
    });
  });

  describe('validateMapDataSafe', () => {
    it('should return success result for valid data', () => {
      const result = validateMapDataSafe(exampleMapData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(exampleMapData);
      }
    });

    it('should return error result for invalid data', () => {
      const result = validateMapDataSafe(invalidMapDataExamples.missingVersion);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeInstanceOf(Array);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should provide detailed error messages', () => {
      const result = validateMapDataSafe(invalidMapDataExamples.invalidMetadata);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((err) => err.includes('metadata'))).toBe(true);
      }
    });

    it('should format error paths correctly', () => {
      const result = validateMapDataSafe({
        version: '1.0.0',
        metadata: exampleMetadata,
        assets: [],
        objects: [
          {
            id: 'obj-1',
            type: 'CCTV',
            name: 'Camera',
            layer: 'CCTV',
            geometry: { type: 'point', coordinates: [0, 0] },
            style: { color: 'invalid-color' },
            properties: {},
          },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((err) => err.includes('objects.0.style.color'))).toBe(true);
      }
    });
  });

  describe('validateMapObject', () => {
    it('should validate individual map objects', () => {
      const result = validateMapObject(exampleObjects[0]);
      expect(result).toEqual(exampleObjects[0]);
    });

    it('should throw for invalid map object', () => {
      expect(() => validateMapObject({ id: '', type: '', name: '' })).toThrow();
    });
  });

  describe('validateMetadata', () => {
    it('should validate metadata', () => {
      const result = validateMetadata(exampleMetadata);
      expect(result).toEqual(exampleMetadata);
    });

    it('should throw for invalid metadata', () => {
      expect(() => validateMetadata({ lotName: '' })).toThrow();
    });
  });

  describe('validateAsset', () => {
    it('should validate assets', () => {
      const result = validateAsset(exampleAssets[0]);
      expect(result).toEqual(exampleAssets[0]);
    });

    it('should throw for invalid asset', () => {
      expect(() => validateAsset({ id: '', name: '' })).toThrow();
    });
  });
});

describe('Complex Validation Scenarios', () => {
  it('should validate map with multiple related objects', () => {
    const data: MapData = {
      version: '1.0.0',
      metadata: exampleMetadata,
      assets: [exampleAssets[0]],
      objects: [
        {
          id: 'obj-1',
          type: 'CCTV',
          name: 'Camera 1',
          layer: 'CCTV',
          geometry: { type: 'point', coordinates: [0, 0] },
          style: {},
          properties: {},
          assetRefs: ['asset-cctv-icon'],
          relations: [{ targetId: 'obj-2', type: 'required' }],
        },
        {
          id: 'obj-2',
          type: 'Zone',
          name: 'Zone 1',
          layer: 'Zones',
          geometry: { type: 'polygon', coordinates: [[0, 0], [10, 0], [10, 10], [0, 10]], closed: true },
          style: {},
          properties: {},
          relations: [{ targetId: 'obj-1', type: 'optional' }],
        },
      ],
    };
    const result = MapDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate map with all geometry types', () => {
    const data: MapData = {
      version: '1.0.0',
      metadata: exampleMetadata,
      assets: [],
      objects: [
        {
          id: 'point-obj',
          type: 'CCTV',
          name: 'Point',
          layer: 'Layer1',
          geometry: { type: 'point', coordinates: [0, 0] },
          style: {},
          properties: {},
        },
        {
          id: 'polyline-obj',
          type: 'Lane',
          name: 'Polyline',
          layer: 'Layer2',
          geometry: { type: 'polyline', coordinates: [[0, 0], [10, 10]] },
          style: {},
          properties: {},
        },
        {
          id: 'polygon-obj',
          type: 'Zone',
          name: 'Polygon',
          layer: 'Layer3',
          geometry: { type: 'polygon', coordinates: [[0, 0], [10, 0], [5, 10]], closed: true },
          style: {},
          properties: {},
        },
      ],
    };
    const result = MapDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should handle empty arrays correctly', () => {
    const data: MapData = {
      version: '1.0.0',
      metadata: exampleMetadata,
      assets: [],
      objects: [],
    };
    const result = MapDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate complex property structures', () => {
    const obj: MapObject = {
      id: 'obj-1',
      type: 'CustomType',
      name: 'Complex Object',
      layer: 'Layer1',
      geometry: { type: 'point', coordinates: [0, 0] },
      style: {},
      properties: {
        simpleString: 'value',
        simpleNumber: 42,
        simpleBoolean: true,
        nestedObject: {
          level1: {
            level2: {
              deepValue: 'deep',
            },
          },
        },
        arrayProp: [1, 2, 3, 'mixed', true],
        nullValue: null,
      },
    };
    const result = MapObjectSchema.safeParse(obj);
    expect(result.success).toBe(true);
  });
});
