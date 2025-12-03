/**
 * Drag and Drop Mapping Hook Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useObjectTypeStore } from '@/shared/store/objectTypeStore'

describe('useDragAndDropMapping Integration', () => {
  beforeEach(() => {
    // Reset store
    useObjectTypeStore.setState({
      types: [],
      mappings: [],
    })
  })

  it('should add mapping to store', () => {
    const store = useObjectTypeStore.getState()

    // Add a type
    store.addType({
      name: 'CCTV',
      icon: '📷',
      properties: [],
    })

    const types = useObjectTypeStore.getState().types
    expect(types.length).toBe(1)

    const typeId = types[0].id

    // Add mapping
    store.addMapping({
      floorId: 'default',
      typeId,
      entityHandle: 'element-123',
    })

    const mappings = useObjectTypeStore.getState().mappings
    expect(mappings.length).toBe(1)
    expect(mappings[0].typeId).toBe(typeId)
    expect(mappings[0].entityHandle).toBe('element-123')
  })

  it('should remove mapping by entity handle', () => {
    const store = useObjectTypeStore.getState()

    // Add a type
    store.addType({
      name: 'CCTV',
      icon: '📷',
      properties: [],
    })

    const types = useObjectTypeStore.getState().types
    const typeId = types[0].id

    // Add mapping
    store.addMapping({
      floorId: 'default',
      typeId,
      entityHandle: 'element-123',
    })

    let mappings = useObjectTypeStore.getState().mappings
    expect(mappings.length).toBe(1)

    // Remove by entity handle
    store.removeMappingByEntity('element-123')

    mappings = useObjectTypeStore.getState().mappings
    expect(mappings.length).toBe(0)
  })

  it('should get mapping by entity and floor', () => {
    const store = useObjectTypeStore.getState()

    // Add a type
    store.addType({
      name: 'CCTV',
      icon: '📷',
      properties: [],
    })

    const types = useObjectTypeStore.getState().types
    const typeId = types[0].id

    // Add mapping
    store.addMapping({
      floorId: 'default',
      typeId,
      entityHandle: 'element-123',
    })

    // Get mapping
    const mapping = store.getMappingByEntity('default', 'element-123')
    expect(mapping).toBeDefined()
    expect(mapping?.typeId).toBe(typeId)
    expect(mapping?.entityHandle).toBe('element-123')
  })

  it('should replace existing mapping when adding new one for same entity', () => {
    const store = useObjectTypeStore.getState()

    // Add two types
    store.addType({
      name: 'CCTV',
      icon: '📷',
      properties: [],
    })

    store.addType({
      name: 'Charger',
      icon: '🔌',
      properties: [],
    })

    const types = useObjectTypeStore.getState().types
    const type1Id = types[0].id
    const type2Id = types[1].id

    // Add first mapping
    store.addMapping({
      floorId: 'default',
      typeId: type1Id,
      entityHandle: 'element-123',
    })

    let mappings = useObjectTypeStore.getState().mappings
    expect(mappings.length).toBe(1)

    // Remove old mapping and add new one (simulating drag-drop replace)
    store.removeMappingByEntity('element-123')
    store.addMapping({
      floorId: 'default',
      typeId: type2Id,
      entityHandle: 'element-123',
    })

    mappings = useObjectTypeStore.getState().mappings
    expect(mappings.length).toBe(1)
    expect(mappings[0].typeId).toBe(type2Id)
  })

  it('should get mappings by floor ID', () => {
    const store = useObjectTypeStore.getState()

    // Add a type
    store.addType({
      name: 'CCTV',
      icon: '📷',
      properties: [],
    })

    const types = useObjectTypeStore.getState().types
    const typeId = types[0].id

    // Add mappings for different floors
    store.addMapping({
      floorId: 'floor-1',
      typeId,
      entityHandle: 'element-1',
    })

    store.addMapping({
      floorId: 'floor-1',
      typeId,
      entityHandle: 'element-2',
    })

    store.addMapping({
      floorId: 'floor-2',
      typeId,
      entityHandle: 'element-3',
    })

    const floor1Mappings = store.getMappingsByFloorId('floor-1')
    expect(floor1Mappings.length).toBe(2)

    const floor2Mappings = store.getMappingsByFloorId('floor-2')
    expect(floor2Mappings.length).toBe(1)
  })
})
