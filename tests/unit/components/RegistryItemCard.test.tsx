import { describe, expect, it } from 'vitest'

import { RegistryItemCard } from '@/components/RegistryItemCard'
import { createMockRegistryItem, render, screen, waitFor } from '../../helpers/test-utils.tsx'

describe('RegistryItemCard', () => {
  const defaultProps = {
    item: createMockRegistryItem(),
    registry: 'awesome-go',
    section: 'Web Frameworks',
  }

  it('renders item title', async () => {
    render(<RegistryItemCard {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument()
    })
  })

  it('renders registry and section', async () => {
    render(<RegistryItemCard {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('awesome-go')).toBeInTheDocument()
      expect(screen.getByText('Web Frameworks')).toBeInTheDocument()
    })
  })

  it('renders description when provided', async () => {
    render(<RegistryItemCard {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Test description')).toBeInTheDocument()
    })
  })

  it('does not render description when not provided', async () => {
    const item = createMockRegistryItem({ description: null })
    render(<RegistryItemCard {...defaultProps} item={item} />)
    await waitFor(() => {
      expect(screen.queryByText('Test description')).not.toBeInTheDocument()
    })
  })

  it('renders stars count', async () => {
    render(<RegistryItemCard {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument()
    })
  })

  it('renders language when provided', async () => {
    render(<RegistryItemCard {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('TypeScript')).toBeInTheDocument()
    })
  })

  it('renders last commit date', async () => {
    render(<RegistryItemCard {...defaultProps} />)
    await waitFor(() => {
      // Check that date is formatted (will vary based on locale)
      expect(screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4}/)).toBeInTheDocument()
    })
  })

  it('renders GitHub link', async () => {
    render(<RegistryItemCard {...defaultProps} />)
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /view/i })
      expect(link).toHaveAttribute(
        'href',
        'https://github.com/test-owner/test-repo',
      )
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  it('shows archived badge when item is archived', async () => {
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
    const { container } = render(<RegistryItemCard {...defaultProps} item={item} />)

    await waitFor(() => {
      // Check for Archive icon and text
      expect(screen.getByText('Archived')).toBeInTheDocument()
      const archiveIcon = container.querySelector('.lucide-archive')
      expect(archiveIcon).toBeInTheDocument()
    })
  })

  it('does not show archived badge when item is not archived', async () => {
    const { container } = render(<RegistryItemCard {...defaultProps} />)

    await waitFor(() => {
      const archiveIcon = container.querySelector('.lucide-archive')
      expect(archiveIcon).not.toBeInTheDocument()
    })
  })

  it('renders without repo_info', async () => {
    const item = createMockRegistryItem({ repo_info: undefined })
    render(<RegistryItemCard {...defaultProps} item={item} />)

    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument()
      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument()
    })
  })

  it('applies hover styles', async () => {
    const { container } = render(<RegistryItemCard {...defaultProps} />)

    await waitFor(() => {
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('hover:shadow-lg')
      expect(card).toHaveClass('group')
    })
  })
})
