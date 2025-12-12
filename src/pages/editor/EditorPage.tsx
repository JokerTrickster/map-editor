/**
 * EditorPage
 * Main map editor page - refactored with custom hooks and components
 */

import { useState, useRef, useEffect, useCallback } from 'react'
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
import { EditorHeader, ViewMode } from './components/EditorHeader'
import { EditorSidebar } from './components/EditorSidebar'
import { AutoLinkModal } from './components/AutoLinkModal'
import { ExportModal } from './components/ExportModal'
import { SaveSuccessModal } from './components/SaveSuccessModal'
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
import { useTemplate } from '@/features/template/hooks/useTemplate'
import { TemplateId } from '@/features/template/lib/templateLoader'
import { TemplateRelationType } from '@/entities/schema/templateSchema'
import { autoLinkObjects, updateRelationship, autoLinkAllObjects, createRadiusCircles, getExistingRelationships, parseCardinality, isTargetLinkedGlobally } from '@/features/editor/lib/relationshipUtils'
import {
  createRelationshipLinks,
  clearRelationshipLinks,
  highlightRelationshipTargets,
  clearTargetHighlights,
  dimNonRelatedElements,
  clearElementDimming
} from '@/features/editor/lib/relationshipVisualization'
import styles from './EditorPage.module.css'
import '@/shared/lib/testHelpers'

