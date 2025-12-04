/**
 * Layer Rendering Hook
 * Handles rendering of selected CSV layers to canvas
 * Only renders layers that are mapped to object types
 */

import { useEffect, useRef } from 'react'
import { dia } from '@joint/core'
import { useCSVStore } from '@/features/csv'
import { useFloorStore } from '@/shared/store/floorStore'
import { useObjectTypeStore } from '@/shared/store/objectTypeStore'
import { createElementsFromCSV } from '../lib/csvRenderer'

export function useLayerRendering(
  graph: dia.Graph | null,
  setElementCount: (count: number) => void,
  setObjectsByLayer: (layers: Map<string, dia.Element[]>) => void,
  setLoadedFileName: (name: string | null) => void,
  pendingGraphJson: any | null,
  setPendingGraphJson: (json: any | null) => void,
  isRestoring: boolean = false
) {
  const groupedLayers = useCSVStore(state => state.groupedLayers)
  const selectedLayers = useCSVStore(state => state.selectedLayers)
  const uploadState = useCSVStore(state => state.uploadState)
  const currentFloor = useFloorStore(state => state.currentFloor)
  const mappings = useObjectTypeStore(state => state.mappings)

  // Track if we just uploaded a new CSV file
  const lastUploadStateRef = useRef<string>('idle')

  useEffect(() => {
    if (!graph) return

    // Priority 1: Restore pending graph JSON (from floor switch)
    if (pendingGraphJson) {
      console.log('🔄 Restoring graph from pendingGraphJson')
      try {
        graph.fromJSON(pendingGraphJson)
        setPendingGraphJson(null)

        // Update element count and objects by layer
        const cells = graph.getCells()
        setElementCount(cells.length)

        // Reconstruct objectsByLayer from restored graph
        const layerMap = new Map<string, dia.Element[]>()
        cells.forEach((cell) => {
          if (cell.isElement()) {
            const element = cell as dia.Element
            const layer = element.get('layer') || 'default'
            if (!layerMap.has(layer)) {
              layerMap.set(layer, [])
            }
            layerMap.get(layer)!.push(element)
          }
        })
        setObjectsByLayer(layerMap)
        console.log(`✅ Graph restored: ${cells.length} cells`)
      } catch (error) {
        console.error('Failed to restore graph from JSON:', error)
        setPendingGraphJson(null)
      }
      return
    }

    // Check if CSV was just uploaded (status changed to 'parsed')
    const currentStatus = uploadState.status
    const wasJustUploaded = lastUploadStateRef.current !== 'parsed' && currentStatus === 'parsed'
    lastUploadStateRef.current = currentStatus

    // Priority 2: Render from CSV only if:
    // 1. CSV was just uploaded (new file)
    // 2. Graph is empty (no saved work)
    if (!groupedLayers || groupedLayers.length === 0) {
      return
    }

    // Skip CSV rendering if graph already has content AND it's not a fresh upload
    const existingCells = graph.getCells()
    if (existingCells.length > 0 && !wasJustUploaded) {
      console.log('⏭️ Skipping CSV render - graph has saved content')
      return
    }

    // If we are in the middle of a floor restoration, skip CSV rendering
    // to prevent overwriting the graph data we just restored from JSON.
    if (isRestoring && existingCells.length > 0) {
      return
    }

    console.log('🎨 Rendering from CSV', { wasJustUploaded, existingCells: existingCells.length })

    // Get mappings for current floor
    const floorMappings = currentFloor ? mappings.filter(m => m.floorId === currentFloor) : []
    const mappedEntityHandles = new Set(floorMappings.map(m => m.entityHandle))

    console.log(`📋 Mappings: ${floorMappings.length} entities mapped to object types`)

    // Clear current elements
    graph.clear()

    // Filter only selected layers AND entities that are mapped to object types
    const layersToRender = groupedLayers
      .map(layer => ({
        ...layer,
        // Filter entities: must be in selected layers AND mapped to object type
        entities: layer.entities.filter(entity =>
          selectedLayers.has(layer.layer) && mappedEntityHandles.has(entity.entityHandle)
        )
      }))
      .filter(layer => layer.entities.length > 0) // Remove layers with no mapped entities

    if (layersToRender.length === 0) {
      console.log('⚠️ No mapped entities to render')
      setElementCount(0)
      setObjectsByLayer(new Map())
      return
    }

    console.log(`✅ Rendering ${layersToRender.length} layers with mapped entities`)


    // Calculate global bounds from all entities in selected layers
    const allEntities = layersToRender.flatMap(layer => layer.entities)

    if (allEntities.length === 0) {
      return
    }

    // Calculate bounds
    const bounds = {
      minX: Math.min(...allEntities.flatMap(e => e.points.map(p => p.x))),
      maxX: Math.max(...allEntities.flatMap(e => e.points.map(p => p.x))),
      minY: Math.min(...allEntities.flatMap(e => e.points.map(p => p.y))),
      maxY: Math.max(...allEntities.flatMap(e => e.points.map(p => p.y))),
    }

    // Render elements from selected layers
    const { elements, objectsByLayer } = createElementsFromCSV(
      layersToRender,
      bounds
    )

    // Add elements to graph
    graph.resetCells(elements)

    // Update state
    setElementCount(elements.length)
    setObjectsByLayer(objectsByLayer)

    // Set loaded file name if parsed
    if (uploadState.status === 'parsed') {
      setLoadedFileName(uploadState.fileName)
    }
  }, [
    graph,
    groupedLayers,
    selectedLayers,
    uploadState,
    pendingGraphJson,
    setElementCount,
    setObjectsByLayer,
    setLoadedFileName,
    setPendingGraphJson,
    currentFloor,
    mappings // Trigger re-render when mappings change
  ])
}
