/**
 * Tests for selection persistence in floorStore
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useFloorStore, Floor } from '../floorStore'
import { storage } from '../../lib/utils'

describe('floorStore - Selection Persistence', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Reset the store
    useFloorStore.setState({ floors: [], currentFloor: null })
  })

  it('should persist selectedElementId when updating floor map data', () => {
    // Create a floor
    const lotId = 'test-lot-1'
    useFloorStore.getState().addFloor(lotId)
    const floorId = useFloorStore.getState().floors[0].id

    // Update map data with selectedElementId
    const testElementId = 'element-123'
    useFloorStore.getState().updateFloorMapData(floorId, {
      selectedElementId: testElementId,
      graphJson: { cells: [] }
    })

    // Verify the data is stored
    const floor = useFloorStore.getState().floors.find(f => f.id === floorId)
    expect(floor?.mapData?.selectedElementId).toBe(testElementId)
  })

  it('should persist null selectedElementId', () => {
    // Create a floor
    const lotId = 'test-lot-1'
    useFloorStore.getState().addFloor(lotId)
    const floorId = useFloorStore.getState().floors[0].id

    // Update with null selection
    useFloorStore.getState().updateFloorMapData(floorId, {
      selectedElementId: null,
      graphJson: { cells: [] }
    })

    // Verify null is stored
    const floor = useFloorStore.getState().floors.find(f => f.id === floorId)
    expect(floor?.mapData?.selectedElementId).toBe(null)
  })

  it('should handle undefined selectedElementId gracefully', () => {
    // Create a floor
    const lotId = 'test-lot-1'
    useFloorStore.getState().addFloor(lotId)
    const floorId = useFloorStore.getState().floors[0].id

    // Update without selectedElementId (backward compatibility)
    useFloorStore.getState().updateFloorMapData(floorId, {
      graphJson: { cells: [] }
    })

    // Verify undefined is handled
    const floor = useFloorStore.getState().floors.find(f => f.id === floorId)
    expect(floor?.mapData?.selectedElementId).toBeUndefined()
  })

  it('should include selectedElementId in localStorage persistence', () => {
    // Create a floor
    const lotId = 'test-lot-1'
    useFloorStore.getState().addFloor(lotId)
    const floorId = useFloorStore.getState().floors[0].id

    // Update with selection
    const testElementId = 'element-456'
    useFloorStore.getState().updateFloorMapData(floorId, {
      selectedElementId: testElementId,
      graphJson: { cells: [] }
    })

    // Check localStorage
    const stored = storage.get<{ floors: Floor[]; currentFloor: string | null }>(
      'map-editor-floors',
      { floors: [], currentFloor: null }
    )
    const storedFloor = stored.floors.find((f) => f.id === floorId)
    expect(storedFloor?.mapData?.selectedElementId).toBe(testElementId)
  })

  it('should maintain independent selections for multiple floors', () => {
    // Create two floors
    const lotId = 'test-lot-1'
    useFloorStore.getState().addFloor(lotId)
    useFloorStore.getState().addFloor(lotId)

    const floors = useFloorStore.getState().floors
    const floor1Id = floors[0].id
    const floor2Id = floors[1].id

    // Set different selections for each floor
    useFloorStore.getState().updateFloorMapData(floor1Id, {
      selectedElementId: 'element-floor1',
      graphJson: { cells: [] }
    })
    useFloorStore.getState().updateFloorMapData(floor2Id, {
      selectedElementId: 'element-floor2',
      graphJson: { cells: [] }
    })

    // Verify each floor maintains its own selection
    const updatedFloors = useFloorStore.getState().floors
    const updatedFloor1 = updatedFloors.find(f => f.id === floor1Id)
    const updatedFloor2 = updatedFloors.find(f => f.id === floor2Id)

    expect(updatedFloor1?.mapData?.selectedElementId).toBe('element-floor1')
    expect(updatedFloor2?.mapData?.selectedElementId).toBe('element-floor2')
  })

  it('should update selectedElementId when changed multiple times', () => {
    // Create a floor
    const lotId = 'test-lot-1'
    useFloorStore.getState().addFloor(lotId)
    const floorId = useFloorStore.getState().floors[0].id

    // First update
    useFloorStore.getState().updateFloorMapData(floorId, {
      selectedElementId: 'element-1',
      graphJson: { cells: [] }
    })

    // Second update
    useFloorStore.getState().updateFloorMapData(floorId, {
      selectedElementId: 'element-2'
    })

    // Third update
    useFloorStore.getState().updateFloorMapData(floorId, {
      selectedElementId: null
    })

    // Verify final state
    const floor = useFloorStore.getState().floors.find(f => f.id === floorId)
    expect(floor?.mapData?.selectedElementId).toBe(null)
  })

  it('should preserve selectedElementId when updating other map data fields', () => {
    // Create a floor
    const lotId = 'test-lot-1'
    useFloorStore.getState().addFloor(lotId)
    const floorId = useFloorStore.getState().floors[0].id

    // Set initial selection
    useFloorStore.getState().updateFloorMapData(floorId, {
      selectedElementId: 'element-123',
      graphJson: { cells: [] }
    })

    // Update other fields without touching selectedElementId
    useFloorStore.getState().updateFloorMapData(floorId, {
      csvRawData: 'test,data',
      csvFileName: 'test.csv'
    })

    // Verify selection is still there
    const floor = useFloorStore.getState().floors.find(f => f.id === floorId)
    expect(floor?.mapData?.selectedElementId).toBe('element-123')
  })

  it('should restore selectedElementId after store reload from localStorage', () => {
    // Create a floor with selection
    const lotId = 'test-lot-1'
    useFloorStore.getState().addFloor(lotId)
    const floorId = useFloorStore.getState().floors[0].id

    const testElementId = 'element-999'
    useFloorStore.getState().updateFloorMapData(floorId, {
      selectedElementId: testElementId,
      graphJson: { cells: [] }
    })

    // Simulate store reload by creating new store instance
    // Get data from localStorage
    const stored = storage.get<{ floors: Floor[]; currentFloor: string | null }>(
      'map-editor-floors',
      { floors: [], currentFloor: null }
    )

    // Reset store and reload from storage
    useFloorStore.setState(stored)

    // Verify selection is restored
    const floor = useFloorStore.getState().floors.find(f => f.id === floorId)
    expect(floor?.mapData?.selectedElementId).toBe(testElementId)
  })
})
