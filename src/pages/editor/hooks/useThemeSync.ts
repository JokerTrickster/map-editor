/**
 * useThemeSync Hook
 * Synchronizes canvas theme with application theme
 */

import { useEffect } from 'react'
import { dia } from '@joint/core'

export function useThemeSync(paper: dia.Paper | null, theme: 'light' | 'dark') {
  useEffect(() => {
    if (!paper) return

    // Use setTimeout to ensure the DOM has been updated by ThemeProvider
    setTimeout(() => {
      const style = getComputedStyle(document.documentElement)
      const gridColor = style.getPropertyValue('--color-canvas-grid').trim()
      const bgColor = style.getPropertyValue('--color-canvas-bg').trim()

      const paperAny = paper as any
      if (paperAny.setGrid) {
        paperAny.setGrid({ name: 'dot', args: { color: gridColor, thickness: 1 } })
      }
      if (paperAny.drawBackground) {
        paperAny.drawBackground({ color: bgColor })
      }
    }, 0)
  }, [paper, theme])
}
