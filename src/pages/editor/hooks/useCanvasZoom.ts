/**
 * useCanvasZoom Hook
 * Handles zoom controls and wheel zoom
 */

import { useEffect, useCallback, RefObject } from 'react'
import { dia } from '@joint/core'

interface UseCanvasZoomReturn {
  handleZoomIn: () => void
  handleZoomOut: () => void
  handleZoomReset: () => void
  handleFitToScreen: () => void
}

export function useCanvasZoom(
  paper: dia.Paper | null,
  canvasRef: RefObject<HTMLDivElement>,
  onZoomChange?: (zoom: number) => void
): UseCanvasZoomReturn {
  const zoomToPoint = useCallback(
    (nextScale: number, x: number, y: number) => {
      if (!paper) return

      const currentScale = paper.scale().sx
      const currentTranslate = paper.translate()

      // Calculate new translation to keep the point (x, y) fixed
      const newTx = x - (x - currentTranslate.tx) * (nextScale / currentScale)
      const newTy = y - (y - currentTranslate.ty) * (nextScale / currentScale)

      paper.scale(nextScale, nextScale)
      paper.translate(newTx, newTy)

      if (onZoomChange) {
        onZoomChange(nextScale)
      }
    },
    [paper, onZoomChange]
  )

  const handleZoomIn = useCallback(() => {
    if (paper) {
      const currentScale = paper.scale()
      const nextScale = Math.min(currentScale.sx * 1.2, 5)
      const viewportWidth = paper.el.parentElement?.clientWidth || 800
      const viewportHeight = paper.el.parentElement?.clientHeight || 600
      const ox = viewportWidth / 2
      const oy = viewportHeight / 2
      zoomToPoint(nextScale, ox, oy)
    }
  }, [paper, zoomToPoint])

  const handleZoomOut = useCallback(() => {
    if (paper) {
      const currentScale = paper.scale()
      const nextScale = Math.max(currentScale.sx / 1.2, 0.1)
      const viewportWidth = paper.el.parentElement?.clientWidth || 800
      const viewportHeight = paper.el.parentElement?.clientHeight || 600
      const ox = viewportWidth / 2
      const oy = viewportHeight / 2
      zoomToPoint(nextScale, ox, oy)
    }
  }, [paper, zoomToPoint])

  const handleZoomReset = useCallback(() => {
    if (paper) {
      paper.scale(1, 1)
      if (onZoomChange) {
        onZoomChange(1)
      }
    }
  }, [paper, onZoomChange])

  const handleFitToScreen = useCallback(() => {
    paper?.scaleContentToFit({
      padding: 50,
      maxScale: 2,
      minScale: 0.1,
    })
  }, [paper])

  // Wheel zoom handler
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()

        if (!paper) return

        const currentScale = paper.scale().sx
        const delta = e.deltaY > 0 ? 0.9 : 1.1

        let nextScale = currentScale * delta
        nextScale = Math.max(0.1, Math.min(nextScale, 5))

        const rect = paper.el.parentElement?.getBoundingClientRect()
        if (!rect) return

        const ox = e.clientX - rect.left
        const oy = e.clientY - rect.top

        zoomToPoint(nextScale, ox, oy)
      }
    }

    const canvasEl = canvasRef.current
    if (canvasEl) {
      canvasEl.addEventListener('wheel', handleWheel, { passive: false })
    }

    return () => {
      if (canvasEl) {
        canvasEl.removeEventListener('wheel', handleWheel)
      }
    }
  }, [paper, canvasRef, zoomToPoint])

  return { handleZoomIn, handleZoomOut, handleZoomReset, handleFitToScreen }
}
