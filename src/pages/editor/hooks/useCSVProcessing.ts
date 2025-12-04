/**
 * useCSVProcessing Hook
 * Handles CSV data processing and rendering to canvas
 */

import { useCallback } from 'react'
import { dia } from '@joint/core'
import { parseBanpoCSV, groupByEntity, getLayerStats, calculateBounds } from '@/shared/lib/csvParser'
import { createElementsFromEntities } from '@/features/editor/lib/elementFactory'

interface UseCSVProcessingReturn {
  processCSVData: (csvText: string, fileName: string) => Promise<void>
}

export function useCSVProcessing(
  graph: dia.Graph | null,
  paper: dia.Paper | null,
  onSuccess?: (elementCount: number, objectsByLayer: Map<string, dia.Element[]>) => void,
  onError?: (error: Error) => void
): UseCSVProcessingReturn {
  const processCSVData = useCallback(
    async (csvText: string, _fileName: string) => {
      if (!graph || !paper) return

      try {
        // Parse CSV
        const rows = parseBanpoCSV(csvText)
        console.log('Parsed rows:', rows.length)

        // Calculate bounds
        const bounds = calculateBounds(rows)
        console.log('Map bounds:', bounds)

        // Get statistics
        const stats = getLayerStats(rows)
        console.log('Layer statistics:', Object.fromEntries(stats))

        // Group entities
        const entities = groupByEntity(rows)
        console.log('Grouped entities:', entities.length)

        // Create JointJS elements with dynamic bounds
        const elements = createElementsFromEntities(entities, bounds)
        console.log('Created elements:', elements.length)

        // Clear existing graph
        graph.clear()

        // Add elements to graph
        graph.addCells(elements)

        // Group elements by layer
        const grouped = new Map<string, dia.Element[]>()
        elements.forEach((element) => {
          const layer = element.get('data')?.layer || 'unknown'
          if (!grouped.has(layer)) {
            grouped.set(layer, [])
          }
          grouped.get(layer)!.push(element)
        })

        // Auto fit to screen with appropriate zoom
        setTimeout(() => {
          if (paper && graph) {
            const elements = graph.getElements()
            if (elements.length === 0) return

            let minX = Infinity,
              minY = Infinity,
              maxX = -Infinity,
              maxY = -Infinity
            let contentElementCount = 0

            elements.forEach((el) => {
              const layer = el.get('data')?.layer || ''

              // Skip background and outline elements
              if (layer === 'e-background' || layer === 'e-outline') {
                return
              }

              const position = el.position()
              const size = el.size()

              minX = Math.min(minX, position.x)
              minY = Math.min(minY, position.y)
              maxX = Math.max(maxX, position.x + size.width)
              maxY = Math.max(maxY, position.y + size.height)
              contentElementCount++
            })

            // If no content elements, fall back to all elements
            if (contentElementCount === 0) {
              elements.forEach((el) => {
                const position = el.position()
                const size = el.size()
                minX = Math.min(minX, position.x)
                minY = Math.min(minY, position.y)
                maxX = Math.max(maxX, position.x + size.width)
                maxY = Math.max(maxY, position.y + size.height)
              })
            }

            const contentWidth = maxX - minX
            const contentHeight = maxY - minY
            console.log('📦 Content BBox (excluding outline):', {
              x: minX,
              y: minY,
              width: contentWidth,
              height: contentHeight,
            })

            // Get viewport size
            const viewport = paper.el.parentElement
            if (!viewport) return

            const viewportWidth = viewport.clientWidth
            const viewportHeight = viewport.clientHeight
            const padding = 50

            // Calculate scale to fit content
            const scaleX = (viewportWidth - padding * 2) / contentWidth
            const scaleY = (viewportHeight - padding * 2) / contentHeight
            const scale = Math.min(scaleX, scaleY, 1.0)

            // Set scale
            paper.scale(scale, scale)

            // Calculate translation to center content
            const centerX = minX + contentWidth / 2
            const centerY = minY + contentHeight / 2

            const tx = viewportWidth / 2 - centerX * scale
            const ty = viewportHeight / 2 - centerY * scale

            paper.translate(tx, ty)

            console.log('🔍 Scale after fit:', scale)
            console.log('🔍 Translate:', { tx, ty })
          }
        }, 100)

        console.log('Map rendering complete!')

        if (onSuccess) {
          onSuccess(elements.length, grouped)
        }
      } catch (error) {
        console.error('Error processing CSV:', error)
        if (onError) {
          onError(error as Error)
        }
      }
    },
    [graph, paper, onSuccess, onError]
  )

  return { processCSVData }
}
