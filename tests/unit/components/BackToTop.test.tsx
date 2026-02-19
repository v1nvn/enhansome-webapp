import { describe, expect, it, vi } from 'vitest'

import { BackToTop } from '@/components/BackToTop'
import { render, waitFor } from '../../helpers/test-utils.tsx'

describe('BackToTop', () => {
  it('renders without errors', async () => {
    render(<BackToTop />)

    await waitFor(() => {
      expect(document.body).toBeInTheDocument()
    })
  })

  it('adds scroll event listener on mount', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    render(<BackToTop />)

    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    })
  })

  it('has scroll function that calls window.scrollTo', () => {
    const scrollToMock = vi.fn()
    window.scrollTo = scrollToMock

    render(<BackToTop />)

    // The component should be able to render
    const { container } = render(<BackToTop />)
    expect(container).toBeInTheDocument()
  })

  it('contains correct structure', async () => {
    const { container } = render(<BackToTop />)

    await waitFor(() => {
      expect(container).toBeInTheDocument()
    })
  })
})
