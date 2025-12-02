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
  onSelectionChange: (elementId: string | null) => void
): UseElementSelectionReturn {
  // Handle element click from canvas
  useEffect(() => {
    if (!paper || !graph) return

    const handlePointerClick = (elementView: dia.ElementView) => {
      const elementId = elementView.model.id as string
      onSelectionChange(elementId)
    }

    paper.on('element:pointerclick', handlePointerClick)

    return () => {
      paper.off('element:pointerclick', handlePointerClick)
    }
  }, [paper, graph, onSelectionChange])

  // Update highlighting when selection changes
  useEffect(() => {
    if (!graph || !paper) return

    graph.getCells().forEach((cell) => {
      if (cell.isElement()) {
        const view = paper.findViewByModel(cell)
        if (cell.id === selectedElementId) {
          view?.highlight()
        } else {
          view?.unhighlight()
        }
      }
    })
  }, [graph, paper, selectedElementId])

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

    if (!graph || !paper) return

    // Unhighlight all elements
    graph.getCells().forEach((cell) => {
      if (cell.isElement()) {
        const view = paper.findViewByModel(cell)
        view?.unhighlight()
      }
    })
  }, [graph, paper, onSelectionChange])

  return { handleElementClick, handleBlankClick }
}
