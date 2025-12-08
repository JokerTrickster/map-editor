/**
 * useElementSelection Hook
 * Handles element selection and highlighting
 */

import { useEffect, useCallback } from 'react'
import { dia } from '@joint/core'

interface UseElementSelectionReturn {
  handleElementClick: (elementId: string) => void
  handleBlankClick: () => void
}

export function useElementSelection(
  graph: dia.Graph | null,
  paper: dia.Paper | null,
  selectedElementId: string | null,
  onSelectionChange: (elementId: string | null) => void,
  onClearMultiSelection?: () => void,
  hasMultiSelection?: boolean
): UseElementSelectionReturn {
  // Handle element click from canvas
  useEffect(() => {
    if (!paper || !graph) return

    const handlePointerClick = (elementView: dia.ElementView) => {
      const elementId = elementView.model.id as string
      onSelectionChange(elementId)
      // Clear multi-selection when clicking individual element
      if (onClearMultiSelection) {
        onClearMultiSelection()
      }
    }

    paper.on('element:pointerclick', handlePointerClick)

    return () => {
      paper.off('element:pointerclick', handlePointerClick)
    }
  }, [paper, graph, onSelectionChange, onClearMultiSelection])

  // Update highlighting when selection changes (skip if multi-selection is active)
  useEffect(() => {
    if (!graph || !paper) return
    if (hasMultiSelection) return // Don't interfere with multi-selection highlights

    graph.getCells().forEach((cell) => {
      if (cell.isElement()) {
        const view = paper.findViewByModel(cell)
        if (view && view.el) {
          // Remove single-select highlight class and restore original z-index
          view.el.classList.remove('single-select-highlight')
          const originalZ = cell.get('singleSelectOriginalZ')
          if (originalZ !== undefined) {
            cell.set('z', originalZ)
            cell.unset('singleSelectOriginalZ')
          }

          // Add highlight class to selected element and bring to front
          if (cell.id === selectedElementId) {
            view.el.classList.add('single-select-highlight')
            // Store original z-index and bring to front
            const currentZ = cell.get('z')
            if (cell.get('singleSelectOriginalZ') === undefined) {
              cell.set('singleSelectOriginalZ', currentZ)
            }
            cell.toFront()
          }
        }
      }
    })
  }, [graph, paper, selectedElementId, hasMultiSelection])

  // Update interactivity based on selection
  useEffect(() => {
    if (!graph || !paper) return

    graph.getCells().forEach((cell) => {
      if (cell.isElement()) {
        const cellView = paper.findViewByModel(cell)
        if (cellView) {
          const cellId = cell.id as string
          cellView.setInteractivity(cellId === selectedElementId)
        }
      }
    })
  }, [graph, paper, selectedElementId])

  const handleElementClick = useCallback(
    (elementId: string) => {
      if (!graph || !paper) return

      onSelectionChange(elementId)

      // Find and center on element
      const element = graph.getCell(elementId)
      if (element && element.isElement()) {
        const bbox = element.getBBox()
        const currentScale = paper.scale()
        const viewportWidth = paper.el.parentElement?.clientWidth || 800
        const viewportHeight = paper.el.parentElement?.clientHeight || 600

        console.log('🎯 Element bbox:', { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height })

        // Calculate center position
        const centerX = -bbox.x * currentScale.sx + viewportWidth / 2 - (bbox.width * currentScale.sx) / 2
        const centerY = -bbox.y * currentScale.sy + viewportHeight / 2 - (bbox.height * currentScale.sy) / 2

        paper.translate(centerX, centerY)
      }
    },
    [graph, paper, onSelectionChange]
  )

  const handleBlankClick = useCallback(() => {
    onSelectionChange(null)

    // Clear multi-selection
    if (onClearMultiSelection) {
      onClearMultiSelection()
    }

    if (!graph || !paper) return

    // Unhighlight all elements
    graph.getCells().forEach((cell) => {
      if (cell.isElement()) {
        const view = paper.findViewByModel(cell)
        view?.unhighlight()
      }
    })
  }, [graph, paper, onSelectionChange, onClearMultiSelection])

  return { handleElementClick, handleBlankClick }
}
