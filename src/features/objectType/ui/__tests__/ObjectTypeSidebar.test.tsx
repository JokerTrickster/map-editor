/**
 * ObjectTypeSidebar Component Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ObjectTypeSidebar } from '../ObjectTypeSidebar'
import { useObjectTypeStore } from '@/shared/store/objectTypeStore'

describe('ObjectTypeSidebar', () => {
  beforeEach(() => {
    // Reset store before each test
    useObjectTypeStore.setState({
      types: [],
    })
  })

  it('should render empty state when no types exist', () => {
    render(<ObjectTypeSidebar />)

    expect(screen.getByText(/객체 타입이 없습니다/)).toBeDefined()
    expect(screen.getByText(/\+ 추가 버튼을 눌러 타입을 생성하세요/)).toBeDefined()
  })

  it('should show add form when add button is clicked', () => {
    render(<ObjectTypeSidebar />)

    const addButton = screen.getByText('+ 추가')
    fireEvent.click(addButton)

    expect(screen.getByPlaceholderText('타입명 (예: CCTV)')).toBeDefined()
    expect(screen.getByText('클릭하여 아이콘/이미지 업로드')).toBeDefined()
    expect(screen.getByText('저장')).toBeDefined()
    expect(screen.getByText('취소')).toBeDefined()
  })

  it('should show error when trying to add type without name', () => {
    render(<ObjectTypeSidebar />)

    const addButton = screen.getByText('+ 추가')
    fireEvent.click(addButton)

    const saveButton = screen.getByText('저장')
    fireEvent.click(saveButton)

    expect(screen.getByText('타입명을 입력하세요')).toBeDefined()
  })

  it('should add new type when form is submitted with valid data', () => {
    render(<ObjectTypeSidebar />)

    const addButton = screen.getByText('+ 추가')
    fireEvent.click(addButton)

    const nameInput = screen.getByPlaceholderText('타입명 (예: CCTV)')
    fireEvent.change(nameInput, { target: { value: 'CCTV' } })

    const saveButton = screen.getByText('저장')
    fireEvent.click(saveButton)

    const state = useObjectTypeStore.getState()
    expect(state.types.length).toBe(1)
    expect(state.types[0].name).toBe('CCTV')
  })

  it('should cancel add form when cancel button is clicked', () => {
    render(<ObjectTypeSidebar />)

    const addButton = screen.getByText('+ 추가')
    fireEvent.click(addButton)

    const nameInput = screen.getByPlaceholderText('타입명 (예: CCTV)')
    fireEvent.change(nameInput, { target: { value: 'CCTV' } })

    const cancelButton = screen.getByText('취소')
    fireEvent.click(cancelButton)

    // Form should be hidden, add button should be visible
    expect(screen.getByText('+ 추가')).toBeDefined()
  })

  it('should add property to form when add property button is clicked', () => {
    render(<ObjectTypeSidebar />)

    const addButton = screen.getByText('+ 추가')
    fireEvent.click(addButton)

    const initialKeyInputs = screen.getAllByPlaceholderText('키')
    const initialCount = initialKeyInputs.length

    const addPropertyButton = screen.getByText('+ 속성 추가')
    fireEvent.click(addPropertyButton)

    const newKeyInputs = screen.getAllByPlaceholderText('키')
    expect(newKeyInputs.length).toBe(initialCount + 1)
  })

  it('should remove property when remove button is clicked', () => {
    render(<ObjectTypeSidebar />)

    const addButton = screen.getByText('+ 추가')
    fireEvent.click(addButton)

    const initialKeyInputs = screen.getAllByPlaceholderText('키')
    const initialCount = initialKeyInputs.length

    const removeButtons = screen.getAllByText('×')
    fireEvent.click(removeButtons[0])

    const keyInputs = screen.getAllByPlaceholderText('키')
    expect(keyInputs.length).toBe(initialCount - 1)
  })

  it('should add type with properties', () => {
    render(<ObjectTypeSidebar />)

    const addButton = screen.getByText('+ 추가')
    fireEvent.click(addButton)

    const nameInput = screen.getByPlaceholderText('타입명 (예: CCTV)')
    fireEvent.change(nameInput, { target: { value: 'CCTV' } })

    const addPropertyButton = screen.getByText('+ 속성 추가')
    fireEvent.click(addPropertyButton)

    const keyInputs = screen.getAllByPlaceholderText('키')
    fireEvent.change(keyInputs[keyInputs.length - 1], { target: { value: 'ip_address' } })

    const saveButton = screen.getByText('저장')
    fireEvent.click(saveButton)

    const state = useObjectTypeStore.getState()
    expect(state.types.length).toBe(1)
    expect(state.types[0].properties.some(p => p.key === 'ip_address')).toBe(true)
  })

  it('should display existing types', () => {
    useObjectTypeStore.getState().addType({
      name: 'CCTV',
      icon: '📷',
      color: '#3b82f6',
      properties: [
        { key: 'ip_address', type: 'string', required: true },
      ],
    })

    render(<ObjectTypeSidebar />)

    expect(screen.getByText('CCTV')).toBeDefined()
  })

  it('should show edit form when edit button is clicked', () => {
    useObjectTypeStore.getState().addType({
      name: 'CCTV',
      icon: '📷',
      color: '#3b82f6',
      properties: [],
    })

    render(<ObjectTypeSidebar />)

    const editButton = screen.getByTitle('수정')
    fireEvent.click(editButton)

    const nameInput = screen.getByPlaceholderText('타입명 (예: CCTV)') as HTMLInputElement
    expect(nameInput.value).toBe('CCTV')
  })

  it('should update type when edit form is submitted', () => {
    useObjectTypeStore.getState().addType({
      name: 'CCTV',
      icon: '📷',
      color: '#3b82f6',
      properties: [],
    })

    render(<ObjectTypeSidebar />)

    const editButton = screen.getByTitle('수정')
    fireEvent.click(editButton)

    const nameInput = screen.getByPlaceholderText('타입명 (예: CCTV)')
    fireEvent.change(nameInput, { target: { value: 'Camera' } })

    const saveButton = screen.getByText('저장')
    fireEvent.click(saveButton)

    const state = useObjectTypeStore.getState()
    expect(state.types[0].name).toBe('Camera')
  })

  it('should delete type when delete button is clicked and confirmed', () => {
    // Mock window.confirm
    const originalConfirm = window.confirm
    window.confirm = () => true

    useObjectTypeStore.getState().addType({
      name: 'CCTV',
      icon: '📷',
      color: '#3b82f6',
      properties: [],
    })

    render(<ObjectTypeSidebar />)

    const deleteButton = screen.getByTitle('삭제')
    fireEvent.click(deleteButton)

    const state = useObjectTypeStore.getState()
    expect(state.types.length).toBe(0)

    // Restore original confirm
    window.confirm = originalConfirm
  })

  it('should not delete type when delete is cancelled', () => {
    // Mock window.confirm
    const originalConfirm = window.confirm
    window.confirm = () => false

    useObjectTypeStore.getState().addType({
      name: 'CCTV',
      icon: '📷',
      color: '#3b82f6',
      properties: [],
    })

    render(<ObjectTypeSidebar />)

    const deleteButton = screen.getByTitle('삭제')
    fireEvent.click(deleteButton)

    const state = useObjectTypeStore.getState()
    expect(state.types.length).toBe(1)

    // Restore original confirm
    window.confirm = originalConfirm
  })

  it('should display multiple object types', () => {
    useObjectTypeStore.getState().addType({
      name: 'CCTV',
      icon: '📷',
      properties: [],
    })

    useObjectTypeStore.getState().addType({
      name: 'Charger',
      icon: '🔌',
      properties: [],
    })

    render(<ObjectTypeSidebar />)

    expect(screen.getByText('CCTV')).toBeDefined()
    expect(screen.getByText('Charger')).toBeDefined()
  })
})
