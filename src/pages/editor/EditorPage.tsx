/**
 * EditorPage
 * Main map editor page - refactored with custom hooks and components
 */

import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { dia } from '@joint/core'
import { useTheme } from '@/shared/context/ThemeContext'
import { useFloorStore } from '@/shared/store/floorStore'
import { FloorTabs } from '@/widgets/editor/FloorTabs'
import { CSVUploader } from '@/features/csv'
import { ObjectTypeSidebar } from '@/features/objectType'
import { ResizablePanel } from '@/shared/ui/ResizablePanel'
import { Modal } from '@/shared/ui/Modal'
import { LoadingOverlay } from '@/shared/ui/LoadingOverlay'
import { EditorHeader } from './components/EditorHeader'
import { EditorSidebar } from './components/EditorSidebar'
import { useJointJSCanvas } from './hooks/useJointJSCanvas'
import { useCanvasPanning } from './hooks/useCanvasPanning'
import { useCanvasZoom } from './hooks/useCanvasZoom'
import { useUndoRedo } from './hooks/useUndoRedo'
import { useMinimap } from './hooks/useMinimap'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useThemeSync } from './hooks/useThemeSync'
import { useElementSelection } from './hooks/useElementSelection'
import { useLayerRendering } from './hooks/useLayerRendering'
import { useObjectCreation } from './hooks/useObjectCreation'
import { ObjectType } from '@/shared/store/objectTypeStore'
import styles from './EditorPage.module.css'
import '@/shared/lib/testHelpers'

export default function EditorPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { currentFloor, updateFloor, floors } = useFloorStore()

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null)
  const minimapContainerRef = useRef<HTMLDivElement>(null)
  const viewportRectRef = useRef<HTMLDivElement>(null)

  // State
  const [selectedObjectType, setSelectedObjectType] = useState<ObjectType | null>(null)
  const [zoom, setZoom] = useState(1)
  const [elementCount, setElementCount] = useState(0)
  const [objectsByLayer, setObjectsByLayer] = useState<Map<string, dia.Element[]>>(new Map())
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [pendingGraphJson, setPendingGraphJson] = useState<any | null>(null)
  const [isRestoring] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)

  // Hooks
  const { graph, paper } = useJointJSCanvas(canvasRef)

  const { handleElementClick, handleBlankClick } = useElementSelection(
    graph,
    paper,
    selectedElementId,
    setSelectedElementId
  )

  useCanvasPanning(paper, graph, canvasRef, handleBlankClick)

  const { handleZoomIn, handleZoomOut, handleZoomReset, handleFitToScreen } = useCanvasZoom(
    paper,
    canvasRef,
    setZoom
  )

  const { undo, redo } = useUndoRedo(graph, setElementCount)

  useMinimap(
    paper,
    graph,
    minimapContainerRef,
    viewportRectRef,
    loadedFileName
  )

  useKeyboardShortcuts(
    selectedElementId,
    graph,
    undo,
    redo,
    () => setSelectedElementId(null),
    setElementCount
  )

  useThemeSync(paper, theme)

  useLayerRendering(
    graph,
    setElementCount,
    setObjectsByLayer,
    setLoadedFileName,
    pendingGraphJson,
    setPendingGraphJson,
    isRestoring
  )

  useObjectCreation(
    paper,
    graph,
    selectedObjectType,
    () => setSelectedObjectType(null)
  )

  // Handlers
  const handleSave = () => {
    if (graph && currentFloor) {
      const json = graph.toJSON()
      const currentFloorData = floors.find(f => f.id === currentFloor)
      if (currentFloorData) {
        updateFloor(currentFloor, {
          mapData: {
            ...currentFloorData.mapData,
            graphJson: json,
            metadata: currentFloorData.mapData?.metadata || {},
            assets: currentFloorData.mapData?.assets || [],
            objects: currentFloorData.mapData?.objects || []
          }
        })
        setShowSaveModal(true)
      }
    }
  }

  const handleClearCanvas = () => {
    if (graph) {
      graph.clear()
      setElementCount(0)
      setObjectsByLayer(new Map())
    }
  }

  const handleLogout = () => {
    // Implement logout logic if needed, for now just redirect
    navigate('/login')
  }

  const handleBackToProjects = () => {
    navigate('/projects')
  }

  return (
    <div className={styles.container}>
      <EditorHeader
        loadedFileName={loadedFileName}
        zoom={zoom}
        theme={theme}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onFitToScreen={handleFitToScreen}
        onUploadClick={() => { }} // TODO: Implement upload click if needed
        onSave={handleSave}
        onClearCanvas={handleClearCanvas}
        onThemeToggle={toggleTheme}
        onLogout={handleLogout}
        onBackToProjects={handleBackToProjects}
      />

      <main className={styles.main}>
        {/* Left Sidebar */}
        <ResizablePanel side="left" defaultWidth={300} minWidth={200} maxWidth={500} defaultCollapsed={true}>
          <ObjectTypeSidebar
            selectedTypeId={selectedObjectType?.id}
            onSelectType={setSelectedObjectType}
          />
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

          {/* Loading Overlay */}
          {isRestoring && <LoadingOverlay message="Loading floor..." />}
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

      <FloorTabs />

      {/* Save Success Modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Success"
        footer={
          <button className={styles.primaryButton} onClick={() => setShowSaveModal(false)}>
            OK
          </button>
        }
      >
        <p>Map saved successfully!</p>
      </Modal>
    </div>
  )
}
