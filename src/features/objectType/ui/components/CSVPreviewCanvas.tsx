/**
 * CSV Preview Canvas
 * Renders CSV geometry data as a preview in the mapping modal
 */

import { useEffect, useRef } from 'react'
import type { GroupedLayer } from '@/features/csv/lib/layerGrouper'
import type { ObjectType } from '@/shared/store/objectTypeStore'

interface CSVPreviewCanvasProps {
  groupedLayers: GroupedLayer[]
  layerMappings: Record<string, string>
  objectTypes: ObjectType[]
  selectedLayer: string | null
}

interface Point {
  x: number
  y: number
}

export function CSVPreviewCanvas({ groupedLayers, layerMappings, objectTypes, selectedLayer }: CSVPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calculate bounds of all points
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    groupedLayers.forEach(layer => {
      layer.entities.forEach(entity => {
        entity.points.forEach(point => {
          minX = Math.min(minX, point.x)
          minY = Math.min(minY, point.y)
          maxX = Math.max(maxX, point.x)
          maxY = Math.max(maxY, point.y)
        })
      })
    })

    // Add padding
    const padding = 20
    const dataWidth = maxX - minX
    const dataHeight = maxY - minY

    // Calculate scale to fit canvas
    const scaleX = (canvas.width - padding * 2) / dataWidth
    const scaleY = (canvas.height - padding * 2) / dataHeight
    const scale = Math.min(scaleX, scaleY, 1) // Don't scale up if data is small

    // Calculate offset to center the drawing
    const offsetX = padding + (canvas.width - padding * 2 - dataWidth * scale) / 2
    const offsetY = padding + (canvas.height - padding * 2 - dataHeight * scale) / 2

    // Transform function
    const transform = (point: Point): Point => ({
      x: offsetX + (point.x - minX) * scale,
      y: canvas.height - (offsetY + (point.y - minY) * scale) // Flip Y axis
    })

    // Get color for layer
    const getLayerColor = (layerName: string): string => {
      const typeId = layerMappings[layerName]
      if (!typeId) return '#666666' // Unmapped layers are gray

      const type = objectTypes.find(t => t.id === typeId)
      if (!type) return '#666666'

      // If type has icon color code, use it
      if (type.icon && type.icon.startsWith('#')) {
        return type.icon
      }

      // Otherwise use type color
      return type.color || '#3B82F6'
    }

    // Render each layer
    groupedLayers.forEach(layer => {
      const isSelected = selectedLayer === layer.layer
      const baseColor = getLayerColor(layer.layer)

      // Change color when selected
      const color = isSelected ? '#FFAA00' : baseColor // Bright orange for selected

      layer.entities.forEach(entity => {
        if (entity.points.length === 0) return

        // Dim unselected layers when a layer is selected
        const alpha = selectedLayer && !isSelected ? 0.2 : 1

        ctx.strokeStyle = color
        ctx.fillStyle = color
        ctx.lineWidth = isSelected ? 4 : 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.globalAlpha = alpha

        const transformedPoints = entity.points.map(transform)

        // Check if it's a closed polygon (LWPOLYLINE or closed path)
        const isClosed = entity.entityType === 'LWPOLYLINE' ||
                        (entity.points.length > 2 &&
                         entity.points[0].x === entity.points[entity.points.length - 1].x &&
                         entity.points[0].y === entity.points[entity.points.length - 1].y)

        // Draw path
        ctx.beginPath()
        transformedPoints.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y)
          } else {
            ctx.lineTo(point.x, point.y)
          }
        })

        if (isClosed) {
          ctx.closePath()
          // Fill with semi-transparent color
          const fillAlpha = isSelected ? 0.3 : 0.2
          ctx.globalAlpha = alpha * fillAlpha
          ctx.fill()
          ctx.globalAlpha = alpha
        }

        ctx.stroke()

        // Draw points for visibility
        if (entity.points.length === 1) {
          // Single point - draw circle
          const p = transformedPoints[0]
          ctx.beginPath()
          ctx.arc(p.x, p.y, isSelected ? 5 : 4, 0, Math.PI * 2)
          ctx.fill()
        }
      })
    })

    // Reset alpha
    ctx.globalAlpha = 1

  }, [groupedLayers, layerMappings, objectTypes, selectedLayer])

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={400}
      style={{
        width: '100%',
        height: '100%',
        border: '1px solid var(--local-border)',
        borderRadius: '8px',
        background: '#1a1a1a'
      }}
    />
  )
}
