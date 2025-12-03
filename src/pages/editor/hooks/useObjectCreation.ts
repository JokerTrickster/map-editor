import { useState, useEffect, useRef } from 'react'
import { dia, shapes } from '@joint/core'
import { ObjectType } from '@/shared/store/objectTypeStore'

export function useObjectCreation(
    paper: dia.Paper | null,
    graph: dia.Graph | null,
    selectedType: ObjectType | null,
    onCreationComplete: () => void
) {
    const [isDrawing, setIsDrawing] = useState(false)
    const [points, setPoints] = useState<{ x: number; y: number }[]>([])
    const tempElementRef = useRef<dia.Element | null>(null)

    useEffect(() => {
        if (!paper || !graph || !selectedType) return

        const handlePointerDown = (_evt: dia.Event, x: number, y: number) => {
            if (selectedType.icon) {
                // Rectangle Drawing (Drag)
                setIsDrawing(true)
                setPoints([{ x, y }])

                // Create temp element
                const rect = new shapes.standard.Rectangle()
                rect.position(x, y)
                rect.resize(1, 1)
                rect.attr({
                    body: {
                        fill: 'rgba(59, 130, 246, 0.2)',
                        stroke: '#3b82f6',
                        strokeWidth: 2,
                        strokeDasharray: '5,5'
                    }
                })
                rect.addTo(graph)
                tempElementRef.current = rect
            } else {
                // Polygon Drawing (Click points)
                if (!isDrawing) {
                    setIsDrawing(true)
                    setPoints([{ x, y }])

                    // Create temp path/polygon
                    const path = new shapes.standard.Path()
                    const color = selectedType.color || '#3b82f6'
                    path.attr({
                        body: {
                            fill: color,
                            fillOpacity: 0.2,
                            stroke: color,
                            strokeWidth: 2
                        }
                    })
                    path.addTo(graph)
                    tempElementRef.current = path
                } else {
                    setPoints(prev => [...prev, { x, y }])
                }
            }
        }

        const handlePointerMove = (_evt: dia.Event, x: number, y: number) => {
            if (!isDrawing || !tempElementRef.current) return

            if (selectedType.icon) {
                // Update Rectangle
                const start = points[0]
                const width = x - start.x
                const height = y - start.y

                tempElementRef.current.position(
                    width > 0 ? start.x : x,
                    height > 0 ? start.y : y
                )
                tempElementRef.current.resize(Math.abs(width), Math.abs(height))
            } else {
                // Update Polygon Preview (Line to cursor)
                // For simplicity, just redraw path with current points + cursor
                const currentPoints = [...points, { x, y }]
                // Construct SVG path data
                const d = 'M ' + currentPoints.map(p => `${p.x} ${p.y}`).join(' L ')
                tempElementRef.current.attr('body/d', d)
            }
        }

        const handlePointerUp = () => {
            if (!isDrawing || !tempElementRef.current) return

            if (selectedType.icon) {
                // Finish Rectangle
                const finalElement = tempElementRef.current
                const bbox = finalElement.getBBox()

                // Create actual object
                const image = new shapes.standard.Image()
                image.position(bbox.x, bbox.y)
                image.resize(bbox.width, bbox.height)
                image.attr({
                    image: { xlinkHref: selectedType.icon },
                    label: { text: selectedType.name, refY: '100%', refY2: 5 }
                })

                // Add custom properties
                image.prop('customProperties', selectedType.properties)
                image.prop('objectTypeId', selectedType.id)

                graph.addCell(image)

                // Cleanup
                finalElement.remove()
                tempElementRef.current = null
                setIsDrawing(false)
                setPoints([])
                onCreationComplete()
            }
        }

        const handleDoubleClick = () => {
            if (!isDrawing || !tempElementRef.current || selectedType.icon) return

            // Finish Polygon
            const finalElement = tempElementRef.current

            // Create actual polygon
            const polygon = new shapes.standard.Polygon()
            // Convert points to string "x,y x,y"
            const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ')

            const color = selectedType.color || '#3b82f6'

            polygon.attr({
                body: {
                    refPoints: pointsStr,
                    fill: color,
                    fillOpacity: 0.5,
                    stroke: color,
                    strokeWidth: 2
                },
                label: { text: selectedType.name }
            })

            polygon.prop('customProperties', selectedType.properties)
            polygon.prop('objectTypeId', selectedType.id)

            graph.addCell(polygon)

            // Cleanup
            finalElement.remove()
            tempElementRef.current = null
            setIsDrawing(false)
            setPoints([])
            onCreationComplete()
        }

        paper.on('blank:pointerdown', handlePointerDown)
        paper.on('blank:pointermove', handlePointerMove)
        paper.on('blank:pointerup', handlePointerUp)
        paper.on('blank:pointerdblclick', handleDoubleClick)

        return () => {
            paper.off('blank:pointerdown', handlePointerDown)
            paper.off('blank:pointermove', handlePointerMove)
            paper.off('blank:pointerup', handlePointerUp)
            paper.off('blank:pointerdblclick', handleDoubleClick)
        }
    }, [paper, graph, selectedType, isDrawing, points])

    return { isDrawing }
}
