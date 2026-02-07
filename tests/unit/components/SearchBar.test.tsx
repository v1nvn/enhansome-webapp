import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SearchBar } from '@/components/SearchBar'
import { render, screen, waitFor } from '../../helpers/test-utils.tsx'

describe('SearchBar', () => {
  const mockOnTagsChange = vi.fn()
  const defaultProps = {
    onTagsChange: mockOnTagsChange,
  }

  beforeEach(() => {
    mockOnTagsChange.mockClear()
  })

  it('renders search input with placeholder', async () => {
    render(<SearchBar {...defaultProps} />)

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/search repositories/i)
      expect(input).toBeInTheDocument()
    })
  })

  it('adds text tag when typing', async () => {
    const { user } = render(<SearchBar {...defaultProps} />)

    const input = await screen.findByPlaceholderText(/search repositories/i)
    await user.type(input, 'test search')

    // Wait for debounce (300ms + some margin)
    await waitFor(
      () => {
        expect(mockOnTagsChange).toHaveBeenCalledWith([
          { label: 'test search', type: 'text', value: 'test search' },
        ])
      },
      { timeout: 1000 },
    )
  })

  it('clears search when input is empty', async () => {
    const { user } = render(<SearchBar {...defaultProps} />)

    const input = await screen.findByPlaceholderText(/search repositories/i)
    await user.type(input, 'test')

    // Wait for debounce
    await waitFor(
      () => {
        expect(mockOnTagsChange).toHaveBeenCalledWith([
          { label: 'test', type: 'text', value: 'test' },
        ])
      },
      { timeout: 1000 },
    )

    // Clear the input
    await user.clear(input)

    // Wait for debounce
    await waitFor(
      () => {
        expect(mockOnTagsChange).toHaveBeenCalledWith([])
      },
      { timeout: 1000 },
    )
  })

  it('shows clear button when there is input', async () => {
    const { user } = render(<SearchBar {...defaultProps} />)

    const input = await screen.findByPlaceholderText(/search repositories/i)

    // Initially no clear button
    let clearButton = screen.queryByRole('button')
    expect(clearButton).not.toBeInTheDocument()

    // Type in the input
    await user.type(input, 'test')

    // Wait for debounce and clear button to appear
    await waitFor(
      () => {
        clearButton = screen.queryByRole('button')
        expect(clearButton).toBeInTheDocument()
      },
      { timeout: 1000 },
    )
  })

  it('clears input when clicking clear button', async () => {
    const { user } = render(<SearchBar {...defaultProps} />)

    const input = await screen.findByPlaceholderText(
      /search repositories/i,
    ) as HTMLInputElement

    await user.type(input, 'test search')

    // Wait for clear button to appear
    const clearButton = await screen.findByRole('button')
    expect(clearButton).toBeInTheDocument()

    // Click clear button
    await user.click(clearButton)

    expect(input.value).toBe('')
  })
})
