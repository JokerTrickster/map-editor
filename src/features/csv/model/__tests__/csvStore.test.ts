import { describe, it, expect, beforeEach } from 'vitest'
import { useCSVStore } from '../csvStore'

// Helper to create a proper File-like object with text() method
function createMockFile(content: string, name: string): File {
  const blob = new Blob([content], { type: 'text/csv' })
  const file = new File([blob], name, { type: 'text/csv' })

  // Add text() method if not available (for test environment)
  if (!file.text) {
    Object.defineProperty(file, 'text', {
      value: async () => content
    })
  }

  return file
}

describe('csvStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { clearFile } = useCSVStore.getState()
    clearFile()
  })

  describe('parseFile', () => {
    it('should parse a valid CSV file and group by layer', async () => {
      const csvContent = `Layer,EntityType,EntityHandle,Points
OUTLINE,LWPOLYLINE,1F3,"[(100, 200), (150, 200)]"
OUTLINE,LWPOLYLINE,2A4,"[(200, 300), (250, 300)]"
CCTV,INSERT,3B5,"(300, 400)"
PARKING_SPOT,LWPOLYLINE,4C6,"[(400, 500), (450, 500)]"`

      const file = createMockFile(csvContent, 'test.csv')

      const { setFile, parseFile } = useCSVStore.getState()

      setFile(file)
      await parseFile()

      const state = useCSVStore.getState()

      // Check upload state
      expect(state.uploadState.status).toBe('parsed')
      if (state.uploadState.status === 'parsed') {
        expect(state.uploadState.fileName).toBe('test.csv')
        expect(state.uploadState.rowCount).toBe(4)
      }

      // Check parsed data
      expect(state.parsedData).toBeDefined()
      expect(state.parsedData?.entities).toHaveLength(4)
      expect(state.parsedData?.errors).toHaveLength(0)

      // Check grouped layers
      expect(state.groupedLayers).toBeDefined()
      expect(state.groupedLayers).toHaveLength(3)

      // Verify layer grouping
      const outlineLayer = state.groupedLayers?.find(l => l.layer === 'OUTLINE')
      expect(outlineLayer).toBeDefined()
      expect(outlineLayer?.count).toBe(2)

      const cctvLayer = state.groupedLayers?.find(l => l.layer === 'CCTV')
      expect(cctvLayer).toBeDefined()
      expect(cctvLayer?.count).toBe(1)

      const parkingLayer = state.groupedLayers?.find(l => l.layer === 'PARKING_SPOT')
      expect(parkingLayer).toBeDefined()
      expect(parkingLayer?.count).toBe(1)
    })

    it('should handle CSV with parsing errors', async () => {
      const csvContent = `Layer,EntityType,EntityHandle,Points
OUTLINE,LWPOLYLINE,1F3,"(100, 200)"`

      const file = createMockFile(csvContent, 'test.csv')

      const { setFile, parseFile } = useCSVStore.getState()

      setFile(file)
      await parseFile()

      const state = useCSVStore.getState()

      // Should successfully parse even with one valid row
      expect(state.uploadState.status).toBe('parsed')
      expect(state.parsedData?.entities).toHaveLength(1)
    })

    it('should set error state for completely invalid CSV', async () => {
      const csvContent = `Layer,EntityType
OUTLINE,LWPOLYLINE`

      const file = createMockFile(csvContent, 'invalid.csv')

      const { setFile, parseFile } = useCSVStore.getState()

      setFile(file)
      await parseFile()

      const state = useCSVStore.getState()

      // Should fail due to missing required columns
      expect(state.uploadState.status).toBe('error')
      if (state.uploadState.status === 'error') {
        expect(state.uploadState.message).toContain('too few columns')
      }
    })

    it('should set error state for empty CSV', async () => {
      const csvContent = ``

      const file = createMockFile(csvContent, 'empty.csv')

      const { setFile, parseFile } = useCSVStore.getState()

      setFile(file)
      await parseFile()

      const state = useCSVStore.getState()

      expect(state.uploadState.status).toBe('error')
      if (state.uploadState.status === 'error') {
        expect(state.uploadState.message).toContain('empty')
      }
    })

    it('should clear all data when clearFile is called', async () => {
      const csvContent = `Layer,EntityType,EntityHandle,Points
OUTLINE,LWPOLYLINE,1F3,"(100, 200)"`

      const file = createMockFile(csvContent, 'test.csv')

      const { setFile, parseFile, clearFile } = useCSVStore.getState()

      setFile(file)
      await parseFile()

      // Verify data exists
      expect(useCSVStore.getState().parsedData).toBeDefined()
      expect(useCSVStore.getState().groupedLayers).toBeDefined()

      // Clear
      clearFile()

      const state = useCSVStore.getState()

      expect(state.uploadState.status).toBe('idle')
      expect(state.file).toBeNull()
      expect(state.rawData).toBeNull()
      expect(state.parsedData).toBeNull()
      expect(state.groupedLayers).toBeNull()
    })

    it('should handle large CSV files efficiently', async () => {
      // Generate CSV with 1000 entities
      let csvContent = 'Layer,EntityType,EntityHandle,Points\n'
      for (let i = 0; i < 1000; i++) {
        csvContent += `LAYER${i % 10},LWPOLYLINE,H${i},"[(${i}, ${i}), (${i + 10}, ${i + 10})]"\n`
      }

      const file = createMockFile(csvContent, 'large.csv')

      const { setFile, parseFile } = useCSVStore.getState()

      setFile(file)

      const startTime = performance.now()
      await parseFile()
      const parseTime = performance.now() - startTime

      const state = useCSVStore.getState()

      expect(state.uploadState.status).toBe('parsed')
      expect(state.parsedData?.entities).toHaveLength(1000)
      expect(state.groupedLayers).toHaveLength(10)

      // Should be very fast (under 500ms)
      expect(parseTime).toBeLessThan(500)
    })

    it('should preserve layer priority order', async () => {
      const csvContent = `Layer,EntityType,EntityHandle,Points
TEXT,TEXT,1,"(100, 200)"
CCTV,INSERT,2,"(200, 300)"
OUTLINE,LWPOLYLINE,3,"(300, 400)"
PARKING_SPOT,LWPOLYLINE,4,"(400, 500)"
INNER_LINE,LWPOLYLINE,5,"(500, 600)"`

      const file = createMockFile(csvContent, 'test.csv')

      const { setFile, parseFile } = useCSVStore.getState()

      setFile(file)
      await parseFile()

      const state = useCSVStore.getState()

      expect(state.groupedLayers).toHaveLength(5)

      // Verify priority order
      expect(state.groupedLayers?.[0].layer).toBe('OUTLINE') // Priority 1
      expect(state.groupedLayers?.[1].layer).toBe('INNER_LINE') // Priority 2
      expect(state.groupedLayers?.[2].layer).toBe('PARKING_SPOT') // Priority 3
      expect(state.groupedLayers?.[3].layer).toBe('CCTV') // Priority 4
      expect(state.groupedLayers?.[4].layer).toBe('TEXT') // Priority 5
    })
  })
})
