/**
 * ResizablePanel Component
 * Resizable and collapsible panel for sidebars
 */

import { useState, useRef, useEffect, type ReactNode } from 'react'
import styles from './ResizablePanel.module.css'

interface ResizablePanelProps {
  side: 'left' | 'right'
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  children: ReactNode
  onWidthChange?: (width: number) => void
}

export function ResizablePanel({
  side,
  defaultWidth = 300,
  minWidth = 200,
  maxWidth = 600,
  children,
  onWidthChange,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [buttonPosition, setButtonPosition] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return

      const panelRect = panelRef.current.getBoundingClientRect()
      let newWidth: number

      if (side === 'left') {
        newWidth = e.clientX - panelRect.left
      } else {
        newWidth = panelRect.right - e.clientX
      }

      // Constrain width
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))

      setWidth(newWidth)
      onWidthChange?.(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, side, minWidth, maxWidth, onWidthChange])

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  // Update button position when panel width or collapse state changes
  useEffect(() => {
    if (panelRef.current && !isCollapsed) {
      const rect = panelRef.current.getBoundingClientRect()
      if (side === 'left') {
        setButtonPosition(rect.right)
      } else {
        setButtonPosition(rect.left)
      }
    }
  }, [width, isCollapsed, side])

  return (
    <>
      {/* Collapse Button - Always visible */}
      <button
        className={`${styles.collapseButton} ${styles[`collapse-${side}`]} ${
          isCollapsed ? styles.collapsedButton : ''
        }`}
        onClick={toggleCollapse}
        style={
          isCollapsed
            ? undefined
            : {
                [side === 'left' ? 'left' : 'right']:
                  side === 'left'
                    ? `${buttonPosition - 12}px`
                    : `${window.innerWidth - buttonPosition - 12}px`,
              }
        }
        title={isCollapsed ? `Show ${side} panel` : `Hide ${side} panel`}
      >
        {isCollapsed ? (
          side === 'left' ? '→' : '←'
        ) : (
          side === 'left' ? '←' : '→'
        )}
      </button>

      {/* Panel */}
      <div
        ref={panelRef}
        className={`${styles.panel} ${styles[side]} ${isCollapsed ? styles.collapsed : ''}`}
        style={{ width: isCollapsed ? 0 : `${width}px` }}
      >
        {/* Panel Content */}
        {!isCollapsed && <div className={styles.content}>{children}</div>}

        {/* Resize Handle */}
        {!isCollapsed && (
          <div
            className={`${styles.resizeHandle} ${styles[`handle-${side}`]} ${
              isResizing ? styles.resizing : ''
            }`}
            onMouseDown={handleResizeStart}
          />
        )}
      </div>
    </>
  )
}
