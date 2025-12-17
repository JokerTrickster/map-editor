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
                // Create image object directly at click position
                const defaultSize = 30 // Default icon size
                const image = new shapes.standard.Image()
                image.position(x - defaultSize / 2, y - defaultSize / 2) // Center on click point
                image.resize(defaultSize, defaultSize)
                image.attr({
                    image: {
                        xlinkHref: selectedType.icon,
                        opacity: 0.9
                    },
                    label: {
                        text: '', // No auto-naming
                        fill: '#ffffff',
                        fontSize: 10,
                        refY: defaultSize + 5,
                        refX: '50%',
                        textAnchor: 'middle'
                    }
                })

                // Set data structure similar to CSV-imported objects
                image.set('data', {
                    typeId: selectedType.id,
                    type: selectedType.name,
                    layer: selectedType.name,
                    properties: {
                        name: '' // Empty name by default
                    }
                })

                // Keep backward compatibility
                image.prop('objectTypeId', selectedType.id)

                graph.addCell(image)
                console.log(`✅ Created image object: ${selectedType.name} at (${x}, ${y})`)

                // Notify completion
                onCreationComplete()
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
            if (!isDrawing || !tempElementRef.current || selectedType.icon) return

            // Update Polygon Preview (Line to cursor)
            // For simplicity, just redraw path with current points + cursor
            const currentPoints = [...points, { x, y }]
            // Construct SVG path data
            const d = 'M ' + currentPoints.map(p => `${p.x} ${p.y}`).join(' L ')
            tempElementRef.current.attr('body/d', d)
        }

        const handlePointerUp = () => {
            // Icon objects are created directly on click, no drag needed
            // This handler is only for polygon drawing (no icon)
            return
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
                    fillOpacity: 0.8,
                    stroke: color,
                    strokeWidth: 2,
                    opacity: 0.8
                },
                label: {
                    text: '', // No auto-naming
                    fill: '#ffffff',
                    fontSize: 12,
                    refY: '50%',
                    refX: '50%',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle'
                }
            })

            // Set data structure similar to CSV-imported objects
            polygon.set('data', {
                typeId: selectedType.id,
                type: selectedType.name,
                layer: selectedType.name,
                properties: {
                    name: '' // Empty name by default
                }
            })

            // Keep backward compatibility
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
