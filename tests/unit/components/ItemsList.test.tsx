import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ItemsList } from '@/components/ItemsList'
import { createMockRegistryItem, render, screen } from '../../helpers/test-utils.tsx'
import type { RegistryItem } from '@/types/registry'

describe('ItemsList', () => {
  const mockOnItemSelect = vi.fn()

  const defaultItems: RegistryItem[] = [
    createMockRegistryItem({ title: 'Item A' }),
    createMockRegistryItem({
      repo_info: {
        archived: false,
        language: 'Go',
        last_commit: '2025-01-10T12:00:00Z',
        owner: 'test',
        repo: 'test',
        stars: 5000,
      },
      title: 'Item B',
    }),
    createMockRegistryItem({
      repo_info: {
        archived: false,
        language: 'Python',
        last_commit: '2025-01-20T12:00:00Z',
        owner: 'test',
        repo: 'test',
        stars: 500,
      },
      title: 'Item C',
    }),
  ]

  const defaultProps = {
    items: defaultItems,
    onItemSelect: mockOnItemSelect,
    selectedItem: null,
    sortBy: 'name' as const,
  }

  beforeEach(() => {
    mockOnItemSelect.mockClear()
  })

  it('renders all items', () => {
    render(
      <div style={{ height: '600px' }}>
        <ItemsList {...defaultProps} />
      </div>
    )

    expect(screen.getByText('Item A')).toBeInTheDocument()
    expect(screen.getByText('Item B')).toBeInTheDocument()
    expect(screen.getByText('Item C')).toBeInTheDocument()
  })

  it('sorts items by name', () => {
    render(
      <div style={{ height: '600px' }}>
        <ItemsList {...defaultProps} sortBy="name" />
      </div>
    )

    const items = screen.getAllByRole('button')
    expect(items[0]).toHaveTextContent('Item A')
    expect(items[1]).toHaveTextContent('Item B')
    expect(items[2]).toHaveTextContent('Item C')
  })

  it('sorts items by stars', () => {
    render(
      <div style={{ height: '600px' }}>
        <ItemsList {...defaultProps} sortBy="stars" />
      </div>
    )

    const items = screen.getAllByRole('button')
    // Item B has 5000 stars, should be first
    expect(items[0]).toHaveTextContent('Item B')
  })

  it('sorts items by updated date', () => {
    render(
      <div style={{ height: '600px' }}>
        <ItemsList {...defaultProps} sortBy="updated" />
      </div>
    )

    const items = screen.getAllByRole('button')
    // Item C has the most recent commit
    expect(items[0]).toHaveTextContent('Item C')
  })

  it('calls onItemSelect when item is clicked', async () => {
    const { user } = render(
      <div style={{ height: '600px' }}>
        <ItemsList {...defaultProps} />
      </div>
    )

    const item = screen.getByText('Item A')
    await user.click(item)

    expect(mockOnItemSelect).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Item A' }),
    )
  })

  it('highlights selected item', () => {
    const selectedItem = defaultItems[0]
    render(
      <div style={{ height: '600px' }}>
        <ItemsList {...defaultProps} selectedItem={selectedItem} />
      </div>
    )

    const itemButton = screen.getByText('Item A').closest('div[role="button"]')
    expect(itemButton).toHaveClass('border-cyan-500')
    expect(itemButton).toHaveClass('bg-cyan-500/10')
  })

  it('renders item description', () => {
    render(
      <div style={{ height: '600px' }}>
        <ItemsList {...defaultProps} />
      </div>
    )
    expect(screen.getAllByText('Test description')).toHaveLength(3)
  })

  it('renders item stars', () => {
    render(
      <div style={{ height: '600px' }}>
        <ItemsList {...defaultProps} />
      </div>
    )
    expect(screen.getByText('1,234')).toBeInTheDocument()
    expect(screen.getByText('5,000')).toBeInTheDocument()
  })

  it('renders item language', () => {
    render(
      <div style={{ height: '600px' }}>
        <ItemsList {...defaultProps} />
      </div>
    )
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText('Go')).toBeInTheDocument()
    expect(screen.getByText('Python')).toBeInTheDocument()
  })

  it('formats dates correctly', () => {
    const today = new Date().toISOString()
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

    const items = [
      createMockRegistryItem({
        repo_info: {
          archived: false,
          language: 'TypeScript',
          last_commit: today,
          owner: 'test',
          repo: 'test',
          stars: 100,
        },
        title: 'Today Item',
      }),
      createMockRegistryItem({
        repo_info: {
          archived: false,
          language: 'TypeScript',
          last_commit: yesterday,
          owner: 'test',
          repo: 'test',
          stars: 100,
        },
        title: 'Yesterday Item',
      }),
      createMockRegistryItem({
        repo_info: {
          archived: false,
          language: 'TypeScript',
          last_commit: weekAgo,
          owner: 'test',
          repo: 'test',
          stars: 100,
        },
        title: 'Week Ago Item',
      }),
    ]

    render(
      <div style={{ height: '600px' }}>
        <ItemsList {...defaultProps} items={items} />
      </div>
    )

    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Yesterday')).toBeInTheDocument()
    expect(screen.getByText('7d ago')).toBeInTheDocument()
  })

  it('shows archived badge for archived items', () => {
    const archivedItem = createMockRegistryItem({
      repo_info: {
        archived: true,
        language: 'TypeScript',
        last_commit: '2025-01-15T12:00:00Z',
        owner: 'test',
        repo: 'test',
        stars: 100,
      },
      title: 'Archived Item',
    })

    render(
      <div style={{ height: '600px' }}>
        <ItemsList {...defaultProps} items={[archivedItem]} />
      </div>
    )

    expect(screen.getByText('Archived')).toBeInTheDocument()
  })

  it('shows sub-items count when item has children', () => {
    const itemWithChildren = createMockRegistryItem({
      children: [
        createMockRegistryItem({ title: 'Child 1' }),
        createMockRegistryItem({ title: 'Child 2' }),
        createMockRegistryItem({ title: 'Child 3' }),
      ],
      title: 'Parent Item',
    })

    render(
      <div style={{ height: '600px' }}>
        <ItemsList {...defaultProps} items={[itemWithChildren]} />
      </div>
    )

    expect(screen.getByText('+3 sub-items')).toBeInTheDocument()
  })

  it('shows empty state when no items', () => {
    render(
      <div style={{ height: '600px' }}>
        <ItemsList {...defaultProps} items={[]} />
      </div>
    )

    expect(screen.getByText('No items in this category')).toBeInTheDocument()
  })

  it('handles keyboard navigation', async () => {
    const { user } = render(
      <div style={{ height: '600px' }}>
        <ItemsList {...defaultProps} />
      </div>
    )

    const itemButton = screen.getByText('Item A').closest<HTMLButtonElement>('div[role="button"]')
    expect(itemButton).not.toBeNull()
    itemButton!.focus()

    await user.keyboard('{Enter}')

    expect(mockOnItemSelect).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Item A' }),
    )
  })

  it('handles space key for selection', async () => {
    const { user } = render(
      <div style={{ height: '600px' }}>
        <ItemsList {...defaultProps} />
      </div>
    )

    const itemButton = screen.getByText('Item A').closest<HTMLButtonElement>('div[role="button"]')
    expect(itemButton).not.toBeNull()
    itemButton!.focus()

    await user.keyboard(' ')

    expect(mockOnItemSelect).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Item A' }),
    )
  })

  it('renders without repo_info', () => {
    const itemNoRepo = createMockRegistryItem({
      repo_info: undefined,
      title: 'No Repo Item',
    })

    render(
      <div style={{ height: '600px' }}>
        <ItemsList {...defaultProps} items={[itemNoRepo]} />
      </div>
    )

    expect(screen.getByText('No Repo Item')).toBeInTheDocument()
  })
})
