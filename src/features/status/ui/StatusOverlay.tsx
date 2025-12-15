/**
 * Status Overlay Component
 * Displays status indicators overlaid on canvas objects
 */

import { useEffect } from 'react';
import { dia } from '@joint/core';
import { CctvStatusIndicator } from './CctvStatusIndicator';
import { ParkingStatusIndicator } from './ParkingStatusIndicator';
import styles from './StatusOverlay.module.css';

interface StatusOverlayProps {
  /** JointJS graph instance */
  graph: dia.Graph;
  /** JointJS paper instance for coordinate mapping */
  paper: dia.Paper;
}

/**
 * Status Overlay
 * Renders status indicators positioned over map objects
 *
 * Usage in EditorPage:
 * ```tsx
 * import { StatusOverlay, useStatusStore, statusService } from '@/features/status';
 *
 * // In component:
 * const { connect, disconnect } = useStatusStore();
 *
 * useEffect(() => {
 *   // Initialize with object IDs
 *   const cctvIds = graph.getElements()
 *     .filter(el => el.get('type') === 'Cctv')
 *     .map(el => el.id);
 *   const parkingIds = graph.getElements()
 *     .filter(el => el.get('type') === 'ParkingLocation')
 *     .map(el => el.id);
 *
 *   statusService.initialize(cctvIds, parkingIds);
 *   connect();
 *
 *   return () => disconnect();
 * }, [graph]);
 *
 * // Render:
 * {graph && paper && (
 *   <StatusOverlay graph={graph} paper={paper} />
 * )}
 * ```
 */
export function StatusOverlay({ graph, paper }: StatusOverlayProps) {
  // Get all elements and filter by type
  const elements = graph.getElements();

  const cctvElements = elements.filter(el => {
    const type = el.get('type') || el.get('objectType');
    return type === 'Cctv' || type === 'cctv';
  });

  const parkingElements = elements.filter(el => {
    const type = el.get('type') || el.get('objectType');
    return type === 'ParkingLocation' || type === 'parkingLocation';
  });

  // Listen for graph changes to re-render
  useEffect(() => {
    const handler = () => {
      // Force re-render when graph changes
    };

    graph.on('change', handler);
    return () => {
      graph.off('change', handler);
    };
  }, [graph]);

  return (
    <div className={styles.statusOverlay}>
      {/* CCTV Status Indicators */}
      {cctvElements.map(element => {
        const bbox = element.getBBox();
        const position = paper.localToClientPoint(bbox.x, bbox.y);
        const objectId = String(element.id);

        return (
          <div
            key={objectId}
            className={styles.statusPosition}
            style={{
              left: position.x,
              top: position.y - 30, // Position above the object
            }}
          >
            <CctvStatusIndicator objectId={objectId} />
          </div>
        );
      })}

      {/* Parking Status Indicators */}
      {parkingElements.map(element => {
        const bbox = element.getBBox();
        const position = paper.localToClientPoint(bbox.x, bbox.y);
        const objectId = String(element.id);

        return (
          <div
            key={objectId}
            className={styles.statusPosition}
            style={{
              left: position.x,
              top: position.y - 30, // Position above the object
            }}
          >
            <ParkingStatusIndicator objectId={objectId} />
          </div>
        );
      })}
    </div>
  );
}
