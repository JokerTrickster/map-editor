import { describe, it, expect } from 'vitest'
import { parseCSV } from '../csvParser'

describe('csvParser', () => {
  describe('parseCSV', () => {
    it('should parse valid CSV with all columns', () => {
      const csv = `Layer,EntityType,EntityHandle,Points,Text,BlockName,Rotation
OUTLINE,LWPOLYLINE,1F3,"[(100, 200), (150, 200), (150, 250)]",,,
CCTV,INSERT,2A4,"(300, 400)",,Camera1,45.5
TEXT,TEXT,3B5,"(500, 600)",Hello World,,0`

      const result = parseCSV(csv)

      expect(result.errors).toHaveLength(0)
      expect(result.entities).toHaveLength(3)
      expect(result.rowCount).toBe(3)

      // Verify first entity
      expect(result.entities[0]).toEqual({
        layer: 'OUTLINE',
        entityType: 'LWPOLYLINE',
        entityHandle: '1F3',
        points: [
          { x: 100, y: 200 },
          { x: 150, y: 200 },
          { x: 150, y: 250 }
        ]
      })

      // Verify second entity with optional fields
      expect(result.entities[1]).toEqual({
        layer: 'CCTV',
        entityType: 'INSERT',
        entityHandle: '2A4',
        points: [{ x: 300, y: 400 }],
        blockName: 'Camera1',
        rotation: 45.5
      })

      // Verify third entity with text
      expect(result.entities[2]).toEqual({
        layer: 'TEXT',
        entityType: 'TEXT',
        entityHandle: '3B5',
        points: [{ x: 500, y: 600 }],
        text: 'Hello World',
        rotation: 0
      })
    })

    it('should handle various point formats', () => {
      const csv = `Layer,EntityType,EntityHandle,Points
TEST1,LINE,A1,"[(100.5, 200.3), (150.2, 300.1)]"
TEST2,LINE,A2,"(100, 200), (150, 300)"
TEST3,LINE,A3,"(100, 200)"
TEST4,LINE,A4,"100, 200"`

      const result = parseCSV(csv)

      expect(result.errors).toHaveLength(0)
      expect(result.entities).toHaveLength(4)

      expect(result.entities[0].points).toEqual([
        { x: 100.5, y: 200.3 },
        { x: 150.2, y: 300.1 }
      ])

      expect(result.entities[1].points).toEqual([
        { x: 100, y: 200 },
        { x: 150, y: 300 }
      ])

      expect(result.entities[2].points).toEqual([{ x: 100, y: 200 }])

      expect(result.entities[3].points).toEqual([{ x: 100, y: 200 }])
    })

    it('should handle negative coordinates', () => {
      const csv = `Layer,EntityType,EntityHandle,Points
TEST,LINE,A1,"[(-100.5, -200.3), (150, -300)]"`

      const result = parseCSV(csv)

      expect(result.errors).toHaveLength(0)
      expect(result.entities[0].points).toEqual([
        { x: -100.5, y: -200.3 },
        { x: 150, y: -300 }
      ])
    })

    it('should handle tab-separated values', () => {
      const csv = `Layer\tEntityType\tEntityHandle\tPoints
OUTLINE\tLWPOLYLINE\t1F3\t"[(100, 200), (150, 200)]"
CCTV\tINSERT\t2A4\t"(300, 400)"`

      const result = parseCSV(csv)

      expect(result.errors).toHaveLength(0)
      expect(result.entities).toHaveLength(2)
      expect(result.entities[0].layer).toBe('OUTLINE')
      expect(result.entities[1].layer).toBe('CCTV')
    })

    it('should handle quoted fields with commas', () => {
      const csv = `Layer,EntityType,EntityHandle,Points,Text
LABEL,TEXT,A1,"(100, 200)","Hello, World"
NOTE,TEXT,A2,"(300, 400)","Multi, Part, Text"`

      const result = parseCSV(csv)

      expect(result.errors).toHaveLength(0)
      expect(result.entities).toHaveLength(2)
      expect(result.entities[0].text).toBe('Hello, World')
      expect(result.entities[1].text).toBe('Multi, Part, Text')
    })

    it('should handle case-insensitive column names', () => {
      const csv = `LAYER,entitytype,EntityHandle,POINTS
OUTLINE,LWPOLYLINE,1F3,"(100, 200)"`

      const result = parseCSV(csv)

      expect(result.errors).toHaveLength(0)
      expect(result.entities).toHaveLength(1)
    })

    it('should return error for empty CSV', () => {
      const result = parseCSV('')

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toBe('CSV file is empty')
      expect(result.entities).toHaveLength(0)
    })

    it('should return error for header-only CSV', () => {
      const csv = `Layer,EntityType,EntityHandle,Points`

      const result = parseCSV(csv)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toBe('CSV file contains only header row')
      expect(result.entities).toHaveLength(0)
    })

    it('should return error for missing required columns', () => {
      const csv = `Layer,EntityType,Points
OUTLINE,LWPOLYLINE,"(100, 200)"`

      const result = parseCSV(csv)

      expect(result.errors.length).toBeGreaterThan(0)
      // With only 3 columns, it will fail the column count check first
      expect(result.errors[0]).toContain('too few columns')
    })

    it('should return error for too few columns', () => {
      const csv = `Layer,EntityType
OUTLINE,LWPOLYLINE`

      const result = parseCSV(csv)

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('too few columns')
    })

    it('should report row-level errors for missing required fields', () => {
      const csv = `Layer,EntityType,EntityHandle,Points
OUTLINE,LWPOLYLINE,1F3,"(100, 200)"
,LWPOLYLINE,2A4,"(200, 300)"
CCTV,,3B5,"(300, 400)"
SENSOR,INSERT,,"(400, 500)"`

      const result = parseCSV(csv)

      expect(result.errors.length).toBeGreaterThan(0)
      // Row numbers are 1-based after header, so errors are on rows 2, 3, 4
      expect(result.errors.some(e => e.includes('Row 3'))).toBe(true) // Empty layer
      expect(result.errors.some(e => e.includes('Row 4'))).toBe(true) // Empty entityType
      expect(result.errors.some(e => e.includes('Row 5'))).toBe(true) // Empty entityHandle

      // Should still parse valid row
      expect(result.entities).toHaveLength(1)
      expect(result.entities[0].layer).toBe('OUTLINE')
    })

    it('should handle malformed points gracefully', () => {
      const csv = `Layer,EntityType,EntityHandle,Points
OUTLINE,LWPOLYLINE,1F3,"not a point"
CCTV,INSERT,2A4,"(100, abc)"`

      const result = parseCSV(csv)

      // Parser handles invalid points by returning empty array (no errors)
      // This is intentional for robustness - we parse what we can
      expect(result.entities).toHaveLength(2)
      expect(result.entities[0].points).toEqual([])
      expect(result.entities[1].points).toEqual([])
    })

    it('should handle empty points gracefully', () => {
      const csv = `Layer,EntityType,EntityHandle,Points
OUTLINE,LWPOLYLINE,1F3,""`

      const result = parseCSV(csv)

      expect(result.entities).toHaveLength(1)
      expect(result.entities[0].points).toEqual([])
    })

    it('should skip empty lines', () => {
      const csv = `Layer,EntityType,EntityHandle,Points
OUTLINE,LWPOLYLINE,1F3,"(100, 200)"

CCTV,INSERT,2A4,"(300, 400)"

`

      const result = parseCSV(csv)

      expect(result.errors).toHaveLength(0)
      expect(result.entities).toHaveLength(2)
    })

    it('should handle Windows line endings', () => {
      const csv = `Layer,EntityType,EntityHandle,Points\r\nOUTLINE,LWPOLYLINE,1F3,"(100, 200)"\r\nCCTV,INSERT,2A4,"(300, 400)"`

      const result = parseCSV(csv)

      expect(result.errors).toHaveLength(0)
      expect(result.entities).toHaveLength(2)
    })

    it('should handle large CSV efficiently', () => {
      // Generate CSV with 1000 rows
      let csv = 'Layer,EntityType,EntityHandle,Points\n'
      for (let i = 0; i < 1000; i++) {
        csv += `LAYER${i % 10},LWPOLYLINE,H${i},"[(${i}, ${i}), (${i + 100}, ${i + 100})]"\n`
      }

      const startTime = performance.now()
      const result = parseCSV(csv)
      const endTime = performance.now()

      expect(result.errors).toHaveLength(0)
      expect(result.entities).toHaveLength(1000)
      expect(endTime - startTime).toBeLessThan(500) // Should parse in under 500ms
    })

    it('should handle unicode characters in layer names', () => {
      const csv = `Layer,EntityType,EntityHandle,Points
主車場,LWPOLYLINE,1F3,"(100, 200)"
駐車スペース,INSERT,2A4,"(300, 400)"
Парковка,TEXT,3B5,"(500, 600)"`

      const result = parseCSV(csv)

      expect(result.errors).toHaveLength(0)
      expect(result.entities).toHaveLength(3)
      expect(result.entities[0].layer).toBe('主車場')
      expect(result.entities[1].layer).toBe('駐車スペース')
      expect(result.entities[2].layer).toBe('Парковка')
    })

    it('should handle escaped quotes in text fields', () => {
      const csv = `Layer,EntityType,EntityHandle,Points,Text
LABEL,TEXT,A1,"(100, 200)","He said ""Hello"""`

      const result = parseCSV(csv)

      expect(result.errors).toHaveLength(0)
      expect(result.entities[0].text).toBe('He said "Hello"')
    })

    it('should handle points with spaces', () => {
      const csv = `Layer,EntityType,EntityHandle,Points
TEST1,LINE,A1,"[( 100 , 200 ),( 150 , 300 )]"
TEST2,LINE,A2,"(  100  ,  200  )"`

      const result = parseCSV(csv)

      expect(result.errors).toHaveLength(0)
      expect(result.entities[0].points).toEqual([
        { x: 100, y: 200 },
        { x: 150, y: 300 }
      ])
      expect(result.entities[1].points).toEqual([{ x: 100, y: 200 }])
    })

    it('should correctly count rows excluding header', () => {
      const csv = `Layer,EntityType,EntityHandle,Points
OUTLINE,LWPOLYLINE,1F3,"(100, 200)"
CCTV,INSERT,2A4,"(300, 400)"
TEXT,TEXT,3B5,"(500, 600)"`

      const result = parseCSV(csv)

      expect(result.rowCount).toBe(3)
    })
  })
})
