/**
 * Usage Examples for Map Schema
 *
 * This file demonstrates how to use the schema validation
 * in real application scenarios.
 */

import {
  validateMapData,
  validateMapDataSafe,
  validateMapObject,
  type MapData,
  type MapObject,
  type Metadata,
  type Asset,
  isPointGeometry,
  isPolygonGeometry,
} from './index';

// ============================================
// Example 1: Creating and Validating Map Data
// ============================================

export function createNewMapData(lotName: string, floorName: string): MapData {
  const now = new Date().toISOString();

  const metadata: Metadata = {
    created: now,
    modified: now,
    lotName,
    floorName,
    floorOrder: floorName === 'B1' ? -1 : 0,
    description: `Map for ${lotName} - ${floorName}`,
  };

  const mapData: MapData = {
    version: '1.0.0',
    metadata,
    assets: [],
    objects: [],
  };

  // Validate before returning
  return validateMapData(mapData);
}

// ============================================
// Example 2: Adding Objects with Validation
// ============================================

export function addCCTVToMap(
  mapData: MapData,
  position: [number, number],
  assetId?: string
): MapData {
  const newCCTV: MapObject = {
    id: `cctv-${Date.now()}`,
    type: 'CCTV',
    name: `Camera ${mapData.objects.filter((o) => o.type === 'CCTV').length + 1}`,
    layer: 'CCTV',
    geometry: {
      type: 'point',
      coordinates: position,
    },
    style: {
      color: '#FF0000',
      opacity: 0.9,
      zIndex: 10,
    },
    properties: {
      status: 'active',
      serialNumber: `CAM-${Math.random().toString(36).substring(7)}`,
    },
    assetRefs: assetId ? [assetId] : undefined,
    relations: [],
  };

  // Validate the new object
  validateMapObject(newCCTV);

  // Add to map and validate entire map
  const updatedMap: MapData = {
    ...mapData,
    metadata: {
      ...mapData.metadata,
      modified: new Date().toISOString(),
    },
    objects: [...mapData.objects, newCCTV],
  };

  return validateMapData(updatedMap);
}

// ============================================
// Example 3: Safe Validation for User Input
// ============================================

export function importMapFromJSON(jsonString: string): MapData {
  try {
    const data = JSON.parse(jsonString);
    const result = validateMapDataSafe(data);

    if (!result.success) {
      const errorMessage = `Map validation failed:\n${result.errors.join('\n')}`;
      throw new Error(errorMessage);
    }

    return result.data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw error;
  }
}

// ============================================
// Example 4: Type Guards for Geometry
// ============================================

export function calculateObjectArea(obj: MapObject): number | null {
  if (isPolygonGeometry(obj.geometry)) {
    // Calculate polygon area using shoelace formula
    const coords = obj.geometry.coordinates;
    let area = 0;

    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      area += coords[i][0] * coords[j][1];
      area -= coords[j][0] * coords[i][1];
    }

    return Math.abs(area) / 2;
  }

  if (isPointGeometry(obj.geometry)) {
    // Points have no area
    return null;
  }

  // Polylines have no area
  return null;
}

// ============================================
// Example 5: Creating Relations
// ============================================

export function linkChargerToParkingSpot(
  mapData: MapData,
  chargerId: string,
  spotId: string
): MapData {
  // Validate that both objects exist
  const charger = mapData.objects.find((o) => o.id === chargerId);
  const spot = mapData.objects.find((o) => o.id === spotId);

  if (!charger || !spot) {
    throw new Error('Charger or parking spot not found');
  }

  // Add relation to charger
  const updatedObjects = mapData.objects.map((obj) => {
    if (obj.id === chargerId) {
      return {
        ...obj,
        relations: [
          ...(obj.relations || []),
          {
            targetId: spotId,
            type: 'required' as const,
            meta: { description: 'Charger serves this parking spot' },
          },
        ],
      };
    }
    return obj;
  });

  const updatedMap: MapData = {
    ...mapData,
    metadata: {
      ...mapData.metadata,
      modified: new Date().toISOString(),
    },
    objects: updatedObjects,
  };

  // Validate entire map (this will check that targetId exists)
  return validateMapData(updatedMap);
}

// ============================================
// Example 6: Adding Assets
// ============================================

export function addAssetToMap(
  mapData: MapData,
  name: string,
  type: 'image' | 'icon' | 'svg',
  url: string,
  mimeType: string
): { mapData: MapData; assetId: string } {
  const assetId = `asset-${Date.now()}`;

  const newAsset: Asset = {
    id: assetId,
    name,
    type,
    url,
    mimeType,
  };

  const updatedMap: MapData = {
    ...mapData,
    metadata: {
      ...mapData.metadata,
      modified: new Date().toISOString(),
    },
    assets: [...mapData.assets, newAsset],
  };

  return {
    mapData: validateMapData(updatedMap),
    assetId,
  };
}

// ============================================
// Example 7: Batch Validation
// ============================================

export function validateMultipleObjects(objects: unknown[]): {
  valid: MapObject[];
  invalid: Array<{ index: number; errors: string[] }>;
} {
  const valid: MapObject[] = [];
  const invalid: Array<{ index: number; errors: string[] }> = [];

  objects.forEach((obj, index) => {
    try {
      const validated = validateMapObject(obj);
      valid.push(validated);
    } catch (error) {
      if (error instanceof Error) {
        invalid.push({
          index,
          errors: [error.message],
        });
      }
    }
  });

  return { valid, invalid };
}

// ============================================
// Example 8: Export to JSON File
// ============================================

export function exportMapToJSON(mapData: MapData): string {
  // Validate before export
  const validated = validateMapData(mapData);

  // Pretty print with 2-space indentation
  return JSON.stringify(validated, null, 2);
}

// ============================================
// Example 9: Update Metadata
// ============================================

export function updateMapMetadata(
  mapData: MapData,
  updates: Partial<Omit<Metadata, 'created' | 'modified'>>
): MapData {
  const updatedMap: MapData = {
    ...mapData,
    metadata: {
      ...mapData.metadata,
      ...updates,
      modified: new Date().toISOString(),
    },
  };

  return validateMapData(updatedMap);
}

// ============================================
// Example 10: Filter and Transform
// ============================================

export function getObjectsByType(mapData: MapData, type: string): MapObject[] {
  return mapData.objects.filter((obj) => obj.type === type);
}

export function getObjectsByLayer(mapData: MapData, layer: string): MapObject[] {
  return mapData.objects.filter((obj) => obj.layer === layer);
}

export function getObjectWithRelations(mapData: MapData, objectId: string): {
  object: MapObject;
  relatedObjects: MapObject[];
} | null {
  const object = mapData.objects.find((o) => o.id === objectId);
  if (!object) return null;

  const relatedObjects = mapData.objects.filter((obj) =>
    object.relations?.some((rel) => rel.targetId === obj.id)
  );

  return { object, relatedObjects };
}
