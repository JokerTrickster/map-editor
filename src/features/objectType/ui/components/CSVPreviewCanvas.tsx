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
}

interface Point {
  x: number
  y: number
}

export function CSVPreviewCanvas({ groupedLayers, layerMappings, objectTypes }: CSVPreviewCanvasProps) {
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
      const color = getLayerColor(layer.layer)

      layer.entities.forEach(entity => {
        if (entity.points.length === 0) return

        ctx.strokeStyle = color
        ctx.fillStyle = color
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

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
          ctx.globalAlpha = 0.2
          ctx.fill()
          ctx.globalAlpha = 1
        }

        ctx.stroke()

        // Draw points for visibility
        if (entity.points.length === 1) {
          // Single point - draw circle
          const p = transformedPoints[0]
          ctx.beginPath()
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
          ctx.fill()
        }
      })
    })

    // Draw legend
    const legendX = 10
    let legendY = 10
    const legendLineHeight = 20

    ctx.font = '12px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'

    // Count mapped vs unmapped
    const mappedCount = Object.values(layerMappings).filter(id => id).length
    const totalCount = groupedLayers.length

    // Draw background for legend
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(legendX - 5, legendY - 5, 150, legendLineHeight * (groupedLayers.length + 1) + 10)

    // Draw legend title
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(`Layers (${mappedCount}/${totalCount} mapped)`, legendX, legendY + legendLineHeight / 2)
    legendY += legendLineHeight

    // Draw each layer in legend
    groupedLayers.slice(0, 10).forEach(layer => { // Show max 10 layers
      const color = getLayerColor(layer.layer)
      const typeId = layerMappings[layer.layer]
      const typeName = typeId ? objectTypes.find(t => t.id === typeId)?.name : 'Unmapped'

      // Draw color box
      ctx.fillStyle = color
      ctx.fillRect(legendX, legendY, 12, 12)

      // Draw layer name
      ctx.fillStyle = '#FFFFFF'
      ctx.fillText(`${layer.layer}: ${typeName}`, legendX + 18, legendY + 6)

      legendY += legendLineHeight
    })

    if (groupedLayers.length > 10) {
      ctx.fillStyle = '#AAAAAA'
      ctx.fillText(`... and ${groupedLayers.length - 10} more`, legendX, legendY + 6)
    }

  }, [groupedLayers, layerMappings, objectTypes])

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
