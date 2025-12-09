/**
 * Layer Mapping Modal
 * Maps CSV layers to Object Types
 */

import { useState, useEffect, useRef } from 'react'
import { useObjectTypeStore, ObjectType } from '@/shared/store/objectTypeStore'
import { useCSVStore } from '@/features/csv/model/csvStore'
import { useFloorStore } from '@/shared/store/floorStore'
import { CSVPreviewCanvas } from './components/CSVPreviewCanvas'
import { ParsedEntity } from '@/features/csv/lib/csvParser'
import styles from './LayerMappingModal.module.css'

/**
 * Auto-mapping configuration
 * Maps layer name keywords to object type names
 * If layer name CONTAINS the keyword (case-insensitive), it will be auto-mapped
 */
const AUTO_LAYER_KEYWORD_MAPPINGS: Record<string, string> = {
  // Keyword (case-insensitive) -> Object type display name
  'arrow': '화살표',
  // 'outline': '외곽선', // 외곽선은 매핑하지 않음 (다른 객체들을 가림)
  'innerline': '내부선',
  'entrance': '입구/출구',
  'elevator': '엘리베이터',
  'lightingline': '조명',
  'occupancylight': '만공차등',
  'cctv': '조명 CCTV',
  'pillar': '기둥',
  'parking': '주차 구역',
  'emergencybell': '비상벨',
}

/**
 * Layers to exclude from auto-mapping
 * These layers should default to "매핑 안함"
 */
const EXCLUDED_LAYERS = [
  'c-cctv-id',
  'c-cctv-ip',
  'p-parking-cctvid',
]

interface SearchableTypeSelectProps {
  value: string
  options: ObjectType[]
  onChange: (value: string) => void
  placeholder?: string
}

interface EntityPreviewProps {
  entity: ParsedEntity
  mappedType?: ObjectType
}

function EntityPreview({ entity, mappedType }: EntityPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 40
    canvas.width = size
    canvas.height = size

    // Fill background
    ctx.fillStyle = '#0b0f19'
    ctx.fillRect(0, 0, size, size)

    if (!entity.points || entity.points.length === 0) return

    // Calculate bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    entity.points.forEach(p => {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    })

    const width = maxX - minX
    const height = maxY - minY

    if (width === 0 || height === 0) return

    // Calculate scale to fit in canvas with padding
    const scale = Math.min(size / width, size / height) * 0.7
    const offsetX = (size - width * scale) / 2
    const offsetY = (size - height * scale) / 2

    // Transform points
    const transformedPoints = entity.points.map(p => ({
      x: (p.x - minX) * scale + offsetX,
      y: (p.y - minY) * scale + offsetY
    }))

    // Draw entity
    ctx.beginPath()
    ctx.moveTo(transformedPoints[0].x, transformedPoints[0].y)

    for (let i = 1; i < transformedPoints.length; i++) {
      ctx.lineTo(transformedPoints[i].x, transformedPoints[i].y)
    }

    // Close path for polygons
    if (entity.entityType === 'LWPOLYLINE' || entity.entityType === 'POLYLINE') {
      ctx.closePath()
    }

    // Use mapped type color if available
    if (mappedType?.icon?.startsWith('#')) {
      ctx.strokeStyle = mappedType.icon
      ctx.fillStyle = mappedType.icon + '40' // Add transparency
    } else {
      ctx.strokeStyle = '#3b82f6'
      ctx.fillStyle = '#3b82f640'
    }

    ctx.lineWidth = 1.5
    ctx.stroke()

    // Fill if polygon
    if (entity.entityType === 'LWPOLYLINE' || entity.entityType === 'POLYLINE') {
      ctx.fill()
    }
  }, [entity, mappedType])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}

function SearchableTypeSelect({ value, options, onChange, placeholder = "매핑 안함" }: SearchableTypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(o => o.id === value)

  // Check if icon is URL or color code
  const getIconDisplay = (option: ObjectType) => {
    if (!option.icon) return null
    const isUrl = option.icon.startsWith('/') || option.icon.startsWith('http')
    const isColor = option.icon.startsWith('#')

    if (isUrl) {
      return <img src={option.icon} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover' }} />
    } else if (isColor) {
      return <div style={{ width: 20, height: 20, borderRadius: 4, background: option.icon, border: '1px solid rgba(255,255,255,0.2)' }} />
    }
    return null
  }

  // Sync input with selection when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(selectedOption?.name || '')
    }
  }, [isOpen, selectedOption])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        // Revert search term to selected name is handled by the other useEffect
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleFocus = () => {
    setIsOpen(true)
    // Optional: Select all text on focus for easier replacement
    // e.target.select()
  }

  return (
    <div className={styles.searchableSelect} ref={containerRef}>
      <div className={styles.selectTrigger}>
        {selectedOption && getIconDisplay(selectedOption)}
        <input
          type="text"
          className={styles.searchInput}
          value={isOpen ? searchTerm : (selectedOption?.name || '')}
          placeholder={placeholder}
          onFocus={handleFocus}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onClick={() => setIsOpen(true)}
          style={{ paddingLeft: selectedOption ? '32px' : '12px' }}
        />
      </div>
      {isOpen && (
        <div className={styles.dropdownList}>
          <div
            className={`${styles.dropdownItem} ${!value ? styles.selected : ''}`}
            onClick={() => {
              onChange('')
              setIsOpen(false)
            }}
          >
            {placeholder}
          </div>
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <div
                key={option.id}
                className={`${styles.dropdownItem} ${option.id === value ? styles.selected : ''}`}
                onClick={() => {
                  onChange(option.id)
                  setIsOpen(false)
                }}
              >
                <div className={styles.dropdownItemContent}>
                  {getIconDisplay(option)}
                  <span>{option.name}</span>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.noResults}>검색 결과 없음</div>
          )}
        </div>
      )}
    </div>
  )
}

