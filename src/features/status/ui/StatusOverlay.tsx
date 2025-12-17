/**
 * Status Overlay Component
 * Displays status indicators overlaid on canvas objects
 * and applies visual changes to elements based on their status
 */

import { useEffect, useState } from 'react';
import { dia } from '@joint/core';
import { CctvStatusIndicator } from './CctvStatusIndicator';
import { ParkingStatusIndicator } from './ParkingStatusIndicator';
import { useStatusStore } from '../model/statusStore';
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
  // Force re-render when paper viewport changes (zoom/pan)
  const [, forceUpdate] = useState({});

  // Get all elements and filter by type/ID pattern
  const elements = graph.getElements();

  const cctvElements = elements.filter(el => {
    const id = String(el.id);
    const type = el.get('type') || el.get('objectType');

    return (
      type === 'Cctv' ||
      type === 'cctv' ||
      id.includes('cctv') ||
      id.includes('onepassreader') ||
      id.includes('reader')
    );
  });

  const parkingElements = elements.filter(el => {
    const id = String(el.id);
    const type = el.get('type') || el.get('objectType');

    return (
      type === 'ParkingLocation' ||
      type === 'parkingLocation' ||
      type === 'parking' ||
      id.includes('parking')
    );
  });

  // Get status data from store
  const { cctvStatuses, parkingStatuses } = useStatusStore();

  // Listen to paper transformations (zoom, pan) to update badge positions
  useEffect(() => {
    const handleTransform = () => {
      // Force re-render to recalculate positions
      forceUpdate({});
    };

    // Subscribe to paper transform events
    paper.on('scale', handleTransform);
    paper.on('translate', handleTransform);

    return () => {
      paper.off('scale', handleTransform);
      paper.off('translate', handleTransform);
    };
  }, [paper]);

  // Apply visual changes to elements based on status
  useEffect(() => {
    // Update parking space colors based on occupancy
    parkingElements.forEach(element => {
      const objectId = String(element.id);
      const status = parkingStatuses[objectId];

      if (status) {
        // Store original color if not already stored
        if (!element.get('originalColor')) {
          const currentColor = element.attr('body/fill') || '#4b5563'; // gray-600
          element.set('originalColor', currentColor);
        }

        // Change color based on occupancy
        if (status.occupied) {
          element.attr('body/fill', '#ef4444'); // red-500 when occupied
          element.attr('body/fillOpacity', 0.7);
        } else {
          // Restore original color when available
          const originalColor = element.get('originalColor') || '#4b5563';
          element.attr('body/fill', originalColor);
          element.attr('body/fillOpacity', 0.5);
        }
      }
    });

    // Update CCTV appearance based on connection status
    cctvElements.forEach(element => {
      const objectId = String(element.id);
      const status = cctvStatuses[objectId];

      if (status) {
        // For disconnected CCTV, we'll add a red badge via CSS
        // The badge will be rendered in the indicator component
        if (!status.connected) {
          element.attr('root/data-cctv-disconnected', true);
        } else {
          element.attr('root/data-cctv-disconnected', false);
        }
      }
    });
  }, [parkingElements, cctvElements, parkingStatuses, cctvStatuses]);

  // Listen for graph changes to re-render
  useEffect(() => {
    const handler = () => {
      // Force re-render when graph changes
      forceUpdate({});
    };

    graph.on('change', handler);
    return () => {
      graph.off('change', handler);
    };
  }, [graph]);

  // Get current paper transformations
  const scale = paper.scale();
  const translate = paper.translate();

  return (
    <div className={styles.statusOverlay}>
      {/* CCTV Status Indicators */}
      {cctvElements.map((element) => {
        const bbox = element.getBBox();
        // Position badge at top-right corner of CCTV icon
        // Calculate screen position using paper transformations
        const x = (bbox.x + bbox.width) * scale.sx + translate.tx;
        const y = bbox.y * scale.sy + translate.ty;
        const objectId = String(element.id);

        return (
          <div
            key={objectId}
            className={styles.statusPosition}
            style={{
              left: `${x}px`,
              top: `${y - 8}px`,
            }}
          >
            <CctvStatusIndicator objectId={objectId} />
          </div>
        );
      })}

      {/* Parking Status Indicators */}
      {parkingElements.map(element => {
        const bbox = element.getBBox();
        // Calculate screen position using paper transformations
        const x = bbox.x * scale.sx + translate.tx;
        const y = bbox.y * scale.sy + translate.ty;
        const objectId = String(element.id);

        return (
          <div
            key={objectId}
            className={styles.statusPosition}
            style={{
              left: `${x}px`,
              top: `${y - 30}px`, // Position above the object
            }}
          >
            <ParkingStatusIndicator objectId={objectId} />
          </div>
        );
      })}
    </div>
  );
}
