/**
 * EditorPage
 * Main map editor page - refactored with custom hooks and components
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dia } from '@joint/core'
import { useTheme } from '@/shared/context/ThemeContext'
import { useFloorStore } from '@/shared/store/floorStore'
import { useObjectTypeStore } from '@/shared/store/objectTypeStore'
import { useProjectStore } from '@/shared/store/projectStore'
import { useCSVStore } from '@/features/csv/model/csvStore'
import { FloorTabs } from '@/widgets/editor/FloorTabs'
import { CSVUploader } from '@/features/csv'
import { ObjectTypeSidebar, LayerMappingModal } from '@/features/objectType'
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
import { useCSVProcessing } from './hooks/useCSVProcessing'
import { useDragAndDropMapping } from './hooks/useDragAndDropMapping'
import { useObjectTypeSync } from './hooks/useObjectTypeSync'
import { ObjectType } from '@/shared/store/objectTypeStore'
import styles from './EditorPage.module.css'
import '@/shared/lib/testHelpers'

export default function EditorPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { currentFloor, updateFloor, floors, updateFloorMapData } = useFloorStore()
  const currentLot = useProjectStore(state => state.currentLot)
  const setCurrentLot = useObjectTypeStore(state => state.setCurrentLot)

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null)
  const minimapContainerRef = useRef<HTMLDivElement>(null)
  const viewportRectRef = useRef<HTMLDivElement>(null)
  const previousFloorRef = useRef<string | null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  // State
  const types = useObjectTypeStore(state => state.types)
  const { setFile, setUploadState } = useCSVStore()
  const [selectedObjectType, setSelectedObjectType] = useState<ObjectType | null>(null)
  const [zoom, setZoom] = useState(1)
  const [elementCount, setElementCount] = useState(0)
  const [objectsByLayer, setObjectsByLayer] = useState<Map<string, dia.Element[]>>(new Map())
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [pendingGraphJson, setPendingGraphJson] = useState<any | null>(null)
  const [isRestoring] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showNoTypesModal, setShowNoTypesModal] = useState(false)
  const [showMappingModal, setShowMappingModal] = useState(false)
  const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' })

  const handleError = (error: Error) => {
    setErrorModal({ show: true, message: error.message })
  }

  const handleObjectUpdate = (id: string, updates: Partial<any>) => {
    if (!graph) return

    const cell = graph.getCell(id)
    if (!cell || !cell.isElement()) return

    const element = cell as dia.Element

    if (updates.position) {
      element.position(updates.position.x, updates.position.y)
    }

    if (updates.size) {
      element.resize(updates.size.width, updates.size.height)
    }

    if (updates.data) {
      element.set('data', updates.data)
    }
  }

  // Debug: log when showMappingModal changes
  useEffect(() => {
    console.log('🔔 showMappingModal changed:', showMappingModal)
  }, [showMappingModal])

  // Hooks
  const { graph, paper } = useJointJSCanvas(canvasRef)

  // CSV Processing
  const { processCSVData } = useCSVProcessing(graph, paper, undefined, handleError)

  useDragAndDropMapping(paper, graph, currentFloor || 'default', handleError)

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

  useObjectTypeSync(graph)

  // Set current lot in objectTypeStore when project loads
  useEffect(() => {
    if (currentLot) {
      setCurrentLot(currentLot)
    }
  }, [currentLot, setCurrentLot])

  // Auto-save current floor when switching floors
  useEffect(() => {
    if (!currentFloor) return

    // Skip if this is the initial load (no previous floor)
    const isInitialLoad = previousFloorRef.current === null

    // Get latest floors data
    const latestFloors = useFloorStore.getState().floors

    // Save previous floor's data before switching
    if (!isInitialLoad && previousFloorRef.current !== currentFloor && graph) {
      const prevFloorData = latestFloors.find(f => f.id === previousFloorRef.current)
      if (prevFloorData) {
        // Get current CSV store state (snapshot)
        const currentCSVState = useCSVStore.getState()

        // Save graph JSON
        const json = graph.toJSON()

        console.log(`💾 Saving floor ${prevFloorData.name}:`, {
          hasGraph: json.cells.length > 0,
          hasCSV: !!currentCSVState.rawData,
        })

        // Save CSV data from snapshot
        updateFloorMapData(prevFloorData.id, {
          graphJson: json,
          csvRawData: currentCSVState.rawData || undefined,
          csvFileName: currentCSVState.file?.name,
          csvParsedData: currentCSVState.parsedData,
          csvGroupedLayers: currentCSVState.groupedLayers || undefined,
          csvSelectedLayers: Array.from(currentCSVState.selectedLayers),
        })
      }
    }

    // Update previous floor reference BEFORE loading new floor
    previousFloorRef.current = currentFloor

    // Load current floor's data
    const currentFloorData = latestFloors.find(f => f.id === currentFloor)

    console.log(`📂 Loading floor ${currentFloorData?.name}:`, {
      hasMapData: !!currentFloorData?.mapData,
      hasGraph: !!currentFloorData?.mapData?.graphJson,
      hasCSV: !!currentFloorData?.mapData?.csvRawData,
    })

    if (currentFloorData?.mapData) {
      const mapData = currentFloorData.mapData

      // Restore CSV data to csvStore
      if (mapData.csvRawData && mapData.csvParsedData && mapData.csvGroupedLayers) {
        console.log(`✅ Restoring CSV for floor ${currentFloorData.name}`)

        // Use internal state update to restore data (no re-render trigger)
        useCSVStore.setState({
          uploadState: {
            status: 'parsed',
            fileName: mapData.csvFileName || 'unknown.csv',
            rowCount: mapData.csvParsedData.rowCount || 0,
          },
          rawData: mapData.csvRawData,
          parsedData: mapData.csvParsedData,
          groupedLayers: mapData.csvGroupedLayers,
          selectedLayers: new Set(mapData.csvSelectedLayers || []),
          file: null, // File object cannot be persisted
        })

        setLoadedFileName(mapData.csvFileName || null)
      } else {
        console.log(`🆕 New floor ${currentFloorData.name} - clearing CSV`)

        // Clear CSV state for new floor (using setState to avoid re-render)
        useCSVStore.setState({
          uploadState: { status: 'idle' },
          file: null,
          rawData: null,
          parsedData: null,
          groupedLayers: null,
          selectedLayers: new Set<string>(),
        })
        setLoadedFileName(null)
      }

      // Restore graph JSON
      if (graph && mapData.graphJson) {
        console.log(`🎨 Restoring graph for floor ${currentFloorData.name}`)
        setPendingGraphJson(mapData.graphJson)
      } else if (graph) {
        console.log(`🧹 Clearing canvas for floor ${currentFloorData.name}`)
        // Clear canvas for new floor
        graph.clear()
        setElementCount(0)
        setObjectsByLayer(new Map())
      }
    } else if (graph) {
      console.log(`🆕 New floor - clearing everything`)

      // New floor with no data - clear CSV state
      useCSVStore.setState({
        uploadState: { status: 'idle' },
        file: null,
        rawData: null,
        parsedData: null,
        groupedLayers: null,
        selectedLayers: new Set<string>(),
      })
      setLoadedFileName(null)
      graph.clear()
      setElementCount(0)
      setObjectsByLayer(new Map())
    }
  }, [currentFloor, graph, updateFloorMapData])

  // Handlers
  const handleUploadClick = () => {
    if (types.length === 0) {
      setShowNoTypesModal(true)
      return
    }
    csvInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setErrorModal({ show: true, message: 'CSV 파일만 업로드 가능합니다.' })
      return
    }

    setFile(file)
    setUploadState({ status: 'uploading', progress: 0 })

    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target?.result as string
      await processCSVData(text, file.name)
      setUploadState({ status: 'idle' })
    }
    reader.readAsText(file)
  }

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
      if (confirm('정말 초기화 하시겠습니까?')) {
        graph.clear()
        setElementCount(0)
        setObjectsByLayer(new Map())
      }
    }
  }

  const handleLogout = () => {
    // Implement logout logic if needed, for now just redirect
    navigate('/login')
  }

  const handleBackToProjects = () => {
    navigate('/dashboard')
  }

  return (
    <div className={styles.container}>
      <input
        type="file"
        ref={csvInputRef}
        onChange={handleFileChange}
        accept=".csv"
        style={{ display: 'none' }}
      />
      <EditorHeader
        loadedFileName={loadedFileName}
        zoom={zoom}
        theme={theme}
        hasObjectTypes={types.length > 0}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onFitToScreen={handleFitToScreen}
        onUploadClick={handleUploadClick}
        onSave={handleSave}
        onClearCanvas={handleClearCanvas}
        onThemeToggle={toggleTheme}
        onLogout={handleLogout}
        onBackToProjects={handleBackToProjects}
      />

      <main className={styles.main}>
        {/* Left Sidebar */}
        <ResizablePanel side="left" defaultWidth={360} minWidth={200} maxWidth={500} defaultCollapsed={true}>
          <ObjectTypeSidebar
            selectedTypeId={selectedObjectType?.id}
            onSelectType={setSelectedObjectType}
          />
        </ResizablePanel>

        {/* No Types Warning Modal */}
        <Modal
          isOpen={showNoTypesModal}
          onClose={() => setShowNoTypesModal(false)}
          title="객체 타입 필요"
          footer={
            <button
              className={styles.primaryButton}
              onClick={() => setShowNoTypesModal(false)}
            >
              확인
            </button>
          }
        >
          <div style={{ padding: '10px 0' }}>
            <p style={{ marginBottom: '10px' }}>CSV 파일을 업로드하기 전에 먼저 객체 타입을 생성해야 합니다.</p>
            <p style={{ color: 'var(--local-text-secondary)', fontSize: '14px' }}>
              좌측 사이드바에서 객체 타입을 추가하거나 JSON 파일을 임포트해주세요.
            </p>
          </div>
        </Modal>

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

        {/* Error Modal */}
        {errorModal.show && (
          <Modal
            isOpen={errorModal.show}
            title="오류 발생"
            onClose={() => setErrorModal({ show: false, message: '' })}
          >
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <p style={{ marginBottom: '24px', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                {errorModal.message}
              </p>
              <button
                onClick={() => setErrorModal({ show: false, message: '' })}
                style={{
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                확인
              </button>
            </div>
          </Modal>
        )}

        {/* Canvas Area */}
        <div className={styles.canvasArea}>
          {/* Show CSV uploader only if no loaded file AND graph is empty AND mapping modal is closed */}
          {!loadedFileName && elementCount === 0 && !showMappingModal && (
            <CSVUploader onMappingRequired={() => setShowMappingModal(true)} />
          )}

          {/* JointJS Canvas Container */}
          <div ref={canvasRef} className={styles.canvas} />

          {/* Minimap Container */}
          {(loadedFileName || elementCount > 0) && (
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
            onObjectUpdate={handleObjectUpdate}
            graph={graph}
          />
        </ResizablePanel>
      </main>

      <FloorTabs />

      {/* Layer Mapping Modal */}
      <LayerMappingModal
        isOpen={showMappingModal}
        onClose={() => setShowMappingModal(false)}
        onConfirm={() => setShowMappingModal(false)}
      />
    </div>
  )
}
