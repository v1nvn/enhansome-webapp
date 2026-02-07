import { describe, expect, it } from 'vitest'

import { RegistryItemTree } from '@/components/RegistryItemTree'
import { createMockRegistryItem, render, screen, waitFor } from '../../helpers/test-utils.tsx'

describe('RegistryItemTree', () => {
  const defaultProps = {
    item: createMockRegistryItem({ title: 'Parent Item' }),
    registry: 'awesome-go',
    section: 'Web Frameworks',
  }

  it('renders the item', async () => {
    render(<RegistryItemTree {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Parent Item')).toBeInTheDocument()
    })
  })

  it('renders item description', async () => {
    render(<RegistryItemTree {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Test description')).toBeInTheDocument()
    })
  })

  it('renders children recursively', async () => {
    const itemWithChildren = createMockRegistryItem({
      children: [
        createMockRegistryItem({ title: 'Child 1' }),
        createMockRegistryItem({ title: 'Child 2' }),
      ],
      title: 'Parent Item',
    })

    render(<RegistryItemTree {...defaultProps} item={itemWithChildren} />)

    await waitFor(() => {
      expect(screen.getByText('Parent Item')).toBeInTheDocument()
      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Child 2')).toBeInTheDocument()
    })
  })

  it('renders nested children', async () => {
    const itemWithNestedChildren = createMockRegistryItem({
      children: [
        createMockRegistryItem({
          children: [createMockRegistryItem({ title: 'Grandchild' })],
          title: 'Child',
        }),
      ],
      title: 'Parent Item',
    })

    render(<RegistryItemTree {...defaultProps} item={itemWithNestedChildren} />)

    await waitFor(() => {
      expect(screen.getByText('Parent Item')).toBeInTheDocument()
      expect(screen.getByText('Child')).toBeInTheDocument()
      expect(screen.getByText('Grandchild')).toBeInTheDocument()
    })
  })

  it('applies indentation for nested levels', async () => {
    const itemWithChildren = createMockRegistryItem({
      children: [createMockRegistryItem({ title: 'Child' })],
      title: 'Parent Item',
    })

    const { container } = render(
      <RegistryItemTree {...defaultProps} item={itemWithChildren} />,
    )

    // Child should have ml-8 class for indentation
    await waitFor(() => {
      const childContainers = container.querySelectorAll('.ml-8')
      expect(childContainers.length).toBeGreaterThan(0)
    })
  })

  it('does not apply indentation at level 0', async () => {
    const { container } = render(<RegistryItemTree {...defaultProps} />)

    // Top level should not have ml-8
    await waitFor(() => {
      const topLevel = container.firstChild as HTMLElement
      expect(topLevel.className).not.toContain('ml-8')
    })
  })

  it('passes registry and section to child items', async () => {
    const itemWithChildren = createMockRegistryItem({
      children: [createMockRegistryItem({ title: 'Child' })],
      title: 'Parent',
    })

    render(<RegistryItemTree {...defaultProps} item={itemWithChildren} />)

    // Both parent and child should show registry and section info
    await waitFor(() => {
      const registryLabels = screen.getAllByText('awesome-go')
      expect(registryLabels.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('renders items without children', async () => {
    const itemNoChildren = createMockRegistryItem({
      children: [],
      title: 'Single Item',
    })

    render(<RegistryItemTree {...defaultProps} item={itemNoChildren} />)

    await waitFor(() => {
      expect(screen.getByText('Single Item')).toBeInTheDocument()
    })
  })

  it('renders with custom level', async () => {
    const { container } = render(<RegistryItemTree {...defaultProps} level={2} />)

    // Should have indentation applied
    await waitFor(() => {
      const topLevel = container.firstChild as HTMLElement
      expect(topLevel.className).toContain('ml-8')
    })
  })

  it('properly spaces child items', async () => {
    const itemWithChildren = createMockRegistryItem({
      children: [
        createMockRegistryItem({ title: 'Child 1' }),
        createMockRegistryItem({ title: 'Child 2' }),
      ],
      title: 'Parent',
    })

    const { container } = render(
      <RegistryItemTree {...defaultProps} item={itemWithChildren} />,
    )

    // Children container should have spacing
    await waitFor(() => {
      const childrenContainer = container.querySelector('.space-y-4')
      expect(childrenContainer).toBeInTheDocument()
    })
  })
})
