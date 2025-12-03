/**
 * EditorPage
 * Main map editor page - refactored with custom hooks and components
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dia } from '@joint/core'
import { useTheme } from '@/shared/context/ThemeContext'
import { FloorTabs } from '@/widgets/editor/FloorTabs'
import { CSVUploader, LayerGroupSelector, useCSVStore } from '@/features/csv'
import { ObjectTypeSidebar } from '@/features/objectType'
import '@/shared/lib/testHelpers'

import { useJointJSCanvas } from './hooks/useJointJSCanvas'
import { useCanvasPanning } from './hooks/useCanvasPanning'
import { useCanvasZoom } from './hooks/useCanvasZoom'
import { useUndoRedo } from './hooks/useUndoRedo'
import { useMinimap } from './hooks/useMinimap'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useCSVProcessing } from './hooks/useCSVProcessing'
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
  const csvUploadState = useCSVStore((state) => state.uploadState)
  const csvRawData = useCSVStore((state) => state.rawData)

  // State
  const [isLoading, setIsLoading] = useState(false)
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

  const { updateMinimapViewport } = useMinimap(
    paper,
    graph,
    minimapContainerRef,
    viewportRectRef,
    loadedFileName
  )

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

  // Drag and drop mapping
  useDragAndDropMapping(paper, graph)

  // CSV processing
  const { processCSVData } = useCSVProcessing(
    graph,
    paper,
    (count, grouped) => {
      setElementCount(count)
      setObjectsByLayer(grouped)

      // Update minimap after content is loaded
      setTimeout(() => {
        if (paper && graph) {
          updateMinimapViewport()
        }
      }, 200)
    },
    (error) => {
      console.error('CSV processing error:', error)
      alert('Error loading CSV file. Check console for details.')
    }
  )

  // Process CSV when uploaded
  useEffect(() => {
    if (csvUploadState.status === 'parsed' && csvRawData) {
      setIsLoading(true)
      processCSVData(csvRawData, csvUploadState.fileName).finally(() => {
        setIsLoading(false)
        setLoadedFileName(csvUploadState.fileName)
      })
    }
  }, [csvUploadState, csvRawData, processCSVData])

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
      />

      <FloorTabs />

      <main className={styles.main}>
        {/* Left Sidebar */}
        <aside className={styles.leftSidebar}>
          <div className={styles.leftSidebarContent}>
            <LayerGroupSelector />
            <ObjectTypeSidebar />
          </div>
        </aside>

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

          {/* Loading Indicator */}
          {isLoading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingBox}>Loading map data...</div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <EditorSidebar
          loadedFileName={loadedFileName}
          elementCount={elementCount}
          zoom={zoom}
          objectsByLayer={objectsByLayer}
          selectedElementId={selectedElementId}
          onObjectClick={handleElementClick}
        />
      </main>
    </div>
  )
}
