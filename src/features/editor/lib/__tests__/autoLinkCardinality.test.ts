/**
 * Test suite for auto-link cardinality enforcement
 *
 * This tests the complete flow of:
 * 1. Creating relationships via auto-link
 * 2. Respecting cardinality limits (1:1, 1:2, N)
 * 3. Clearing existing relationships before re-linking
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { dia } from '@joint/core'
import {
  autoLinkObjects,
  updateRelationship,
  getExistingRelationships,
  getRemainingCapacity,
  parseCardinality
} from '../relationshipUtils'
import { TemplateRelationType } from '@/entities/schema/templateSchema'

describe('Auto-link cardinality enforcement', () => {
  let graph: dia.Graph
  let source: dia.Element
  let targets: dia.Element[]

  beforeEach(() => {
    graph = new dia.Graph()

    // Create source element (CCTV)
    source = new dia.Element({
      type: 'standard.Rectangle',
      id: 'cctv-1',
      data: {
        typeId: 'cctv',
        type: 'cctv',
        properties: {
          name: 'CCTV-1'
        }
      },
      position: { x: 0, y: 0 },
      size: { width: 50, height: 50 }
    })
    graph.addCell(source)

    // Create 7 target elements (parking spaces) within range
    targets = []
    for (let i = 0; i < 7; i++) {
      const target = new dia.Element({
        type: 'standard.Rectangle',
        id: `space-${i}`,
        data: {
          typeId: 'parkingSpace',
          type: 'parkingSpace',
          properties: {
            name: `Space-${i}`
          }
        },
        position: { x: (i + 1) * 60, y: 0 },
        size: { width: 50, height: 50 }
      })
      graph.addCell(target)
      targets.push(target)
    }
  })

  it('should respect 1:2 cardinality limit when auto-linking', () => {
    const relationConfig: TemplateRelationType = {
      name: 'CCTV 주차구역 모니터링',
      description: 'CCTV monitors parking spaces',
      sourceType: 'cctv',
      targetType: 'parkingSpace',
      cardinality: '1:2',
      propertyKey: 'monitoredSpaces',
      autoLink: {
        strategy: 'nearest',
        maxDistance: 1000,
        allowDuplicates: false
      }
    }

    // Auto-link with cardinality limit
    const maxLinks = parseCardinality(relationConfig.cardinality)
    const linkedIds = autoLinkObjects(
      graph,
      source,
      'cctv_to_parkingSpace',
      relationConfig,
      undefined,
      maxLinks ?? undefined
    )

    // Should only create 2 links (not 7)
    expect(linkedIds).toHaveLength(2)
    expect(linkedIds).toEqual(['space-0', 'space-1']) // Nearest two

    // Verify the data was updated correctly
    linkedIds.forEach(targetId => {
      updateRelationship(
        source,
        relationConfig.propertyKey,
        targetId,
        relationConfig.cardinality,
        'add'
      )
    })

    const existingTargets = getExistingRelationships(source, relationConfig.propertyKey)
    expect(existingTargets).toHaveLength(2)
    expect(existingTargets).toEqual(['space-0', 'space-1'])
  })

  it('should clear existing relationships before re-linking', () => {
    const relationConfig: TemplateRelationType = {
      name: 'CCTV 주차구역 모니터링',
      description: 'CCTV monitors parking spaces',
      sourceType: 'cctv',
      targetType: 'parkingSpace',
      cardinality: '1:2',
      propertyKey: 'monitoredSpaces',
      autoLink: {
        strategy: 'nearest',
        maxDistance: 1000,
        allowDuplicates: false
      }
    }

    // First auto-link - create 2 relationships
    const maxLinks = parseCardinality(relationConfig.cardinality)
    let linkedIds = autoLinkObjects(
      graph,
      source,
      'cctv_to_parkingSpace',
      relationConfig,
      undefined,
      maxLinks ?? undefined
    )

    linkedIds.forEach(targetId => {
      updateRelationship(
        source,
        relationConfig.propertyKey,
        targetId,
        relationConfig.cardinality,
        'add'
      )
    })

    // Verify 2 relationships exist
    let existingTargets = getExistingRelationships(source, relationConfig.propertyKey)
    expect(existingTargets).toHaveLength(2)

    // Simulate clearing existing relationships (like handleAutoLink does)
    existingTargets.forEach(targetId => {
      updateRelationship(
        source,
        relationConfig.propertyKey,
        targetId,
        relationConfig.cardinality,
        'remove'
      )
    })

    // Verify all relationships were removed
    existingTargets = getExistingRelationships(source, relationConfig.propertyKey)
    expect(existingTargets).toHaveLength(0)

    // Re-link - should create 2 NEW relationships
    linkedIds = autoLinkObjects(
      graph,
      source,
      'cctv_to_parkingSpace',
      relationConfig,
      undefined,
      maxLinks ?? undefined
    )

    linkedIds.forEach(targetId => {
      updateRelationship(
        source,
        relationConfig.propertyKey,
        targetId,
        relationConfig.cardinality,
        'add'
      )
    })

    // Should still have exactly 2 relationships (not 4)
    existingTargets = getExistingRelationships(source, relationConfig.propertyKey)
    expect(existingTargets).toHaveLength(2)
  })

  it('should respect 1:1 cardinality limit', () => {
    const relationConfig: TemplateRelationType = {
      name: 'Primary CCTV',
      description: 'One CCTV per space',
      sourceType: 'cctv',
      targetType: 'parkingSpace',
      cardinality: '1:1',
      propertyKey: 'primarySpace',
      autoLink: {
        strategy: 'nearest',
        maxDistance: 1000,
        allowDuplicates: false
      }
    }

    const maxLinks = parseCardinality(relationConfig.cardinality)
    const linkedIds = autoLinkObjects(
      graph,
      source,
      'cctv_to_primarySpace',
      relationConfig,
      undefined,
      maxLinks ?? undefined
    )

    // Should only create 1 link
    expect(linkedIds).toHaveLength(1)
    expect(linkedIds).toEqual(['space-0']) // Nearest one

    linkedIds.forEach(targetId => {
      updateRelationship(
        source,
        relationConfig.propertyKey,
        targetId,
        relationConfig.cardinality,
        'add'
      )
    })

    const existingTargets = getExistingRelationships(source, relationConfig.propertyKey)
    expect(existingTargets).toHaveLength(1)

    // For 1:1, the value should be a string, not an array
    const propertyValue = source.get('data').properties[relationConfig.propertyKey]
    expect(typeof propertyValue).toBe('string')
    expect(propertyValue).toBe('space-0')
  })

  it('should respect unlimited cardinality (N)', () => {
    const relationConfig: TemplateRelationType = {
      name: 'All Spaces',
      description: 'CCTV can monitor unlimited spaces',
      sourceType: 'cctv',
      targetType: 'parkingSpace',
      cardinality: 'N',
      propertyKey: 'allMonitoredSpaces',
      autoLink: {
        strategy: 'nearest',
        maxDistance: 1000,
        allowDuplicates: false
      }
    }

    const maxLinks = parseCardinality(relationConfig.cardinality)
    const linkedIds = autoLinkObjects(
      graph,
      source,
      'cctv_to_allSpaces',
      relationConfig,
      undefined,
      maxLinks ?? undefined
    )

    // Should create links to all 7 targets
    expect(linkedIds).toHaveLength(7)

    linkedIds.forEach(targetId => {
      updateRelationship(
        source,
        relationConfig.propertyKey,
        targetId,
        relationConfig.cardinality,
        'add'
      )
    })

    const existingTargets = getExistingRelationships(source, relationConfig.propertyKey)
    expect(existingTargets).toHaveLength(7)
  })

  it('should calculate remaining capacity correctly', () => {
    const relationConfig: TemplateRelationType = {
      name: 'CCTV 주차구역 모니터링',
      description: 'CCTV monitors parking spaces',
      sourceType: 'cctv',
      targetType: 'parkingSpace',
      cardinality: '1:5',
      propertyKey: 'monitoredSpaces',
      autoLink: {
        strategy: 'nearest',
        maxDistance: 1000,
        allowDuplicates: false
      }
    }

    // Add 3 relationships manually
    ;['space-0', 'space-1', 'space-2'].forEach(targetId => {
      updateRelationship(
        source,
        relationConfig.propertyKey,
        targetId,
        relationConfig.cardinality,
        'add'
      )
    })

    // Check remaining capacity
    const remaining = getRemainingCapacity(
      source,
      relationConfig.propertyKey,
      relationConfig.cardinality
    )

    // Should have 2 slots remaining (5 max - 3 existing = 2)
    expect(remaining).toBe(2)

    // Verify existing count
    const existingTargets = getExistingRelationships(source, relationConfig.propertyKey)
    expect(existingTargets).toHaveLength(3)
  })
})
