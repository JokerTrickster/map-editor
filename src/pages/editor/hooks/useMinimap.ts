/**
 * useMinimap Hook
 * Manages minimap initialization and viewport synchronization
 */

import { useEffect, useRef, useCallback, RefObject } from 'react'
import { dia } from '@joint/core'

interface UseMinimapReturn {
  minimapPaper: dia.Paper | null
  updateMinimapViewport: () => void
}

export function useMinimap(
  paper: dia.Paper | null,
  graph: dia.Graph | null,
  minimapContainerRef: RefObject<HTMLDivElement>,
  viewportRectRef: RefObject<HTMLDivElement>,
  loadedFileName: string | null
): UseMinimapReturn {
  const minimapPaperRef = useRef<dia.Paper | null>(null)
  const minimapBaseScaleRef = useRef<number | null>(null)
  const minimapBaseTranslateRef = useRef<{ tx: number; ty: number } | null>(null)

  const updateMinimapViewport = useCallback(() => {
    if (!paper || !minimapPaperRef.current || !viewportRectRef.current || !graph) return

    const mainScale = paper.scale()
    const mainTranslate = paper.translate()
    const viewportEl = paper.el.parentElement
    if (!viewportEl) return

    const viewportWidth = viewportEl.clientWidth
    const viewportHeight = viewportEl.clientHeight

    // Use fixed canvas bounds (3000x3000, same as panning bounds)
    const CANVAS_MIN_X = -1500
    const CANVAS_MAX_X = 1500
    const CANVAS_MIN_Y = -1500
    const CANVAS_MAX_Y = 1500

    const contentCenterX = (CANVAS_MIN_X + CANVAS_MAX_X) / 2  // 0
    const contentCenterY = (CANVAS_MIN_Y + CANVAS_MAX_Y) / 2  // 0
    const requiredWidth = CANVAS_MAX_X - CANVAS_MIN_X  // 3000
    const requiredHeight = CANVAS_MAX_Y - CANVAS_MIN_Y  // 3000

    // Calculate visible viewport in graph coordinates
    const visibleRect = {
      x: -mainTranslate.tx / mainScale.sx,
      y: -mainTranslate.ty / mainScale.sy,
      width: viewportWidth / mainScale.sx,
      height: viewportHeight / mainScale.sy,
    }

    // Scale minimap to fit required area
    const minimapContainer = minimapContainerRef.current
    if (!minimapContainer) return

    const containerWidth = minimapContainer.clientWidth
    const containerHeight = minimapContainer.clientHeight
    const padding = 10

    const safeWidth = Math.max(requiredWidth, 1)
    const safeHeight = Math.max(requiredHeight, 1)

    const scaleX = (containerWidth - 2 * padding) / safeWidth
    const scaleY = (containerHeight - 2 * padding) / safeHeight
    const scale = Math.min(scaleX, scaleY)

    // Calculate translation to center content
    const tx = containerWidth / 2 - contentCenterX * scale
    const ty = containerHeight / 2 - contentCenterY * scale

    // Apply transform to minimap paper
    minimapPaperRef.current.scale(scale, scale)
    minimapPaperRef.current.translate(tx, ty)

    // Update viewport indicator
    const viewportRect = {
      x: visibleRect.x * scale + tx,
      y: visibleRect.y * scale + ty,
      width: visibleRect.width * scale,
      height: visibleRect.height * scale,
    }

    const viewport = viewportRectRef.current

    // Visual adjustment: reduce indicator size by 50%
    const visualScale = 0.5
    const visualWidth = viewportRect.width * visualScale
    const visualHeight = viewportRect.height * visualScale
    const visualX = viewportRect.x + (viewportRect.width - visualWidth) / 2
    const visualY = viewportRect.y + (viewportRect.height - visualHeight) / 2

    viewport.style.left = `${visualX}px`
    viewport.style.top = `${visualY}px`
    viewport.style.width = `${visualWidth}px`
    viewport.style.height = `${visualHeight}px`
    viewport.style.pointerEvents = 'none'
  }, [paper, graph, minimapContainerRef, viewportRectRef])

  // Initialize minimap
  useEffect(() => {
    if (!minimapContainerRef.current || !graph) return
    if (minimapPaperRef.current) return

    const minimapPaper = new dia.Paper({
      model: graph,
      width: 200,
      height: 150,
      gridSize: 10,
      interactive: false,
      background: { color: 'rgba(0,0,0,0)' },
    })

    minimapPaperRef.current = minimapPaper
    minimapContainerRef.current.appendChild(minimapPaper.el)

    // Initial fit
    minimapPaper.scaleContentToFit({ padding: 10 })
    minimapBaseScaleRef.current = minimapPaper.scale().sx
    minimapBaseTranslateRef.current = minimapPaper.translate()

    // Minimap interaction handler
    const centerOnPoint = (x: number, y: number) => {
      if (!paper) return

      const mainScale = paper.scale()
      const viewport = paper.el.parentElement

      if (viewport) {
        const viewportWidth = viewport.clientWidth
        const viewportHeight = viewport.clientHeight

        const newTx = viewportWidth / 2 - x * mainScale.sx
        const newTy = viewportHeight / 2 - y * mainScale.sy

        paper.translate(newTx, newTy)
      }
    }

    minimapPaper.on('blank:pointerdown', (_evt: dia.Event, x: number, y: number) => {
      centerOnPoint(x, y)
    })

    minimapPaper.on('cell:pointerdown', (_cellView: dia.CellView, _evt: dia.Event, x: number, y: number) => {
      centerOnPoint(x, y)
    })

    // Force update viewport
    updateMinimapViewport()

    return () => {
      minimapPaper.remove()
      minimapPaperRef.current = null
      minimapBaseScaleRef.current = null
      minimapBaseTranslateRef.current = null
    }
  }, [graph, paper, minimapContainerRef, loadedFileName, updateMinimapViewport])

  // Attach listeners for minimap sync
  useEffect(() => {
    if (!paper) return

    paper.on('translate resize scale', updateMinimapViewport)

    return () => {
      paper.off('translate resize scale', updateMinimapViewport)
    }
  }, [paper, updateMinimapViewport])

  return { minimapPaper: minimapPaperRef.current, updateMinimapViewport }
}
