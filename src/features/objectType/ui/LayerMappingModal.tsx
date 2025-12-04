/**
 * Layer Mapping Modal
 * Maps CSV layers to Object Types
 */

import { useState, useEffect } from 'react'
import { useObjectTypeStore } from '@/shared/store/objectTypeStore'
import { useCSVStore } from '@/features/csv/model/csvStore'
import { useFloorStore } from '@/shared/store/floorStore'
import styles from './LayerMappingModal.module.css'

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

        <div className={styles.mappingList}>
          {groupedLayers?.map(layer => (
            <div key={layer.layer} className={styles.mappingItem}>
              <div className={styles.layerInfo}>
                <div className={styles.layerName}>{layer.layer}</div>
                <div className={styles.layerCount}>{layer.entities.length}개 엔티티</div>
              </div>
              <select
                value={layerMappings[layer.layer] || ''}
                onChange={(e) => handleMappingChange(layer.layer, e.target.value)}
                className={styles.typeSelect}
              >
                <option value="">매핑 안함</option>
                {types.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
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
