import { describe, it, expect } from 'vitest'
import { groupByLayer, getLayerSummary } from '../layerGrouper'
import type { ParsedEntity } from '../csvParser'

describe('layerGrouper', () => {
  describe('groupByLayer', () => {
    it('should group entities by layer name', () => {
      const entities: ParsedEntity[] = [
        {
          layer: 'OUTLINE',
          entityType: 'LWPOLYLINE',
          entityHandle: '1F3',
          points: [
            { x: 100, y: 200 },
            { x: 150, y: 200 }
          ]
        },
        {
          layer: 'OUTLINE',
          entityType: 'LWPOLYLINE',
          entityHandle: '2A4',
          points: [
            { x: 200, y: 300 },
            { x: 250, y: 300 }
          ]
        },
        {
          layer: 'CCTV',
          entityType: 'INSERT',
          entityHandle: '3B5',
          points: [{ x: 300, y: 400 }]
        }
      ]

      const result = groupByLayer(entities)

      expect(result).toHaveLength(2)

      // OUTLINE should come first (higher priority)
      const outlineGroup = result.find(g => g.layer === 'OUTLINE')
      expect(outlineGroup).toBeDefined()
      expect(outlineGroup!.count).toBe(2)
      expect(outlineGroup!.entities).toHaveLength(2)

      const cctvGroup = result.find(g => g.layer === 'CCTV')
      expect(cctvGroup).toBeDefined()
      expect(cctvGroup!.count).toBe(1)
    })

    it('should collect unique entity types per layer', () => {
      const entities: ParsedEntity[] = [
        {
          layer: 'MIXED',
          entityType: 'LWPOLYLINE',
          entityHandle: '1',
          points: [{ x: 0, y: 0 }]
        },
        {
          layer: 'MIXED',
          entityType: 'INSERT',
          entityHandle: '2',
          points: [{ x: 100, y: 100 }]
        },
        {
          layer: 'MIXED',
          entityType: 'LWPOLYLINE',
          entityHandle: '3',
          points: [{ x: 200, y: 200 }]
        },
        {
          layer: 'MIXED',
          entityType: 'TEXT',
          entityHandle: '4',
          points: [{ x: 300, y: 300 }]
        }
      ]

      const result = groupByLayer(entities)

      expect(result).toHaveLength(1)
      expect(result[0].entityTypes.size).toBe(3)
      expect(result[0].entityTypes.has('LWPOLYLINE')).toBe(true)
      expect(result[0].entityTypes.has('INSERT')).toBe(true)
      expect(result[0].entityTypes.has('TEXT')).toBe(true)
    })

    it('should calculate bounds for each layer', () => {
      const entities: ParsedEntity[] = [
        {
          layer: 'LAYER1',
          entityType: 'LWPOLYLINE',
          entityHandle: '1',
          points: [
            { x: 100, y: 200 },
            { x: 300, y: 400 }
          ]
        },
        {
          layer: 'LAYER1',
          entityType: 'LWPOLYLINE',
          entityHandle: '2',
          points: [
            { x: 50, y: 150 },
            { x: 350, y: 450 }
          ]
        }
      ]

      const result = groupByLayer(entities)

      expect(result).toHaveLength(1)
      expect(result[0].bounds).toEqual({
        minX: 50,
        maxX: 350,
        minY: 150,
        maxY: 450
      })
    })

    it('should handle entities without points', () => {
      const entities: ParsedEntity[] = [
        {
          layer: 'EMPTY',
          entityType: 'TEXT',
          entityHandle: '1',
          points: []
        }
      ]

      const result = groupByLayer(entities)

      expect(result).toHaveLength(1)
      expect(result[0].bounds).toBeUndefined()
    })

    it('should sort layers by priority', () => {
      const entities: ParsedEntity[] = [
        {
          layer: 'TEXT',
          entityType: 'TEXT',
          entityHandle: '1',
          points: [{ x: 0, y: 0 }]
        },
        {
          layer: 'CCTV',
          entityType: 'INSERT',
          entityHandle: '2',
          points: [{ x: 0, y: 0 }]
        },
        {
          layer: 'OUTLINE',
          entityType: 'LWPOLYLINE',
          entityHandle: '3',
          points: [{ x: 0, y: 0 }]
        },
        {
          layer: 'PARKING_SPOT',
          entityType: 'LWPOLYLINE',
          entityHandle: '4',
          points: [{ x: 0, y: 0 }]
        },
        {
          layer: 'INNER_LINE',
          entityType: 'LWPOLYLINE',
          entityHandle: '5',
          points: [{ x: 0, y: 0 }]
        }
      ]

      const result = groupByLayer(entities)

      expect(result).toHaveLength(5)
      expect(result[0].layer).toBe('OUTLINE') // Priority 1
      expect(result[1].layer).toBe('INNER_LINE') // Priority 2
      expect(result[2].layer).toBe('PARKING_SPOT') // Priority 3
      expect(result[3].layer).toBe('CCTV') // Priority 4
      expect(result[4].layer).toBe('TEXT') // Priority 5
    })

    it('should sort alphabetically within same priority', () => {
      const entities: ParsedEntity[] = [
        {
          layer: 'LAYER_C',
          entityType: 'LINE',
          entityHandle: '1',
          points: [{ x: 0, y: 0 }]
        },
        {
          layer: 'LAYER_A',
          entityType: 'LINE',
          entityHandle: '2',
          points: [{ x: 0, y: 0 }]
        },
        {
          layer: 'LAYER_B',
          entityType: 'LINE',
          entityHandle: '3',
          points: [{ x: 0, y: 0 }]
        }
      ]

      const result = groupByLayer(entities)

      expect(result).toHaveLength(3)
      expect(result[0].layer).toBe('LAYER_A')
      expect(result[1].layer).toBe('LAYER_B')
      expect(result[2].layer).toBe('LAYER_C')
    })

    it('should handle empty entity array', () => {
      const result = groupByLayer([])

      expect(result).toHaveLength(0)
    })

    it('should handle unknown layer names', () => {
      const entities: ParsedEntity[] = [
        {
          layer: '',
          entityType: 'LINE',
          entityHandle: '1',
          points: [{ x: 0, y: 0 }]
        }
      ]

      const result = groupByLayer(entities)

      expect(result).toHaveLength(1)
      expect(result[0].layer).toBe('UNKNOWN')
    })

    it('should handle negative coordinates in bounds', () => {
      const entities: ParsedEntity[] = [
        {
          layer: 'TEST',
          entityType: 'LINE',
          entityHandle: '1',
          points: [
            { x: -100, y: -200 },
            { x: 100, y: 200 }
          ]
        }
      ]

      const result = groupByLayer(entities)

      expect(result[0].bounds).toEqual({
        minX: -100,
        maxX: 100,
        minY: -200,
        maxY: 200
      })
    })
  })

  describe('getLayerSummary', () => {
    it('should calculate summary statistics', () => {
      const entities: ParsedEntity[] = [
        {
          layer: 'LAYER1',
          entityType: 'LWPOLYLINE',
          entityHandle: '1',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 }
          ]
        },
        {
          layer: 'LAYER1',
          entityType: 'INSERT',
          entityHandle: '2',
          points: [{ x: 50, y: 50 }]
        },
        {
          layer: 'LAYER2',
          entityType: 'TEXT',
          entityHandle: '3',
          points: [{ x: 200, y: 200 }]
        }
      ]

      const grouped = groupByLayer(entities)
      const summary = getLayerSummary(grouped)

      expect(summary.totalLayers).toBe(2)
      expect(summary.totalEntities).toBe(3)
      expect(summary.layerNames).toContain('LAYER1')
      expect(summary.layerNames).toContain('LAYER2')
      expect(summary.entityTypeCount).toBe(3)
    })

    it('should calculate global bounds', () => {
      const entities: ParsedEntity[] = [
        {
          layer: 'LAYER1',
          entityType: 'LINE',
          entityHandle: '1',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 }
          ]
        },
        {
          layer: 'LAYER2',
          entityType: 'LINE',
          entityHandle: '2',
          points: [
            { x: 200, y: 200 },
            { x: 300, y: 300 }
          ]
        }
      ]

      const grouped = groupByLayer(entities)
      const summary = getLayerSummary(grouped)

      expect(summary.globalBounds).toEqual({
        minX: 0,
        maxX: 300,
        minY: 0,
        maxY: 300
      })
    })

    it('should handle empty grouped layers', () => {
      const summary = getLayerSummary([])

      expect(summary.totalLayers).toBe(0)
      expect(summary.totalEntities).toBe(0)
      expect(summary.layerNames).toHaveLength(0)
      expect(summary.entityTypeCount).toBe(0)
      expect(summary.globalBounds).toBeUndefined()
    })

    it('should handle layers without points', () => {
      const entities: ParsedEntity[] = [
        {
          layer: 'EMPTY',
          entityType: 'TEXT',
          entityHandle: '1',
          points: []
        }
      ]

      const grouped = groupByLayer(entities)
      const summary = getLayerSummary(grouped)

      expect(summary.totalLayers).toBe(1)
      expect(summary.totalEntities).toBe(1)
      expect(summary.globalBounds).toBeUndefined()
    })
  })
})