export default function EditorPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { currentFloor, updateFloor, floors, updateFloorMapData } = useFloorStore()
  const currentLot = useProjectStore(state => state.currentLot)
  const currentLotData = useProjectStore(state => state.getLotById(state.currentLot || ''))
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
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(new Set())
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [dataVersion, setDataVersion] = useState(0) // Force re-renders when data changes
  const [pendingGraphJson, setPendingGraphJson] = useState<any | null>(null)
  const [isRestoring] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showNoTypesModal, setShowNoTypesModal] = useState(false)
  const [showMappingModal, setShowMappingModal] = useState(false)
  const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' })
  const [saveCountdown, setSaveCountdown] = useState(3)
  const [autoNavigate, setAutoNavigate] = useState(false)

  // Relationship State
  const [showAutoLinkModal, setShowAutoLinkModal] = useState(false)

  // Relationship Edit Mode State
  const [relationshipEditState, setRelationshipEditState] = useState<{
    editing: boolean
    relationKey: string | null
    propertyKey: string | null
    targetIds: string[]
  }>({
    editing: false,
    relationKey: null,
    propertyKey: null,
    targetIds: []
  })

  // Export State
  const [showExportModal, setShowExportModal] = useState(false)

  // Viewer State
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false)
  const [savedMapId, setSavedMapId] = useState<string | null>(null)

  // Rotation State (0, 90, 180, 270)
  const [rotation, setRotation] = useState(0)

  // Load Template for Relation Types
  const { template } = useTemplate(currentLotData?.templateId as TemplateId)

  // Mutable copy of relationTypes (can be edited at runtime)
  const [mutableRelationTypes, setMutableRelationTypes] = useState<Record<string, TemplateRelationType>>({})

  // Initialize mutableRelationTypes from template
  useEffect(() => {
    console.log('[EditorPage] Template loaded:', {
      id: currentLotData?.templateId,
      hasTemplate: !!template,
      relationTypes: template?.relationTypes
    })

    // Initialize mutable copy from template
    if (template?.relationTypes) {
      setMutableRelationTypes(template.relationTypes)
      console.log('[EditorPage] Initialized mutableRelationTypes:', template.relationTypes)
    } else {
      setMutableRelationTypes({})
    }
  }, [template, currentLotData])

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
      // Force React re-render when data changes
      setDataVersion(v => v + 1)
    }
  }

  // Relation Type Management Handlers
  const handleUpdateRelationType = (key: string, config: TemplateRelationType) => {
    setMutableRelationTypes(prev => ({
      ...prev,
      [key]: config
    }))
    console.log(`✅ Updated relation type: ${key}`, config)
  }

  const handleDeleteRelationType = (key: string) => {
    setMutableRelationTypes(prev => {
      const updated = { ...prev }
      delete updated[key]
      return updated
    })
    console.log(`🗑️ Deleted relation type: ${key}`)
  }

  // Relationship Handlers
  const handleUnlink = (relationKey: string, targetId: string) => {
    if (!selectedElementId || !graph) return

    const element = graph.getCell(selectedElementId) as dia.Element
    if (!element) return

    const relationConfig = mutableRelationTypes[relationKey]
    if (!relationConfig) {
      console.error(`❌ Relation config not found for key: ${relationKey}`)
      return
    }

    console.log(`🗑️ Unlinking relationship: ${relationKey} -> ${targetId}`)
    console.log(`  Config:`, relationConfig)
    console.log(`  Property Key:`, relationConfig.propertyKey)

    const currentData = element.get('data') || {}
    console.log(`  Current data before removal:`, currentData)

    // Capture the updated data from updateRelationship
    const newData = updateRelationship(
      element,
      relationConfig.propertyKey,
      targetId,
      relationConfig.cardinality,
      'remove'
    )

    console.log(`✅ Relationship removed. Updated data:`, newData)

    // Force a re-render by triggering a change event
    element.trigger('change:data', element, newData)

    // Trigger update to refresh UI with the new data (this will update dataVersion)
    handleObjectUpdate(selectedElementId, { data: newData })
  }

  const handleAutoLink = (relationKey: string) => {
    if (!selectedElementId || !graph) return

    const element = graph.getCell(selectedElementId) as dia.Element
    if (!element) return

    const relationConfig = mutableRelationTypes[relationKey]
    if (!relationConfig || !relationConfig.autoLink) return

    console.log(`\n🚀 Auto-link started for relation: ${relationKey}`)
    console.log(`   Property key: ${relationConfig.propertyKey}`)
    console.log(`   Cardinality: ${relationConfig.cardinality}`)

    // Get existing relationships
    const existingTargets = getExistingRelationships(element, relationConfig.propertyKey)
    const existingCount = existingTargets.length

    console.log(`   Existing relationships: ${existingCount}`, existingTargets)

    // Calculate max links
    const maxLinks = parseCardinality(relationConfig.cardinality)

    console.log(`   Max links allowed: ${maxLinks}`)

    // Auto-link with capacity limit
    const linkedIds = autoLinkObjects(
      graph,
      element,
      relationKey,
      relationConfig,
      undefined,
      maxLinks ?? undefined
    )

    console.log(`🔗 Auto-link returned ${linkedIds.length} IDs (max: ${maxLinks}):`, linkedIds)

    if (linkedIds.length === 0) {
      console.warn('⚠️ No relationships created by auto-link')
      alert('범위 내에서 연결 가능한 객체를 찾지 못했습니다.')
      return
    }

    // Clear existing relationships first
    let currentData = element.get('data')

    if (existingCount > 0) {
      console.log(`🧹 Clearing ${existingCount} existing relationships`)

      existingTargets.forEach(targetId => {
        currentData = updateRelationship(
          element,
          relationConfig.propertyKey,
          targetId,
          relationConfig.cardinality,
          'remove'
        )
        console.log(`   ✓ Removed: ${targetId}`)
      })
    }

    // Now add the new relationships one by one
    console.log(`➕ Adding ${linkedIds.length} new relationships`)

    linkedIds.forEach((targetId, index) => {
      console.log(`   [${index + 1}/${linkedIds.length}] Adding: ${targetId}`)

      currentData = updateRelationship(
        element,
        relationConfig.propertyKey,
        targetId,
        relationConfig.cardinality,
        'add'
      )

      console.log(`   ✓ Added. Current list:`, currentData.properties[relationConfig.propertyKey])
    })

    // Single update at the end (this will update dataVersion)
    handleObjectUpdate(selectedElementId, { data: currentData })

    console.log(`💾 Final save completed`)
    console.log(`   Total relationships: ${linkedIds.length}`)
    console.log(`   Final data:`, currentData.properties[relationConfig.propertyKey])

    const message = existingCount > 0
      ? `기존 ${existingCount}개 관계를 삭제하고 ${linkedIds.length}개 새 관계를 생성했습니다.`
      : `${linkedIds.length}개 관계를 자동으로 생성했습니다.`

    console.log(`✅ ${message}`)
  }

  const handleOpenAutoLinkModal = () => {
    setShowAutoLinkModal(true)
  }

  const handleExport = () => {
    setShowExportModal(true)
  }

  // Handle relationship edit mode change from RelationshipManager
  const handleRelationEditModeChange = (
    editing: boolean,
    relationKey: string | null,
    availableTargetIds: string[]
  ) => {
    console.log('🎯 Relationship edit mode changed:', { editing, relationKey, availableTargetIds })

    // Get property key from relationKey
    let propertyKey: string | null = null
    if (relationKey && mutableRelationTypes[relationKey]) {
      propertyKey = mutableRelationTypes[relationKey].propertyKey
    }

    setRelationshipEditState({
      editing,
      relationKey,
      propertyKey,
      targetIds: availableTargetIds
    })
  }

  const handleAutoLinkConfirm = async (
    adjustedDistances: Record<string, number>,
    enabledRelations: Record<string, boolean>
  ) => {
    if (!graph || !paper) return

    console.log('🔗 Auto-link all objects started')
    console.log('📊 Adjusted distances:', adjustedDistances)
    console.log('📊 Enabled relations:', enabledRelations)
    console.log('📊 Relation types:', mutableRelationTypes)
    console.log('📊 Total elements on canvas:', graph.getElements().length)

    // Filter out disabled relation types
    const activeRelationTypes = Object.fromEntries(
      Object.entries(mutableRelationTypes).filter(([key]) => enabledRelations[key] !== false)
    )

    const enabledCount = Object.keys(activeRelationTypes).length
    const totalCount = Object.keys(mutableRelationTypes).length
    console.log(`✅ Processing ${enabledCount}/${totalCount} enabled relation types`)

    // Debug: log all elements and their typeIds
    graph.getElements().forEach(el => {
      const data = el.get('data') || {}
      console.log('🎯 Element:', {
        id: el.id,
        typeId: data.typeId,
        type: data.type,
        data
      })
    })

    // Only pass enabled relation types to autoLinkAllObjects
    const results = autoLinkAllObjects(graph, activeRelationTypes, template, adjustedDistances)

    console.log('✨ Auto-link results:', results)

    if (results.length > 0) {
      // Show radius circles for 3 seconds
      const circles = createRadiusCircles(paper, results)

      setTimeout(() => {
        circles.forEach(circle => circle.remove())
      }, 3000)

      const totalLinks = results.reduce((sum, r) => sum + r.targetIds.length, 0)
      console.log(`✅ Successfully created ${totalLinks} relationships from ${results.length} source objects`)

      // Log success message with detailed info
      const disabledCount = totalCount - enabledCount
      const message = disabledCount > 0
        ? `${totalLinks}개 관계를 생성했습니다. (활성화: ${enabledCount}개 / 비활성화: ${disabledCount}개)`
        : `${totalLinks}개 관계를 생성했습니다.`
      console.log(`✅ ${message}`)
    } else {
      console.warn('⚠️ No relationships created. Check if objects exist and types match.')
      alert('생성된 관계가 없습니다. 객체와 타입을 확인하세요.')
    }
  }

  // Handle object type selection - select all objects of this type on the map
  const handleTypeSelect = (type: ObjectType | null) => {
    console.log('🎯 handleTypeSelect called:', { type: type?.name, typeId: type?.id })
    setSelectedObjectType(type)

    if (!graph || !paper || !type) {
      // Clear selection if no type selected
      console.log('🧹 Clearing selection (no type)')
      setSelectedTypeId(null)
      setSelectedElementId(null)
      setSelectedElementIds(new Set())
      // Clear all highlights
      graph?.getCells().forEach(cell => {
        if (cell.isElement()) {
          const view = paper?.findViewByModel(cell)
          view?.unhighlight()
        }
      })
      return
    }

    // Toggle: If same type clicked again, deselect
    if (selectedTypeId === type.id) {
      console.log(`🔄 Deselecting type "${type.name}"`)
      setSelectedTypeId(null)
      setSelectedElementIds(new Set())
      setSelectedElementId(null)
      return
    }

    // Find all elements with this object type
    const cells = graph.getCells()
    const matchingElementIds = new Set<string>()

    cells.forEach(cell => {
      if (!cell.isElement()) return
      const element = cell as dia.Element

      const elementTypeId = element.prop('objectTypeId')
      if (elementTypeId === type.id) {
        matchingElementIds.add(element.id.toString())
      }
    })

    // Update selection state
    if (matchingElementIds.size > 0) {
      console.log(`✅ Selected ${matchingElementIds.size} objects of type "${type.name}"`)
      setSelectedTypeId(type.id)
      setSelectedElementIds(matchingElementIds)
      setSelectedElementId(Array.from(matchingElementIds)[0])
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

  // Selection handler
  const handleSelectionChange = (elementId: string | null) => {
    setSelectedElementId(elementId)
  }

  const { handleElementClick, handleBlankClick } = useElementSelection(
    graph,
    paper,
    selectedElementId,
    handleSelectionChange,
    () => {
      setSelectedTypeId(null)
      setSelectedElementIds(new Set())
    },
    selectedElementIds.size > 0
  )

  useCanvasPanning(paper, graph, canvasRef, handleBlankClick)

  const { handleZoomIn, handleZoomOut, handleFitToScreen } = useCanvasZoom(
    paper,
    canvasRef,
    setZoom
  )

  // Handle rotation (90 degrees per click, 0 -> 90 -> 180 -> 270 -> 0)
  const handleRotate = useCallback(() => {
    const newRotation = (rotation + 90) % 360
    setRotation(newRotation)
    console.log(`🔄 Rotating canvas to ${newRotation}°`)
  }, [rotation])

  // Apply rotation using CSS transform on SVG element
  useEffect(() => {
    if (!paper) return

    const svgElement = paper.svg
    if (svgElement) {
      // Apply CSS transform to the SVG element
      svgElement.style.transform = `rotate(${rotation}deg)`
      svgElement.style.transformOrigin = 'center center'
      svgElement.style.transition = 'transform 0.3s ease'

      console.log(`✅ Applied rotation ${rotation}° to SVG element`)
    }
  }, [paper, rotation])

  const { undo, redo } = useUndoRedo(graph, setElementCount)

  useMinimap(
    paper,
    graph,
    minimapContainerRef,
    viewportRectRef,
    loadedFileName,
    rotation
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

  // Highlight multiple selected elements with custom styling
  useEffect(() => {
    if (!graph || !paper) return

    const elementIdArray = Array.from(selectedElementIds)
    console.log('🎨 Multi-selection highlight effect triggered:', {
      selectedCount: selectedElementIds.size,
      selectedTypeId,
      elementIds: elementIdArray
    })

    // Clear all existing highlights first
    console.log('🧹 Clearing all highlights...')

    // Remove custom highlight class and restore original z-index from all cells
    graph.getCells().forEach(cell => {
      if (cell.isElement()) {
        const view = paper.findViewByModel(cell)
        if (view && view.el) {
          // Remove custom highlight class
          view.el.classList.remove('multi-select-highlight')

          // Restore original z-index if it was stored
          const originalZ = cell.get('originalZ')
          if (originalZ !== undefined) {
            cell.set('z', originalZ)
            cell.unset('originalZ')
          }

          // Also call unhighlight to remove JointJS highlights
          view.unhighlight()
        }
      }
    })

    // Apply custom highlight to selected elements
    if (elementIdArray.length > 0) {
      console.log('✨ Applying highlights to', elementIdArray.length, 'elements')
      elementIdArray.forEach(elementId => {
        const cell = graph.getCell(elementId)
        if (cell && cell.isElement()) {
          const view = paper.findViewByModel(cell)
          if (view && view.el) {
            // Add custom CSS class for highlighting
            view.el.classList.add('multi-select-highlight')

            // Store original z-index and temporarily bring to front
            const currentZ = cell.get('z')
            if (cell.get('originalZ') === undefined) {
              cell.set('originalZ', currentZ)
            }
            cell.toFront()
          }
        }
      })
    } else {
      console.log('🧹 Cleared all highlights (no selection)')
    }
  }, [graph, paper, selectedTypeId, selectedElementIds])

  // Show relationship visualizations when object is selected
  useEffect(() => {
    if (!graph || !paper || !selectedElementId) {
      // Clear visualizations when nothing selected
      if (graph && paper) {
        console.log('🧹 Clearing relationship visualizations (no selection)')
        clearRelationshipLinks(graph)
        clearTargetHighlights(graph, paper)
        clearElementDimming(graph, paper)
      }
      return
    }

    const selectedElement = graph.getCell(selectedElementId)
    if (!selectedElement || !selectedElement.isElement()) return

    const elementData = selectedElement.get('data') || {}
    console.log(`👁️ Showing relationships for selected element: ${selectedElementId}`)
    console.log(`   Element type: ${elementData.typeId || elementData.type}`)
    console.log(`   Element name: ${elementData.properties?.name || 'Unknown'}`)
    console.log(`   Available relation types:`, Object.keys(mutableRelationTypes))
    console.log(`   Element properties:`, elementData.properties)

    // Clear previous visualizations
    clearRelationshipLinks(graph)
    clearTargetHighlights(graph, paper)
    clearElementDimming(graph, paper)

    // Create new visualizations
    const links = createRelationshipLinks(
      graph,
      selectedElement as dia.Element,
      mutableRelationTypes,
      template || undefined,
      types
    )

    // Highlight target elements with relationship-specific colors
    highlightRelationshipTargets(graph, paper, links)

    // Dim non-related elements to make relationships stand out
    const targetIds = links.map(link => link.targetId)
    dimNonRelatedElements(graph, paper, selectedElementId, targetIds)

    console.log(`✨ Showing relationships for ${selectedElementId}: ${links.length} links`)

    // Cleanup: when selection changes or component unmounts
    return () => {
      console.log('🧹 Cleanup: Clearing relationship visualizations')
      clearRelationshipLinks(graph)
      clearTargetHighlights(graph, paper)
      clearElementDimming(graph, paper)
    }
  }, [selectedElementId, graph, paper, mutableRelationTypes, template, types, dataVersion])

  // Highlight available targets when in relationship edit mode
  useEffect(() => {
    if (!graph || !paper) return

    if (relationshipEditState.editing && relationshipEditState.targetIds.length > 0) {
      console.log('🎨 Highlighting available targets for editing:', relationshipEditState.targetIds)

      // Add custom highlight to available targets with edit mode styling
      relationshipEditState.targetIds.forEach(targetId => {
        const targetElement = graph.getCell(targetId)
        if (targetElement && targetElement.isElement()) {
          const view = paper.findViewByModel(targetElement)
          if (view) {
            // Use a different highlight style for edit mode (green/clickable)
            view.highlight(null, {
              highlighter: {
                name: 'stroke',
                options: {
                  padding: 8,
                  rx: 8,
                  ry: 8,
                  attrs: {
                    'stroke-width': 4,
                    stroke: '#10b981', // Green color for available targets
                    'stroke-dasharray': '0', // Solid line (not dashed)
                    filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.5))', // Glow effect
                  }
                }
              }
            })

            // Change cursor to pointer for clickable targets
            if (view.el) {
              view.el.style.cursor = 'pointer'
            }
          }
        }
      })
    } else {
      // Clear edit mode highlights and restore cursor
      graph.getElements().forEach(element => {
        const view = paper.findViewByModel(element)
        if (view && view.el) {
          view.el.style.cursor = ''
        }
      })
    }

    // Cleanup
    return () => {
      if (!graph || !paper) return
      graph.getElements().forEach(element => {
        const view = paper.findViewByModel(element)
        if (view && view.el) {
          view.el.style.cursor = ''
        }
      })
    }
  }, [relationshipEditState, graph, paper])

  // Handle canvas clicks when in relationship edit mode
  useEffect(() => {
    if (!paper || !graph) return
    if (!relationshipEditState.editing || !relationshipEditState.propertyKey || !selectedElementId) return

    const handleEditModeClick = (elementView: dia.ElementView) => {
      const clickedId = elementView.model.id as string

      // Check if clicked element is an available target
      if (relationshipEditState.targetIds.includes(clickedId)) {
        console.log('🔗 Creating relationship:', {
          source: selectedElementId,
          target: clickedId,
          propertyKey: relationshipEditState.propertyKey,
          relationKey: relationshipEditState.relationKey
        })

        // Get the selected element
        const selectedElement = graph.getCell(selectedElementId)
        if (!selectedElement || !selectedElement.isElement()) return

        // Get current data
        const currentData = selectedElement.get('data') || {}
        const currentProps = currentData.properties || {}
        const value = currentProps[relationshipEditState.propertyKey!]

        // Get relation config for cardinality check
        const relationConfig = relationshipEditState.relationKey
          ? mutableRelationTypes[relationshipEditState.relationKey]
          : null

        if (!relationConfig) {
          console.error('❌ Relation config not found')
          return
        }

        const maxCount = parseCardinality(relationConfig.cardinality)

        // Check for duplicate global links (if not allowed)
        if (relationConfig.autoLink && !relationConfig.autoLink.allowDuplicates) {
          const { isLinked, linkedBySourceId } = isTargetLinkedGlobally(
            graph,
            relationConfig,
            clickedId,
            selectedElementId,
            undefined
          )

          if (isLinked) {
            const sourceEl = graph.getCell(linkedBySourceId!)
            const sourceName = sourceEl?.get('data')?.properties?.name || linkedBySourceId
            alert(
              `이 객체는 이미 다른 객체(${sourceName})와 연결되어 있습니다.\n` +
              `관계 설정에서 "중복 연결 허용"이 비활성화되어 있습니다.`
            )
            return
          }
        }

        let newValue: string | string[]
        let shouldUpdate = false

        if (maxCount === 1) {
          // Single relationship - replace
          newValue = clickedId
          shouldUpdate = true
        } else {
          // Multiple relationships - add to list
          const list = Array.isArray(value) ? [...value] : (value ? [value] : [])

          // Check if already exists
          if (list.includes(clickedId)) {
            console.log('⚠️ Relationship already exists')
            return
          }

          // Check max count
          if (maxCount !== null && list.length >= maxCount) {
            console.log(`⚠️ 최대 ${maxCount}개까지만 연결할 수 있습니다.`)
            return
          }

          list.push(clickedId)
          newValue = list
          shouldUpdate = true
        }

        if (shouldUpdate) {
          // Update the element
          const newData = {
            ...currentData,
            properties: {
              ...currentProps,
              [relationshipEditState.propertyKey!]: newValue
            }
          }

          selectedElement.set('data', newData)
          handleObjectUpdate(selectedElementId, { data: newData })

          console.log('✅ Relationship created successfully')

          // Exit edit mode after successful creation
          setRelationshipEditState({
            editing: false,
            relationKey: null,
            propertyKey: null,
            targetIds: []
          })

          // Show visual feedback with a brief flash animation
          const view = paper.findViewByModel(elementView.model)
          if (view) {
            // Flash the target element
            view.highlight(null, {
              highlighter: {
                name: 'stroke',
                options: {
                  padding: 10,
                  rx: 10,
                  ry: 10,
                  attrs: {
                    'stroke-width': 6,
                    stroke: '#10b981',
                    'stroke-dasharray': '0'
                  }
                }
              }
            })

            // Remove flash after a short delay
            setTimeout(() => {
              view.unhighlight()
            }, 500)
          }
        }
      }
    }

    // Add listener with high priority (before selection handler)
    paper.on('element:pointerclick', handleEditModeClick)

    return () => {
      paper.off('element:pointerclick', handleEditModeClick)
    }
  }, [
    paper,
    graph,
    relationshipEditState,
    selectedElementId,
    mutableRelationTypes,
    handleObjectUpdate
  ])

  // Set current lot in objectTypeStore when project loads
  useEffect(() => {
    if (currentLot) {
      setCurrentLot(currentLot)
    }
  }, [currentLot, setCurrentLot])

  // Update element z-index when object type priority changes
  useEffect(() => {
    if (!graph) return

    const cells = graph.getCells()
    let updateCount = 0

    cells.forEach(cell => {
      if (!cell.isElement()) return

      const element = cell as dia.Element
      const objectTypeId = element.prop('objectTypeId')

      if (objectTypeId) {
        const objectType = types.find(t => t.id === objectTypeId)
        if (objectType && objectType.priority !== undefined) {
          const currentZ = element.get('z')
          if (currentZ !== objectType.priority) {
            element.set('z', objectType.priority)
            updateCount++
          }
        }
      }
    })

    if (updateCount > 0) {
      console.log(`📊 Updated z-index for ${updateCount} elements`)
    }
  }, [graph, types])

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

  const handleSave = (shouldAutoNavigate = false) => {
    if (graph && currentFloor && currentLot) {
      console.log('💾 Saving project:', { currentLot, currentFloor })

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

        console.log('📊 Floor data saved:', { floorId: currentFloor, elementCount: graph.getCells().length })

        // Generate and save canvas thumbnail
        if (paper) {
          try {
            const svg = paper.svg
            const bbox = paper.getContentBBox()

            if (bbox && bbox.width > 0 && bbox.height > 0) {
              // Create a temporary canvas with same aspect ratio as card (4:3)
              const canvas = document.createElement('canvas')
              const targetWidth = 400  // Reduced for smaller file size
              const targetHeight = 300
              canvas.width = targetWidth
              canvas.height = targetHeight
              const ctx = canvas.getContext('2d')

              if (ctx) {
                // Fill with background color
                ctx.fillStyle = '#0f172a'
                ctx.fillRect(0, 0, targetWidth, targetHeight)

                // Calculate scale to fit content with less padding
                const scaleX = targetWidth / bbox.width
                const scaleY = targetHeight / bbox.height
                const scale = Math.min(scaleX, scaleY) * 0.9 // 90% to show more content, less empty space

                const scaledWidth = bbox.width * scale
                const scaledHeight = bbox.height * scale
                const offsetX = (targetWidth - scaledWidth) / 2
                // Shift content up slightly to show more of the bottom
                const offsetY = (targetHeight - scaledHeight) / 2 - (targetHeight * 0.05)

                // Create SVG image
                const svgData = new XMLSerializer().serializeToString(svg)
                const img = new Image()
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
                const url = URL.createObjectURL(svgBlob)

                img.onload = () => {
                  ctx.save()
                  ctx.translate(offsetX - bbox.x * scale, offsetY - bbox.y * scale)
                  ctx.scale(scale, scale)
                  ctx.drawImage(img, 0, 0)
                  ctx.restore()

                  // Convert to base64 with higher quality
                  const thumbnail = canvas.toDataURL('image/png', 0.9)

                  // Update project thumbnail
                  const updateLot = useProjectStore.getState().updateLot
                  updateLot(currentLot, { thumbnail })

                  console.log('🖼️ Thumbnail saved for project:', currentLot)

                  URL.revokeObjectURL(url)
                }

                img.src = url
              }
            }
          } catch (err) {
            console.error('Failed to generate thumbnail:', err)
          }
        }

        // Show save success modal with current lot ID as map ID (placeholder until API integration)
        setSavedMapId(currentLot)
        setShowSaveSuccessModal(true)
      }
    }
  }

  const handleClearCanvas = () => {
    if (graph) {
      if (confirm('레이어 매핑된 객체를 삭제하고 템플릿 객체의 속성과 관계를 초기화하시겠습니까?')) {
        // Remove all CSV-imported (layer-mapped) objects
        const elementsToRemove: dia.Element[] = []
        const templateElements: dia.Element[] = []

        graph.getElements().forEach(element => {
          const data = element.get('data') || {}
          if (data.type === 'csv-entity') {
            // Mark CSV entities for removal
            elementsToRemove.push(element)
          } else {
            // Keep template objects but reset them
            templateElements.push(element)
          }
        })

        // Remove CSV entities
        elementsToRemove.forEach(element => element.remove())

        // Reset template objects (clear properties and relationships)
        templateElements.forEach(element => {
          const data = element.get('data') || {}
          const resetData = {
            ...data,
            properties: {
              name: data.properties?.name || '' // Keep name but reset other properties
            }
          }
          element.set('data', resetData)
        })

        // Remove all links (relationships)
        graph.getLinks().forEach(link => link.remove())

        // Update counts
        setElementCount(graph.getElements().length)

        // Rebuild objectsByLayer map (only template objects remain)
        const newObjectsByLayer = new Map<string, dia.Element[]>()
        graph.getElements().forEach(element => {
          const data = element.get('data') || {}
          const layer = data.layer || 'default'

          if (!newObjectsByLayer.has(layer)) {
            newObjectsByLayer.set(layer, [])
          }
          newObjectsByLayer.get(layer)!.push(element)
        })
        setObjectsByLayer(newObjectsByLayer)

        console.log(`✅ Cleared ${elementsToRemove.length} CSV objects, kept ${templateElements.length} template objects`)
      }
    }
  }

  const handleLogout = () => {
    // Implement logout logic if needed, for now just redirect
    navigate('/login')
  }

  const handleBackToProjects = () => {
    // Check if there are unsaved changes
    if (graph && graph.getCells().length > 0) {
      const confirmed = window.confirm(
        '프로젝트를 나가기 전에 저장하시겠습니까?\n\n저장하지 않은 변경사항은 손실될 수 있습니다.'
      )

      if (confirmed) {
        // Save before leaving with auto-navigation enabled
        handleSave(true)
      } else {
        navigate('/dashboard')
      }
    } else {
      navigate('/dashboard')
    }
  }

  const handleSaveModalConfirm = () => {
    const shouldNavigate = autoNavigate
    setShowSaveModal(false)
    setAutoNavigate(false)
    if (shouldNavigate) {
      navigate('/dashboard')
    }
  }

  // Countdown timer for save modal (only when autoNavigate is enabled)
  useEffect(() => {
    if (showSaveModal && autoNavigate && saveCountdown > 0) {
      const timer = setTimeout(() => {
        setSaveCountdown(saveCountdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (showSaveModal && autoNavigate && saveCountdown === 0) {
      setShowSaveModal(false)
      navigate('/dashboard')
    }
  }, [showSaveModal, autoNavigate, saveCountdown, navigate])

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
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRotate={handleRotate}
        onFitToScreen={handleFitToScreen}
        onUploadClick={handleUploadClick}
        onSave={() => handleSave(false)}
        onClearCanvas={handleClearCanvas}
        onExport={handleExport}
        onThemeToggle={toggleTheme}
        onLogout={handleLogout}
        onBackToProjects={handleBackToProjects}
      />

      <main className={styles.main}>
        {/* Left Sidebar - Hidden in Viewer Mode */}
        {viewMode === 'edit' && (
          <ResizablePanel
            side="left"
            defaultWidth={360}
            minWidth={200}
            maxWidth={500}
            defaultCollapsed={!currentLotData?.templateId}
          >
            <ObjectTypeSidebar
              selectedTypeId={selectedTypeId}
              onSelectType={handleTypeSelect}
            />
          </ResizablePanel>
        )}

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
          onClose={() => {
            setShowSaveModal(false)
            setAutoNavigate(false)
          }}
          title="저장 완료"
        >
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'successPulse 0.6s ease-out',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '20px',
                fontWeight: '600',
                color: 'var(--color-text)'
              }}>
                저장되었습니다!
              </h3>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: 'var(--color-text-secondary)',
                lineHeight: '1.6'
              }}>
                맵 데이터와 썸네일이 성공적으로 저장되었습니다.
              </p>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              width: '100%'
            }}>
              <button
                className={styles.primaryButton}
                onClick={autoNavigate ? handleSaveModalConfirm : () => {
                  setShowSaveModal(false)
                  setAutoNavigate(false)
                }}
                style={{
                  minWidth: '200px',
                  padding: '12px 32px',
                  background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
              >
                {autoNavigate ? '대시보드로 이동' : '확인'}
              </button>
              {autoNavigate && (
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: 'var(--color-text-tertiary)'
                }}>
                  {saveCountdown}초 후 자동으로 이동합니다
                </p>
              )}
            </div>
          </div>
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
          <div className={styles.minimapContainer} ref={minimapContainerRef}>
            <div className={styles.minimapViewport} ref={viewportRectRef} />
          </div>

          {/* Loading Overlay */}
          {isRestoring && <LoadingOverlay message="Loading floor..." />}
        </div>

        {/* Right Sidebar - Hidden in Viewer Mode */}
        {viewMode === 'edit' && (
          <ResizablePanel
            side="right"
            defaultWidth={300}
            minWidth={200}
            maxWidth={400}
          >
            <EditorSidebar
              loadedFileName={loadedFileName}
              elementCount={elementCount}
              zoom={zoom}
              objectsByLayer={objectsByLayer}
              selectedElementId={selectedElementId}
              onObjectClick={handleElementClick}
              onObjectUpdate={handleObjectUpdate}
              graph={graph}
              template={template}
              relationTypes={mutableRelationTypes}
              onUnlink={handleUnlink}
              onAutoLink={handleAutoLink}
              onAutoLinkAll={handleOpenAutoLinkModal}
              onUpdateRelationType={handleUpdateRelationType}
              onDeleteRelationType={handleDeleteRelationType}
              onRelationEditModeChange={handleRelationEditModeChange}
            />
          </ResizablePanel>
        )}
      </main>

      <FloorTabs />

      {/* Layer Mapping Modal */}
      <LayerMappingModal
        isOpen={showMappingModal}
        onClose={() => setShowMappingModal(false)}
        onConfirm={() => setShowMappingModal(false)}
      />

      {/* Auto Link Modal */}
      {Object.keys(mutableRelationTypes).length > 0 && (
        <AutoLinkModal
          isOpen={showAutoLinkModal}
          onClose={() => setShowAutoLinkModal(false)}
          onConfirm={handleAutoLinkConfirm}
          relationTypes={mutableRelationTypes}
          template={template}
          graph={graph}
          paper={paper}
        />
      )}

      {/* Export Modal */}
      {currentLotData && currentFloor && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          graph={graph}
          lotName={currentLotData.name}
          lotCreated={currentLotData.created}
          floorName={useFloorStore.getState().getCurrentFloorData()?.name || 'Floor 1'}
          floorOrder={useFloorStore.getState().getCurrentFloorData()?.order || 1}
        />
      )}

      {/* Save Success Modal */}
      {savedMapId && (
        <SaveSuccessModal
          isOpen={showSaveSuccessModal}
          onClose={() => setShowSaveSuccessModal(false)}
          onViewerMode={() => {
            setShowSaveSuccessModal(false)
            setViewMode('viewer')
          }}
          onDashboard={() => {
            setShowSaveSuccessModal(false)
            navigate('/dashboard')
          }}
          mapId={savedMapId}
        />
      )}
    </div>
  )
}
