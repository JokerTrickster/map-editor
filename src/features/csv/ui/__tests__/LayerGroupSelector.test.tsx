/**
 * LayerGroupSelector Component Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LayerGroupSelector } from '../LayerGroupSelector'
import { useCSVStore } from '../../model/csvStore'
import type { GroupedLayer } from '../../lib/layerGrouper'

describe('LayerGroupSelector', () => {
  const mockGroupedLayers: GroupedLayer[] = [
    {
      layer: 'OUTLINE',
      entities: [{} as any, {} as any],
      count: 2,
      entityTypes: new Set(['LINE']),
    },
    {
      layer: 'PARKING_SPOT',
      entities: [{} as any, {} as any, {} as any],
      count: 3,
      entityTypes: new Set(['POLYGON']),
    },
    {
      layer: 'CCTV',
      entities: [{} as any],
      count: 1,
      entityTypes: new Set(['POINT']),
    },
  ]

  beforeEach(() => {
    // Reset store before each test
    useCSVStore.setState({
      groupedLayers: null,
      selectedLayers: new Set<string>(),
    })
  })

  it('should not render when no grouped layers', () => {
    const { container } = render(<LayerGroupSelector />)
    expect(container.firstChild).toBeNull()
  })

  it('should render layer list with entity counts', () => {
    useCSVStore.setState({
      groupedLayers: mockGroupedLayers,
      selectedLayers: new Set<string>(),
    })

    render(<LayerGroupSelector />)

    expect(screen.getByText('OUTLINE')).toBeDefined()
    expect(screen.getByText('2개 엔티티')).toBeDefined()
    expect(screen.getByText('PARKING_SPOT')).toBeDefined()
    expect(screen.getByText('3개 엔티티')).toBeDefined()
    expect(screen.getByText('CCTV')).toBeDefined()
    expect(screen.getByText('1개 엔티티')).toBeDefined()
  })

  it('should toggle layer selection on checkbox click', () => {
    useCSVStore.setState({
      groupedLayers: mockGroupedLayers,
      selectedLayers: new Set<string>(),
    })

    render(<LayerGroupSelector />)

    const checkboxes = screen.getAllByRole('checkbox')

    // Click first checkbox
    fireEvent.click(checkboxes[0])

    const state = useCSVStore.getState()
    expect(state.selectedLayers.has('OUTLINE')).toBe(true)
  })

  it('should select all layers on button click', () => {
    useCSVStore.setState({
      groupedLayers: mockGroupedLayers,
      selectedLayers: new Set<string>(),
    })

    render(<LayerGroupSelector />)

    const selectAllButton = screen.getByText('전체 선택')

    fireEvent.click(selectAllButton)

    const state = useCSVStore.getState()
    expect(state.selectedLayers.size).toBe(3)
    expect(state.selectedLayers.has('OUTLINE')).toBe(true)
    expect(state.selectedLayers.has('PARKING_SPOT')).toBe(true)
    expect(state.selectedLayers.has('CCTV')).toBe(true)
  })

  it('should deselect all layers on button click', () => {
    useCSVStore.setState({
      groupedLayers: mockGroupedLayers,
      selectedLayers: new Set(['OUTLINE', 'PARKING_SPOT']),
    })

    render(<LayerGroupSelector />)

    const deselectAllButton = screen.getByText('선택 해제')

    fireEvent.click(deselectAllButton)

    const state = useCSVStore.getState()
    expect(state.selectedLayers.size).toBe(0)
  })

  it('should highlight selected layers with CSS class', () => {
    useCSVStore.setState({
      groupedLayers: mockGroupedLayers,
      selectedLayers: new Set(['OUTLINE']),
    })

    const { container } = render(<LayerGroupSelector />)

    const selectedItem = container.querySelector('.selected')
    expect(selectedItem).toBeDefined()
    if (selectedItem?.textContent) {
      expect(selectedItem.textContent).toContain('OUTLINE')
    }
  })
})
