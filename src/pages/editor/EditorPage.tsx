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
  const [pendingGraphJson, setPendingGraphJson] = useState<any | null>(null)

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
  useLayerRendering(
    graph,
    setElementCount,
    setObjectsByLayer,
    setLoadedFileName,
    pendingGraphJson,
    setPendingGraphJson
  )

  // Auto-save current floor data when CSV data changes OR when graph changes (we need to hook into graph changes ideally, but for now we hook into CSV state + periodic/manual save?)
  // Actually, hooking into graph changes is expensive. 
  // For now, we save whenever CSV state changes, which covers initial load.
  // But for manual edits, we might need a separate save mechanism or just save on unmount/switch.
  // The current effect only triggers on CSV state changes.
  // Let's add a save on floor switch (in the cleanup or before switch).
  // But we can't easily block the switch.
  // We can update the effect to also run when we want to save.

  // Better approach: Update the existing effect to save graphJson.
  // Note: This effect only runs when CSV state changes. If user moves an object, this effect DOES NOT RUN.
  // So manual edits are still at risk if we don't save them.
  // However, the prompt asks to fix "independent management". 
  // Saving graphJson here ensures that AT LEAST the CSV-generated graph is saved as graphJson.
  // If we want to save manual edits, we should probably add a listener to the graph, or save on floor switch.

  useEffect(() => {
    if (!currentFloor) return

    // Only save if there's actual CSV data OR graph data
    // We should allow saving even if only graph exists (e.g. drawn manually)
    // But the current logic is tied to CSV.
    if (!csvState.rawData && (!graph || graph.getCells().length === 0)) return

    // Don't save during floor switch (wait for floor change effect to complete)
    if (previousFloorRef.current && previousFloorRef.current !== currentFloor) {
      return
    }

    // Save current floor data
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
          graphJson: graph?.toJSON() || undefined, // Save graph state
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csvState.rawData, csvState.parsedData, csvState.groupedLayers, csvState.selectedLayers, loadedFileName])

  // Drag and drop mapping
  useDragAndDropMapping(paper, graph)

  // Load floor data when switching floors
  useEffect(() => {
    if (!graph || !currentFloor) return

    const previousFloor = previousFloorRef.current

    // Only process floor changes, not initial mount
    if (previousFloor && previousFloor !== currentFloor) {
      // Save previous floor state before switching?
      // The auto-save effect above might not have run if only graph changed.
      // We should ideally save the previous floor here.
      const oldFloor = floors.find(f => f.id === previousFloor);
      if (oldFloor) {
        // We can't easily access the "previous" graph state here because graph might already be reflecting new floor?
        // No, graph is still the old graph until we clear it below.
        // So we CAN save here!
        const currentMapData = oldFloor.mapData || {
          metadata: {},
          assets: [],
          objects: []
        };

        updateFloor(previousFloor, {
          mapData: {
            ...currentMapData,
            graphJson: graph.toJSON()
          }
        });
      }

      // Clear canvas and state
      graph.clear()
      setElementCount(0)
      setLoadedFileName(null)
      setObjectsByLayer(new Map())
      setSelectedElementId(null)
      setPendingGraphJson(null)

      // Clear CSV store first
      clearFile()

      // Then restore new floor data if exists
      const newFloor = floors.find((f) => f.id === currentFloor)

      // Restore Graph JSON if exists
      if (newFloor?.mapData?.graphJson) {
        setPendingGraphJson(newFloor.mapData.graphJson)
      }

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
