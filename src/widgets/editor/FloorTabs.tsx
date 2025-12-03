import { useEffect, useState, useRef } from 'react';
import { useProjectStore } from '@/shared/store/projectStore';
import { useFloorStore, type Floor } from '@/shared/store/floorStore';
import styles from './FloorTabs.module.css';

export function FloorTabs() {
  const currentLot = useProjectStore((state) => state.currentLot);
  const floors = useFloorStore((state) =>
    currentLot ? state.getFloorsByLotId(currentLot) : []
  );
  const currentFloor = useFloorStore((state) => state.currentFloor);
  const { addFloor, setCurrentFloor, updateFloor } = useFloorStore();

  // State for inline editing
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize first floor if none exists
  useEffect(() => {
    if (currentLot && floors.length === 0) {
      addFloor(currentLot, { order: 0 });
    }
  }, [currentLot, floors.length, addFloor]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingFloorId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingFloorId]);

  // Handle add floor
  const handleAddFloor = () => {
    if (!currentLot) return;

    const maxOrder = floors.length > 0 ? Math.max(...floors.map((f) => f.order)) : -1;
    const newOrder = maxOrder + 1;

    addFloor(currentLot, { order: newOrder });
  };

  // Floor deletion is completely disabled and removed

  // Handle floor selection
  const handleSelectFloor = (floorId: string) => {
    setCurrentFloor(floorId);
  };

  // Handle double-click to edit floor name
  const handleDoubleClick = (floor: Floor) => {
    setEditingFloorId(floor.id);
    setEditValue(floor.name);
  };

  // Handle save edit
  const handleSaveEdit = () => {
    if (!editingFloorId || !editValue.trim()) {
      setEditingFloorId(null);
      return;
    }

    updateFloor(editingFloorId, { name: editValue.trim() });
    setEditingFloorId(null);
    setEditValue('');
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingFloorId(null);
    setEditValue('');
  };

  // Handle input key down
  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSaveEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelEdit();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, floorId: string) => {
    const currentIndex = floors.findIndex((f) => f.id === floorId);

    if (event.key === 'ArrowLeft' && currentIndex > 0) {
      event.preventDefault();
      setCurrentFloor(floors[currentIndex - 1].id);
    } else if (event.key === 'ArrowRight' && currentIndex < floors.length - 1) {
      event.preventDefault();
      setCurrentFloor(floors[currentIndex + 1].id);
    }
    // Delete key is disabled
  };

  // Don't render if no current lot
  if (!currentLot) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyText}>No project selected</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        {floors.map((floor) => {
          const isActive = currentFloor === floor.id;
          const isEditing = editingFloorId === floor.id;

          return (
            <div
              key={floor.id}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
              onClick={() => !isEditing && handleSelectFloor(floor.id)}
              onDoubleClick={() => handleDoubleClick(floor)}
              onKeyDown={(e) => !isEditing && handleKeyDown(e, floor.id)}
              tabIndex={isEditing ? -1 : 0}
              role="tab"
              aria-selected={isActive}
            >
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.editInput}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onBlur={handleSaveEdit}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className={styles.tabName}>{floor.name}</span>
              )}
              {/* Delete button is disabled */}
            </div>
          );
        })}

        {/* Add Floor Button */}
        <button
          className={styles.addBtn}
          onClick={handleAddFloor}
          title="Add new floor"
          aria-label="Add new floor"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Add Floor</span>
        </button>
      </div>
    </div>
  );
}
