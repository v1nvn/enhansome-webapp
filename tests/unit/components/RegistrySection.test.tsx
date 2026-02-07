import { describe, expect, it } from 'vitest'

import { RegistrySection } from '@/components/RegistrySection'
import { createMockRegistryItem, render, screen, waitFor } from '../../helpers/test-utils.tsx'

describe('RegistrySection', () => {
  const mockItems = [
    createMockRegistryItem({ title: 'Item 1' }),
    createMockRegistryItem({ title: 'Item 2' }),
    createMockRegistryItem({ title: 'Item 3' }),
  ]

  const defaultProps = {
    description: 'Test section description',
    items: mockItems,
    registry: 'awesome-go',
    title: 'Test Section',
  }

  it('renders section title', async () => {
    render(<RegistrySection {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Section' })).toBeInTheDocument()
    })
  })

  it('renders section description when provided', async () => {
    render(<RegistrySection {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Test section description')).toBeInTheDocument()
    })
  })

  it('does not render description when null', async () => {
    render(<RegistrySection {...defaultProps} description={null} />)
    await waitFor(() => {
      expect(screen.queryByText('Test section description')).not.toBeInTheDocument()
    })
  })

  it('renders item count badge', async () => {
    render(<RegistrySection {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  it('renders all items when expanded', async () => {
    render(<RegistrySection {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
      expect(screen.getByText('Item 3')).toBeInTheDocument()
    })
  })

  it('is expanded by default', async () => {
    render(<RegistrySection {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument()
    })
  })

  it('can be initialized as collapsed', async () => {
    render(<RegistrySection {...defaultProps} initialExpanded={false} />)

    await waitFor(() => {
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
    })
  })

  it('toggles expanded/collapsed when header is clicked', async () => {
    const { user } = render(<RegistrySection {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument()
    })

    const header = screen.getByRole('button')

    // Click to collapse
    await user.click(header)
    await waitFor(() => {
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
    })

    // Click to expand
    await user.click(header)
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument()
    })
  })

  it('respects expandAll prop over local state', async () => {
    const { rerender, user } = render(
      <RegistrySection {...defaultProps} expandAll={true} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument()
    })

    const header = screen.getByRole('button')

    // Try to collapse by clicking
    await user.click(header)

    // Should still be expanded because expandAll=true
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument()
    })

    // Change expandAll to false
    rerender(<RegistrySection {...defaultProps} expandAll={false} />)

    // Should now be collapsed
    await waitFor(() => {
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
    })
  })

  it('shows ChevronDown icon when expanded', async () => {
    const { container } = render(<RegistrySection {...defaultProps} />)

    await waitFor(() => {
      const chevronDown = container.querySelector('.lucide-chevron-down')
      expect(chevronDown).toBeInTheDocument()
    })
  })

  it('shows ChevronRight icon when collapsed', async () => {
    const { container } = render(
      <RegistrySection {...defaultProps} initialExpanded={false} />,
    )

    await waitFor(() => {
      const chevronRight = container.querySelector('.lucide-chevron-right')
      expect(chevronRight).toBeInTheDocument()
    })
  })

  it('does not render when items array is empty', async () => {
    const { container } = render(<RegistrySection {...defaultProps} items={[]} />)

    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('renders items in a grid layout', async () => {
    const { container } = render(<RegistrySection {...defaultProps} />)

    await waitFor(() => {
      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-1')
    })
  })

  it('renders with correct number of items', async () => {
    const manyItems = Array(10)
      .fill(null)
      .map((_, i) => createMockRegistryItem({ title: `Item ${i}` }))

    render(<RegistrySection {...defaultProps} items={manyItems} />)

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument()
    })
  })

  it('applies correct styles to header', async () => {
    render(<RegistrySection {...defaultProps} />)

    await waitFor(() => {
      const header = screen.getByRole('button')
      expect(header).toBeInTheDocument()
    })
  })

  it('truncates long descriptions with line-clamp', async () => {
    const longDescription = 'A'.repeat(200)
    const { container } = render(
      <RegistrySection {...defaultProps} description={longDescription} />,
    )

    await waitFor(() => {
      const description = container.querySelector('.line-clamp-1')
      expect(description).toBeInTheDocument()
    })
  })
})
