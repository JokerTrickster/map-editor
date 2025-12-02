/**
 * Store exports - Central access point for all Zustand stores
 */

export { useProjectStore } from './projectStore';
export type { ParkingLot } from './projectStore';

export { useFloorStore } from './floorStore';
export type { Floor, MapData } from './floorStore';

export { useCanvasStore } from './canvasStore';

export { useObjectTypeStore } from './objectTypeStore';
export type { ObjectType, Property, Mapping } from './objectTypeStore';
