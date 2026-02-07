import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ItemDetailPanel } from '@/components/ItemDetailPanel'
import { createMockRegistryItem, render, screen, waitFor } from '../../helpers/test-utils.tsx'

describe('ItemDetailPanel', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('shows empty state when no item is selected', async () => {
    render(<ItemDetailPanel item={null} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText('Select an item to view details')).toBeInTheDocument()
    })
  })

  it('renders item title', async () => {
    const item = createMockRegistryItem({ title: 'Test Component' })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText('Test Component')).toBeInTheDocument()
    })
  })

  it('renders GitHub repository link', async () => {
    const item = createMockRegistryItem()
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /test-owner\/test-repo/i })
      expect(link).toHaveAttribute(
        'href',
        'https://github.com/test-owner/test-repo',
      )
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  it('calls onClose when close button is clicked', async () => {
    const item = createMockRegistryItem()
    const { user } = render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    const closeButton = screen.getByRole('button')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('renders description section when item has description', async () => {
    const item = createMockRegistryItem({ description: 'A great component' })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('A great component')).toBeInTheDocument()
    })
  })

  it('does not render description section when item has no description', async () => {
    const item = createMockRegistryItem({ description: null })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.queryByText('Description')).not.toBeInTheDocument()
    })
  })

  it('renders repository info section with stars', async () => {
    const item = createMockRegistryItem()
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText('Repository Info')).toBeInTheDocument()
      expect(screen.getByText('Stars')).toBeInTheDocument()
      expect(screen.getByText('1,234')).toBeInTheDocument()
    })
  })

  it('renders language when available', async () => {
    const item = createMockRegistryItem()
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText('Language')).toBeInTheDocument()
      expect(screen.getByText('TypeScript')).toBeInTheDocument()
    })
  })

  it('renders last commit date', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('Last Commit')).toBeInTheDocument()
      expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument()
    })
  })

  it('shows archived badge when repository is archived', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('Archived Repository')).toBeInTheDocument()
    })
  })

  it('does not show archived badge when repository is not archived', async () => {
    const item = createMockRegistryItem()
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.queryByText('Archived Repository')).not.toBeInTheDocument()
    })
  })

  it('renders sub-items section when item has children', async () => {
    const item = createMockRegistryItem({
      children: [
        createMockRegistryItem({ title: 'Child 1' }),
        createMockRegistryItem({ title: 'Child 2' }),
      ],
    })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText('Sub-items (2)')).toBeInTheDocument()
      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Child 2')).toBeInTheDocument()
    })
  })

  it('does not render sub-items section when item has no children', async () => {
    const item = createMockRegistryItem({ children: [] })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.queryByText(/Sub-items/)).not.toBeInTheDocument()
    })
  })

  it('renders nested sub-items', async () => {
    const item = createMockRegistryItem({
      children: [
        createMockRegistryItem({
          children: [createMockRegistryItem({ title: 'Nested Child' })],
          title: 'Parent Child',
        }),
      ],
    })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText('Parent Child')).toBeInTheDocument()
      expect(screen.getByText('Nested Child')).toBeInTheDocument()
    })
  })

  it('renders sub-item with description', async () => {
    const item = createMockRegistryItem({
      children: [
        createMockRegistryItem({
          description: 'Child description',
          title: 'Child Item',
        }),
      ],
    })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText('Child description')).toBeInTheDocument()
    })
  })

  it('renders sub-item stars when available', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('999')).toBeInTheDocument()
    })
  })

  it('renders sub-item language when available', async () => {
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
    await waitFor(() => {
      expect(screen.getByText('Rust')).toBeInTheDocument()
    })
  })

  it('handles item without repo_info', async () => {
    const item = createMockRegistryItem({
      repo_info: undefined,
      title: 'No Repo Item',
    })
    render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText('No Repo Item')).toBeInTheDocument()
      expect(screen.queryByText('Repository Info')).not.toBeInTheDocument()
    })
  })

  it('contains close icon', async () => {
    const item = createMockRegistryItem()
    const { container } = render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    await waitFor(() => {
      const closeIcon = container.querySelector('.lucide-x')
      expect(closeIcon).toBeInTheDocument()
    })
  })

  it('contains external link icon', async () => {
    const item = createMockRegistryItem()
    const { container } = render(<ItemDetailPanel item={item} onClose={mockOnClose} />)

    await waitFor(() => {
      const linkIcon = container.querySelector('.lucide-external-link')
      expect(linkIcon).toBeInTheDocument()
    })
  })
})
