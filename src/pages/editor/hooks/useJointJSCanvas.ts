/**
 * useJointJSCanvas Hook
 * Initializes and manages JointJS canvas (graph and paper)
 */

import { useEffect, useRef, useState, RefObject } from 'react'
import { dia, shapes } from '@joint/core'

interface UseJointJSCanvasReturn {
  graph: dia.Graph | null
  paper: dia.Paper | null
}

export function useJointJSCanvas(
  canvasRef: RefObject<HTMLDivElement>
): UseJointJSCanvasReturn {
  const [graph, setGraph] = useState<dia.Graph | null>(null)
  const [paper, setPaper] = useState<dia.Paper | null>(null)
  const graphRef = useRef<dia.Graph | null>(null)
  const paperRef = useRef<dia.Paper | null>(null)
  const initializedRef = useRef<boolean>(false)

  useEffect(() => {
    // Prevent double initialization
    if (initializedRef.current) {
      return
    }

    // Wait for canvasRef.current to be available
    if (!canvasRef.current) {
      // Poll until canvas is available
      const checkInterval = setInterval(() => {
        if (canvasRef.current && !initializedRef.current) {
          clearInterval(checkInterval)
          initializeCanvas()
        }
      }, 50)

      return () => clearInterval(checkInterval)
    }

    // Canvas is already available, initialize immediately
    initializeCanvas()

    function initializeCanvas() {
      if (initializedRef.current || !canvasRef.current) return

      console.log('✅ Canvas element mounted, initializing JointJS...')

      // Mark as initialized
      initializedRef.current = true

      // Create graph
      const newGraph = new dia.Graph({}, { cellNamespace: shapes })
      graphRef.current = newGraph
      setGraph(newGraph)

      // Create paper with default theme (will be updated by theme effect)
      const newPaper = new dia.Paper({
        model: newGraph,
        width: 100000,
        height: 100000,
        gridSize: 10,
        drawGrid: { name: 'dot', args: { color: '#2d3139', thickness: 1 } },
        background: { color: '#13151a' },
        cellViewNamespace: shapes,
        interactive: false,
        async: true,
        sorting: dia.Paper.sorting.APPROX,
      })
      paperRef.current = newPaper
      setPaper(newPaper)

      // Append paper to container
      canvasRef.current!.appendChild(newPaper.el)

      console.log('🎨 JointJS initialized successfully')
    }

    // Cleanup
    return () => {
      if (graphRef.current && paperRef.current) {
        console.log('🧹 Cleaning up JointJS...')
        paperRef.current.remove()
        graphRef.current.clear()
      }
      initializedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty array - run only on mount, polling handles canvas availability

  return { graph, paper }
}
