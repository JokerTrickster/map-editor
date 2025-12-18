/**
 * MultiFloorCanvas - Container for multiple floor canvases
 * Handles grid, stack, and side-by-side layouts
 */

import { useRef, useEffect } from 'react';
import { Floor, LayoutMode } from '@/shared/store';
import { FloorBadge } from '../FloorBadge';
import { StatusOverlay } from '@/features/status';
import { useJointJSCanvas } from '@/pages/editor/hooks/useJointJSCanvas';
import { useCanvasPanning } from '@/pages/editor/hooks/useCanvasPanning';
import { useCanvasZoom } from '@/pages/editor/hooks/useCanvasZoom';
import { useTheme } from '@/shared/context/ThemeContext';
import { useThemeSync } from '@/pages/editor/hooks/useThemeSync';
import styles from './MultiFloorCanvas.module.css';

export interface MultiFloorCanvasProps {
  floors: Floor[];
  layout: LayoutMode;
  synchronizedZoom?: boolean;
  onZoomChange?: (floorId: string, zoom: number) => void;
}

interface FloorCanvasProps {
  floor: Floor;
  layout: LayoutMode;
  synchronizedZoom?: boolean;
  externalZoom?: number;
  onZoomChange?: (zoom: number) => void;
}

/**
 * Individual floor canvas component
 */
function FloorCanvas({
  floor,
  layout,
  synchronizedZoom = false,
  externalZoom,
  onZoomChange,
}: FloorCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // JointJS Canvas
  const { graph, paper } = useJointJSCanvas(canvasRef);

  // Canvas interactions (read-only)
  useCanvasPanning(paper, graph, canvasRef);
  useCanvasZoom(paper, canvasRef, (newZoom) => {
    if (onZoomChange) {
      onZoomChange(newZoom);
    }
  });
  useThemeSync(paper, theme);

  // Load graph from floor data
  useEffect(() => {
    console.log(`🔍 FloorCanvas[${floor.name}]: Attempting to load graph...`);
    console.log(`  - graph: ${!!graph}, paper: ${!!paper}`);
    console.log(`  - mapData: ${!!floor.mapData}`);
    console.log(`  - graphJson: ${!!floor.mapData?.graphJson}`);

    if (!graph || !paper || !floor.mapData?.graphJson) {
      console.log(`❌ FloorCanvas[${floor.name}]: Missing dependencies, cannot render`);
      return;
    }

    try {
      // Clear existing graph
      graph.clear();

      // Load graph data
      graph.fromJSON(floor.mapData.graphJson);

      const cellCount = graph.getCells().length;
      console.log(`✅ FloorCanvas[${floor.name}]: Loaded ${cellCount} cells`);

      // Fit content to screen after rendering
      setTimeout(() => {
        if (cellCount > 0) {
          paper.scaleContentToFit({
            padding: 30,
            maxScale: 1.2,
            minScale: 0.1,
          });
          console.log(`📐 FloorCanvas[${floor.name}]: Fitted to viewport`);
        }
      }, 100);
    } catch (error) {
      console.error(`❌ FloorCanvas[${floor.name}]: Failed to load graph:`, error);
    }
  }, [graph, paper, floor]);

  // Set paper to read-only mode
  useEffect(() => {
    if (!paper) return;

    paper.setInteractivity(() => ({
      elementMove: false,
      addLinkFromMagnet: false,
    }));
  }, [paper]);

  // Sync zoom if enabled
  useEffect(() => {
    if (synchronizedZoom && externalZoom !== undefined && paper) {
      paper.scale(externalZoom, externalZoom);
    }
  }, [synchronizedZoom, externalZoom, paper]);

  // Calculate object count
  const objectCount = floor.mapData?.objects?.length || 0;
  const hasGraphData = !!floor.mapData?.graphJson;

  return (
    <div className={`${styles.floorCanvas} ${styles[layout]}`}>
      {!hasGraphData ? (
        <div className={styles.emptyState}>
          <p>{floor.name}: 맵 데이터 없음</p>
          <span style={{fontSize: '12px', color: '#888'}}>이 층에는 저장된 맵이 없습니다</span>
        </div>
      ) : (
        <>
          <div ref={canvasRef} className={styles.canvas} />

          {/* Floor Badge */}
          <FloorBadge
            floor={floor}
            objectCount={objectCount}
            statusSummary="ok"
          />

          {/* Status Overlay */}
          {graph && paper && (
            <StatusOverlay graph={graph} paper={paper} />
          )}
        </>
      )}
    </div>
  );
}

/**
 * Multi-floor canvas container with layout management
 */
export function MultiFloorCanvas({
  floors,
  layout,
  synchronizedZoom = false,
  onZoomChange,
}: MultiFloorCanvasProps) {
  const masterZoomRef = useRef<number>(1);

  // Handle zoom change from individual canvas
  const handleFloorZoomChange = (floorId: string, zoom: number) => {
    if (synchronizedZoom) {
      masterZoomRef.current = zoom;
    }

    if (onZoomChange) {
      onZoomChange(floorId, zoom);
    }
  };

  // Determine grid columns based on floor count
  const getGridColumns = (): number => {
    const count = floors.length;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count <= 4) return 2;
    return 3;
  };

  const gridColumns = getGridColumns();

  // Handle empty state
  if (floors.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </div>
        <h3 className={styles.emptyTitle}>층이 선택되지 않았습니다</h3>
        <p className={styles.emptyMessage}>
          왼쪽 패널에서 표시할 층을 선택하세요
        </p>
      </div>
    );
  }

  return (
    <div
      className={`${styles.container} ${styles[layout]}`}
      style={
        layout === 'grid'
          ? { gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }
          : undefined
      }
    >
      {floors.map((floor) => (
        <FloorCanvas
          key={floor.id}
          floor={floor}
          layout={layout}
          synchronizedZoom={synchronizedZoom}
          externalZoom={synchronizedZoom ? masterZoomRef.current : undefined}
          onZoomChange={(zoom) => handleFloorZoomChange(floor.id, zoom)}
        />
      ))}
    </div>
  );
}
