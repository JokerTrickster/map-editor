/**
 * EditorSidebar Component
 * Right sidebar showing map info and object list
 */

import { dia } from '@joint/core'
import styles from './EditorSidebar.module.css'

interface EditorSidebarProps {
  loadedFileName: string | null
  elementCount: number
  zoom: number
  objectsByLayer: Map<string, dia.Element[]>
  selectedElementId: string | null
  onObjectClick: (elementId: string) => void
}

export function EditorSidebar({
  loadedFileName,
  elementCount,
  zoom,
  objectsByLayer,
  selectedElementId,
  onObjectClick,
}: EditorSidebarProps) {
  return (
    <aside className={styles.rightSidebar}>
      <div className={styles.sidebarHeader}>Map Info</div>
      <div className={styles.sidebarContent}>
        {loadedFileName ? (
          <>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>File</div>
              <div className={styles.infoValue}>{loadedFileName}</div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Elements</div>
              <div className={styles.infoValue}>{elementCount}</div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Zoom</div>
              <div className={styles.infoValue}>{Math.round(zoom * 100)}%</div>
            </div>

            {/* Object List by Layer */}
            <div className={styles.objectList}>
              <div className={styles.objectListHeader}>Objects</div>
              <div className={styles.objectListContent}>
                {Array.from(objectsByLayer.entries()).map(([layer, elements]) => (
                  <details key={layer} open>
                    <summary className={styles.layerSummary}>
                      {layer} ({elements.length})
                    </summary>
                    <div className={styles.layerElements}>
                      {elements.map((element) => {
                        const elementId = element.id as string
                        const data = element.get('data')
                        const text = data?.text || data?.entityHandle || elementId.slice(0, 8)
                        const isSelected = selectedElementId === elementId

                        return (
                          <div
                            key={elementId}
                            onClick={() => onObjectClick(elementId)}
                            className={`${styles.elementItem} ${isSelected ? styles.elementItemSelected : ''}`}
                          >
                            {text}
                          </div>
                        )
                      })}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className={styles.emptyMessage}>Upload a CSV file to view the map</p>
        )}
      </div>
    </aside>
  )
}
