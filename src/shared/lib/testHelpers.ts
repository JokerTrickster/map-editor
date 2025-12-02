/**
 * Test Helpers - Utility functions for manual testing
 * Use in browser console to initialize test data
 */

import { useProjectStore } from '@/shared/store/projectStore';
import { useFloorStore } from '@/shared/store/floorStore';

/**
 * Initialize a test parking lot project
 * Usage in browser console:
 *   window.initTestProject()
 */
export function initTestProject() {
  const projectStore = useProjectStore.getState();
  const floorStore = useFloorStore.getState();

  try {
    // Create a test parking lot
    projectStore.createLot({
      name: 'Test Parking Lot',
      description: 'Test project for floor management',
    });

    const currentLot = projectStore.currentLot;
    if (!currentLot) {
      console.error('Failed to create test lot');
      return;
    }

    // Add initial floor (1F) - this should happen automatically but let's ensure it
    const existingFloors = floorStore.getFloorsByLotId(currentLot);
    if (existingFloors.length === 0) {
      floorStore.addFloor(currentLot, { order: 0 });
    }

    console.log('✅ Test project initialized successfully!');
    console.log('Lot ID:', currentLot);
    console.log('Floors:', floorStore.getFloorsByLotId(currentLot));
  } catch (error) {
    console.error('Failed to initialize test project:', error);
  }
}

/**
 * Clear all test data
 * Usage in browser console:
 *   window.clearTestData()
 */
export function clearTestData() {
  const projectStore = useProjectStore.getState();
  const floorStore = useFloorStore.getState();

  const lots = projectStore.lots;
  lots.forEach((lot) => {
    projectStore.deleteLot(lot.id);
  });

  const floors = floorStore.floors;
  floors.forEach((floor) => {
    floorStore.deleteFloor(floor.id);
  });

  console.log('✅ All test data cleared!');
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).initTestProject = initTestProject;
  (window as any).clearTestData = clearTestData;
}
