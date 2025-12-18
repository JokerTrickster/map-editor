/**
 * Component tests for FloorSelectorPanel
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { FloorSelectorPanel } from './FloorSelectorPanel';
import { Floor } from '@/shared/store';

// Mock floors
const mockFloors: Floor[] = [
  {
    id: 'floor1',
    lotId: 'lot1',
    name: 'B1',
    order: -1,
    mapData: { objects: Array(20).fill({}) } as any,
    created: '2024-01-01',
    modified: '2024-01-01',
  },
  {
    id: 'floor2',
    lotId: 'lot1',
    name: '1F',
    order: 0,
    mapData: { objects: Array(25).fill({}) } as any,
    created: '2024-01-01',
    modified: '2024-01-01',
  },
  {
    id: 'floor3',
    lotId: 'lot1',
    name: '2F',
    order: 1,
    mapData: { objects: Array(18).fill({}) } as any,
    created: '2024-01-01',
    modified: '2024-01-01',
  },
];

describe('FloorSelectorPanel', () => {
  it('renders floor list correctly', () => {
    const onSelectionChange = vi.fn();

    render(
      <FloorSelectorPanel
        floors={mockFloors}
        selectedFloorIds={[]}
        onSelectionChange={onSelectionChange}
      />
    );

    expect(screen.getByText('B1')).toBeInTheDocument();
    expect(screen.getByText('1F')).toBeInTheDocument();
    expect(screen.getByText('2F')).toBeInTheDocument();
  });

  it('displays object counts correctly', () => {
    const onSelectionChange = vi.fn();

    render(
      <FloorSelectorPanel
        floors={mockFloors}
        selectedFloorIds={[]}
        onSelectionChange={onSelectionChange}
      />
    );

    expect(screen.getByText('20 objects')).toBeInTheDocument();
    expect(screen.getByText('25 objects')).toBeInTheDocument();
    expect(screen.getByText('18 objects')).toBeInTheDocument();
  });

  it('shows selected floors as checked', () => {
    const onSelectionChange = vi.fn();

    render(
      <FloorSelectorPanel
        floors={mockFloors}
        selectedFloorIds={['floor1', 'floor3']}
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked(); // B1
    expect(checkboxes[1]).not.toBeChecked(); // 1F
    expect(checkboxes[2]).toBeChecked(); // 2F
  });

  it('calls onSelectionChange when checkbox is clicked', () => {
    const onSelectionChange = vi.fn();

    render(
      <FloorSelectorPanel
        floors={mockFloors}
        selectedFloorIds={[]}
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(onSelectionChange).toHaveBeenCalledWith(['floor1']);
  });

  it('removes floor from selection when unchecked', () => {
    const onSelectionChange = vi.fn();

    render(
      <FloorSelectorPanel
        floors={mockFloors}
        selectedFloorIds={['floor1', 'floor2']}
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Uncheck B1

    expect(onSelectionChange).toHaveBeenCalledWith(['floor2']);
  });

  it('shows selection count', () => {
    const onSelectionChange = vi.fn();

    render(
      <FloorSelectorPanel
        floors={mockFloors}
        selectedFloorIds={['floor1', 'floor2']}
        onSelectionChange={onSelectionChange}
        maxSelection={5}
      />
    );

    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });

  it('selects all floors when "모두 선택" is clicked', () => {
    const onSelectionChange = vi.fn();

    render(
      <FloorSelectorPanel
        floors={mockFloors}
        selectedFloorIds={[]}
        onSelectionChange={onSelectionChange}
      />
    );

    const selectAllButton = screen.getByText('모두 선택');
    fireEvent.click(selectAllButton);

    expect(onSelectionChange).toHaveBeenCalledWith(['floor1', 'floor2', 'floor3']);
  });

  it('clears all selections when "선택 해제" is clicked', () => {
    const onSelectionChange = vi.fn();

    render(
      <FloorSelectorPanel
        floors={mockFloors}
        selectedFloorIds={['floor1', 'floor2']}
        onSelectionChange={onSelectionChange}
      />
    );

    const clearButton = screen.getByText('선택 해제');
    fireEvent.click(clearButton);

    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('shows warning when max selection is reached', () => {
    const onSelectionChange = vi.fn();

    render(
      <FloorSelectorPanel
        floors={mockFloors}
        selectedFloorIds={['f1', 'f2', 'f3', 'f4', 'f5']}
        onSelectionChange={onSelectionChange}
        maxSelection={5}
      />
    );

    expect(screen.getByText(/최대 5개 층까지 선택할 수 있습니다/)).toBeInTheDocument();
  });

  it('disables checkboxes when disabled prop is true', () => {
    const onSelectionChange = vi.fn();

    render(
      <FloorSelectorPanel
        floors={mockFloors}
        selectedFloorIds={[]}
        onSelectionChange={onSelectionChange}
        disabled={true}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeDisabled();
    });
  });

  it('disables unselectable floors when max is reached', () => {
    const onSelectionChange = vi.fn();

    const manyFloors = Array.from({ length: 8 }, (_, i) => ({
      id: `floor${i + 1}`,
      lotId: 'lot1',
      name: `${i + 1}F`,
      order: i,
      mapData: null,
      created: '2024-01-01',
      modified: '2024-01-01',
    }));

    render(
      <FloorSelectorPanel
        floors={manyFloors}
        selectedFloorIds={['floor1', 'floor2', 'floor3', 'floor4', 'floor5']}
        onSelectionChange={onSelectionChange}
        maxSelection={5}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    // First 5 should be enabled (selected)
    expect(checkboxes[0]).not.toBeDisabled();
    expect(checkboxes[1]).not.toBeDisabled();
    expect(checkboxes[2]).not.toBeDisabled();
    expect(checkboxes[3]).not.toBeDisabled();
    expect(checkboxes[4]).not.toBeDisabled();

    // Remaining should be disabled
    expect(checkboxes[5]).toBeDisabled();
    expect(checkboxes[6]).toBeDisabled();
    expect(checkboxes[7]).toBeDisabled();
  });
});
