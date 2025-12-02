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

      // Restrict Panning Area
      const contentBBox = graph?.getBBox() || { x: 0, y: 0, width: 1000, height: 1000 }
      const viewportWidth = paper.el.parentElement?.clientWidth || 800
      const viewportHeight = paper.el.parentElement?.clientHeight || 600
      const PAN_PADDING = 2000

      // Calculate min/max translation values
      const minTx = -(contentBBox.x + contentBBox.width + PAN_PADDING) * currentScale.sx + viewportWidth
      const maxTx = -(contentBBox.x - PAN_PADDING) * currentScale.sx
      const minTy = -(contentBBox.y + contentBBox.height + PAN_PADDING) * currentScale.sy + viewportHeight
      const maxTy = -(contentBBox.y - PAN_PADDING) * currentScale.sy

      // Clamp values
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
