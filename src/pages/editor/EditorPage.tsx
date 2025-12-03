/**
 * EditorPage
 * Main map editor page - refactored with custom hooks and components
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dia } from '@joint/core'
import { useTheme } from '@/shared/context/ThemeContext'
import { useFloorStore } from '@/shared/store/floorStore'
import { FloorTabs } from '@/widgets/editor/FloorTabs'
import { CSVUploader, LayerGroupSelector, useCSVStore } from '@/features/csv'
import { ObjectTypeSidebar } from '@/features/objectType'
import { ResizablePanel } from '@/shared/ui/ResizablePanel'
import '@/shared/lib/testHelpers'

import { useJointJSCanvas } from './hooks/useJointJSCanvas'
import { useCanvasPanning } from './hooks/useCanvasPanning'
import { useCanvasZoom } from './hooks/useCanvasZoom'
import { useUndoRedo } from './hooks/useUndoRedo'
import { useMinimap } from './hooks/useMinimap'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useThemeSync } from './hooks/useThemeSync'
import { useElementSelection } from './hooks/useElementSelection'
import { useLayerRendering } from './hooks/useLayerRendering'
import { useDragAndDropMapping } from './hooks/useDragAndDropMapping'

import { EditorHeader } from './components/EditorHeader'
import { EditorSidebar } from './components/EditorSidebar'

import styles from './EditorPage.module.css'

export default function EditorPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const currentFloor = useFloorStore((state) => state.currentFloor)
  const updateFloor = useFloorStore((state) => state.updateFloor)
  const floors = useFloorStore((state) => state.floors)
  const clearFile = useCSVStore((state) => state.clearFile)
  const csvState = useCSVStore()

  // State
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [elementCount, setElementCount] = useState(0)
  const [objectsByLayer, setObjectsByLayer] = useState<Map<string, dia.Element[]>>(new Map())
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const minimapContainerRef = useRef<HTMLDivElement>(null)
  const viewportRectRef = useRef<HTMLDivElement>(null)
  const previousFloorRef = useRef<string | null>(null)

  // Initialize canvas
  const { graph, paper } = useJointJSCanvas(canvasRef)

  // Element selection
  const { handleElementClick, handleBlankClick } = useElementSelection(
    graph,
    paper,
    selectedElementId,
    setSelectedElementId
  )

  // Canvas features
  useCanvasPanning(paper, graph, canvasRef, handleBlankClick)

  const zoomHandlers = useCanvasZoom(paper, canvasRef, setZoom)

  const { undo, redo } = useUndoRedo(graph, setElementCount)

  useMinimap(paper, graph, minimapContainerRef, viewportRectRef, loadedFileName)

  useThemeSync(paper, theme)

  useKeyboardShortcuts(
    selectedElementId,
    graph,
    undo,
    redo,
    () => setSelectedElementId(null),
    setElementCount
  )

  // Layer rendering - handles selected layer rendering to canvas
  useLayerRendering(graph, setElementCount, setObjectsByLayer, setLoadedFileName)

  // Auto-save current floor data when CSV data changes
  useEffect(() => {
    if (!currentFloor) return

    // Save current floor data whenever CSV state changes
    const floor = floors.find((f) => f.id === currentFloor)
    if (floor) {
      updateFloor(currentFloor, {
        mapData: {
          ...(floor.mapData || {}),
          csvRawData: csvState.rawData || undefined,
          csvFileName: loadedFileName || undefined,
          csvParsedData: csvState.parsedData || undefined,
          csvGroupedLayers: csvState.groupedLayers || undefined,
          csvSelectedLayers: csvState.selectedLayers.size > 0 ? Array.from(csvState.selectedLayers) : undefined,
          metadata: floor.mapData?.metadata || {},
          assets: floor.mapData?.assets || [],
          objects: floor.mapData?.objects || [],
        },
      })
    }
  }, [currentFloor, floors, updateFloor, csvState.rawData, csvState.parsedData, csvState.groupedLayers, csvState.selectedLayers, loadedFileName])

  // Drag and drop mapping
  useDragAndDropMapping(paper, graph)

  // Load floor data when switching floors
  useEffect(() => {
    if (!graph || !currentFloor) return

    const previousFloor = previousFloorRef.current

    // Only process floor changes, not initial mount
    if (previousFloor && previousFloor !== currentFloor) {
      // Clear canvas and state
      graph.clear()
      setElementCount(0)
      setLoadedFileName(null)
      setObjectsByLayer(new Map())
      setSelectedElementId(null)

      // Clear CSV store first
      clearFile()

      // Then restore new floor data if exists
      const newFloor = floors.find((f) => f.id === currentFloor)
      if (newFloor?.mapData?.csvRawData) {
        // Restore CSV data to csvStore
        const mapData = newFloor.mapData
        const rawData = mapData.csvRawData!

        // Create a File object from saved data
        const blob = new Blob([rawData], { type: 'text/csv' })
        const file = new File([blob], mapData.csvFileName || 'restored.csv', { type: 'text/csv' })

        // Restore all CSV store state at once
        setTimeout(() => {
          useCSVStore.setState({
            file,
            rawData: mapData.csvRawData,
            parsedData: mapData.csvParsedData,
            groupedLayers: mapData.csvGroupedLayers,
            selectedLayers: new Set(mapData.csvSelectedLayers || []),
            uploadState: {
              status: 'parsed',
              fileName: mapData.csvFileName || 'restored.csv',
              rowCount: mapData.csvParsedData?.rowCount || 0,
            },
          })

          setLoadedFileName(mapData.csvFileName || null)
        }, 0)
      }
    }

    // Update previous floor ref
    previousFloorRef.current = currentFloor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFloor, graph])

  // Handlers
  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    navigate('/login')
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleClearCanvas = () => {
    if (confirm('Clear all elements from canvas?')) {
      graph?.clear()
      setElementCount(0)
      setLoadedFileName(null)
      setObjectsByLayer(new Map())
      setSelectedElementId(null)
    }
  }

  return (
    <div className={styles.container}>
      <EditorHeader
        loadedFileName={loadedFileName}
        zoom={zoom}
        theme={theme}
        onZoomIn={zoomHandlers.handleZoomIn}
        onZoomOut={zoomHandlers.handleZoomOut}
        onZoomReset={zoomHandlers.handleZoomReset}
        onFitToScreen={zoomHandlers.handleFitToScreen}
        onUploadClick={triggerFileInput}
        onClearCanvas={handleClearCanvas}
        onThemeToggle={toggleTheme}
        onLogout={handleLogout}
        onBackToProjects={() => navigate('/dashboard')}
      />

      <FloorTabs />

      <main className={styles.main}>
        {/* Left Sidebar */}
        <ResizablePanel side="left" defaultWidth={300} minWidth={200} maxWidth={500} defaultCollapsed={true}>
          <LayerGroupSelector />
          <ObjectTypeSidebar />
        </ResizablePanel>

        {/* Canvas Area */}
        <div className={styles.canvasArea}>
          {!loadedFileName && <CSVUploader />}

          {/* JointJS Canvas Container */}
          <div ref={canvasRef} className={styles.canvas} />

          {/* Minimap Container */}
          {loadedFileName && (
            <div className={styles.minimapContainer} ref={minimapContainerRef}>
              <div className={styles.minimapViewport} ref={viewportRectRef} />
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <ResizablePanel side="right" defaultWidth={320} minWidth={250} maxWidth={500} defaultCollapsed={true}>
          <EditorSidebar
            loadedFileName={loadedFileName}
            elementCount={elementCount}
            zoom={zoom}
            objectsByLayer={objectsByLayer}
            selectedElementId={selectedElementId}
            onObjectClick={handleElementClick}
          />
        </ResizablePanel>
      </main>
    </div>
  )
}
