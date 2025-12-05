/**
 * Layer Mapping Modal
 * Maps CSV layers to Object Types
 */

import { useState, useEffect, useRef } from 'react'
import { useObjectTypeStore, ObjectType } from '@/shared/store/objectTypeStore'
import { useCSVStore } from '@/features/csv/model/csvStore'
import { useFloorStore } from '@/shared/store/floorStore'
import { CSVPreviewCanvas } from './components/CSVPreviewCanvas'
import styles from './LayerMappingModal.module.css'

interface SearchableTypeSelectProps {
  value: string
  options: ObjectType[]
  onChange: (value: string) => void
  placeholder?: string
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
        // Find mapping for this layer (check first entity handle)
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
  }, [isOpen, currentFloor, groupedLayers, getMappingsByFloorId])

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
              {groupedLayers?.map(layer => (
                <div
                  key={layer.layer}
                  className={`${styles.mappingItem} ${selectedLayer === layer.layer ? styles.selectedMappingItem : ''}`}
                  onClick={() => setSelectedLayer(layer.layer === selectedLayer ? null : layer.layer)}
                >
                  <div className={styles.layerInfo}>
                    <div className={styles.layerName}>{layer.layer}</div>
                    <div className={styles.layerCount}>{layer.entities.length}개 엔티티</div>
                  </div>
                  <SearchableTypeSelect
                    value={layerMappings[layer.layer] || ''}
                    options={types}
                    onChange={(value) => handleMappingChange(layer.layer, value)}
                  />
                </div>
              ))}
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