interface LayerMappingModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function LayerMappingModal({ isOpen, onClose, onConfirm }: LayerMappingModalProps) {
  const types = useObjectTypeStore(state => state.types)
  const groupedLayers = useCSVStore(state => state.groupedLayers)
  const currentFloor = useFloorStore(state => state.currentFloor)
  const addMapping = useObjectTypeStore(state => state.addMapping)
  const getMappingsByFloorId = useObjectTypeStore(state => state.getMappingsByFloorId)
  const removeMapping = useObjectTypeStore(state => state.removeMapping)

  // Local state: layerName -> typeId
  const [layerMappings, setLayerMappings] = useState<Record<string, string>>({})
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null)

  // Load existing mappings when modal opens
  useEffect(() => {
    if (isOpen && currentFloor && groupedLayers) {
      const existingMappings = getMappingsByFloorId(currentFloor)
      const mappingsMap: Record<string, string> = {}

      groupedLayers.forEach(layer => {
        const layerLower = layer.layer.toLowerCase()

        // Check if this layer is excluded from auto-mapping
        const isExcluded = EXCLUDED_LAYERS.some(excluded =>
          layerLower === excluded.toLowerCase()
        )

        if (isExcluded) {
          // Skip auto-mapping for excluded layers (매핑 안함)
          return
        }

        // Check if this layer should be auto-mapped (keyword matching)
        let autoTypeDisplayName: string | undefined

        // Find matching keyword in layer name
        for (const [keyword, typeName] of Object.entries(AUTO_LAYER_KEYWORD_MAPPINGS)) {
          if (layerLower.includes(keyword.toLowerCase())) {
            autoTypeDisplayName = typeName
            break
          }
        }

        if (autoTypeDisplayName) {
          // Find the object type by display name
          const autoType = types.find(t => t.name === autoTypeDisplayName)
          if (autoType) {
            mappingsMap[layer.layer] = autoType.id
            return
          }
        }

        // Otherwise, check for existing mapping
        const firstEntityHandle = layer.entities[0]?.entityHandle
        if (firstEntityHandle) {
          const mapping = existingMappings.find(m => m.entityHandle === firstEntityHandle)
          if (mapping) {
            mappingsMap[layer.layer] = mapping.typeId
          }
        }
      })

      setLayerMappings(mappingsMap)
    }
  }, [isOpen, currentFloor, groupedLayers, getMappingsByFloorId, types])

  const handleMappingChange = (layerName: string, typeId: string) => {
    setLayerMappings(prev => ({
      ...prev,
      [layerName]: typeId
    }))
  }

  const handleConfirm = () => {
    if (!currentFloor || !groupedLayers) return

    // Get existing mappings for this floor
    const existingMappings = getMappingsByFloorId(currentFloor)

    // Remove all existing mappings for this floor
    existingMappings.forEach(mapping => {
      removeMapping(mapping.id)
    })

    // Create new mappings
    groupedLayers.forEach(layer => {
      const typeId = layerMappings[layer.layer]
      if (typeId) {
        // Map all entities in this layer to the selected type
        layer.entities.forEach(entity => {
          addMapping({
            floorId: currentFloor,
            typeId: typeId,
            entityHandle: entity.entityHandle
          })
        })
      }
    })

    onConfirm()
  }

  const getMappedCount = () => {
    return Object.values(layerMappings).filter(typeId => typeId !== '').length
  }

  const getTotalLayers = () => {
    return groupedLayers?.length || 0
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>레이어 매핑</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.description}>
          CSV 레이어를 객체 타입과 매핑하세요. 매핑된 레이어만 맵에 렌더링됩니다.
        </div>

        <div className={styles.stats}>
          <span>매핑된 레이어: {getMappedCount()} / {getTotalLayers()}</span>
        </div>

        <div className={styles.content}>
          <div className={styles.previewSection}>
            <div className={styles.previewHeader}>미리보기</div>
            {groupedLayers && (
              <CSVPreviewCanvas
                groupedLayers={groupedLayers}
                layerMappings={layerMappings}
                objectTypes={types}
                selectedLayer={selectedLayer}
              />
            )}
          </div>

          <div className={styles.mappingSection}>
            <div className={styles.mappingList}>
              {groupedLayers?.map(layer => {
                // Get first entity for preview
                const firstEntity = layer.entities[0]
                const typeId = layerMappings[layer.layer]
                const mappedType = types.find(t => t.id === typeId)

                return (
                  <div
                    key={layer.layer}
                    className={`${styles.mappingItem} ${selectedLayer === layer.layer ? styles.selectedMappingItem : ''}`}
                    onClick={() => setSelectedLayer(layer.layer === selectedLayer ? null : layer.layer)}
                  >
                    <div className={styles.layerInfo}>
                      <div className={styles.layerPreview}>
                        {firstEntity ? (
                          <EntityPreview entity={firstEntity} mappedType={mappedType} />
                        ) : (
                          <div className={styles.previewPlaceholder}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                              <path d="M2 17l10 5 10-5"/>
                              <path d="M2 12l10 5 10-5"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className={styles.layerDetails}>
                        <div className={styles.layerName}>{layer.layer}</div>
                        <div className={styles.layerCount}>{layer.entities.length}개 엔티티</div>
                      </div>
                    </div>
                    <SearchableTypeSelect
                      value={layerMappings[layer.layer] || ''}
                      options={types}
                      onChange={(value) => handleMappingChange(layer.layer, value)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelButton}>
            취소
          </button>
          <button onClick={handleConfirm} className={styles.confirmButton}>
            확인 ({getMappedCount()}개 매핑)
          </button>
        </div>
      </div>
    </div>
  )
}
