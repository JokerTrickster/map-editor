import { describe, test, expect, beforeEach } from 'vitest'
import { dia } from '@joint/core'
import { exportGraphToJSON } from '../exportUtils'

describe('exportUtils', () => {
  let graph: dia.Graph

  beforeEach(() => {
    graph = new dia.Graph()
  })

  describe('exportGraphToJSON - new type-specific structure', () => {
    test('exports graph with new data structure and type-specific arrays', () => {
      const metadata = {
        lotName: 'Test Parking Lot',
        lotCreated: '2025-12-04T05:41:00.194Z',
        floorName: 'B2',
        floorOrder: -2
      }

      const result = exportGraphToJSON(graph, metadata)

      // Verify top-level structure
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('createdAt')
      expect(result.data).toHaveProperty('name')
      expect(result.data).toHaveProperty('parkingLotLevels')

      // Verify data values
      expect(result.data.createdAt).toBe(metadata.lotCreated)
      expect(result.data.name).toBe(metadata.lotName)
      expect(result.data.parkingLotLevels).toHaveLength(1)

      // Verify floor level structure
      const floorLevel = result.data.parkingLotLevels[0]
      expect(floorLevel.name).toBe(metadata.floorName)
      expect(floorLevel.mapData).toBeDefined()

      // Verify mapData structure (type-specific arrays)
      expect(floorLevel.mapData).toHaveProperty('version')
      expect(floorLevel.mapData).toHaveProperty('metadata')
      expect(floorLevel.mapData.version).toBe('1.0.0')
      expect(floorLevel.mapData.metadata.lotName).toBe(metadata.lotName)
      expect(floorLevel.mapData.metadata.floorName).toBe(metadata.floorName)
      expect(floorLevel.mapData.metadata.floorOrder).toBe(metadata.floorOrder)

      // Verify NO generic objects array exists
      expect(floorLevel.mapData).not.toHaveProperty('objects')
      expect(floorLevel.mapData).not.toHaveProperty('assets')
    })

    test('exports CCTV to lightCctvs with position', () => {
      const rect = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        data: {
          typeId: 'CCTV',
          properties: {
            name: 'Test CCTV',
            serialNumber: 'CAM-001',
            ipAddress: '192.168.1.100',
            model: 'Hikvision',
            resolution: '4MP'
          },
          layer: 'equipment'
        }
      })
      graph.addCell(rect)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-04T05:41:00.194Z',
        floorName: 'B1',
        floorOrder: -1
      }

      const result = exportGraphToJSON(graph, metadata)

      // Verify CCTV structure
      expect(result.data.parkingLotLevels[0].mapData.cctvs).toBeDefined()
      expect(result.data.parkingLotLevels[0].mapData.cctvs?.lightCctvs).toHaveLength(1)

      const cctv = result.data.parkingLotLevels[0].mapData.cctvs!.lightCctvs[0]
      expect(cctv.id).toBeDefined()
      expect(cctv.position).toEqual({ x: 125, y: 125 }) // Centered position
      expect(cctv.name).toBe('Test CCTV')
      expect(cctv.serialNumber).toBe('CAM-001')
      expect(cctv.ipAddress).toBe('192.168.1.100')
      expect(cctv.model).toBe('Hikvision')
      expect(cctv.resolution).toBe('4MP')

      // Verify no nested properties object
      expect(cctv).not.toHaveProperty('properties')
      expect(cctv).not.toHaveProperty('geometry')
    })

    test('exports Zone with points array', () => {
      const polygon = new dia.Element({
        type: 'standard.Polygon',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        data: {
          typeId: 'Zone',
          properties: {
            name: 'Zone A',
            zoneName: 'Parking Zone A',
            capacity: 50,
            handicappedSpots: 5
          },
          layer: 'zones'
        }
      })
      graph.addCell(polygon)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-04T05:41:00.194Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)

      // Verify Zone structure
      expect(result.data.parkingLotLevels[0].mapData.zones).toBeDefined()
      expect(result.data.parkingLotLevels[0].mapData.zones).toHaveLength(1)

      const zone = result.data.parkingLotLevels[0].mapData.zones![0]
      expect(zone.id).toBeDefined()
      expect(zone.name).toBe('Zone A')
      expect(zone.points).toBeDefined()
      expect(Array.isArray(zone.points)).toBe(true)
      expect(zone.zoneName).toBe('Parking Zone A')
      expect(zone.capacity).toBe(50)
      expect(zone.handicappedSpots).toBe(5)

      // Verify no nested properties
      expect(zone).not.toHaveProperty('properties')
      expect(zone).not.toHaveProperty('geometry')
    })

    test('exports Column with position', () => {
      const column = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 200, y: 300 },
        size: { width: 20, height: 20 },
        data: {
          typeId: 'Column',
          properties: {
            name: 'Column 1'
          }
        }
      })
      graph.addCell(column)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-04T05:41:00.194Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)

      expect(result.data.parkingLotLevels[0].mapData.columns).toBeDefined()
      expect(result.data.parkingLotLevels[0].mapData.columns).toHaveLength(1)

      const col = result.data.parkingLotLevels[0].mapData.columns![0]
      expect(col.position).toEqual({ x: 210, y: 310 })
      expect(col.name).toBe('Column 1')
    })

    test('exports ParkingLocation with points array', () => {
      const spot = new dia.Element({
        type: 'standard.Polygon',
        position: { x: 0, y: 0 },
        size: { width: 50, height: 30 },
        data: {
          typeId: 'ParkingSpot',
          properties: {
            name: 'Spot A-01',
            spotNumber: 'A-01',
            spotType: 'ev',
            status: 'available'
          }
        }
      })
      graph.addCell(spot)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-04T05:41:00.194Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)

      expect(result.data.parkingLotLevels[0].mapData.parkingLocations).toBeDefined()
      expect(result.data.parkingLotLevels[0].mapData.parkingLocations).toHaveLength(1)

      const location = result.data.parkingLotLevels[0].mapData.parkingLocations![0]
      expect(location.points).toBeDefined()
      expect(location.spotNumber).toBe('A-01')
      expect(location.spotType).toBe('ev')
      expect(location.status).toBe('available')
    })

    test('exports multiple object types correctly', () => {
      // Add CCTV
      graph.addCell(new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        data: { typeId: 'CCTV', properties: { name: 'Camera 1' } }
      }))

      // Add Column
      graph.addCell(new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 200, y: 200 },
        size: { width: 20, height: 20 },
        data: { typeId: 'Column', properties: { name: 'Column 1' } }
      }))

      // Add Charger
      graph.addCell(new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 300, y: 300 },
        size: { width: 30, height: 30 },
        data: { typeId: 'Charger', properties: { name: 'Charger 1', powerOutput: 7.2 } }
      }))

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-04T05:41:00.194Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const mapData = result.data.parkingLotLevels[0].mapData

      // Verify all type-specific arrays exist
      expect(mapData.cctvs?.lightCctvs).toHaveLength(1)
      expect(mapData.columns).toHaveLength(1)
      expect(mapData.chargers).toHaveLength(1)

      // Verify no objects array
      expect(mapData).not.toHaveProperty('objects')
    })

    test('handles empty graph with no type-specific arrays', () => {
      const metadata = {
        lotName: 'Empty Lot',
        lotCreated: '2025-12-10T12:00:00.000Z',
        floorName: '1F',
        floorOrder: 0
      }

      const result = exportGraphToJSON(graph, metadata)
      const mapData = result.data.parkingLotLevels[0].mapData

      // Empty arrays should not be present (all optional)
      expect(mapData.cctvs).toBeUndefined()
      expect(mapData.zones).toBeUndefined()
      expect(mapData.columns).toBeUndefined()
      expect(mapData.parkingLocations).toBeUndefined()
      expect(mapData.sensors).toBeUndefined()
      expect(mapData.chargers).toBeUndefined()
    })

    test('validates ISO 8601 timestamp format', () => {
      const metadata = {
        lotName: 'Test',
        lotCreated: '2025-12-04T05:41:00.194Z',
        floorName: 'B1',
        floorOrder: -1
      }

      const result = exportGraphToJSON(graph, metadata)

      const createdTimestamp = result.data.parkingLotLevels[0].mapData.metadata.created
      expect(createdTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

      const modifiedTimestamp = result.data.parkingLotLevels[0].mapData.metadata.modified
      expect(modifiedTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    test('preserves all required metadata fields', () => {
      const metadata = {
        lotName: 'Complete Test',
        lotCreated: '2025-12-04T05:41:00.194Z',
        floorName: 'B2',
        floorOrder: -2,
        author: 'Test Author',
        description: 'Test Description'
      }

      const result = exportGraphToJSON(graph, metadata)

      // Top-level required fields
      expect(result.data.createdAt).toBeDefined()
      expect(result.data.name).toBeDefined()
      expect(result.data.parkingLotLevels).toBeDefined()

      // Floor level required fields
      const floor = result.data.parkingLotLevels[0]
      expect(floor.name).toBeDefined()
      expect(floor.mapData).toBeDefined()

      // MapData required fields
      expect(floor.mapData.version).toBeDefined()
      expect(floor.mapData.metadata).toBeDefined()

      // Metadata optional fields
      expect(floor.mapData.metadata.author).toBe('Test Author')
      expect(floor.mapData.metadata.description).toBe('Test Description')
    })

    test('flattens properties to root level', () => {
      const cctv = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        data: {
          typeId: 'CCTV',
          properties: {
            name: 'Camera 1',
            serialNumber: 'CAM-001',
            ipAddress: '192.168.1.100',
            model: 'Hikvision'
          }
        }
      })
      graph.addCell(cctv)

      const metadata = {
        lotName: 'Test',
        lotCreated: '2025-12-04T05:41:00.194Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const exported = result.data.parkingLotLevels[0].mapData.cctvs!.lightCctvs[0]

      // All properties should be at root level
      expect(exported.serialNumber).toBe('CAM-001')
      expect(exported.ipAddress).toBe('192.168.1.100')
      expect(exported.model).toBe('Hikvision')

      // No nested properties object
      expect(exported).not.toHaveProperty('properties')
    })

    test('routes different type aliases correctly', () => {
      // Test type aliases
      graph.addCell(new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 0, y: 0 },
        size: { width: 50, height: 50 },
        data: { typeId: 'Camera', properties: { name: 'Camera' } } // Should map to CCTV
      }))

      graph.addCell(new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 0, y: 0 },
        size: { width: 50, height: 50 },
        data: { typeId: 'ParkingZone', properties: { name: 'Zone' } } // Should map to Zone
      }))

      graph.addCell(new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 0, y: 0 },
        size: { width: 50, height: 50 },
        data: { typeId: 'EVCharger', properties: { name: 'Charger' } } // Should map to Charger
      }))

      const metadata = {
        lotName: 'Test',
        lotCreated: '2025-12-04T05:41:00.194Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const mapData = result.data.parkingLotLevels[0].mapData

      expect(mapData.cctvs?.lightCctvs).toHaveLength(1)
      expect(mapData.zones).toHaveLength(1)
      expect(mapData.chargers).toHaveLength(1)
    })

    test('extracts relationships from properties with Id/Ids/Ref/Refs patterns', () => {
      // Create CCTV with relationships
      const cctv = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        data: {
          typeId: 'CCTV',
          properties: {
            name: 'Camera 1',
            controlId: 'control-123',
            zoneId: 'zone-456'
          }
        }
      })
      graph.addCell(cctv)

      // Create Zone with multiple relationships
      const zone = new dia.Element({
        type: 'standard.Polygon',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        data: {
          typeId: 'Zone',
          properties: {
            name: 'Zone A',
            columnIds: ['col-1', 'col-2', 'col-3'],
            parkingLocationIds: ['spot-1', 'spot-2']
          }
        }
      })
      graph.addCell(zone)

      // Create Sensor with relationship
      const sensor = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 200, y: 200 },
        size: { width: 30, height: 30 },
        data: {
          typeId: 'Sensor',
          properties: {
            name: 'Sensor 1',
            linkedSpotId: 'spot-1'
          }
        }
      })
      graph.addCell(sensor)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-04T05:41:00.194Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const mapData = result.data.parkingLotLevels[0].mapData

      // Verify CCTV relationships
      expect(mapData.cctvs?.lightCctvs).toHaveLength(1)
      const cctvExport = mapData.cctvs!.lightCctvs[0]
      expect(cctvExport.controlId).toBe('control-123')
      expect(cctvExport.zoneId).toBe('zone-456')

      // Verify Zone relationships
      expect(mapData.zones).toHaveLength(1)
      const zoneExport = mapData.zones![0]
      expect(zoneExport.columnIds).toEqual(['col-1', 'col-2', 'col-3'])
      expect(zoneExport.parkingLocationIds).toEqual(['spot-1', 'spot-2'])

      // Verify Sensor relationships
      expect(mapData.sensors).toHaveLength(1)
      const sensorExport = mapData.sensors![0]
      expect(sensorExport.linkedSpotId).toBe('spot-1')
    })

    test('excludes non-relationship properties from relation extraction', () => {
      // Create object with mix of relationship and non-relationship properties
      const cctv = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        data: {
          typeId: 'CCTV',
          properties: {
            name: 'Camera 1',
            serialNumber: 'CAM-001', // Should NOT be treated as relation
            ipAddress: '192.168.1.1', // Should NOT be treated as relation
            model: 'Hikvision',       // Should NOT be treated as relation
            readerId: 'READER-123',   // Should NOT be treated as relation
            controlId: 'control-123', // SHOULD be treated as relation
            zoneId: 'zone-456'        // SHOULD be treated as relation
          }
        }
      })
      graph.addCell(cctv)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-04T05:41:00.194Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const mapData = result.data.parkingLotLevels[0].mapData

      // Verify CCTV has correct properties
      const cctvExport = mapData.cctvs!.lightCctvs[0]

      // Regular properties should be in the export
      expect(cctvExport.serialNumber).toBe('CAM-001')
      expect(cctvExport.ipAddress).toBe('192.168.1.1')
      expect(cctvExport.model).toBe('Hikvision')

      // Relationship properties should also be in the export
      expect(cctvExport.controlId).toBe('control-123')
      expect(cctvExport.zoneId).toBe('zone-456')
    })

    test('handles empty and null relationship values', () => {
      // Create object with empty/null relationship properties
      const cctv = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        data: {
          typeId: 'CCTV',
          properties: {
            name: 'Camera 1',
            controlId: '', // Empty string - should not create relation
            zoneId: null,  // Null - should not create relation
            sensorId: undefined // Undefined - should not create relation
          }
        }
      })
      graph.addCell(cctv)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-04T05:41:00.194Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const mapData = result.data.parkingLotLevels[0].mapData

      // Verify CCTV has no relationships
      const cctvExport = mapData.cctvs!.lightCctvs[0]
      expect(cctvExport.controlId).toBeUndefined()
      expect(cctvExport.zoneId).toBeUndefined()
    })
  })
})
