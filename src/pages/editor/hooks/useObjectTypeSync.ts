/**
 * Object Type Sync Hook
 * Updates all objects when their type definition changes (color, icon)
 */

import { useEffect, useRef } from 'react'
import { dia } from '@joint/core'
import { useObjectTypeStore } from '@/shared/store/objectTypeStore'

export function useObjectTypeSync(graph: dia.Graph | null) {
  const types = useObjectTypeStore(state => state.types)
  const mappings = useObjectTypeStore(state => state.mappings)

  // Track previous types to detect changes
  const prevTypesRef = useRef<Map<string, { color?: string; icon?: string }>>(new Map())

  useEffect(() => {
    if (!graph) return

    // Build current types map
    const currentTypesMap = new Map(
      types.map(type => [type.id, { color: type.color, icon: type.icon }])
    )

    // Check for changes
    types.forEach(type => {
      const prevType = prevTypesRef.current.get(type.id)
      const currentType = currentTypesMap.get(type.id)

      // If type changed, update all elements with this typeId
      if (prevType && currentType) {
        const colorChanged = prevType.color !== currentType.color
        const iconChanged = prevType.icon !== currentType.icon

        if (colorChanged || iconChanged) {
          console.log(`🔄 Type "${type.name}" changed, updating objects...`)
          updateElementsForType(graph, type.id, type, mappings)
        }
      }
    })

    // Update ref for next comparison
    prevTypesRef.current = currentTypesMap
  }, [graph, types, mappings])
}

/**
 * Update all elements that belong to a specific object type
 */
function updateElementsForType(
  graph: dia.Graph,
  typeId: string,
  type: { name: string; color?: string; icon?: string },
  mappings: Array<{ entityHandle: string; typeId: string }>
) {
  const cells = graph.getCells()
  let updatedCount = 0

  cells.forEach(cell => {
    if (!cell.isElement()) return
    const element = cell as dia.Element

    // Check if element has this typeId
    const elementTypeId = element.prop('objectTypeId')
    const elementEntityHandle = element.prop('data/entityHandle')

    // Update if:
    // 1. Directly created with this type (has objectTypeId)
    // 2. CSV entity mapped to this type
    let shouldUpdate = false

    if (elementTypeId === typeId) {
      shouldUpdate = true
    } else if (elementEntityHandle) {
      // Check if this entity is mapped to this type
      const mapping = mappings.find(m =>
        m.entityHandle === elementEntityHandle && m.typeId === typeId
      )
      if (mapping) {
        shouldUpdate = true
      }
    }

    if (shouldUpdate) {
      // Update color for shapes
      if (type.color) {
        const currentAttrs = element.attr()

        // Handle different element types
        if (currentAttrs.body) {
          // Standard shapes (Path, Polygon, Rectangle)
          element.attr('body/fill', type.color)
          element.attr('body/stroke', type.color)
        } else if (currentAttrs.rect) {
          // Rectangle shape
          element.attr('rect/fill', type.color)
          element.attr('rect/stroke', type.color)
        }
      }

      // Update icon for image elements (only if icon is a URL)
      if (type.icon && element.attr('image')) {
        const isActualAsset = type.icon.startsWith('/assets/parking/') || type.icon.startsWith('http')
        if (isActualAsset) {
          element.attr('image/xlinkHref', type.icon)
        }
      }

      // Do NOT update label - keep labels empty

      updatedCount++
    }
  })

  console.log(`✅ Updated ${updatedCount} objects for type "${type.name}"`)
}
