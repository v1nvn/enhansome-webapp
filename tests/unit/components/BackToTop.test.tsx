import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'

import { BackToTop } from '@/components/BackToTop'
import { render, screen, waitFor } from '../../helpers/test-utils.tsx'

describe('BackToTop', () => {
  beforeEach(() => {
    // Reset scroll position
    window.scrollY = 0
  })

  it('does not render when scroll position is below threshold', async () => {
    window.scrollY = 100
    render(<BackToTop />)

    // Wait for effect to run
    await waitFor(() => {
      expect(screen.queryByLabelText('Back to top')).not.toBeInTheDocument()
    })
  })

  it('renders when scroll position is above threshold', async () => {
    window.scrollY = 400
    render(<BackToTop />)

    // Dispatch scroll event to trigger visibility check
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Back to top')).toBeInTheDocument()
    })
  })

  it('shows button when scrolling down past 300px', async () => {
    render(<BackToTop />)

    // Initially not visible
    expect(screen.queryByLabelText('Back to top')).not.toBeInTheDocument()

    // Simulate scroll
    window.scrollY = 400
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
    })

    // Should be visible now
    await waitFor(() => {
      expect(screen.getByLabelText('Back to top')).toBeInTheDocument()
    })
  })

  it('hides button when scrolling back up below 300px', async () => {
    window.scrollY = 400
    render(<BackToTop />)

    // Dispatch initial scroll event
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
    })

    // Wait for button to appear
    await waitFor(() => {
      expect(screen.getByLabelText('Back to top')).toBeInTheDocument()
    })

    // Simulate scroll back up
    window.scrollY = 100
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
    })

    // Should be hidden now
    await waitFor(() => {
      expect(screen.queryByLabelText('Back to top')).not.toBeInTheDocument()
    })
  })

  it('scrolls to top when clicked', async () => {
    const scrollToMock = vi.fn()
    window.scrollTo = scrollToMock
    window.scrollY = 400

    const { user } = render(<BackToTop />)

    // Dispatch scroll event to make button visible
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Back to top')).toBeInTheDocument()
    })

    const button = screen.getByLabelText('Back to top')
    await user.click(button)

    expect(scrollToMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      top: 0,
    })
  })

  it('removes event listener on unmount', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    window.scrollY = 400

    const { unmount } = render(<BackToTop />)

    unmount()

    await waitFor(() => {
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function),
      )
    })
  })

  it('has correct button attributes', async () => {
    window.scrollY = 400
    render(<BackToTop />)

    // Dispatch scroll event to make button visible
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Back to top')).toBeInTheDocument()
    })

    const button = screen.getByLabelText('Back to top')
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-label', 'Back to top')
  })

  it('contains ArrowUp icon', async () => {
    window.scrollY = 400
    const { container } = render(<BackToTop />)

    // Dispatch scroll event to make button visible
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
    })

    await waitFor(() => {
      const icon = container.querySelector('.lucide-arrow-up')
      expect(icon).toBeInTheDocument()
    })
  })
})
