import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CategorySidebar } from '@/components/CategorySidebar'
import { createMockRegistryData, render, screen, waitFor } from '../../helpers/test-utils.tsx'
import type { RegistryFile } from '@/types/registry'

describe('CategorySidebar', () => {
  const mockOnCategorySelect = vi.fn()

  const mockRegistries: RegistryFile[] = [
    {
      data: createMockRegistryData({
        items: [
          {
            description: 'Web frameworks',
            items: Array(5).fill(null).map((_, i) => ({
              children: [],
              description: `Framework ${i}`,
              title: `Framework ${i}`,
            })),
            title: 'Web Frameworks',
          },
          {
            description: 'Database tools',
            items: Array(3).fill(null).map((_, i) => ({
              children: [],
              description: `Database ${i}`,
              title: `Database ${i}`,
            })),
            title: 'Databases',
          },
        ],
      }),
      name: 'awesome-go',
    },
    {
      data: createMockRegistryData({
        items: [
          {
            description: 'React tools',
            items: Array(4).fill(null).map((_, i) => ({
              children: [],
              description: `React tool ${i}`,
              title: `Tool ${i}`,
            })),
            title: 'React Tools',
          },
        ],
      }),
      name: 'awesome-react',
    },
  ]

  const defaultProps = {
    onCategorySelect: mockOnCategorySelect,
    registries: mockRegistries,
    selectedCategory: null,
  }

  beforeEach(() => {
    mockOnCategorySelect.mockClear()
  })

  it('renders all registries', async () => {
    render(<CategorySidebar {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('awesome-go')).toBeInTheDocument()
      expect(screen.getByText('awesome-react')).toBeInTheDocument()
    })
  })

  it('shows category count for each registry', async () => {
    render(<CategorySidebar {...defaultProps} />)

    await waitFor(() => {
      // awesome-go has 2 categories (Web Frameworks, Databases)
      const awesomeGo = screen.getByText('awesome-go').closest('button')
      expect(awesomeGo).toHaveTextContent('2')

      // awesome-react has 1 category
      const awesomeReact = screen.getByText('awesome-react').closest('button')
      expect(awesomeReact).toHaveTextContent('1')
    })
  })

  it('shows all categories by default (expanded)', async () => {
    render(<CategorySidebar {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Web Frameworks')).toBeInTheDocument()
      expect(screen.getByText('Databases')).toBeInTheDocument()
      expect(screen.getByText('React Tools')).toBeInTheDocument()
    })
  })

  it('shows item count for each category', async () => {
    render(<CategorySidebar {...defaultProps} />)

    await waitFor(() => {
      // Web Frameworks has 5 items
      const webFrameworks = screen.getByText('Web Frameworks').closest('button')
      expect(webFrameworks).toHaveTextContent('5')

      // Databases has 3 items
      const databases = screen.getByText('Databases').closest('button')
      expect(databases).toHaveTextContent('3')
    })
  })

  it('collapses registry when header is clicked', async () => {
    const { user } = render(<CategorySidebar {...defaultProps} />)

    const registryHeader = await waitFor(() => screen.getByText('awesome-go').closest('button')!)
    await user.click(registryHeader)

    // Categories should be hidden
    await waitFor(() => {
      expect(screen.queryByText('Web Frameworks')).not.toBeInTheDocument()
      expect(screen.queryByText('Databases')).not.toBeInTheDocument()
    })
  })

  it('expands collapsed registry when clicked again', async () => {
    const { user } = render(<CategorySidebar {...defaultProps} />)

    const registryHeader = await waitFor(() => screen.getByText('awesome-go').closest('button')!)

    // Collapse
    await user.click(registryHeader)
    await waitFor(() => {
      expect(screen.queryByText('Web Frameworks')).not.toBeInTheDocument()
    })

    // Expand
    await user.click(registryHeader)
    await waitFor(() => {
      expect(screen.getByText('Web Frameworks')).toBeInTheDocument()
    })
  })

  it('calls onCategorySelect when category is clicked', async () => {
    const { user } = render(<CategorySidebar {...defaultProps} />)

    const webFrameworksButton = await waitFor(() => screen.getByText('Web Frameworks'))
    await user.click(webFrameworksButton)

    await waitFor(() => {
      expect(mockOnCategorySelect).toHaveBeenCalledWith('awesome-go::Web Frameworks')
    })
  })

  it('highlights selected category', async () => {
    render(
      <CategorySidebar
        {...defaultProps}
        selectedCategory="awesome-go::Web Frameworks"
      />,
    )

    await waitFor(() => {
      const selectedButton = screen.getByText('Web Frameworks').closest('button')
      expect(selectedButton).toHaveClass('border-cyan-500')
      expect(selectedButton).toHaveClass('bg-cyan-500/20')
      expect(selectedButton).toHaveClass('dark:text-cyan-300')
    })
  })

  it('filters categories based on search query', async () => {
    const { user } = render(<CategorySidebar {...defaultProps} />)

    const searchInput = await waitFor(() => screen.getByPlaceholderText('Search categories...'))
    await user.type(searchInput, 'web')

    await waitFor(() => {
      expect(screen.getByText('Web Frameworks')).toBeInTheDocument()
      expect(screen.queryByText('Databases')).not.toBeInTheDocument()
      expect(screen.queryByText('React Tools')).not.toBeInTheDocument()
    })
  })

  it('filters categories case-insensitively', async () => {
    const { user } = render(<CategorySidebar {...defaultProps} />)

    const searchInput = await waitFor(() => screen.getByPlaceholderText('Search categories...'))
    await user.type(searchInput, 'WEB')

    await waitFor(() => {
      expect(screen.getByText('Web Frameworks')).toBeInTheDocument()
    })
  })

  it('shows total category count', async () => {
    render(<CategorySidebar {...defaultProps} />)

    // Total: 3 categories (Web Frameworks, Databases, React Tools)
    await waitFor(() => {
      expect(screen.getByText('3 categories')).toBeInTheDocument()
    })
  })

  it('updates category count when filtering', async () => {
    const { user } = render(<CategorySidebar {...defaultProps} />)

    const searchInput = await waitFor(() => screen.getByPlaceholderText('Search categories...'))
    await user.type(searchInput, 'web')

    await waitFor(() => {
      expect(screen.getByText('1 categories')).toBeInTheDocument()
    })
  })

  it('hides registry when all its categories are filtered out', async () => {
    const { user } = render(<CategorySidebar {...defaultProps} />)

    const searchInput = await waitFor(() => screen.getByPlaceholderText('Search categories...'))
    await user.type(searchInput, 'react')

    // Only awesome-react should be visible
    await waitFor(() => {
      expect(screen.getByText('awesome-react')).toBeInTheDocument()
      expect(screen.queryByText('awesome-go')).not.toBeInTheDocument()
    })
  })

  it('shows search icon', async () => {
    const { container } = render(<CategorySidebar {...defaultProps} />)

    await waitFor(() => {
      const searchIcon = container.querySelector('.lucide-search')
      expect(searchIcon).toBeInTheDocument()
    })
  })

  it('shows chevron icons for expanded/collapsed state', async () => {
    const { container, user } = render(<CategorySidebar {...defaultProps} />)

    // Initially expanded - should show ChevronDown
    await waitFor(() => {
      const chevronDown = container.querySelectorAll('.lucide-chevron-down')
      expect(chevronDown.length).toBeGreaterThan(0)
    })

    // Collapse a registry
    const registryHeader = await waitFor(() => screen.getByText('awesome-go').closest('button')!)
    await user.click(registryHeader)

    // Should now show ChevronRight for collapsed registry
    await waitFor(() => {
      const chevronRight = container.querySelector('.lucide-chevron-right')
      expect(chevronRight).toBeInTheDocument()
    })
  })

  it('handles empty registries', async () => {
    render(<CategorySidebar {...defaultProps} registries={[]} />)

    await waitFor(() => {
      expect(screen.getByText('0 categories')).toBeInTheDocument()
    })
  })

  it('clears search when input is cleared', async () => {
    const { user } = render(<CategorySidebar {...defaultProps} />)

    const searchInput = await waitFor(() => screen.getByPlaceholderText(
      'Search categories...',
    ) as HTMLInputElement)

    await user.type(searchInput, 'web')
    await waitFor(() => {
      expect(screen.getByText('1 categories')).toBeInTheDocument()
    })

    await user.clear(searchInput)
    await waitFor(() => {
      expect(screen.getByText('3 categories')).toBeInTheDocument()
    })
  })
})
