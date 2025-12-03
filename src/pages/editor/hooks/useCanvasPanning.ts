/**
 * useCanvasPanning Hook
 * Handles canvas panning with mouse drag
 */

import { useEffect, useRef, RefObject } from 'react'
import { dia } from '@joint/core'

export function useCanvasPanning(
  paper: dia.Paper | null,
  graph: dia.Graph | null,
  canvasRef: RefObject<HTMLDivElement>,
  onBlankClick?: () => void
) {
  const isPanning = useRef(false)
  const lastMousePosition = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!paper || !graph) return

    const handleBlankPointerDown = (evt: dia.Event) => {
      if (onBlankClick) {
        onBlankClick()
      }

      isPanning.current = true
      lastMousePosition.current = { x: evt.clientX || 0, y: evt.clientY || 0 }
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grabbing'
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning.current || !paper) return

      const dx = e.clientX - lastMousePosition.current.x
      const dy = e.clientY - lastMousePosition.current.y

      const currentTranslate = paper.translate()
      const currentScale = paper.scale()
      let newTx = currentTranslate.tx + dx
      let newTy = currentTranslate.ty + dy

      // Fixed canvas bounds (3000x3000) - same as minimap
      // Allow panning from -1500 to +1500 in both directions at ANY zoom level
      const CANVAS_MIN_X = -1500
      const CANVAS_MAX_X = 1500
      const CANVAS_MIN_Y = -1500
      const CANVAS_MAX_Y = 1500
      const viewportWidth = paper.el.parentElement?.clientWidth || 800
      const viewportHeight = paper.el.parentElement?.clientHeight || 600

      // Calculate the scaled canvas size
      // const canvasWidthScaled = (CANVAS_MAX_X - CANVAS_MIN_X) * currentScale.sx
      // const canvasHeightScaled = (CANVAS_MAX_Y - CANVAS_MIN_Y) * currentScale.sy

      // Calculate min/max translation values
      // For X axis:
      // maxTx: when showing left edge (CANVAS_MIN_X at left of viewport)
      // minTx: when showing right edge (CANVAS_MAX_X at right of viewport)
      // const maxTx = -(CANVAS_MIN_X * currentScale.sx)
      // const minTx = -(CANVAS_MAX_X * currentScale.sx) + viewportWidth

      // For Y axis:
      // maxTy: when showing top edge (CANVAS_MIN_Y at top of viewport)
      // minTy: when showing bottom edge (CANVAS_MAX_Y at bottom of viewport)
      // const maxTy = -(CANVAS_MIN_Y * currentScale.sy)
      // const minTy = -(CANVAS_MAX_Y * currentScale.sy) + viewportHeight

      // Always use center-based clamping to allow full freedom of movement
      // This matches the minimap behavior where you can center on any point within bounds

      // X Axis
      const centerX = -newTx / currentScale.sx + viewportWidth / (2 * currentScale.sx)
      const clampedCenterX = Math.max(CANVAS_MIN_X, Math.min(CANVAS_MAX_X, centerX))
      newTx = -(clampedCenterX * currentScale.sx) + viewportWidth / 2

      // Y Axis
      const centerY = -newTy / currentScale.sy + viewportHeight / (2 * currentScale.sy)
      const clampedCenterY = Math.max(CANVAS_MIN_Y, Math.min(CANVAS_MAX_Y, centerY))
      newTy = -(clampedCenterY * currentScale.sy) + viewportHeight / 2

      paper.translate(newTx, newTy)
      lastMousePosition.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
      isPanning.current = false
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'default'
      }
    }

    paper.on('blank:pointerdown', handleBlankPointerDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      paper.off('blank:pointerdown', handleBlankPointerDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [paper, graph, canvasRef, onBlankClick])
}
