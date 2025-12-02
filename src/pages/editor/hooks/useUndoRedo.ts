/**
 * useUndoRedo Hook
 * Manages undo/redo history for canvas changes
 */

import { useEffect, useRef, useCallback } from 'react'
import { dia } from '@joint/core'

interface UseUndoRedoReturn {
  undo: () => void
  redo: () => void
}

export function useUndoRedo(
  graph: dia.Graph | null,
  onElementCountChange?: (count: number) => void
): UseUndoRedoReturn {
  const historyStack = useRef<string[]>([])
  const historyIndex = useRef<number>(-1)

  // Save graph state to history
  const saveState = useCallback(() => {
    if (!graph) return
    const state = JSON.stringify(graph.toJSON())

    // Remove future states if we're not at the end
    historyStack.current = historyStack.current.slice(0, historyIndex.current + 1)

    // Add new state
    historyStack.current.push(state)
    historyIndex.current++

    // Limit history to 50 states
    if (historyStack.current.length > 50) {
      historyStack.current.shift()
      historyIndex.current--
    }
  }, [graph])

  // Track changes for undo/redo
  useEffect(() => {
    if (!graph) return

    graph.on('change', saveState)

    return () => {
      graph.off('change', saveState)
    }
  }, [graph, saveState])

  const undo = useCallback(() => {
    if (historyIndex.current > 0 && graph) {
      historyIndex.current--
      const state = historyStack.current[historyIndex.current]
      graph.off('change')
      graph.fromJSON(JSON.parse(state))
      graph.on('change', saveState)

      if (onElementCountChange) {
        onElementCountChange(graph.getElements().length)
      }
      console.log('🔙 Undo')
    }
  }, [graph, saveState, onElementCountChange])

  const redo = useCallback(() => {
    if (historyIndex.current < historyStack.current.length - 1 && graph) {
      historyIndex.current++
      const state = historyStack.current[historyIndex.current]
      graph.off('change')
      graph.fromJSON(JSON.parse(state))
      graph.on('change', saveState)

      if (onElementCountChange) {
        onElementCountChange(graph.getElements().length)
      }
      console.log('🔜 Redo')
    }
  }, [graph, saveState, onElementCountChange])

  return { undo, redo }
}
