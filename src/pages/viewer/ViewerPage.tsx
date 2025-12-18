/**
 * ViewerPage
 * Standalone read-only map viewer with multi-floor support
 */

import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useTheme } from '@/shared/context/ThemeContext'
import { useProjectStore } from '@/shared/store/projectStore'
import { useFloorStore } from '@/shared/store/floorStore'
import { useViewerStore } from '@/shared/store/viewerStore'
import { statusService, useStatusStore, StatusOverlay } from '@/features/status'
import { ResizablePanel } from '@/shared/ui/ResizablePanel'
import { LoadingOverlay } from '@/shared/ui/LoadingOverlay'
import { ViewerJsonPanel } from '../editor/components/ViewerJsonPanel'
import { ConnectionPanel } from './components/ConnectionPanel'
import { CctvAlert } from './components/CctvAlert'
import { FloorSelectorPanel, DisplayModeToggle, MultiFloorCanvas, FloorBadge } from '@/features/viewer'
import { useJointJSCanvas } from '../editor/hooks/useJointJSCanvas'
import { useCanvasPanning } from '../editor/hooks/useCanvasPanning'
import { useCanvasZoom } from '../editor/hooks/useCanvasZoom'
import { useThemeSync } from '../editor/hooks/useThemeSync'
import styles from './ViewerPage.module.css'

