import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SearchBar, SearchTag } from '@/components/SearchBar'
import { render, screen, waitFor } from '../../helpers/test-utils.tsx'

describe('SearchBar', () => {
  const mockOnTagsChange = vi.fn()
  const defaultProps = {
    languages: ['TypeScript', 'JavaScript', 'Go', 'Python'],
    onTagsChange: mockOnTagsChange,
    registries: ['awesome-go', 'awesome-react'],
    tags: [] as SearchTag[],
  }

  beforeEach(() => {
    mockOnTagsChange.mockClear()
  })

  it('renders search input with placeholder', () => {
    render(<SearchBar {...defaultProps} />)
    const input = screen.getByPlaceholderText(
      /search or filter/i,
    ) as HTMLInputElement

    expect(input).toBeInTheDocument()
  })

  it('shows help text when no tags are present', () => {
    render(<SearchBar {...defaultProps} />)
    expect(screen.getByText(/try:/i)).toBeInTheDocument()
    expect(screen.getByText('language:Go')).toBeInTheDocument()
  })

  it('adds text tag when pressing Enter', async () => {
    const { user } = render(<SearchBar {...defaultProps} />)
    const input = screen.getByPlaceholderText(
      /search or filter/i,
    ) as HTMLInputElement

    await user.type(input, 'test search')
    await user.keyboard('{Enter}')

    expect(mockOnTagsChange).toHaveBeenCalledWith([
      { label: 'test search', type: 'text', value: 'test search' },
    ])
  })

  it('adds language tag when using language: prefix', async () => {
    const { user } = render(<SearchBar {...defaultProps} />)
    const input = screen.getByPlaceholderText(
      /search or filter/i,
    ) as HTMLInputElement

    await user.type(input, 'language:Go')
    await user.keyboard('{Enter}')

    expect(mockOnTagsChange).toHaveBeenCalledWith([
      { label: 'language:Go', type: 'language', value: 'Go' },
    ])
  })

  it('adds stars tag when using stars:> prefix', async () => {
    const { user } = render(<SearchBar {...defaultProps} />)
    const input = screen.getByPlaceholderText(
      /search or filter/i,
    ) as HTMLInputElement

    await user.type(input, 'stars:>1000')
    await user.keyboard('{Enter}')

    expect(mockOnTagsChange).toHaveBeenCalledWith([
      { label: 'stars:>1000', type: 'stars', value: '>1000' },
    ])
  })

  it('adds registry tag when using registry: prefix', async () => {
    const { user } = render(<SearchBar {...defaultProps} />)
    const input = screen.getByPlaceholderText(
      /search or filter/i,
    ) as HTMLInputElement

    await user.type(input, 'registry:awesome-go')
    await user.keyboard('{Enter}')

    expect(mockOnTagsChange).toHaveBeenCalledWith([
      { label: 'registry:awesome-go', type: 'registry', value: 'awesome-go' },
    ])
  })

  it('adds archived tag when using is:archived', async () => {
    const { user } = render(<SearchBar {...defaultProps} />)
    const input = screen.getByPlaceholderText(
      /search or filter/i,
    ) as HTMLInputElement

    await user.type(input, 'is:archived')
    await user.keyboard('{Enter}')

    expect(mockOnTagsChange).toHaveBeenCalledWith([
      { label: 'is:archived', type: 'archived', value: 'true' },
    ])
  })

  it('adds active tag when using is:active', async () => {
    const { user } = render(<SearchBar {...defaultProps} />)
    const input = screen.getByPlaceholderText(
      /search or filter/i,
    ) as HTMLInputElement

    await user.type(input, 'is:active')
    await user.keyboard('{Enter}')

    expect(mockOnTagsChange).toHaveBeenCalledWith([
      { label: 'is:active', type: 'archived', value: 'false' },
    ])
  })

  it('displays existing tags', () => {
    const tags: SearchTag[] = [
      { label: 'language:Go', type: 'language', value: 'Go' },
      { label: 'stars:>1000', type: 'stars', value: '>1000' },
    ]

    render(<SearchBar {...defaultProps} tags={tags} />)

    expect(screen.getByText('language:Go')).toBeInTheDocument()
    expect(screen.getByText('stars:>1000')).toBeInTheDocument()
  })

  it('removes tag when clicking X button', async () => {
    const tags: SearchTag[] = [
      { label: 'language:Go', type: 'language', value: 'Go' },
    ]

    const { user } = render(<SearchBar {...defaultProps} tags={tags} />)

    // Find and click the X button on the tag
    const removeButtons = screen.getAllByRole('button')
    const xButton = removeButtons.find(btn =>
      btn.querySelector('svg.lucide-x'),
    )

    if (xButton) {
      await user.click(xButton)
      expect(mockOnTagsChange).toHaveBeenCalledWith([])
    }
  })

  it('removes last tag when pressing Backspace with empty input', async () => {
    const tags: SearchTag[] = [
      { label: 'language:Go', type: 'language', value: 'Go' },
      { label: 'test', type: 'text', value: 'test' },
    ]

    const { user } = render(<SearchBar {...defaultProps} tags={tags} />)
    const input = screen.getByPlaceholderText('') as HTMLInputElement

    await user.click(input)
    await user.keyboard('{Backspace}')

    expect(mockOnTagsChange).toHaveBeenCalledWith([
      { label: 'language:Go', type: 'language', value: 'Go' },
    ])
  })

  it('shows suggestions when typing', async () => {
    const { user } = render(<SearchBar {...defaultProps} />)
    const input = screen.getByPlaceholderText(
      /search or filter/i,
    ) as HTMLInputElement

    await user.type(input, 'lang')

    await waitFor(() => {
      expect(screen.getByText('Suggested filters')).toBeInTheDocument()
    })
  })

  it('filters suggestions based on input', async () => {
    const { user } = render(<SearchBar {...defaultProps} />)
    const input = screen.getByPlaceholderText(
      /search or filter/i,
    ) as HTMLInputElement

    await user.type(input, 'stars')

    await waitFor(() => {
      const suggestions = screen.getAllByText('stars:>1000')
      expect(suggestions.length).toBeGreaterThan(0)
      expect(screen.getByText('stars:>5000')).toBeInTheDocument()
    })
  })

  it('selects suggestion when clicked', async () => {
    const { user } = render(<SearchBar {...defaultProps} />)
    const input = screen.getByPlaceholderText(
      /search or filter/i,
    ) as HTMLInputElement

    await user.type(input, 'stars')

    await waitFor(() => {
      const suggestions = screen.getAllByText('stars:>1000')
      expect(suggestions.length).toBeGreaterThan(0)
    })

    const suggestionButtons = screen.getAllByText('stars:>1000')
    await user.click(suggestionButtons[0])

    expect(mockOnTagsChange).toHaveBeenCalledWith([
      { label: 'stars:>1000', type: 'stars', value: '>1000' },
    ])
  })

  it('replaces tag of same type (except text) when adding new one', async () => {
    const tags: SearchTag[] = [
      { label: 'language:Go', type: 'language', value: 'Go' },
    ]

    const { user } = render(<SearchBar {...defaultProps} tags={tags} />)
    const input = screen.getByPlaceholderText('') as HTMLInputElement

    await user.type(input, 'language:TypeScript')
    await user.keyboard('{Enter}')

    expect(mockOnTagsChange).toHaveBeenCalledWith([
      { label: 'language:TypeScript', type: 'language', value: 'TypeScript' },
    ])
  })

  it('allows multiple text tags', async () => {
    const tags: SearchTag[] = [{ label: 'test1', type: 'text', value: 'test1' }]

    const { user } = render(<SearchBar {...defaultProps} tags={tags} />)
    const input = screen.getByPlaceholderText('') as HTMLInputElement

    await user.type(input, 'test2')
    await user.keyboard('{Enter}')

    expect(mockOnTagsChange).toHaveBeenCalledWith([
      { label: 'test1', type: 'text', value: 'test1' },
      { label: 'test2', type: 'text', value: 'test2' },
    ])
  })

  it('clears input after adding tag', async () => {
    const { user } = render(<SearchBar {...defaultProps} />)
    const input = screen.getByPlaceholderText(
      /search or filter/i,
    ) as HTMLInputElement

    await user.type(input, 'test')
    await user.keyboard('{Enter}')

    expect(input.value).toBe('')
  })
})
