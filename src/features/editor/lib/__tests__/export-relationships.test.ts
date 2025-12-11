import { describe, test, expect, beforeEach } from 'vitest'
import { dia } from '@joint/core'
import { exportGraphToJSON } from '../exportUtils'

/**
 * Dedicated test suite to reproduce and verify relationship export issues
 *
 * This test suite focuses on identifying scenarios where relationships
 * might not be properly extracted and exported in the JSON output.
 */
describe('Export Relationships - Issue Reproduction', () => {
  let graph: dia.Graph

  beforeEach(() => {
    graph = new dia.Graph()
  })

  describe('Relationship Extraction Issues', () => {
    test('SCENARIO 1: Properties with valid relationship fields should export relationships', () => {
      // Create a Zone with relationships to columns and parking spots
      const zone = new dia.Element({
        type: 'standard.Polygon',
        position: { x: 0, y: 0 },
        size: { width: 200, height: 200 },
        data: {
          typeId: 'Zone',
          layer: 'e-zone',
          properties: {
            name: 'Zone A',
            zoneName: 'Parking Zone A',
            capacity: 50,
            columnIds: ['column-1', 'column-2', 'column-3'],
            parkingLocationIds: ['spot-1', 'spot-2', 'spot-3']
          }
        }
      })
      graph.addCell(zone)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-11T00:00:00.000Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const mapData = result.data.parkingLotLevels[0].mapData

      // Verify Zone was exported
      expect(mapData.zones).toBeDefined()
      expect(mapData.zones).toHaveLength(1)

      const zoneExport = mapData.zones![0]

      // CRITICAL: These relationship arrays should be present
      console.log('🔍 Zone export:', JSON.stringify(zoneExport, null, 2))
      expect(zoneExport.columnIds).toBeDefined()
      expect(zoneExport.columnIds).toEqual(['column-1', 'column-2', 'column-3'])
      expect(zoneExport.parkingLocationIds).toBeDefined()
      expect(zoneExport.parkingLocationIds).toEqual(['spot-1', 'spot-2', 'spot-3'])
    })

    test('SCENARIO 2: CCTV with single relationship IDs should export them', () => {
      const cctv = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        data: {
          typeId: 'CCTV',
          layer: 'c-cctv',
          properties: {
            name: 'Camera 1',
            serialNumber: 'CAM-001',
            controlId: 'control-system-1',
            zoneId: 'zone-alpha'
          }
        }
      })
      graph.addCell(cctv)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-11T00:00:00.000Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const mapData = result.data.parkingLotLevels[0].mapData

      expect(mapData.cctvs?.lightCctvs).toBeDefined()
      expect(mapData.cctvs?.lightCctvs).toHaveLength(1)

      const cctvExport = mapData.cctvs!.lightCctvs[0]

      console.log('🔍 CCTV export:', JSON.stringify(cctvExport, null, 2))

      // CRITICAL: Single relationship IDs should be exported
      expect(cctvExport.controlId).toBe('control-system-1')
      expect(cctvExport.zoneId).toBe('zone-alpha')
    })

    test('SCENARIO 3: Sensor with linkedSpotId relationship', () => {
      const sensor = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 200, y: 200 },
        size: { width: 30, height: 30 },
        data: {
          typeId: 'Sensor',
          layer: 'c-sensor',
          properties: {
            name: 'Ultrasonic Sensor 1',
            sensorType: 'ultrasonic',
            model: 'US-100',
            range: 5,
            linkedSpotId: 'parking-spot-a01'
          }
        }
      })
      graph.addCell(sensor)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-11T00:00:00.000Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const mapData = result.data.parkingLotLevels[0].mapData

      expect(mapData.sensors).toBeDefined()
      expect(mapData.sensors).toHaveLength(1)

      const sensorExport = mapData.sensors![0]

      console.log('🔍 Sensor export:', JSON.stringify(sensorExport, null, 2))

      // CRITICAL: linkedSpotId should be exported
      expect(sensorExport.linkedSpotId).toBe('parking-spot-a01')
    })

    test('SCENARIO 4: ParkingLocation with multiple relationship types', () => {
      const spot = new dia.Element({
        type: 'standard.Polygon',
        position: { x: 0, y: 0 },
        size: { width: 50, height: 30 },
        data: {
          typeId: 'ParkingSpot',
          layer: 'p-parking',
          properties: {
            name: 'Spot A-01',
            spotNumber: 'A-01',
            spotType: 'ev',
            status: 'available',
            zoneId: 'zone-a',
            chargerId: 'charger-01',
            sensorId: 'sensor-01'
          }
        }
      })
      graph.addCell(spot)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-11T00:00:00.000Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const mapData = result.data.parkingLotLevels[0].mapData

      expect(mapData.parkingLocations).toBeDefined()
      expect(mapData.parkingLocations).toHaveLength(1)

      const spotExport = mapData.parkingLocations![0]

      console.log('🔍 ParkingLocation export:', JSON.stringify(spotExport, null, 2))

      // CRITICAL: All three relationship IDs should be exported
      expect(spotExport.zoneId).toBe('zone-a')
      expect(spotExport.chargerId).toBe('charger-01')
      expect(spotExport.sensorId).toBe('sensor-01')
    })

    test('SCENARIO 5: Charger with parkingSpotId relationship', () => {
      const charger = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 300, y: 300 },
        size: { width: 40, height: 40 },
        data: {
          typeId: 'Charger',
          layer: 'e-charger',
          properties: {
            name: 'EV Charger 1',
            powerOutput: 7.2,
            chargingType: 'AC',
            connectorType: 'Type 2',
            status: 'available',
            parkingSpotId: 'spot-ev-01'
          }
        }
      })
      graph.addCell(charger)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-11T00:00:00.000Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const mapData = result.data.parkingLotLevels[0].mapData

      expect(mapData.chargers).toBeDefined()
      expect(mapData.chargers).toHaveLength(1)

      const chargerExport = mapData.chargers![0]

      console.log('🔍 Charger export:', JSON.stringify(chargerExport, null, 2))

      // CRITICAL: parkingSpotId should be exported
      expect(chargerExport.parkingSpotId).toBe('spot-ev-01')
    })

    test('SCENARIO 6: Empty/null/undefined relationship values should not export', () => {
      const cctv = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        data: {
          typeId: 'CCTV',
          properties: {
            name: 'Camera No Relations',
            controlId: '', // Empty string
            zoneId: null, // Null
            sensorId: undefined // Undefined
          }
        }
      })
      graph.addCell(cctv)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-11T00:00:00.000Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const mapData = result.data.parkingLotLevels[0].mapData

      const cctvExport = mapData.cctvs!.lightCctvs[0]

      console.log('🔍 CCTV with empty relations:', JSON.stringify(cctvExport, null, 2))

      // Empty/null/undefined should not be exported
      expect(cctvExport.controlId).toBeUndefined()
      expect(cctvExport.zoneId).toBeUndefined()
      expect(cctvExport).not.toHaveProperty('sensorId')
    })

    test('SCENARIO 7: Zone with empty relationship arrays should not export them', () => {
      const zone = new dia.Element({
        type: 'standard.Polygon',
        position: { x: 0, y: 0 },
        size: { width: 200, height: 200 },
        data: {
          typeId: 'Zone',
          properties: {
            name: 'Zone Empty',
            columnIds: [], // Empty array
            parkingLocationIds: [] // Empty array
          }
        }
      })
      graph.addCell(zone)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-11T00:00:00.000Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const mapData = result.data.parkingLotLevels[0].mapData

      const zoneExport = mapData.zones![0]

      console.log('🔍 Zone with empty arrays:', JSON.stringify(zoneExport, null, 2))

      // Empty arrays should not be exported
      expect(zoneExport.columnIds).toBeUndefined()
      expect(zoneExport.parkingLocationIds).toBeUndefined()
    })

    test('SCENARIO 8: Complex scenario with multiple related objects', () => {
      // Create a complete parking setup with all relationships

      // Zone
      const zone = new dia.Element({
        type: 'standard.Polygon',
        position: { x: 0, y: 0 },
        size: { width: 500, height: 500 },
        data: {
          typeId: 'Zone',
          properties: {
            name: 'Zone A',
            columnIds: ['col-1', 'col-2'],
            parkingLocationIds: ['spot-1', 'spot-2', 'spot-3']
          }
        }
      })

      // Columns
      const col1 = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 100, y: 100 },
        size: { width: 20, height: 20 },
        data: {
          typeId: 'Column',
          properties: { name: 'Column 1', zoneId: 'zone-a' }
        }
      })

      const col2 = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 300, y: 100 },
        size: { width: 20, height: 20 },
        data: {
          typeId: 'Column',
          properties: { name: 'Column 2', zoneId: 'zone-a' }
        }
      })

      // Parking spots with relationships
      const spot1 = new dia.Element({
        type: 'standard.Polygon',
        position: { x: 50, y: 200 },
        size: { width: 50, height: 30 },
        data: {
          typeId: 'ParkingSpot',
          properties: {
            name: 'Spot 1',
            spotNumber: 'A-01',
            zoneId: 'zone-a',
            sensorId: 'sensor-1'
          }
        }
      })

      const spot2 = new dia.Element({
        type: 'standard.Polygon',
        position: { x: 150, y: 200 },
        size: { width: 50, height: 30 },
        data: {
          typeId: 'ParkingSpot',
          properties: {
            name: 'Spot 2',
            spotNumber: 'A-02',
            zoneId: 'zone-a',
            chargerId: 'charger-1'
          }
        }
      })

      // Sensor
      const sensor = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 75, y: 180 },
        size: { width: 20, height: 20 },
        data: {
          typeId: 'Sensor',
          properties: { name: 'Sensor 1', linkedSpotId: 'spot-1' }
        }
      })

      // Charger
      const charger = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 175, y: 180 },
        size: { width: 20, height: 20 },
        data: {
          typeId: 'Charger',
          properties: { name: 'Charger 1', parkingSpotId: 'spot-2' }
        }
      })

      // CCTV
      const cctv = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 250, y: 250 },
        size: { width: 30, height: 30 },
        data: {
          typeId: 'CCTV',
          properties: {
            name: 'Camera 1',
            zoneId: 'zone-a',
            controlId: 'control-1'
          }
        }
      })

      graph.addCells([zone, col1, col2, spot1, spot2, sensor, charger, cctv])

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-11T00:00:00.000Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const mapData = result.data.parkingLotLevels[0].mapData

      console.log('🔍 Complex scenario - Full export:', JSON.stringify(mapData, null, 2))

      // Verify all objects and their relationships
      expect(mapData.zones).toHaveLength(1)
      expect(mapData.zones![0].columnIds).toEqual(['col-1', 'col-2'])
      expect(mapData.zones![0].parkingLocationIds).toEqual(['spot-1', 'spot-2', 'spot-3'])

      expect(mapData.columns).toHaveLength(2)
      expect(mapData.columns![0].zoneId).toBe('zone-a')
      expect(mapData.columns![1].zoneId).toBe('zone-a')

      expect(mapData.parkingLocations).toHaveLength(2)
      expect(mapData.parkingLocations![0].zoneId).toBe('zone-a')
      expect(mapData.parkingLocations![0].sensorId).toBe('sensor-1')
      expect(mapData.parkingLocations![1].zoneId).toBe('zone-a')
      expect(mapData.parkingLocations![1].chargerId).toBe('charger-1')

      expect(mapData.sensors).toHaveLength(1)
      expect(mapData.sensors![0].linkedSpotId).toBe('spot-1')

      expect(mapData.chargers).toHaveLength(1)
      expect(mapData.chargers![0].parkingSpotId).toBe('spot-2')

      expect(mapData.cctvs?.lightCctvs).toHaveLength(1)
      expect(mapData.cctvs!.lightCctvs[0].zoneId).toBe('zone-a')
      expect(mapData.cctvs!.lightCctvs[0].controlId).toBe('control-1')
    })
  })

  describe('Edge Cases and Data Integrity', () => {
    test('EDGE CASE 1: Properties object missing entirely', () => {
      const element = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        data: {
          typeId: 'CCTV'
          // No properties field at all
        }
      })
      graph.addCell(element)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-11T00:00:00.000Z',
        floorName: 'B1'
      }

      // Should not crash
      expect(() => {
        const result = exportGraphToJSON(graph, metadata)
        console.log('🔍 No properties:', JSON.stringify(result.data.parkingLotLevels[0].mapData.cctvs, null, 2))
      }).not.toThrow()
    })

    test('EDGE CASE 2: Mixed valid and invalid relationship values', () => {
      const zone = new dia.Element({
        type: 'standard.Polygon',
        position: { x: 0, y: 0 },
        size: { width: 200, height: 200 },
        data: {
          typeId: 'Zone',
          properties: {
            name: 'Zone Mixed',
            columnIds: ['col-1', '', null, 'col-2', undefined, 'col-3'], // Mixed array
            parkingLocationIds: ['spot-1', 'spot-2']
          }
        }
      })
      graph.addCell(zone)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-11T00:00:00.000Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const mapData = result.data.parkingLotLevels[0].mapData

      const zoneExport = mapData.zones![0]

      console.log('🔍 Mixed values in array:', JSON.stringify(zoneExport, null, 2))

      // Should filter out null/undefined/empty strings, keeping only valid IDs
      expect(zoneExport.columnIds).toBeDefined()
      expect(zoneExport.columnIds).toEqual(['col-1', 'col-2', 'col-3'])
      expect(zoneExport.parkingLocationIds).toEqual(['spot-1', 'spot-2'])
    })

    test('EDGE CASE 3: Relationship property is an object instead of string/array', () => {
      const element = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        data: {
          typeId: 'CCTV',
          properties: {
            name: 'Camera Bad Data',
            controlId: { nested: 'object' } // Wrong data type
          }
        }
      })
      graph.addCell(element)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-11T00:00:00.000Z',
        floorName: 'B1'
      }

      // Should not crash, should handle gracefully
      expect(() => {
        const result = exportGraphToJSON(graph, metadata)
        console.log('🔍 Object instead of string:', JSON.stringify(result.data.parkingLotLevels[0].mapData.cctvs, null, 2))
      }).not.toThrow()
    })

    test('EDGE CASE 4: Numeric relationship IDs should be converted to strings', () => {
      const element = new dia.Element({
        type: 'standard.Rectangle',
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        data: {
          typeId: 'CCTV',
          properties: {
            name: 'Camera Numeric',
            controlId: 12345, // Number instead of string
            zoneId: 'zone-1'
          }
        }
      })
      graph.addCell(element)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-11T00:00:00.000Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const cctvExport = result.data.parkingLotLevels[0].mapData.cctvs!.lightCctvs[0]

      console.log('🔍 Numeric ID:', JSON.stringify(cctvExport, null, 2))

      // Numeric IDs should be converted to strings
      expect(cctvExport.controlId).toBe('12345')
      expect(typeof cctvExport.controlId).toBe('string')
      expect(cctvExport.zoneId).toBe('zone-1')
    })

    test('EDGE CASE 5: Mixed array with strings, numbers, null, undefined', () => {
      const zone = new dia.Element({
        type: 'standard.Polygon',
        position: { x: 0, y: 0 },
        size: { width: 200, height: 200 },
        data: {
          typeId: 'Zone',
          properties: {
            name: 'Zone Complex Mixed',
            columnIds: ['col-1', null, '', undefined, 'col-2', 0, 123, 'col-3'], // Mixed types
            parkingLocationIds: [1, 2, 3, 'spot-4'] // Numeric and string mix
          }
        }
      })
      graph.addCell(zone)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-11T00:00:00.000Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const mapData = result.data.parkingLotLevels[0].mapData

      const zoneExport = mapData.zones![0]

      console.log('🔍 Complex mixed array:', JSON.stringify(zoneExport, null, 2))

      // Should filter null/undefined/empty, convert numbers to strings
      expect(zoneExport.columnIds).toBeDefined()
      expect(zoneExport.columnIds).toEqual(['col-1', 'col-2', '0', '123', 'col-3'])
      expect(zoneExport.parkingLocationIds).toBeDefined()
      expect(zoneExport.parkingLocationIds).toEqual(['1', '2', '3', 'spot-4'])
    })

    test('EDGE CASE 6: Array with only invalid values should not export', () => {
      const zone = new dia.Element({
        type: 'standard.Polygon',
        position: { x: 0, y: 0 },
        size: { width: 200, height: 200 },
        data: {
          typeId: 'Zone',
          properties: {
            name: 'Zone All Invalid',
            columnIds: [null, undefined, '', {}], // All invalid
            parkingLocationIds: ['spot-1'] // Valid for comparison
          }
        }
      })
      graph.addCell(zone)

      const metadata = {
        lotName: 'Test Lot',
        lotCreated: '2025-12-11T00:00:00.000Z',
        floorName: 'B1'
      }

      const result = exportGraphToJSON(graph, metadata)
      const mapData = result.data.parkingLotLevels[0].mapData

      const zoneExport = mapData.zones![0]

      console.log('🔍 All invalid array:', JSON.stringify(zoneExport, null, 2))

      // Array with no valid IDs should not be exported
      expect(zoneExport.columnIds).toBeUndefined()
      expect(zoneExport.parkingLocationIds).toEqual(['spot-1'])
    })
  })
})
