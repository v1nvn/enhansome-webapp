import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ItemDetailPanel } from '@/components/ItemDetailPanel'
import { createMockRegistryItem, render, screen } from '../../helpers/test-utils.tsx'

describe('ItemDetailPanel', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('shows empty state when no item is selected', () => {
    render(<ItemDetailPanel item={null} onClose={mockOnClose} />)

    expect(screen.getByText('Select an item to view details')).toBeInTheDocument()
  })

  it('renders item title', () => {
    const item = createMockRegistryItem({ title: 'Test Component' })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    expect(screen.getByText('Test Component')).toBeInTheDocument()
  })

  it('renders GitHub repository link', () => {
    const item = createMockRegistryItem()
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    const link = screen.getByRole('link', { name: /test-owner\/test-repo/i })
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/test-owner/test-repo',
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('calls onClose when close button is clicked', async () => {
    const item = createMockRegistryItem()
    const { user } = render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    const closeButton = screen.getByRole('button')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('renders description section when item has description', () => {
    const item = createMockRegistryItem({ description: 'A great component' })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('A great component')).toBeInTheDocument()
  })

  it('does not render description section when item has no description', () => {
    const item = createMockRegistryItem({ description: null })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    expect(screen.queryByText('Description')).not.toBeInTheDocument()
  })

  it('renders repository info section with stars', () => {
    const item = createMockRegistryItem()
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    expect(screen.getByText('Repository Info')).toBeInTheDocument()
    expect(screen.getByText('Stars')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  it('renders language when available', () => {
    const item = createMockRegistryItem()
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    expect(screen.getByText('Language')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('renders last commit date', () => {
    const item = createMockRegistryItem({
      repo_info: {
        archived: false,
        language: 'TypeScript',
        last_commit: '2025-01-15T12:00:00Z',
        owner: 'test-owner',
        repo: 'test-repo',
        stars: 1234,
      },
    })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    expect(screen.getByText('Last Commit')).toBeInTheDocument()
    expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument()
  })

  it('shows archived badge when repository is archived', () => {
    const item = createMockRegistryItem({
      repo_info: {
        archived: true,
        language: 'TypeScript',
        last_commit: '2025-01-15T12:00:00Z',
        owner: 'test-owner',
        repo: 'test-repo',
        stars: 1234,
      },
    })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    expect(screen.getByText('Archived Repository')).toBeInTheDocument()
  })

  it('does not show archived badge when repository is not archived', () => {
    const item = createMockRegistryItem()
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    expect(screen.queryByText('Archived Repository')).not.toBeInTheDocument()
  })

  it('renders sub-items section when item has children', () => {
    const item = createMockRegistryItem({
      children: [
        createMockRegistryItem({ title: 'Child 1' }),
        createMockRegistryItem({ title: 'Child 2' }),
      ],
    })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    expect(screen.getByText('Sub-items (2)')).toBeInTheDocument()
    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
  })

  it('does not render sub-items section when item has no children', () => {
    const item = createMockRegistryItem({ children: [] })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    expect(screen.queryByText(/Sub-items/)).not.toBeInTheDocument()
  })

  it('renders nested sub-items', () => {
    const item = createMockRegistryItem({
      children: [
        createMockRegistryItem({
          children: [createMockRegistryItem({ title: 'Nested Child' })],
          title: 'Parent Child',
        }),
      ],
    })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    expect(screen.getByText('Parent Child')).toBeInTheDocument()
    expect(screen.getByText('Nested Child')).toBeInTheDocument()
  })

  it('renders sub-item with description', () => {
    const item = createMockRegistryItem({
      children: [
        createMockRegistryItem({
          description: 'Child description',
          title: 'Child Item',
        }),
      ],
    })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    expect(screen.getByText('Child description')).toBeInTheDocument()
  })

  it('renders sub-item stars when available', () => {
    const item = createMockRegistryItem({
      children: [
        createMockRegistryItem({
          repo_info: {
            archived: false,
            language: 'Go',
            last_commit: '2025-01-15T12:00:00Z',
            owner: 'test',
            repo: 'test',
            stars: 999,
          },
          title: 'Child Item',
        }),
      ],
    })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    expect(screen.getByText('999')).toBeInTheDocument()
  })

  it('renders sub-item language when available', () => {
    const item = createMockRegistryItem({
      children: [
        createMockRegistryItem({
          repo_info: {
            archived: false,
            language: 'Rust',
            last_commit: '2025-01-15T12:00:00Z',
            owner: 'test',
            repo: 'test',
            stars: 100,
          },
          title: 'Child Item',
        }),
      ],
    })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    // Should show Rust (and TypeScript from parent)
    expect(screen.getByText('Rust')).toBeInTheDocument()
  })

  it('handles item without repo_info', () => {
    const item = createMockRegistryItem({
      repo_info: undefined,
      title: 'No Repo Item',
    })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    expect(screen.getByText('No Repo Item')).toBeInTheDocument()
    expect(screen.queryByText('Repository Info')).not.toBeInTheDocument()
  })

  it('contains close icon', () => {
    const item = createMockRegistryItem()
    const { container } = render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    const closeIcon = container.querySelector('.lucide-x')
    expect(closeIcon).toBeInTheDocument()
  })

  it('contains external link icon', () => {
    const item = createMockRegistryItem()
    const { container } = render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    const linkIcon = container.querySelector('.lucide-external-link')
    expect(linkIcon).toBeInTheDocument()
  })
})
