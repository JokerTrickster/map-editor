/**
 * FloorSelectorPanel - Floor selection panel with checkboxes
 * Allows users to select multiple floors for display in multi-floor mode
 */

import { Floor } from '@/shared/store';
import styles from './FloorSelectorPanel.module.css';

export interface FloorSelectorPanelProps {
  floors: Floor[];
  selectedFloorIds: string[];
  onSelectionChange: (floorIds: string[]) => void;
  maxSelection?: number;
  disabled?: boolean;
}

export function FloorSelectorPanel({
  floors,
  selectedFloorIds,
  onSelectionChange,
  maxSelection = 5,
  disabled = false,
}: FloorSelectorPanelProps) {
  // Sort floors by order (basement -> ground -> upper)
  const sortedFloors = [...floors].sort((a, b) => a.order - b.order);

  // Calculate object count for each floor
  const getObjectCount = (floor: Floor): number => {
    if (!floor.mapData?.objects) return 0;
    return floor.mapData.objects.length;
  };

  // Get status summary (placeholder - will integrate with real status later)
  const getStatusSummary = (_floor: Floor): 'ok' | 'warning' | 'error' | 'inactive' => {
    // TODO: Integrate with status store for real-time status
    return 'ok';
  };

  // Handle individual floor checkbox toggle
  const handleFloorToggle = (floorId: string) => {
    if (disabled) return;

    const isSelected = selectedFloorIds.includes(floorId);

    if (isSelected) {
      // Remove from selection
      onSelectionChange(selectedFloorIds.filter((id) => id !== floorId));
    } else {
      // Add to selection (with max limit check)
      if (selectedFloorIds.length >= maxSelection) {
        console.warn(`Maximum ${maxSelection} floors can be selected`);
        // TODO: Show toast notification
        return;
      }
      onSelectionChange([...selectedFloorIds, floorId]);
    }
  };

  // Handle "Select All" button
  const handleSelectAll = () => {
    if (disabled) return;
    const allFloorIds = sortedFloors.map((f) => f.id);
    onSelectionChange(allFloorIds.slice(0, maxSelection));
  };

  // Handle "Clear" button
  const handleClear = () => {
    if (disabled) return;
    onSelectionChange([]);
  };

  // Check if a floor can be selected (not at max limit or already selected)
  const canSelectFloor = (floorId: string): boolean => {
    if (selectedFloorIds.includes(floorId)) return true;
    return selectedFloorIds.length < maxSelection;
  };

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>층 선택</h3>
        <div className={styles.selectionCount}>
          {selectedFloorIds.length} / {maxSelection}
        </div>
      </div>

      {/* Floor List */}
      <div className={styles.floorList}>
        {sortedFloors.map((floor) => {
          const isSelected = selectedFloorIds.includes(floor.id);
          const isDisabled = disabled || !canSelectFloor(floor.id);
          const objectCount = getObjectCount(floor);
          const status = getStatusSummary(floor);

          return (
            <label
              key={floor.id}
              className={`${styles.floorItem} ${isSelected ? styles.selected : ''} ${
                isDisabled ? styles.disabled : ''
              }`}
            >
              <div className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleFloorToggle(floor.id)}
                  disabled={isDisabled}
                />
              </div>

              <div className={styles.floorInfo}>
                <div className={styles.floorName}>
                  {floor.name}
                  <span className={`${styles.statusDot} ${styles[status]}`} />
                </div>
                <div className={styles.floorMeta}>
                  {objectCount} objects
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className={styles.actions}>
        <button
          onClick={handleSelectAll}
          disabled={disabled}
          className={styles.actionButton}
        >
          모두 선택
        </button>
        <button
          onClick={handleClear}
          disabled={disabled || selectedFloorIds.length === 0}
          className={styles.actionButton}
        >
          선택 해제
        </button>
      </div>

      {/* Warning for max selection */}
      {selectedFloorIds.length >= maxSelection && (
        <div className={styles.warning}>
          최대 {maxSelection}개 층까지 선택할 수 있습니다
        </div>
      )}
    </div>
  );
}
