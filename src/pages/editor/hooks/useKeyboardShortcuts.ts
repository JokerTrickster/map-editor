/**
 * useKeyboardShortcuts Hook
 * Handles keyboard shortcuts for undo, redo, and delete
 */

import { useEffect } from 'react'
import { dia } from '@joint/core'

export function useKeyboardShortcuts(
  selectedElementId: string | null,
  graph: dia.Graph | null,
  undo: () => void,
  redo: () => void,
  onElementDelete?: (elementId: string) => void,
  onElementCountChange?: (count: number) => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z (or Cmd+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z (or Cmd+Shift+Z on Mac)
      else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault()
        redo()
      }
      // Delete: Delete or Backspace key
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        e.preventDefault()
        if (graph) {
          const element = graph.getCell(selectedElementId)
          if (element) {
            element.remove()
            if (onElementDelete) {
              onElementDelete(selectedElementId)
            }
            if (onElementCountChange) {
              onElementCountChange(graph.getElements().length)
            }
            console.log('🗑️ Deleted element:', selectedElementId)
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedElementId, graph, undo, redo, onElementDelete, onElementCountChange])
}