export default function ViewerPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { theme, toggleTheme } = useTheme()

  // Stores
  const { getLotById } = useProjectStore()
  const { floors } = useFloorStore()
  const {
    displayMode,
    selectedFloorIds,
    layout,
    setDisplayMode,
    setSelectedFloorIds,
    setLayout,
  } = useViewerStore()

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null)

  // State
  const [loading, setLoading] = useState(true)
  const [projectData, setProjectData] = useState<any>(null)
  const [zoom, setZoom] = useState(1)
  const [showConnectionPanel, setShowConnectionPanel] = useState(false)

  // JointJS Canvas (for single-floor mode)
  const { graph, paper } = useJointJSCanvas(canvasRef)

  // Canvas interactions (read-only)
  useCanvasPanning(paper, graph, canvasRef)
  useCanvasZoom(paper, canvasRef, setZoom)
  useThemeSync(paper, theme)

  // Status service
  const { connect, disconnect } = useStatusStore()

  // Load project data from store
  useEffect(() => {
    if (!projectId) {
      navigate('/dashboard')
      return
    }

    const project = getLotById(projectId)
    if (!project) {
      console.error('Project not found:', projectId)
      setLoading(false)
      return
    }

    const projectFloors = floors.filter(floor => floor.lotId === projectId)

    if (projectFloors.length === 0) {
      console.warn('No floors found for project:', projectId)
      setProjectData({
        projectId,
        projectName: project.name,
        floors: [],
        graphJson: null
      })
      setLoading(false)
      return
    }

    // Sort floors by order
    const sortedFloors = [...projectFloors].sort((a, b) => a.order - b.order)

    setProjectData({
      projectId,
      projectName: project.name,
      floors: sortedFloors,
    })
    setLoading(false)

    // Initialize URL state
    const urlMode = searchParams.get('mode') as 'single' | 'multi' | null
    const urlFloors = searchParams.get('floors')?.split(',') || []
    const urlLayout = searchParams.get('layout') as 'grid' | 'stack' | 'side' | null

    if (urlMode) {
      setDisplayMode(urlMode)
    }

    if (urlFloors.length > 0) {
      const validFloorIds = urlFloors.filter(id => sortedFloors.find(f => f.id === id))
      if (validFloorIds.length > 0) {
        setSelectedFloorIds(validFloorIds)
      } else {
        // Default to first floor
        setSelectedFloorIds([sortedFloors[0].id])
      }
    } else {
      // Default to first floor
      setSelectedFloorIds([sortedFloors[0].id])
    }

    if (urlLayout) {
      setLayout(urlLayout)
    }
  }, [projectId, navigate, getLotById, floors])

  // Update URL when viewer state changes
  useEffect(() => {
    if (!projectData) return

    const params = new URLSearchParams()
    params.set('mode', displayMode)
    params.set('floors', selectedFloorIds.join(','))
    params.set('layout', layout)

    setSearchParams(params, { replace: true })
  }, [displayMode, selectedFloorIds, layout, projectData])

  // Load graph for single-floor mode
  useEffect(() => {
    if (displayMode !== 'single' || !graph || !paper || !projectData?.floors) {
      return
    }

    // Get currently selected floor
    const currentFloor = projectData.floors.find((f: any) => f.id === selectedFloorIds[0])
    if (!currentFloor?.mapData?.graphJson) {
      console.log('⚠️ No graph data for selected floor')
      return
    }

    try {
      graph.clear()
      graph.fromJSON(currentFloor.mapData.graphJson)
      console.log('✅ Graph loaded in single-floor mode:', graph.getCells().length, 'cells')

      setTimeout(() => {
        if (graph.getCells().length > 0) {
          paper.scaleContentToFit({
            padding: 50,
            maxScale: 1.5,
            minScale: 0.1,
          })
        }
      }, 100)
    } catch (error) {
      console.error('❌ Failed to load graph:', error)
    }
  }, [graph, paper, projectData, displayMode, selectedFloorIds])

  // Set paper to read-only mode
  useEffect(() => {
    if (!paper) return

    paper.setInteractivity(() => ({
      elementMove: false,
      addLinkFromMagnet: false,
    }))
  }, [paper])

  // Initialize status service
  useEffect(() => {
    if (!graph || displayMode !== 'single') return

    const elements = graph.getElements()

    const cctvIds = elements
      .filter(el => {
        const id = String(el.id);
        const type = el.get('type') || el.get('objectType');
        return (
          type === 'Cctv' ||
          type === 'cctv' ||
          id.includes('cctv') ||
          id.includes('onepassreader') ||
          id.includes('reader')
        );
      })
      .map(el => String(el.id))

    const parkingIds = elements
      .filter(el => {
        const id = String(el.id);
        const type = el.get('type') || el.get('objectType');
        return (
          type === 'ParkingLocation' ||
          type === 'parkingLocation' ||
          type === 'parking' ||
          id.includes('parking')
        );
      })
      .map(el => String(el.id))

    statusService.initialize(cctvIds, parkingIds)
    connect()

    return () => {
      disconnect()
    }
  }, [graph, displayMode, connect, disconnect])

  // Handle floor selection change
  const handleFloorSelectionChange = (floorIds: string[]) => {
    setSelectedFloorIds(floorIds)
  }

  // Get selected floors for display (with validation)
  const getSelectedFloors = () => {
    if (!projectData?.floors) return []
    return projectData.floors
      .filter((f: any) => selectedFloorIds.includes(f.id))
      .filter((f: any) => {
        // Validate floor has graph data
        if (!f.mapData?.graphJson) {
          console.warn(`⚠️ Floor ${f.name} (${f.id}) has no graph data, skipping from multi-floor view`)
          return false
        }
        return true
      })
  }

  // Get current floor for single mode
  const getCurrentFloor = () => {
    if (!projectData?.floors || selectedFloorIds.length === 0) return null
    return projectData.floors.find((f: any) => f.id === selectedFloorIds[0])
  }

  if (loading) {
    return <LoadingOverlay message="맵 로딩 중..." />
  }

  if (!projectData) {
    return (
      <div className={styles.error}>
        <h2>프로젝트를 찾을 수 없습니다</h2>
        <button onClick={() => navigate('/dashboard')}>
          대시보드로 돌아가기
        </button>
      </div>
    )
  }

  const currentFloor = getCurrentFloor()
  const selectedFloors = getSelectedFloors()

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backButton}
            onClick={() => navigate('/dashboard')}
          >
            ← 대시보드
          </button>
          <h1 className={styles.title}>
            {projectData.projectName || 'Unnamed Project'} (뷰어)
          </h1>

          {/* Display Mode Toggle */}
          {projectData.floors.length > 1 && (
            <DisplayModeToggle
              mode={displayMode}
              onChange={setDisplayMode}
            />
          )}

          {/* Layout Selector (only in multi mode) */}
          {displayMode === 'multi' && (
            <div className={styles.layoutSelector}>
              <label className={styles.layoutLabel}>레이아웃</label>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as any)}
                className={styles.layoutSelect}
              >
                <option value="grid">그리드</option>
                <option value="stack">스택</option>
                <option value="side">나란히</option>
              </select>
            </div>
          )}
        </div>

        <div className={styles.headerRight}>
          {displayMode === 'single' && (
            <div className={styles.zoomInfo}>
              Zoom: {Math.round(zoom * 100)}%
            </div>
          )}
          <button
            className={styles.connectionButton}
            onClick={() => setShowConnectionPanel(true)}
            aria-label="Connection and Share"
          >
            🔌 연결 & 공유
          </button>
          <button
            className={styles.themeButton}
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Floor Selector Panel (left sidebar) */}
        {projectData.floors.length > 1 && (
          <div className={styles.floorSelectorPanel}>
            <FloorSelectorPanel
              floors={projectData.floors}
              selectedFloorIds={selectedFloorIds}
              onSelectionChange={handleFloorSelectionChange}
              maxSelection={displayMode === 'single' ? 1 : 5}
            />
          </div>
        )}

        {/* Canvas Area */}
        <div className={styles.canvasArea}>
          {displayMode === 'single' ? (
            // Single-floor view
            <div className={styles.canvasWrapper}>
              <div ref={canvasRef} className={styles.canvas} />

              {/* Floor Badge */}
              {currentFloor && (
                <FloorBadge
                  floor={currentFloor}
                  objectCount={currentFloor.mapData?.objects?.length || 0}
                  statusSummary="ok"
                />
              )}

              {/* Status Overlay */}
              {graph && paper && (
                <StatusOverlay graph={graph} paper={paper} />
              )}
            </div>
          ) : selectedFloors.length > 0 ? (
            // Multi-floor view
            <MultiFloorCanvas
              floors={selectedFloors}
              layout={layout}
            />
          ) : (
            // No valid floors selected
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '16px',
              padding: '48px',
              textAlign: 'center',
              color: 'var(--color-text-secondary)'
            }}>
              <p style={{fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)'}}>
                선택된 층이 없습니다
              </p>
              <span style={{fontSize: '14px'}}>
                왼쪽 패널에서 층을 선택하거나, 층 데이터가 있는지 확인하세요
              </span>
            </div>
          )}
        </div>

        {/* Right Sidebar - JSON Preview */}
        <ResizablePanel
          side="right"
          defaultWidth={400}
          minWidth={300}
          maxWidth={600}
        >
          <ViewerJsonPanel
            graph={displayMode === 'single' ? graph : null}
            projectName={projectData.projectName || 'Unnamed Project'}
          />
        </ResizablePanel>
      </main>

      {/* Connection Panel */}
      {showConnectionPanel && (
        <ConnectionPanel
          projectId={projectId!}
          onClose={() => setShowConnectionPanel(false)}
        />
      )}

      {/* CCTV Disconnection Alert */}
      <CctvAlert />
    </div>
  )
}
