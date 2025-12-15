/**
 * Object Type Sync Hook
 * Updates all objects when their type definition changes (color, icon)
 */

import { useEffect, useRef } from 'react'
import { dia, shapes } from '@joint/core'
import { useObjectTypeStore } from '@/shared/store/objectTypeStore'

export function useObjectTypeSync(graph: dia.Graph | null, paper: dia.Paper | null) {
  const types = useObjectTypeStore(state => state.types)
  const mappings = useObjectTypeStore(state => state.mappings)

  // Track previous types to detect changes
  const prevTypesRef = useRef<Map<string, { color?: string; icon?: string }>>(new Map())

  useEffect(() => {
    if (!graph || !paper) return

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
          updateElementsForType(graph, paper, type.id, type, mappings)
        }
      }
    })

    // Update ref for next comparison
    prevTypesRef.current = currentTypesMap
  }, [graph, paper, types, mappings])
}

/**
 * Update all elements that belong to a specific object type
 */
function updateElementsForType(
  graph: dia.Graph,
  _paper: dia.Paper,
  typeId: string,
  type: { name: string; color?: string; icon?: string },
  mappings: Array<{ entityHandle: string; typeId: string }>
) {
  const cells = graph.getCells()
  let updatedCount = 0
  let colorUpdates = 0
  let imageUpdates = 0
  let typeTransformations = 0

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
      const currentAttrs = element.attr()

      // Determine if we're updating color or image
      const isActualAsset = type.icon && (
        type.icon.startsWith('/assets/parking/') ||
        type.icon.startsWith('http') ||
        type.icon.startsWith('data:image/')  // Support base64 images
      )
      const isColorCode = type.icon && type.icon.startsWith('#')
      const useColor = type.color || isColorCode

      // Detect if element type needs to change
      const isCurrentlyImage = currentAttrs.image !== undefined
      const shouldBeImage = isActualAsset
      const needsTypeChange = isCurrentlyImage !== shouldBeImage

      if (needsTypeChange) {
        // Element type transformation required
        console.log(`🔄 Type transformation: ${isCurrentlyImage ? 'Image → Color' : 'Color → Image'} for ${elementEntityHandle || elementTypeId}`)

        // Extract element properties
        const position = element.position()
        const size = element.size()
        const zIndex = element.get('z') as number
        const elementId = element.id
        const data = element.prop('data')
        const objectTypeId = element.prop('objectTypeId')

        // Create new element with correct type
        let newElement: dia.Element

        if (shouldBeImage) {
          // Color → Image transformation
          const isCCTV = type.name?.includes('CCTV')
          const iconSize = isCCTV ? 20 : 32

          // Calculate centered position for icon
          const centeredX = position.x + (size.width - iconSize) / 2
          const centeredY = position.y + (size.height - iconSize) / 2

          newElement = new shapes.standard.Image({
            id: elementId,
            position: { x: centeredX, y: centeredY },
            size: { width: iconSize, height: iconSize },
            z: zIndex,
            attrs: {
              image: { xlinkHref: type.icon },
              label: { text: '' }
            },
            data
          })

          console.log(`  → Created Image element at (${centeredX}, ${centeredY}) size ${iconSize}x${iconSize}`)
        } else {
          // Image → Color transformation
          const colorToUse = isColorCode ? type.icon : type.color

          // Get original path data if available, otherwise create a rectangle
          const bodyAttrs = currentAttrs.body
          const pathData = bodyAttrs?.d || `M 0 0 L ${size.width} 0 L ${size.width} ${size.height} L 0 ${size.height} Z`

          newElement = new shapes.standard.Path({
            id: elementId,
            position: position,
            size: size,
            z: zIndex,
            attrs: {
              body: {
                d: pathData,
                fill: colorToUse,
                stroke: colorToUse,
                strokeWidth: 2,
                opacity: 0.8
              },
              label: { text: '' }
            },
            data
          })

          console.log(`  → Created Path element at (${position.x}, ${position.y}) size ${size.width}x${size.height}`)
        }

        // Preserve objectTypeId for future sync
        if (objectTypeId) {
          newElement.prop('objectTypeId', objectTypeId)
        }

        // Replace element in graph
        graph.removeCells([element])
        graph.addCell(newElement)

        typeTransformations++
        updatedCount++
      } else {
        // Same type - just update attributes
        if (useColor && !currentAttrs.image) {
          const colorToUse = isColorCode ? type.icon : type.color

          // Support all common SVG/JointJS shape types
          if (currentAttrs.body) {
            // Standard Path shapes (most common in CSV renderer)
            element.attr('body/fill', colorToUse)
            element.attr('body/stroke', colorToUse)
            colorUpdates++
          } else if (currentAttrs.rect) {
            // Rectangle shapes
            element.attr('rect/fill', colorToUse)
            element.attr('rect/stroke', colorToUse)
            colorUpdates++
          } else if (currentAttrs.circle) {
            // Circle shapes
            element.attr('circle/fill', colorToUse)
            element.attr('circle/stroke', colorToUse)
            colorUpdates++
          } else if (currentAttrs.ellipse) {
            // Ellipse shapes
            element.attr('ellipse/fill', colorToUse)
            element.attr('ellipse/stroke', colorToUse)
            colorUpdates++
          } else if (currentAttrs.polygon) {
            // Polygon shapes
            element.attr('polygon/fill', colorToUse)
            element.attr('polygon/stroke', colorToUse)
            colorUpdates++
          } else if (currentAttrs.polyline) {
            // Polyline shapes
            element.attr('polyline/fill', colorToUse)
            element.attr('polyline/stroke', colorToUse)
            colorUpdates++
          } else if (currentAttrs.path) {
            // Generic path elements (fallback)
            element.attr('path/fill', colorToUse)
            element.attr('path/stroke', colorToUse)
            colorUpdates++
          }
        }

        // Update icon for image elements (only if icon is a URL)
        if (isActualAsset && currentAttrs.image) {
          element.attr('image/xlinkHref', type.icon)
          imageUpdates++
        }

        updatedCount++
      }
    }
  })

  console.log(`✅ Updated ${updatedCount} objects for type "${type.name}"`)
  console.log(`   - Color updates: ${colorUpdates}`)
  console.log(`   - Image updates: ${imageUpdates}`)
  console.log(`   - Type transformations: ${typeTransformations}`)

  // Note: JointJS automatically re-renders views when element.attr() is called
  // No manual paper update needed - the changes are automatically reflected
}
