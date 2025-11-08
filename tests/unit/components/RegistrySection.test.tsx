import { describe, expect, it } from 'vitest'

import { RegistrySection } from '@/components/RegistrySection'
import { createMockRegistryItem, render, screen } from '../../helpers/test-utils.tsx'

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

  it('renders section title', () => {
    render(<RegistrySection {...defaultProps} />)
    expect(screen.getByRole('heading', { name: 'Test Section' })).toBeInTheDocument()
  })

  it('renders section description when provided', () => {
    render(<RegistrySection {...defaultProps} />)
    expect(screen.getByText('Test section description')).toBeInTheDocument()
  })

  it('does not render description when null', () => {
    render(<RegistrySection {...defaultProps} description={null} />)
    expect(screen.queryByText('Test section description')).not.toBeInTheDocument()
  })

  it('renders item count badge', () => {
    render(<RegistrySection {...defaultProps} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders all items when expanded', () => {
    render(<RegistrySection {...defaultProps} />)

    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
  })

  it('is expanded by default', () => {
    render(<RegistrySection {...defaultProps} />)

    // Items should be visible
    expect(screen.getByText('Item 1')).toBeInTheDocument()
  })

  it('can be initialized as collapsed', () => {
    render(<RegistrySection {...defaultProps} initialExpanded={false} />)

    // Items should not be visible
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
  })

  it('toggles expanded/collapsed when header is clicked', async () => {
    const { user } = render(<RegistrySection {...defaultProps} />)

    const header = screen.getByRole('button')

    // Initially expanded
    expect(screen.getByText('Item 1')).toBeInTheDocument()

    // Click to collapse
    await user.click(header)
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument()

    // Click to expand
    await user.click(header)
    expect(screen.getByText('Item 1')).toBeInTheDocument()
  })

  it('respects expandAll prop over local state', async () => {
    const { rerender, user } = render(
      <RegistrySection {...defaultProps} expandAll={true} />,
    )

    const header = screen.getByRole('button')

    // Should be expanded
    expect(screen.getByText('Item 1')).toBeInTheDocument()

    // Try to collapse by clicking
    await user.click(header)

    // Should still be expanded because expandAll=true
    expect(screen.getByText('Item 1')).toBeInTheDocument()

    // Change expandAll to false
    rerender(<RegistrySection {...defaultProps} expandAll={false} />)

    // Should now be collapsed
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
  })

  it('shows ChevronDown icon when expanded', () => {
    const { container } = render(<RegistrySection {...defaultProps} />)

    const chevronDown = container.querySelector('.lucide-chevron-down')
    expect(chevronDown).toBeInTheDocument()
  })

  it('shows ChevronRight icon when collapsed', () => {
    const { container } = render(
      <RegistrySection {...defaultProps} initialExpanded={false} />,
    )

    const chevronRight = container.querySelector('.lucide-chevron-right')
    expect(chevronRight).toBeInTheDocument()
  })

  it('does not render when items array is empty', () => {
    const { container } = render(<RegistrySection {...defaultProps} items={[]} />)

    expect(container.firstChild).toBeNull()
  })

  it('renders items in a grid layout', () => {
    const { container } = render(<RegistrySection {...defaultProps} />)

    const grid = container.querySelector('.grid')
    expect(grid).toHaveClass('grid-cols-1')
    expect(grid).toHaveClass('md:grid-cols-2')
    expect(grid).toHaveClass('lg:grid-cols-3')
  })

  it('renders with correct number of items', () => {
    const manyItems = Array(10)
      .fill(null)
      .map((_, i) => createMockRegistryItem({ title: `Item ${i}` }))

    render(<RegistrySection {...defaultProps} items={manyItems} />)

    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('applies correct styles to header', () => {
    render(<RegistrySection {...defaultProps} />)

    const header = screen.getByRole('button')
    expect(header).toHaveClass('sticky')
    expect(header).toHaveClass('top-0')
    expect(header).toHaveClass('z-30')
  })

  it('truncates long descriptions with line-clamp', () => {
    const longDescription = 'A'.repeat(200)
    const { container } = render(
      <RegistrySection {...defaultProps} description={longDescription} />,
    )

    const description = container.querySelector('.line-clamp-1')
    expect(description).toBeInTheDocument()
  })
})
