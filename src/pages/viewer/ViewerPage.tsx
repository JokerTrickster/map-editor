/**
 * ViewerPage
 * Standalone read-only map viewer accessible from dashboard
 */

import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTheme } from '@/shared/context/ThemeContext'
import { useProjectStore } from '@/shared/store/projectStore'
import { useFloorStore } from '@/shared/store/floorStore'
import { statusService, useStatusStore, StatusOverlay } from '@/features/status'
import { ResizablePanel } from '@/shared/ui/ResizablePanel'
import { LoadingOverlay } from '@/shared/ui/LoadingOverlay'
import { ViewerJsonPanel } from '../editor/components/ViewerJsonPanel'
import { useJointJSCanvas } from '../editor/hooks/useJointJSCanvas'
import { useCanvasPanning } from '../editor/hooks/useCanvasPanning'
import { useCanvasZoom } from '../editor/hooks/useCanvasZoom'
import { useThemeSync } from '../editor/hooks/useThemeSync'
import styles from './ViewerPage.module.css'

export default function ViewerPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  // Project store
  const { getLotById } = useProjectStore()
  const { floors } = useFloorStore()

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null)

  // State
  const [loading, setLoading] = useState(true)
  const [projectData, setProjectData] = useState<any>(null)
  const [currentFloorIndex, setCurrentFloorIndex] = useState(0)
  const [zoom, setZoom] = useState(1)

  // JointJS Canvas
  const { graph, paper } = useJointJSCanvas(canvasRef)

  // Canvas interactions (read-only)
  useCanvasPanning(paper, graph, canvasRef)
  useCanvasZoom(paper, canvasRef, setZoom)
  useThemeSync(paper, theme)

  // Status service
  const { connect, disconnect } = useStatusStore()

  // Load project data from store (mock data)
  useEffect(() => {
    if (!projectId) {
      navigate('/dashboard')
      return
    }

    // Load project from store
    const project = getLotById(projectId)
    if (!project) {
      console.error('Project not found:', projectId)
      setLoading(false)
      return
    }

    // Load floors for this project
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

    // Use first floor by default
    const firstFloor = projectFloors[0]
    const graphJson = firstFloor.mapData?.graphJson

    setProjectData({
      projectId,
      projectName: project.name,
      floors: projectFloors,
      currentFloor: firstFloor,
      graphJson
    })
    setLoading(false)

    console.log('📂 Loaded project data:', {
      projectId,
      projectName: project.name,
      floorCount: projectFloors.length,
      hasGraph: !!graphJson
    })
  }, [projectId, navigate, getLotById, floors])

  // Load graph from project data
  useEffect(() => {
    if (!graph || !projectData?.graphJson) return

    try {
      graph.fromJSON(projectData.graphJson)
      console.log('✅ Graph loaded in viewer mode')
    } catch (error) {
      console.error('Failed to load graph:', error)
    }
  }, [graph, projectData])

  // Set paper to read-only mode
  useEffect(() => {
    if (!paper) return

    paper.setInteractivity(() => ({
      elementMove: false,
      addLinkFromMagnet: false,
    }))

    console.log('🔒 Viewer mode: Read-only')
  }, [paper])

  // Initialize status service
  useEffect(() => {
    if (!graph) return

    const elements = graph.getElements()
    const cctvIds = elements
      .filter(el => {
        const type = el.get('type') || el.get('objectType')
        return type === 'Cctv' || type === 'cctv'
      })
      .map(el => String(el.id))

    const parkingIds = elements
      .filter(el => {
        const type = el.get('type') || el.get('objectType')
        return type === 'ParkingLocation' || type === 'parkingLocation'
      })
      .map(el => String(el.id))

    statusService.initialize(cctvIds, parkingIds)
    connect()

    return () => {
      disconnect()
    }
  }, [graph, connect, disconnect])

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
          {projectData.floors && projectData.floors.length > 1 && (
            <div className={styles.floorSelector}>
              <select
                value={currentFloorIndex}
                onChange={(e) => {
                  const newIndex = parseInt(e.target.value)
                  setCurrentFloorIndex(newIndex)
                  const newFloor = projectData.floors[newIndex]
                  setProjectData({
                    ...projectData,
                    currentFloor: newFloor,
                    graphJson: newFloor.mapData?.graphJson
                  })
                }}
                className={styles.floorSelect}
              >
                {projectData.floors.map((floor: any, index: number) => (
                  <option key={floor.id} value={index}>
                    {floor.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className={styles.headerRight}>
          <div className={styles.zoomInfo}>
            Zoom: {Math.round(zoom * 100)}%
          </div>
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
        {/* Canvas Area */}
        <div className={styles.canvasArea}>
          <div className={styles.canvasWrapper}>
            <div ref={canvasRef} className={styles.canvas} />

            {/* Status Overlay */}
            {graph && paper && (
              <StatusOverlay graph={graph} paper={paper} />
            )}
          </div>
        </div>

        {/* Right Sidebar - JSON Preview */}
        <ResizablePanel
          side="right"
          defaultWidth={400}
          minWidth={300}
          maxWidth={600}
        >
          <ViewerJsonPanel
            graph={graph}
            projectName={projectData.projectName || 'Unnamed Project'}
          />
        </ResizablePanel>
      </main>
    </div>
  )
}
