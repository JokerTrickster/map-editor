import { describe, it, expect } from 'vitest'
import { parseCSV } from '../csvParser'
import { groupByLayer } from '../layerGrouper'

describe('CSV Parser Performance', () => {
  it('should parse 50,000 points in under 2 seconds', () => {
    // Generate CSV with ~50,000 points
    // Use 10,000 entities with 5 points each = 50,000 points
    let csv = 'Layer,EntityType,EntityHandle,Points\n'

    for (let i = 0; i < 10000; i++) {
      const layer = `LAYER${i % 100}` // 100 different layers
      const entityType = i % 2 === 0 ? 'LWPOLYLINE' : 'INSERT'
      const handle = `H${i.toString(16).toUpperCase()}`

      // Create 5 points per entity
      const points = []
      for (let j = 0; j < 5; j++) {
        points.push(`(${i * 10 + j}, ${i * 10 + j})`)
      }
      const pointsStr = `"[${points.join(', ')}]"`

      csv += `${layer},${entityType},${handle},${pointsStr}\n`
    }

    const startTime = performance.now()
    const result = parseCSV(csv)
    const parseTime = performance.now() - startTime

    expect(result.errors).toHaveLength(0)
    expect(result.entities).toHaveLength(10000)

    // Count total points
    const totalPoints = result.entities.reduce((sum, entity) => sum + entity.points.length, 0)
    expect(totalPoints).toBe(50000)

    // Performance requirement: <2 seconds
    expect(parseTime).toBeLessThan(2000)

    console.log(`✓ Parsed 50,000 points in ${parseTime.toFixed(2)}ms`)
  })

  it('should group 50,000 points efficiently', () => {
    // Generate CSV with ~50,000 points
    let csv = 'Layer,EntityType,EntityHandle,Points\n'

    for (let i = 0; i < 10000; i++) {
      const layer = `LAYER${i % 100}` // 100 different layers
      const entityType = 'LWPOLYLINE'
      const handle = `H${i}`

      const points = []
      for (let j = 0; j < 5; j++) {
        points.push(`(${i * 10 + j}, ${i * 10 + j})`)
      }
      const pointsStr = `"[${points.join(', ')}]"`

      csv += `${layer},${entityType},${handle},${pointsStr}\n`
    }

    const parseResult = parseCSV(csv)

    const startTime = performance.now()
    const grouped = groupByLayer(parseResult.entities)
    const groupTime = performance.now() - startTime

    expect(grouped).toHaveLength(100)
    expect(grouped.reduce((sum, g) => sum + g.count, 0)).toBe(10000)

    // Grouping should be very fast (< 100ms)
    expect(groupTime).toBeLessThan(100)

    console.log(`✓ Grouped 100 layers with 50,000 points in ${groupTime.toFixed(2)}ms`)
  })

  it('should handle complete workflow efficiently', () => {
    // Simulate real-world CSV with mixed layers
    let csv = 'Layer,EntityType,EntityHandle,Points,Text,BlockName,Rotation\n'

    // OUTLINE layer: 100 polylines with 10 points each = 1,000 points
    for (let i = 0; i < 100; i++) {
      const points = []
      for (let j = 0; j < 10; j++) {
        points.push(`(${i * 100 + j * 10}, ${i * 100 + j * 10})`)
      }
      csv += `OUTLINE,LWPOLYLINE,OUT${i},"[${points.join(', ')}]",,,\n`
    }

    // PARKING_SPOT layer: 5,000 rectangles with 4 points each = 20,000 points
    for (let i = 0; i < 5000; i++) {
      const x = (i % 100) * 30
      const y = Math.floor(i / 100) * 50
      csv += `PARKING_SPOT,LWPOLYLINE,PS${i},"[(${x}, ${y}), (${x + 25}, ${y}), (${x + 25}, ${y + 45}), (${x}, ${y + 45})]",,,\n`
    }

    // CCTV layer: 1,000 inserts with 1 point each = 1,000 points
    for (let i = 0; i < 1000; i++) {
      csv += `CCTV,INSERT,CAM${i},"(${i * 10}, ${i * 10})",,Camera${i},${(i * 45) % 360}\n`
    }

    // TEXT layer: 2,000 labels with 1 point each = 2,000 points
    for (let i = 0; i < 2000; i++) {
      csv += `TEXT,TEXT,TXT${i},"(${i * 5}, ${i * 5})","Label ${i}",,0\n`
    }

    // Total: 8,100 entities, 24,000 points

    const startTime = performance.now()

    // Parse
    const parseResult = parseCSV(csv)
    const parseTime = performance.now() - startTime

    // Group
    const groupStart = performance.now()
    const grouped = groupByLayer(parseResult.entities)
    const groupTime = performance.now() - groupStart

    const totalTime = performance.now() - startTime

    // Verify results
    expect(parseResult.errors).toHaveLength(0)
    expect(parseResult.entities.length).toBe(8100)

    expect(grouped).toHaveLength(4)
    expect(grouped[0].layer).toBe('OUTLINE') // Priority 1
    expect(grouped[1].layer).toBe('PARKING_SPOT') // Priority 3
    expect(grouped[2].layer).toBe('CCTV') // Priority 4
    expect(grouped[3].layer).toBe('TEXT') // Priority 5

    // Count total points
    const totalPoints = parseResult.entities.reduce((sum, e) => sum + e.points.length, 0)
    expect(totalPoints).toBe(24000)

    // Performance: Complete workflow should be fast
    expect(totalTime).toBeLessThan(1000) // Under 1 second for 24k points

    console.log(`✓ Complete workflow (8,100 entities, 24,000 points):`)
    console.log(`  - Parse: ${parseTime.toFixed(2)}ms`)
    console.log(`  - Group: ${groupTime.toFixed(2)}ms`)
    console.log(`  - Total: ${totalTime.toFixed(2)}ms`)
  })
})
