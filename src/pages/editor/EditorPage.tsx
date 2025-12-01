import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dia, shapes } from '@joint/core'
import { parseBanpoCSV, groupByEntity, getLayerStats } from '@/shared/lib/csvParser'
import { createElementsFromEntities } from '@/features/editor/lib/elementFactory'
import styles from './EditorPage.module.css'

export default function EditorPage() {
    const navigate = useNavigate()
    const [isDragging, setIsDragging] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [loadedFileName, setLoadedFileName] = useState<string | null>(null)
    const [zoom, setZoom] = useState(1)
    const [elementCount, setElementCount] = useState(0)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const canvasRef = useRef<HTMLDivElement>(null)
    const graphRef = useRef<dia.Graph | null>(null)
    const paperRef = useRef<dia.Paper | null>(null)

    // Initialize JointJS canvas
    useEffect(() => {
        if (!canvasRef.current) return

        // Create graph
        const graph = new dia.Graph({}, { cellNamespace: shapes })
        graphRef.current = graph

        // Create paper
        const paper = new dia.Paper({
            model: graph,
            width: 5000,
            height: 5000,
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

        // Cleanup
        return () => {
            paper.remove()
            graph.clear()
        }
    }, [])

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

            // Get statistics
            const stats = getLayerStats(rows)
            console.log('Layer statistics:', Object.fromEntries(stats))

            // Group entities
            const entities = groupByEntity(rows)
            console.log('Grouped entities:', entities.length)

            // Create JointJS elements
            const elements = createElementsFromEntities(entities)
            console.log('Created elements:', elements.length)

            // Clear existing graph
            graphRef.current?.clear()

            // Add elements to graph
            graphRef.current?.addCells(elements)
            setElementCount(elements.length)

            // Fit content to view
            setTimeout(() => {
                paperRef.current?.scaleContentToFit({
                    padding: 50,
                    maxScale: 2,
                    minScale: 0.1
                })
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
