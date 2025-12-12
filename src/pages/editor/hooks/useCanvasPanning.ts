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
  onBlankClick?: () => void,
  rotation: number = 0
) {
  const isPanning = useRef(false)
  const lastMousePosition = useRef({ x: 0, y: 0 })
  const hasMoved = useRef(false)

  useEffect(() => {
    if (!paper || !graph) return

    const handleBlankPointerDown = (evt: dia.Event) => {
      isPanning.current = true
      hasMoved.current = false
      lastMousePosition.current = { x: evt.clientX || 0, y: evt.clientY || 0 }
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grabbing'
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning.current || !paper) return

      const rawDx = e.clientX - lastMousePosition.current.x
      const rawDy = e.clientY - lastMousePosition.current.y

      // Track if user has moved (not just clicked)
      if (Math.abs(rawDx) > 2 || Math.abs(rawDy) > 2) {
        hasMoved.current = true
      }

      // Transform delta based on rotation
      // When map is rotated, the paper's coordinate system is rotated relative to the screen
      // We need to adjust dx/dy to match the visual movement
      let dx = rawDx
      let dy = rawDy

      switch (rotation) {
        case 90:
          dx = rawDy
          dy = -rawDx
          break
        case 180:
          dx = -rawDx
          dy = -rawDy
          break
        case 270:
          dx = -rawDy
          dy = rawDx
          break
        default: // 0
          dx = rawDx
          dy = rawDy
      }

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
      // Only trigger blank click if user clicked without moving (not panning)
      if (isPanning.current && !hasMoved.current && onBlankClick) {
        onBlankClick()
      }

      isPanning.current = false
      hasMoved.current = false
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
  }, [paper, graph, canvasRef, onBlankClick, rotation])
}
