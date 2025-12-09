/**
 * AutoLinkModal Component
 * Draggable modal for adjusting auto-link radius with real-time preview
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { dia } from '@joint/core'
import { TemplateRelationType } from '@/entities/schema/templateSchema'
import { useObjectTypeStore } from '@/shared/store/objectTypeStore'
import styles from './AutoLinkModal.module.css'

interface AutoLinkModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (adjustedDistances: Record<string, number>) => Promise<void> | void
  relationTypes: Record<string, TemplateRelationType>
  template?: any
  graph: dia.Graph | null
  paper: dia.Paper | null
}

interface CirclePreview {
  x: number
  y: number
  radius: number
  color: string
  relationKey: string
}

export function AutoLinkModal({
  isOpen,
  onClose,
  onConfirm,
  relationTypes,
  template,
  graph,
  paper
}: AutoLinkModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [position, setPosition] = useState({ x: 100, y: 100 })

  // Use useMemo to prevent recreating this array on every render
  const autoLinkRelations = useMemo(
    () => Object.entries(relationTypes).filter(([_, config]) => config.autoLink),
    [relationTypes]
  )

  // Initialize distances from config
  const [distances, setDistances] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    Object.entries(relationTypes).forEach(([key, config]) => {
      if (config.autoLink) {
        initial[key] = config.autoLink.maxDistance
      }
    })
    return initial
  })

  const [objectCounts, setObjectCounts] = useState<Record<string, { sources: number; targets: number }>>({})
  const [circles, setCircles] = useState<CirclePreview[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Individual preview toggle for each relation type
  const [showPreview, setShowPreview] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    Object.keys(relationTypes).forEach(key => {
      if (relationTypes[key].autoLink) {
        initial[key] = true
      }
    })
    return initial
  })

  // Calculate object counts and circle previews
  useEffect(() => {
    if (!graph || !paper || !template?.objectTypes || !isOpen) return

    // Build UUID mapping
    const uuidToTemplateType = new Map<string, string>()
    const objectTypes = useObjectTypeStore.getState().types

    objectTypes.forEach(objType => {
      const templateEntry = Object.entries(template.objectTypes).find(([_, tmplType]: [string, any]) =>
        tmplType.displayName === objType.name || tmplType.name === objType.name
      )
      if (templateEntry) {
        uuidToTemplateType.set(objType.id, templateEntry[0])
      }
    })

    const counts: Record<string, { sources: number; targets: number }> = {}
    const newCircles: CirclePreview[] = []
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
    let colorIndex = 0

    autoLinkRelations.forEach(([key, config]) => {
      if (!config.autoLink) return

      // Count source elements
      const sourceElements = graph.getElements().filter(el => {
        const typeId = el.get('data')?.typeId
        const templateTypeKey = uuidToTemplateType.get(typeId) || typeId
        return templateTypeKey === config.sourceType
      })

      // Count target elements
      const targetElements = graph.getElements().filter(el => {
        const typeId = el.get('data')?.typeId
        const templateTypeKey = uuidToTemplateType.get(typeId) || typeId
        return templateTypeKey === config.targetType
      })

      counts[key] = {
        sources: sourceElements.length,
        targets: targetElements.length
      }

      // Create circle previews for each source element
      const color = colors[colorIndex % colors.length]
      colorIndex++

      const radius = distances[key] || config.autoLink.maxDistance

      sourceElements.forEach(sourceElement => {
        const bbox = sourceElement.getBBox()
        const center = bbox.center()

        // Convert paper coordinates to client coordinates
        const paperScale = paper.scale()
        const paperTranslate = paper.translate()

        newCircles.push({
          x: center.x * paperScale.sx + paperTranslate.tx,
          y: center.y * paperScale.sy + paperTranslate.ty,
          radius: radius * paperScale.sx,
          color,
          relationKey: key
        })
      })
    })

    setObjectCounts(counts)
    setCircles(newCircles)
  }, [graph, paper, template, autoLinkRelations, isOpen, distances])

  // Dragging handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('input, button')) return

    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }, [position])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return

    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    })
  }, [isDragging, dragOffset])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleDistanceChange = (relationKey: string, value: number) => {
    setDistances(prev => ({
      ...prev,
      [relationKey]: value
    }))
  }

  const handleConfirm = async () => {
    setIsLoading(true)

    // Allow UI to update before heavy computation
    await new Promise(resolve => setTimeout(resolve, 100))

    try {
      await onConfirm(distances)
      // Close modal after successful completion
      onClose()
    } catch (error) {
      console.error('Auto-link failed:', error)
      alert('관계 생성 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    onClose()
  }

  if (!isOpen) return null

  // Find the paper element to render circles
  const paperElement = paper?.el

  const handleTogglePreview = (relationKey: string) => {
    setShowPreview(prev => ({
      ...prev,
      [relationKey]: !prev[relationKey]
    }))
  }

  return (
    <>
      {/* Render circle previews on canvas */}
      {paperElement && createPortal(
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 5
        }}>
          {circles.filter(circle => showPreview[circle.relationKey]).map((circle, index) => (
            <div key={index}>
              {/* Outer circle (filled) */}
              <div
                style={{
                  position: 'absolute',
                  left: circle.x - circle.radius,
                  top: circle.y - circle.radius,
                  width: circle.radius * 2,
                  height: circle.radius * 2,
                  background: `radial-gradient(circle, ${circle.color}15 0%, ${circle.color}05 70%, transparent 100%)`,
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              />
              {/* Border circle */}
              <div
                style={{
                  position: 'absolute',
                  left: circle.x - circle.radius,
                  top: circle.y - circle.radius,
                  width: circle.radius * 2,
                  height: circle.radius * 2,
                  border: `3px solid ${circle.color}`,
                  borderRadius: '50%',
                  opacity: 0.8,
                  pointerEvents: 'none',
                  boxShadow: `0 0 10px ${circle.color}80, inset 0 0 10px ${circle.color}40`
                }}
              />
              {/* Center dot */}
              <div
                style={{
                  position: 'absolute',
                  left: circle.x - 4,
                  top: circle.y - 4,
                  width: 8,
                  height: 8,
                  background: circle.color,
                  borderRadius: '50%',
                  border: '2px solid white',
                  boxShadow: `0 0 8px ${circle.color}`,
                  pointerEvents: 'none'
                }}
              />
            </div>
          ))}
        </div>,
        paperElement
      )}

      {/* Modal */}
      <div className={styles.overlay}>
        <div
          ref={modalRef}
          className={styles.modal}
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            cursor: isDragging ? 'grabbing' : 'grab',
            opacity: isDragging ? 0.7 : 1,
            transition: isDragging ? 'none' : 'opacity 0.2s ease'
          }}
          onMouseDown={handleMouseDown}
        >
          <div className={styles.header}>
            <h2 className={styles.title}>자동 관계 생성 - 반경 설정</h2>
            <button className={styles.closeButton} onClick={handleCancel}>
              ✕
            </button>
          </div>

          <div className={styles.content}>
            <p className={styles.description}>
              각 관계 타입의 탐색 반경을 조절하세요. (드래그로 이동 가능)
            </p>

            <div className={styles.relationList}>
              {autoLinkRelations.map(([key, config]) => {
                const sourceTypeName = template?.objectTypes?.[config.sourceType]?.displayName || config.sourceType
                const targetTypeName = template?.objectTypes?.[config.targetType]?.displayName || config.targetType
                const currentDistance = distances[key] || config.autoLink!.maxDistance
                const counts = objectCounts[key] || { sources: 0, targets: 0 }

                return (
                  <div key={key} className={styles.relationItem}>
                    <div className={styles.relationHeader}>
                      <div className={styles.relationHeaderTop}>
                        <div className={styles.relationNameGroup}>
                          <span className={styles.relationName}>{config.name}</span>
                          <span className={styles.cardinalityBadge}>{config.cardinality}</span>
                        </div>
                        <label className={styles.previewToggleSmall}>
                          <input
                            type="checkbox"
                            checked={showPreview[key] ?? true}
                            onChange={() => handleTogglePreview(key)}
                            className={styles.toggleCheckboxSmall}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className={styles.toggleTextSmall}>미리보기</span>
                        </label>
                      </div>
                      <span className={styles.relationFlow}>
                        {sourceTypeName} → {targetTypeName}
                      </span>
                      <div className={styles.objectCounts}>
                        <span className={styles.countBadge}>
                          📍 Source: <strong>{counts.sources}</strong>개
                        </span>
                        <span className={styles.countBadge}>
                          🎯 Target: <strong>{counts.targets}</strong>개
                        </span>
                      </div>
                    </div>

                    <div className={styles.sliderContainer}>
                      <label className={styles.sliderLabel}>
                        탐색 반경: <strong>{currentDistance}px</strong>
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="500"
                        step="10"
                        value={currentDistance}
                        onChange={(e) => handleDistanceChange(key, parseInt(e.target.value))}
                        className={styles.slider}
                      />
                      <div className={styles.sliderMarks}>
                        <span>50px</span>
                        <span>500px</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className={styles.footer}>
            {isLoading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <span className={styles.loadingText}>관계 생성 중...</span>
              </div>
            ) : (
              <>
                <button
                  className={styles.cancelButton}
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  취소
                </button>
                <button
                  className={styles.confirmButton}
                  onClick={handleConfirm}
                  disabled={isLoading}
                >
                  관계 생성
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
