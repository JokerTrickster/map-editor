import type { MapData, MapObject, Asset, Metadata } from './types';

/**
 * Example metadata for a parking lot floor
 */
export const exampleMetadata: Metadata = {
  created: new Date('2025-12-01T10:00:00.000Z').toISOString(),
  modified: new Date('2025-12-02T15:30:00.000Z').toISOString(),
  author: 'admin@example.com',
  lotName: 'Building A Parking Lot',
  floorName: 'B1',
  floorOrder: -1,
  description: 'First basement floor parking area',
};

/**
 * Example assets (icons, images)
 */
export const exampleAssets: Asset[] = [
  {
    id: 'asset-cctv-icon',
    name: 'cctv-icon',
    type: 'icon',
    url: '/assets/icons/cctv.svg',
    mimeType: 'image/svg+xml',
    size: 2048,
    width: 64,
    height: 64,
  },
  {
    id: 'asset-charger-icon',
    name: 'charger-icon',
    type: 'icon',
    url: '/assets/icons/charger.svg',
    mimeType: 'image/svg+xml',
    size: 1824,
    width: 64,
    height: 64,
  },
  {
    id: 'asset-floorplan',
    name: 'floor-b1',
    type: 'image',
    url: '/assets/floorplans/b1.png',
    mimeType: 'image/png',
    size: 524288,
    width: 1920,
    height: 1080,
  },
];

/**
 * Example map objects with different geometry types
 */
export const exampleObjects: MapObject[] = [
  // CCTV - Point geometry
  {
    id: 'obj-cctv-001',
    type: 'CCTV',
    name: 'Camera 01',
    layer: 'CCTV',
    entityHandle: 'DXF-123',
    geometry: {
      type: 'point',
      coordinates: [100, 200],
    },
    style: {
      color: '#FF0000',
      opacity: 0.9,
      zIndex: 10,
    },
    properties: {
      serialNumber: 'CAM-001',
      ipAddress: '192.168.1.100',
      model: 'Hikvision DS-2CD2143G0-I',
      resolution: '4MP',
    },
    assetRefs: ['asset-cctv-icon'],
    relations: [],
  },

  // EV Charger - Point geometry
  {
    id: 'obj-charger-001',
    type: 'Charger',
    name: 'EV Charger 01',
    layer: 'Chargers',
    geometry: {
      type: 'point',
      coordinates: [150, 250],
    },
    style: {
      color: '#00FF00',
      opacity: 1.0,
      zIndex: 10,
    },
    properties: {
      powerOutput: 7.2,
      chargingType: 'AC',
      connectorType: 'Type 2',
      status: 'available',
    },
    assetRefs: ['asset-charger-icon'],
    relations: [
      {
        targetId: 'obj-spot-001',
        type: 'required',
        meta: {
          description: 'Charger serves this parking spot',
        },
      },
    ],
  },

  // Parking Spot - Polygon geometry
  {
    id: 'obj-spot-001',
    type: 'ParkingSpot',
    name: 'Spot A-01',
    layer: 'ParkingSpots',
    geometry: {
      type: 'polygon',
      coordinates: [
        [140, 240],
        [160, 240],
        [160, 260],
        [140, 260],
      ],
      closed: true,
    },
    style: {
      fillColor: '#0000FF',
      strokeColor: '#000000',
      strokeWidth: 2,
      opacity: 0.3,
      zIndex: 1,
    },
    properties: {
      spotNumber: 'A-01',
      spotType: 'ev',
      status: 'available',
    },
    assetRefs: [],
    relations: [
      {
        targetId: 'obj-charger-001',
        type: 'required',
        meta: {
          description: 'EV charging spot',
        },
      },
    ],
  },

  // Parking Lane - Polyline geometry
  {
    id: 'obj-lane-001',
    type: 'ParkingLane',
    name: 'Lane A',
    layer: 'Lanes',
    geometry: {
      type: 'polyline',
      coordinates: [
        [50, 100],
        [150, 100],
        [150, 300],
        [50, 300],
      ],
    },
    style: {
      strokeColor: '#FFFF00',
      strokeWidth: 3,
      opacity: 0.8,
      zIndex: 5,
    },
    properties: {
      direction: 'bidirectional',
      maxSpeed: 10,
    },
    assetRefs: [],
    relations: [],
  },

  // Sensor - Point geometry
  {
    id: 'obj-sensor-001',
    type: 'Sensor',
    name: 'Ultrasonic Sensor 01',
    layer: 'Sensors',
    geometry: {
      type: 'point',
      coordinates: [145, 235],
    },
    style: {
      color: '#FF00FF',
      opacity: 0.7,
      zIndex: 8,
    },
    properties: {
      sensorType: 'ultrasonic',
      model: 'HC-SR04',
      range: 400,
      linkedSpot: 'A-01',
    },
    assetRefs: [],
    relations: [
      {
        targetId: 'obj-spot-001',
        type: 'reference',
        meta: {
          description: 'Monitors occupancy of parking spot',
        },
      },
    ],
  },

  // Zone - Polygon geometry
  {
    id: 'obj-zone-001',
    type: 'Zone',
    name: 'Zone A',
    layer: 'Zones',
    geometry: {
      type: 'polygon',
      coordinates: [
        [0, 0],
        [200, 0],
        [200, 350],
        [0, 350],
      ],
      closed: true,
    },
    style: {
      fillColor: '#CCCCCC',
      strokeColor: '#666666',
      strokeWidth: 1,
      opacity: 0.1,
      zIndex: 0,
    },
    properties: {
      zoneName: 'Section A',
      capacity: 50,
      handicappedSpots: 3,
    },
    assetRefs: [],
    relations: [],
  },
];

