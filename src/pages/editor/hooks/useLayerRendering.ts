/**
 * Layer Rendering Hook
 * Handles rendering of selected CSV layers to canvas
 */

import { useEffect } from 'react'
import { dia } from '@joint/core'
import { useCSVStore } from '@/features/csv'
import { createElementsFromCSV } from '../lib/csvRenderer'

export function useLayerRendering(
  graph: dia.Graph | null,
  setElementCount: (count: number) => void,
  setObjectsByLayer: (layers: Map<string, dia.Element[]>) => void,
  setLoadedFileName: (name: string | null) => void
) {
  const groupedLayers = useCSVStore(state => state.groupedLayers)
  const selectedLayers = useCSVStore(state => state.selectedLayers)
  const uploadState = useCSVStore(state => state.uploadState)

  useEffect(() => {
    if (!graph || !groupedLayers || groupedLayers.length === 0) {
      return
    }

    // Clear current elements
    graph.clear()

    // Filter only selected layers
    const layersToRender = groupedLayers.filter(layer =>
      selectedLayers.has(layer.layer)
    )

    if (layersToRender.length === 0) {
      setElementCount(0)
      setObjectsByLayer(new Map())
      return
    }

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
    setElementCount,
    setObjectsByLayer,
    setLoadedFileName,
  ])
}
