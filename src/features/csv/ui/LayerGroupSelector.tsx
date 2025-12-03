/**
 * Layer Group Selector
 * Displays grouped layers with checkboxes for selection
 */

import { useCSVStore } from '../model/csvStore'
import styles from './LayerGroupSelector.module.css'

export function LayerGroupSelector() {
  const groupedLayers = useCSVStore(state => state.groupedLayers)
  const selectedLayers = useCSVStore(state => state.selectedLayers)
  const toggleLayer = useCSVStore(state => state.toggleLayer)
  const selectAllLayers = useCSVStore(state => state.selectAllLayers)
  const deselectAllLayers = useCSVStore(state => state.deselectAllLayers)

  if (!groupedLayers || groupedLayers.length === 0) {
    return null
  }

  const allSelected = groupedLayers.every(layer => selectedLayers.has(layer.layer))
  const someSelected = groupedLayers.some(layer => selectedLayers.has(layer.layer))

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>레이어 선택</h3>
        <div className={styles.actions}>
          <button
            className={styles.actionButton}
            onClick={selectAllLayers}
            disabled={allSelected}
          >
            전체 선택
          </button>
          <button
            className={styles.actionButton}
            onClick={deselectAllLayers}
            disabled={!someSelected}
          >
            선택 해제
          </button>
        </div>
      </div>

      <div className={styles.layerList}>
        {groupedLayers.map(layer => {
          const isSelected = selectedLayers.has(layer.layer)

          return (
            <label
              key={layer.layer}
              className={`${styles.layerItem} ${isSelected ? styles.selected : ''}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleLayer(layer.layer)}
                className={styles.checkbox}
              />
              <div className={styles.layerInfo}>
                <span className={styles.layerName}>{layer.layer}</span>
                <span className={styles.entityCount}>
                  {layer.count}개 엔티티
                </span>
              </div>
            </label>
          )
        })}
      </div>

      <div className={styles.summary}>
        <span>
          {selectedLayers.size} / {groupedLayers.length} 레이어 선택됨
        </span>
      </div>
    </div>
  )
}