/**
 * Complete example map data
 */
export const exampleMapData: MapData = {
  version: '1.0.0',
  metadata: exampleMetadata,
  assets: exampleAssets,
  objects: exampleObjects,
};

/**
 * Minimal valid map data (for testing)
 */
export const minimalMapData: MapData = {
  version: '1.0.0',
  metadata: {
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    lotName: 'Test Lot',
    floorName: '1F',
    floorOrder: 0,
  },
  assets: [],
  objects: [],
};

/**
 * Example invalid data for testing validation errors
 */
export const invalidMapDataExamples = {
  missingVersion: {
    metadata: exampleMetadata,
    assets: [],
    objects: [],
  },

  invalidMetadata: {
    version: '1.0.0',
    metadata: {
      created: 'not-a-date',
      modified: new Date().toISOString(),
      lotName: '',
      floorName: 'B1',
      floorOrder: 0,
    },
    assets: [],
    objects: [],
  },

  duplicateObjectIds: {
    version: '1.0.0',
    metadata: exampleMetadata,
    assets: [],
    objects: [
      {
        id: 'duplicate-id',
        type: 'CCTV',
        name: 'Object 1',
        layer: 'Layer1',
        geometry: { type: 'point', coordinates: [0, 0] },
        style: {},
        properties: {},
      },
      {
        id: 'duplicate-id',
        type: 'Sensor',
        name: 'Object 2',
        layer: 'Layer2',
        geometry: { type: 'point', coordinates: [10, 10] },
        style: {},
        properties: {},
      },
    ],
  },

  invalidAssetRef: {
    version: '1.0.0',
    metadata: exampleMetadata,
    assets: [{ id: 'asset-1', name: 'Asset', type: 'icon', url: 'http://example.com/icon.svg', mimeType: 'image/svg+xml' }],
    objects: [
      {
        id: 'obj-1',
        type: 'CCTV',
        name: 'Camera',
        layer: 'CCTV',
        geometry: { type: 'point', coordinates: [0, 0] },
        style: {},
        properties: {},
        assetRefs: ['non-existent-asset'],
      },
    ],
  },

  invalidRelationTargetId: {
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
        style: {},
        properties: {},
        relations: [{ targetId: 'non-existent-object', type: 'required' }],
      },
    ],
  },

  invalidPolygon: {
    version: '1.0.0',
    metadata: exampleMetadata,
    assets: [],
    objects: [
      {
        id: 'obj-1',
        type: 'Zone',
        name: 'Invalid Zone',
        layer: 'Zones',
        geometry: {
          type: 'polygon',
          coordinates: [[0, 0], [10, 10]], // Only 2 points
          closed: true,
        },
        style: {},
        properties: {},
      },
    ],
  },

  invalidColor: {
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
        style: { color: 'red' }, // Invalid hex format
        properties: {},
      },
    ],
  },
};
