import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dia, shapes } from '@joint/core'
import { parseBanpoCSV, groupByEntity, getLayerStats } from '@/shared/lib/csvParser'
import { createElementsFromEntities } from '@/features/editor/lib/elementFactory'
import { useTheme } from '@/shared/context/ThemeContext'
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

    // Panning state refs
    const isPanning = useRef(false)
    const lastMousePosition = useRef({ x: 0, y: 0 })

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
            interactive: true,
            async: true,
            sorting: dia.Paper.sorting.APPROX,
        })
        paperRef.current = paper

        // Append paper to container
        canvasRef.current.appendChild(paper.el)

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
            paper.translate(currentTranslate.tx + dx, currentTranslate.ty + dy)

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

                    // Set initial scale to 100% (1.0)
                    const scale = 1.0

                    // Set scale
                    paperRef.current.scale(scale, scale)

                    // Calculate translation to center content
                    const centerX = minX + contentWidth / 2
                    const centerY = minY + contentHeight / 2
                    const tx = viewportWidth / 2 - centerX * scale
                    const ty = viewportHeight / 2 - centerY * scale

                    paperRef.current.translate(tx, ty)

                    console.log('🔍 Scale after fit:', scale)
                    console.log('🔍 Translate:', { tx, ty })
                    setZoom(scale)
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
            const newScale = Math.min(currentScale.sx * 1.2, 3)
            paperRef.current.scale(newScale, newScale)
            setZoom(newScale)
        }
    }

    const handleZoomOut = () => {
        if (paperRef.current) {
            const currentScale = paperRef.current.scale()
            const newScale = Math.max(currentScale.sx / 1.2, 0.1)
            paperRef.current.scale(newScale, newScale)
            setZoom(newScale)
        }
    }

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
