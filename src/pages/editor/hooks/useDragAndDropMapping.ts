/**
 * Drag and Drop Mapping Hook
 * Handles dragging object types onto canvas elements to create mappings
 */

import { useEffect, useState } from 'react'
import { dia } from '@joint/core'
import { useObjectTypeStore } from '@/shared/store/objectTypeStore'

export function useDragAndDropMapping(
  paper: dia.Paper | null,
  graph: dia.Graph | null,
  floorId: string = 'default'
) {
  const [dragOverElementId, setDragOverElementId] = useState<string | null>(null)
  const addMapping = useObjectTypeStore((state) => state.addMapping)
  const removeMappingByEntity = useObjectTypeStore((state) => state.removeMappingByEntity)
  const getMappingByEntity = useObjectTypeStore((state) => state.getMappingByEntity)

  useEffect(() => {
    if (!paper) return

    const paperEl = paper.el

    // Handle dragover on canvas elements
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.dataTransfer!.dropEffect = 'copy'

      // Find the element under mouse
      const point = paper.clientToLocalPoint({
        x: e.clientX,
        y: e.clientY,
      })

      const elementView = paper.findViewAtPoint(point)
      if (elementView && elementView.model.isElement()) {
        const elementId = elementView.model.id as string
        setDragOverElementId(elementId)

        // Highlight element
        elementView.model.attr('body/stroke', '#4CAF50')
        elementView.model.attr('body/strokeWidth', 3)
      } else {
        setDragOverElementId(null)
      }
    }

    // Handle dragleave
    const handleDragLeave = (e: DragEvent) => {
      if (dragOverElementId) {
        const element = graph?.getCell(dragOverElementId)
        if (element && element.isElement()) {
          // Reset highlight
          const mapping = getMappingByEntity(floorId, dragOverElementId)
          if (mapping) {
            element.attr('body/stroke', '#2196F3')
          } else {
            element.attr('body/stroke', '#000000')
          }
          element.attr('body/strokeWidth', 1)
        }
        setDragOverElementId(null)
      }
    }

    // Handle drop
    const handleDrop = (e: DragEvent) => {
      e.preventDefault()

      const typeId = e.dataTransfer!.getData('objectTypeId')
      const typeName = e.dataTransfer!.getData('objectTypeName')

      if (!typeId || !typeName) return

      // Find the element under mouse
      const point = paper.clientToLocalPoint({
        x: e.clientX,
        y: e.clientY,
      })

      const elementView = paper.findViewAtPoint(point)
      if (elementView && elementView.model.isElement()) {
        const elementId = elementView.model.id as string

        try {
          // Remove existing mapping if any
          removeMappingByEntity(elementId)

          // Create new mapping
          addMapping({
            floorId,
            typeId,
            entityHandle: elementId,
          })

          // Update element visual
          elementView.model.attr('body/stroke', '#2196F3')
          elementView.model.attr('body/strokeWidth', 2)
          elementView.model.attr('body/fill', '#E3F2FD')

          console.log(`Mapped ${typeName} to element ${elementId}`)
        } catch (error) {
          console.error('Failed to create mapping:', error)
          alert(error instanceof Error ? error.message : 'Failed to create mapping')
        }
      }

      setDragOverElementId(null)
    }

    paperEl.addEventListener('dragover', handleDragOver as EventListener)
    paperEl.addEventListener('dragleave', handleDragLeave as EventListener)
    paperEl.addEventListener('drop', handleDrop as EventListener)

    return () => {
      paperEl.removeEventListener('dragover', handleDragOver as EventListener)
      paperEl.removeEventListener('dragleave', handleDragLeave as EventListener)
      paperEl.removeEventListener('drop', handleDrop as EventListener)
    }
  }, [paper, graph, floorId, dragOverElementId, addMapping, removeMappingByEntity, getMappingByEntity])

  return {
    dragOverElementId,
  }
}
