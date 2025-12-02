import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dia, shapes } from '@joint/core'
import { parseBanpoCSV, groupByEntity, getLayerStats } from '@/shared/lib/csvParser'
import { createElementsFromEntities } from '@/features/editor/lib/elementFactory'
import { useTheme } from '@/shared/context/ThemeContext'
import { FloorTabs } from '@/widgets/editor/FloorTabs'
import '@/shared/lib/testHelpers' // Initialize test helpers for development
import styles from './EditorPage.module.css'

export default function EditorPage() {
    const navigate = useNavigate()
    const { theme, toggleTheme } = useTheme()
    const [isDragging, setIsDragging] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [loadedFileName, setLoadedFileName] = useState<string | null>(null)
    const [zoom, setZoom] = useState(1)
    const [elementCount, setElementCount] = useState(0)
    const [objectsByLayer, setObjectsByLayer] = useState<Map<string, dia.Element[]>>(new Map())
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const canvasRef = useRef<HTMLDivElement>(null)
    const graphRef = useRef<dia.Graph | null>(null)
    const paperRef = useRef<dia.Paper | null>(null)

    // Manual undo/redo history
    const historyStack = useRef<string[]>([]) // Graph JSON states
    const historyIndex = useRef<number>(-1)

    // Panning state refs
    const isPanning = useRef(false)
    const lastMousePosition = useRef({ x: 0, y: 0 })

    // Minimap Refs
    const minimapContainerRef = useRef<HTMLDivElement>(null)
    const minimapPaperRef = useRef<dia.Paper | null>(null)
    const viewportRectRef = useRef<HTMLDivElement>(null)
    const minimapBaseScaleRef = useRef<number | null>(null)
    const minimapBaseTranslateRef = useRef<{ tx: number; ty: number } | null>(null)

    // Sync Minimap Viewport
    const updateMinimapViewport = () => {
        if (!paperRef.current || !minimapPaperRef.current || !viewportRectRef.current || !graphRef.current) return

        const mainScale = paperRef.current.scale()
        const mainTranslate = paperRef.current.translate()
        const viewportEl = paperRef.current.el.parentElement
        if (!viewportEl) return

        const viewportWidth = viewportEl.clientWidth
        const viewportHeight = viewportEl.clientHeight

        // 1. Calculate Content Center and Extent
        const contentBBox = graphRef.current.getBBox() || { x: 0, y: 0, width: 1000, height: 1000 }
        const contentCenterX = contentBBox.x + contentBBox.width / 2
        const contentCenterY = contentBBox.y + contentBBox.height / 2

        // 2. Calculate Visible Viewport in Graph Coordinates
        const visibleRect = {
            x: -mainTranslate.tx / mainScale.sx,
            y: -mainTranslate.ty / mainScale.sy,
            width: viewportWidth / mainScale.sx,
            height: viewportHeight / mainScale.sy
        }

        // 3. Calculate Max Distance from Center (Center-Anchored Expansion)
        // We want the minimap to stay centered on contentCenterX/Y.
        // We expand the view only enough to include the furthest point of interest (content or viewport).

        // Points of interest: Content corners and Viewport corners
        const points = [
            { x: contentBBox.x, y: contentBBox.y },
            { x: contentBBox.x + contentBBox.width, y: contentBBox.y + contentBBox.height },
            { x: visibleRect.x, y: visibleRect.y },
            { x: visibleRect.x + visibleRect.width, y: visibleRect.y + visibleRect.height }
        ]

        let maxDistX = 0
        let maxDistY = 0

        points.forEach(p => {
            const dx = Math.abs(p.x - contentCenterX)
            const dy = Math.abs(p.y - contentCenterY)
            maxDistX = Math.max(maxDistX, dx)
            maxDistY = Math.max(maxDistY, dy)
        })

        // The required viewing area is a rectangle centered on contentCenter
        // with width = 2 * maxDistX and height = 2 * maxDistY
        const requiredWidth = maxDistX * 2
        const requiredHeight = maxDistY * 2

        // 4. Scale Minimap to Fit Required Area
        const minimapContainer = minimapContainerRef.current
        if (!minimapContainer) return

        const containerWidth = minimapContainer.clientWidth
        const containerHeight = minimapContainer.clientHeight
        const padding = 10

        const safeWidth = Math.max(requiredWidth, 1)
        const safeHeight = Math.max(requiredHeight, 1)

        const scaleX = (containerWidth - 2 * padding) / safeWidth
        const scaleY = (containerHeight - 2 * padding) / safeHeight
        const scale = Math.min(scaleX, scaleY)

        // Calculate translation to center the contentCenter in the container
        // tx = (containerCenter) - (contentCenter * scale)
        const tx = (containerWidth / 2) - (contentCenterX * scale)
        const ty = (containerHeight / 2) - (contentCenterY * scale)

        // Apply transform to minimap paper
        minimapPaperRef.current.scale(scale, scale)
        minimapPaperRef.current.translate(tx, ty)

        // 5. Update Viewport Indicator
        const viewportRect = {
            x: visibleRect.x * scale + tx,
            y: visibleRect.y * scale + ty,
            width: visibleRect.width * scale,
            height: visibleRect.height * scale
        }

        const viewport = viewportRectRef.current

        // Visual adjustment: Reduce the indicator size by 50% as requested
        const visualScale = 0.5
        const visualWidth = viewportRect.width * visualScale
        const visualHeight = viewportRect.height * visualScale
        const visualX = viewportRect.x + (viewportRect.width - visualWidth) / 2
        const visualY = viewportRect.y + (viewportRect.height - visualHeight) / 2

        viewport.style.left = `${visualX}px`
        viewport.style.top = `${visualY}px`
        viewport.style.width = `${visualWidth}px`
        viewport.style.height = `${visualHeight}px`
        // Ensure clicks pass through to the paper below
        viewport.style.pointerEvents = 'none'
    }

    // Initialize JointJS canvas (Run once)
    useEffect(() => {
        if (!canvasRef.current) return

        // Create graph
        const graph = new dia.Graph({}, { cellNamespace: shapes })
        graphRef.current = graph

        // Create paper with default theme (will be updated by theme effect)
        // Use large paper size to accommodate CAD coordinates
        const paper = new dia.Paper({
            model: graph,
            width: 100000,
            height: 100000,
            gridSize: 10,
            drawGrid: { name: 'dot', args: { color: '#2d3139', thickness: 1 } },
            background: { color: '#13151a' },
            cellViewNamespace: shapes,
            interactive: false, // Disable interaction by default
            async: true,
            sorting: dia.Paper.sorting.APPROX,
        })
        paperRef.current = paper

        // Append paper to container
        canvasRef.current.appendChild(paper.el)

        // Save graph state to history
        const saveState = () => {
            if (!graphRef.current) return
            const state = JSON.stringify(graphRef.current.toJSON())

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
        }

        // Track changes for undo/redo
        graph.on('change', saveState)

        // Attach listeners for minimap sync
        paper.on('translate resize scale', () => {
            updateMinimapViewport()
        })

        // Element selection handler
        paper.on('element:pointerclick', (elementView: dia.ElementView) => {
            const elementId = elementView.model.id as string
            setSelectedElementId(elementId)

            // Highlight selected element
            graph.getCells().forEach(cell => {
                if (cell.isElement()) {
                    const view = paper.findViewByModel(cell)
                    if (cell.id === elementId) {
                        // Highlight selected
                        view?.highlight()
                    } else {
                        // Unhighlight others
                        view?.unhighlight()
                    }
                }
            })
        })

        // Panning Handlers
        paper.on('blank:pointerdown', (evt: dia.Event) => {
            // Deselect any selected element when clicking on blank area
            setSelectedElementId(null)

            // Unhighlight all elements
            graph.getCells().forEach(cell => {
                if (cell.isElement()) {
                    const view = paper.findViewByModel(cell)
                    view?.unhighlight()
                }
            })

            isPanning.current = true
            lastMousePosition.current = { x: evt.clientX || 0, y: evt.clientY || 0 }
            if (canvasRef.current) {
                canvasRef.current.style.cursor = 'grabbing'
            }
        })

        const handleMouseMove = (e: MouseEvent) => {
            if (!isPanning.current || !paper) return

            const dx = e.clientX - lastMousePosition.current.x
            const dy = e.clientY - lastMousePosition.current.y

            const currentTranslate = paper.translate()
            const currentScale = paper.scale()
            let newTx = currentTranslate.tx + dx
            let newTy = currentTranslate.ty + dy

            // Restrict Panning Area
            // Calculate content bounding box
            const contentBBox = graphRef.current?.getBBox() || { x: 0, y: 0, width: 1000, height: 1000 }
            const viewportWidth = paper.el.parentElement?.clientWidth || 800
            const viewportHeight = paper.el.parentElement?.clientHeight || 600

            // Define padding (how far user can pan away from content)
            const PAN_PADDING = 2000 // px

            // Calculate allowed translation bounds
            // The logic is: we don't want the viewport to completely lose sight of the content + padding
            // So, the viewport's visible area (in graph coords) must overlap with (content + padding)



            // Calculate min/max translation values
            // These formulas ensure that we can't pan the content completely off-screen

            // Max Tx: Panning right (content moves right). Limit is when left edge of content is at right edge of viewport + padding
            // Min Tx: Panning left (content moves left). Limit is when right edge of content is at left edge of viewport - padding

            const minTx = - (contentBBox.x + contentBBox.width + PAN_PADDING) * currentScale.sx + viewportWidth
            const maxTx = - (contentBBox.x - PAN_PADDING) * currentScale.sx

            const minTy = - (contentBBox.y + contentBBox.height + PAN_PADDING) * currentScale.sy + viewportHeight
            const maxTy = - (contentBBox.y - PAN_PADDING) * currentScale.sy

            // Clamp values
            newTx = Math.min(Math.max(newTx, minTx), maxTx)
            newTy = Math.min(Math.max(newTy, minTy), maxTy)

            paper.translate(newTx, newTy)

            lastMousePosition.current = { x: e.clientX, y: e.clientY }
        }

        const handleMouseUp = () => {
            isPanning.current = false
            if (canvasRef.current) {
                canvasRef.current.style.cursor = 'default'
            }
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)

        // Cleanup
        return () => {
            paper.remove()
            graph.clear()
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [])

    // Update Paper Theme when theme changes
    useEffect(() => {
        if (!paperRef.current) return

        // Use setTimeout to ensure the DOM has been updated by ThemeProvider
        setTimeout(() => {
            const style = getComputedStyle(document.documentElement)
            const gridColor = style.getPropertyValue('--color-canvas-grid').trim()
            const bgColor = style.getPropertyValue('--color-canvas-bg').trim()

            const paper = paperRef.current as any
            if (paper.setGrid) {
                paper.setGrid({ name: 'dot', args: { color: gridColor, thickness: 1 } })
            }
            if (paper.drawBackground) {
                paper.drawBackground({ color: bgColor })
            }
        }, 0)
    }, [theme])

    // Initialize Minimap
    useEffect(() => {
        // Only initialize if container exists and graph exists
        if (!minimapContainerRef.current || !graphRef.current) return

        // Prevent double initialization
        if (minimapPaperRef.current) return

        const minimapGraph = graphRef.current // Share the same graph

        const minimapPaper = new dia.Paper({
            model: minimapGraph,
            width: 200,
            height: 150,
            gridSize: 10,
            interactive: false, // Minimap is not interactive for editing
            background: { color: 'rgba(0,0,0,0)' } // Transparent background
        })

        minimapPaperRef.current = minimapPaper
        minimapContainerRef.current.appendChild(minimapPaper.el)

        // Initial fit
        minimapPaper.scaleContentToFit({ padding: 10 })
        minimapBaseScaleRef.current = minimapPaper.scale().sx
        minimapBaseTranslateRef.current = minimapPaper.translate()

        // Minimap interaction
        // Minimap interaction handler
        const centerOnPoint = (x: number, y: number) => {
            if (!paperRef.current) return

            // x, y are already in graph coordinates from the event
            const mainPaper = paperRef.current
            const mainScale = mainPaper.scale()
            const viewport = mainPaper.el.parentElement

            if (viewport) {
                const viewportWidth = viewport.clientWidth
                const viewportHeight = viewport.clientHeight

                const newTx = viewportWidth / 2 - x * mainScale.sx
                const newTy = viewportHeight / 2 - y * mainScale.sy

                mainPaper.translate(newTx, newTy)
            }
        }

        minimapPaper.on('blank:pointerdown', (_evt: dia.Event, x: number, y: number) => {
            centerOnPoint(x, y)
        })

        minimapPaper.on('cell:pointerdown', (_cellView: dia.CellView, _evt: dia.Event, x: number, y: number) => {
            centerOnPoint(x, y)
        })

        // Force update viewport
        updateMinimapViewport()

        return () => {
            minimapPaper.remove()
            minimapPaperRef.current = null
            minimapBaseScaleRef.current = null
            minimapBaseTranslateRef.current = null
        }
    }, [loadedFileName]) // Re-run when file is loaded (and container is rendered)

    // Update minimap content when elements change
    useEffect(() => {
        if (minimapPaperRef.current && elementCount > 0) {
            minimapPaperRef.current.scaleContentToFit({ padding: 10 })
            minimapBaseScaleRef.current = minimapPaperRef.current.scale().sx
            minimapBaseTranslateRef.current = minimapPaperRef.current.translate()
            updateMinimapViewport()
        }
    }, [elementCount])

    // Update element interactivity based on selection
    useEffect(() => {
        if (!graphRef.current || !paperRef.current) return

        const graph = graphRef.current
        const paper = paperRef.current

        // Update interactivity for all elements
        graph.getCells().forEach(cell => {
            if (cell.isElement()) {
                const cellView = paper.findViewByModel(cell)
                if (cellView) {
                    const cellId = cell.id as string
                    // Enable interaction only for selected element
                    if (cellId === selectedElementId) {
                        cellView.setInteractivity(true)
                    } else {
                        cellView.setInteractivity(false)
                    }
                }
            }
        })
    }, [selectedElementId])


    const handleLogout = () => {
        localStorage.removeItem('accessToken')
        navigate('/login')
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const files = Array.from(e.dataTransfer.files)
        handleFiles(files)
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files)
            handleFiles(files)
        }
    }

    const handleFiles = async (files: File[]) => {
        if (files.length === 0) return

        const file = files[0]

        // Check if CSV file
        if (!file.name.endsWith('.csv')) {
            alert('Please upload a CSV file')
            return
        }

        setIsLoading(true)
        setLoadedFileName(file.name)

        try {
            // Read CSV file
            const csvText = await file.text()
            console.log('CSV file loaded:', file.name)

            // Parse CSV
            const rows = parseBanpoCSV(csvText)
            console.log('Parsed rows:', rows.length)

            // Calculate bounds
            const { calculateBounds } = await import('@/shared/lib/csvParser')
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
            graphRef.current?.clear()

            // Add elements to graph
            graphRef.current?.addCells(elements)
            setElementCount(elements.length)

            // Group elements by layer
            const grouped = new Map<string, dia.Element[]>()
            elements.forEach(element => {
                const layer = element.get('data')?.layer || 'unknown'
                if (!grouped.has(layer)) {
                    grouped.set(layer, [])
                }
                grouped.get(layer)!.push(element)
            })
            setObjectsByLayer(grouped)

            // Auto fit to screen with appropriate zoom
            setTimeout(() => {
                if (paperRef.current && graphRef.current) {
                    // Calculate actual bounding box from all elements, excluding background/outline
                    const elements = graphRef.current.getElements()
                    if (elements.length === 0) return

                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                    let contentElementCount = 0

                    elements.forEach(el => {
                        const layer = el.get('data')?.layer || ''

                        // Skip background and outline elements - they span the entire map
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
                        elements.forEach(el => {
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
                    console.log('📦 Content BBox (excluding outline):', { x: minX, y: minY, width: contentWidth, height: contentHeight })

                    // Get viewport size
                    const viewport = paperRef.current.el.parentElement
                    if (!viewport) return

                    const viewportWidth = viewport.clientWidth
                    const viewportHeight = viewport.clientHeight
                    const padding = 50

                    // Calculate scale to fit content
                    const scaleX = (viewportWidth - padding * 2) / contentWidth
                    const scaleY = (viewportHeight - padding * 2) / contentHeight
                    const scale = Math.min(scaleX, scaleY, 1.0) // Don't zoom in more than 1.0 initially

                    // Set scale
                    paperRef.current.scale(scale, scale)

                    // Calculate translation to center content
                    const centerX = minX + contentWidth / 2
                    const centerY = minY + contentHeight / 2

                    // New translation: center of viewport - (center of content * scale)
                    const tx = viewportWidth / 2 - centerX * scale
                    const ty = viewportHeight / 2 - centerY * scale

                    paperRef.current.translate(tx, ty)

                    console.log('🔍 Scale after fit:', scale)
                    console.log('🔍 Translate:', { tx, ty })
                    setZoom(scale)

                    // Update minimap
                    if (minimapPaperRef.current) {
                        minimapPaperRef.current.scaleContentToFit({ padding: 10 })
                        minimapBaseScaleRef.current = minimapPaperRef.current.scale().sx
                        minimapBaseTranslateRef.current = minimapPaperRef.current.translate()
                        updateMinimapViewport()
                    }
                }
            }, 100)

            console.log('Map rendering complete!')
        } catch (error) {
            console.error('Error processing CSV:', error)
            alert('Error loading CSV file. Check console for details.')
        } finally {
            setIsLoading(false)
        }
    }

    const triggerFileInput = () => {
        fileInputRef.current?.click()
    }

    const handleZoomIn = () => {
        if (paperRef.current) {
            const currentScale = paperRef.current.scale()
            const nextScale = Math.min(currentScale.sx * 1.2, 5) // Max zoom 5x

            // Zoom to center of viewport
            const viewportWidth = paperRef.current.el.parentElement?.clientWidth || 800
            const viewportHeight = paperRef.current.el.parentElement?.clientHeight || 600

            const ox = viewportWidth / 2
            const oy = viewportHeight / 2

            zoomToPoint(nextScale, ox, oy)
        }
    }

    const handleZoomOut = () => {
        if (paperRef.current) {
            const currentScale = paperRef.current.scale()
            const nextScale = Math.max(currentScale.sx / 1.2, 0.1) // Min zoom 0.1x

            // Zoom to center of viewport
            const viewportWidth = paperRef.current.el.parentElement?.clientWidth || 800
            const viewportHeight = paperRef.current.el.parentElement?.clientHeight || 600

            const ox = viewportWidth / 2
            const oy = viewportHeight / 2

            zoomToPoint(nextScale, ox, oy)
        }
    }

    const zoomToPoint = (nextScale: number, x: number, y: number) => {
        if (!paperRef.current) return

        const currentScale = paperRef.current.scale().sx
        const currentTranslate = paperRef.current.translate()

        // Calculate new translation to keep the point (x, y) fixed
        // Formula: newTx = x - (x - oldTx) * (newScale / oldScale)
        const newTx = x - (x - currentTranslate.tx) * (nextScale / currentScale)
        const newTy = y - (y - currentTranslate.ty) * (nextScale / currentScale)

        paperRef.current.scale(nextScale, nextScale)
        paperRef.current.translate(newTx, newTy)
        setZoom(nextScale)
    }

    // Wheel Zoom Handler
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault()

                if (!paperRef.current) return

                const currentScale = paperRef.current.scale().sx
                const delta = e.deltaY > 0 ? 0.9 : 1.1 // Zoom out or in

                let nextScale = currentScale * delta
                nextScale = Math.max(0.1, Math.min(nextScale, 5)) // Clamp zoom

                // Get mouse position relative to viewport
                const rect = paperRef.current.el.parentElement?.getBoundingClientRect()
                if (!rect) return

                const ox = e.clientX - rect.left
                const oy = e.clientY - rect.top

                zoomToPoint(nextScale, ox, oy)
            }
        }

        const canvasEl = canvasRef.current
        if (canvasEl) {
            canvasEl.addEventListener('wheel', handleWheel, { passive: false })
        }

        return () => {
            if (canvasEl) {
                canvasEl.removeEventListener('wheel', handleWheel)
            }
        }
    }, [])

    // Undo function
    const undo = () => {
        if (historyIndex.current > 0 && graphRef.current) {
            historyIndex.current--
            const state = historyStack.current[historyIndex.current]
            graphRef.current.off('change') // Temporarily disable change tracking
            graphRef.current.fromJSON(JSON.parse(state))
            graphRef.current.on('change', () => { }) // Re-enable (will be properly set on mount)
            setElementCount(graphRef.current.getElements().length)
            console.log('🔙 Undo')
        }
    }

    // Redo function
    const redo = () => {
        if (historyIndex.current < historyStack.current.length - 1 && graphRef.current) {
            historyIndex.current++
            const state = historyStack.current[historyIndex.current]
            graphRef.current.off('change') // Temporarily disable change tracking
            graphRef.current.fromJSON(JSON.parse(state))
            graphRef.current.on('change', () => { }) // Re-enable
            setElementCount(graphRef.current.getElements().length)
            console.log('🔜 Redo')
        }
    }

    // Keyboard Shortcuts (Undo/Redo/Delete)
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
                if (graphRef.current) {
                    const element = graphRef.current.getCell(selectedElementId)
                    if (element) {
                        element.remove()
                        setSelectedElementId(null)
                        setElementCount(graphRef.current.getElements().length)
                        console.log('🗑️ Deleted element:', selectedElementId)
                    }
                }
            }
        }

        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [selectedElementId])

    const handleZoomReset = () => {
        if (paperRef.current) {
            paperRef.current.scale(1, 1)
            setZoom(1)
        }
    }

    const handleFitToScreen = () => {
        paperRef.current?.scaleContentToFit({
            padding: 50,
            maxScale: 2,
            minScale: 0.1
        })
    }

    const handleClearCanvas = () => {
        if (confirm('Clear all elements from canvas?')) {
            graphRef.current?.clear()
            setElementCount(0)
            setLoadedFileName(null)
            setObjectsByLayer(new Map())
            setSelectedElementId(null)
        }
    }

    const handleObjectClick = (elementId: string) => {
        if (!graphRef.current || !paperRef.current) return

        setSelectedElementId(elementId)

        // Find and highlight the element
        const element = graphRef.current.getCell(elementId)
        if (element && element.isElement()) {
            // Unhighlight all
            graphRef.current.getCells().forEach(cell => {
                if (cell.isElement()) {
                    const view = paperRef.current!.findViewByModel(cell)
                    view?.unhighlight()
                }
            })

            // Highlight selected
            const view = paperRef.current.findViewByModel(element)
            view?.highlight()

            // Center on element
            const bbox = element.getBBox()
            const currentScale = paperRef.current.scale()
            const translate = paperRef.current.translate()

            console.log('🎯 Element bbox:', { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height })
            console.log('🎯 Current scale:', currentScale)
            console.log('🎯 Current translate:', translate)

            // Get viewport size (not paper size)
            const viewportWidth = paperRef.current.el.parentElement?.clientWidth || 800
            const viewportHeight = paperRef.current.el.parentElement?.clientHeight || 600
            console.log('🎯 Viewport size:', { width: viewportWidth, height: viewportHeight })
            console.log('🎯 Paper el size:', { width: paperRef.current.el.clientWidth, height: paperRef.current.el.clientHeight })

            // Calculate center position using viewport size
            const centerX = -bbox.x * currentScale.sx + (viewportWidth / 2) - (bbox.width * currentScale.sx / 2)
            const centerY = -bbox.y * currentScale.sy + (viewportHeight / 2) - (bbox.height * currentScale.sy / 2)

            console.log('🎯 Calculated center:', { centerX, centerY })

            paperRef.current.translate(centerX, centerY)
        }
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.logo}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z" />
                    </svg>
                    Map Editor
                    {loadedFileName && (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                            ({loadedFileName})
                        </span>
                    )}
                </div>

                <div className={styles.toolbar}>
                    {/* Zoom Controls */}
                    <div className={styles.zoomControls}>
                        <button onClick={handleZoomOut} className={styles.toolButton} title="Zoom Out">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                        <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
                        <button onClick={handleZoomIn} className={styles.toolButton} title="Zoom In">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                        <button onClick={handleZoomReset} className={styles.toolButton} title="Reset Zoom">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                            </svg>
                        </button>
                        <button onClick={handleFitToScreen} className={styles.toolButton} title="Fit to Screen">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                            </svg>
                        </button>
                    </div>

                    <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)', margin: '0 8px' }} />

                    <button onClick={triggerFileInput} className={styles.toolButton} title="Upload CSV">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Upload CSV
                    </button>

                    <button onClick={handleClearCanvas} className={styles.toolButton} title="Clear Canvas">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Clear
                    </button>

                    <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)', margin: '0 8px' }} />

                    <button className={`${styles.toolButton} ${styles.primaryButton}`}>
                        Export
                    </button>

                    <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)', margin: '0 8px' }} />

                    {/* Theme Toggle */}
                    <button onClick={toggleTheme} className={styles.toolButton} title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}>
                        {theme === 'light' ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={handleLogout}
                        className={styles.toolButton}
                        title="Logout"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Floor Tabs */}
            <FloorTabs />

            {/* Main Content */}
            <main className={styles.main}>
                {/* Left Sidebar - Tools */}
                <aside className={styles.leftSidebar}>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', padding: '8px', textAlign: 'center' }}>
                        {elementCount > 0 ? `${elementCount} elements` : 'No data'}
                    </div>
                </aside>

                {/* Canvas Area */}
                <div
                    className={styles.canvasArea}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {!loadedFileName ? (
                        <div
                            className={styles.uploadZone}
                            style={isDragging ? { borderColor: 'var(--color-primary)', backgroundColor: 'rgba(59, 130, 246, 0.1)' } : {}}
                        >
                            <div className={styles.uploadIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            </div>
                            <h2 className={styles.uploadTitle}>Upload CSV File</h2>
                            <p className={styles.uploadDesc}>Drag & drop your banpo.csv file here, or click to browse</p>
                            <button onClick={triggerFileInput} className={styles.uploadButton} disabled={isLoading}>
                                {isLoading ? 'Loading...' : 'Choose File'}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileInput}
                                accept=".csv"
                                style={{ display: 'none' }}
                            />
                        </div>
                    ) : null}

                    {/* JointJS Canvas Container */}
                    <div
                        ref={canvasRef}
                        style={{
                            width: '100%',
                            height: '100%',
                            position: 'absolute',
                            top: 0,
                            left: 0
                        }}
                    />

                    {/* Minimap Container */}
                    {loadedFileName && (
                        <div className={styles.minimapContainer} ref={minimapContainerRef}>
                            <div className={styles.minimapViewport} ref={viewportRectRef} />
                        </div>
                    )}

                    {isLoading && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'rgba(0, 0, 0, 0.8)',
                            padding: '20px 40px',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '16px',
                            zIndex: 1000
                        }}>
                            Loading map data...
                        </div>
                    )}
                </div>

                {/* Right Sidebar - Properties */}
                <aside className={styles.rightSidebar}>
                    <div className={styles.sidebarHeader}>Map Info</div>
                    <div className={styles.sidebarContent}>
                        {loadedFileName ? (
                            <>
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                                        File
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--color-text)' }}>
                                        {loadedFileName}
                                    </div>
                                </div>
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                                        Elements
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--color-text)' }}>
                                        {elementCount}
                                    </div>
                                </div>
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                                        Zoom
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--color-text)' }}>
                                        {Math.round(zoom * 100)}%
                                    </div>
                                </div>

                                {/* Object List by Layer */}
                                <div style={{ marginTop: '20px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginBottom: '8px', fontWeight: 600 }}>
                                        Objects
                                    </div>
                                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        {Array.from(objectsByLayer.entries()).map(([layer, elements]) => (
                                            <details key={layer} open style={{ marginBottom: '8px' }}>
                                                <summary style={{
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    color: 'var(--color-text)',
                                                    cursor: 'pointer',
                                                    padding: '4px 0',
                                                    userSelect: 'none'
                                                }}>
                                                    {layer} ({elements.length})
                                                </summary>
                                                <div style={{ paddingLeft: '12px', marginTop: '4px' }}>
                                                    {elements.map(element => {
                                                        const elementId = element.id as string
                                                        const data = element.get('data')
                                                        const text = data?.text || data?.entityHandle || elementId.slice(0, 8)
                                                        const isSelected = selectedElementId === elementId

                                                        return (
                                                            <div
                                                                key={elementId}
                                                                onClick={() => handleObjectClick(elementId)}
                                                                style={{
                                                                    fontSize: '11px',
                                                                    padding: '3px 6px',
                                                                    marginBottom: '2px',
                                                                    cursor: 'pointer',
                                                                    borderRadius: '3px',
                                                                    backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                                                                    color: isSelected ? '#ffffff' : 'var(--color-text-secondary)',
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    if (!isSelected) {
                                                                        e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'
                                                                    }
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    if (!isSelected) {
                                                                        e.currentTarget.style.backgroundColor = 'transparent'
                                                                    }
                                                                }}
                                                            >
                                                                {text}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </details>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                Upload a CSV file to view the map
                            </p>
                        )}
                    </div>
                </aside>
            </main>
        </div>
    )
}
