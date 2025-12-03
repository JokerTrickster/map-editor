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
      // Allow panning from -1500 to +1500 in both directions
      const CANVAS_MIN_X = -1500
      const CANVAS_MAX_X = 1500
      const CANVAS_MIN_Y = -1500
      const CANVAS_MAX_Y = 1500
      const viewportWidth = paper.el.parentElement?.clientWidth || 800
      const viewportHeight = paper.el.parentElement?.clientHeight || 600

      // Calculate min/max translation values
      // Max translation is when we show the left/top edge
      const maxTx = -(CANVAS_MIN_X * currentScale.sx)
      // Min translation is when we show the right/bottom edge
      const minTx = -(CANVAS_MAX_X * currentScale.sx) + viewportWidth

      const maxTy = -(CANVAS_MIN_Y * currentScale.sy)
      const minTy = -(CANVAS_MAX_Y * currentScale.sy) + viewportHeight

      // Clamp values to prevent panning beyond canvas bounds
      newTx = Math.min(Math.max(newTx, minTx), maxTx)
      newTy = Math.min(Math.max(newTy, minTy), maxTy)

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
