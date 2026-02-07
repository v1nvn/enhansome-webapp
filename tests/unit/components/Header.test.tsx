import { describe, expect, it } from 'vitest'

import Header from '@/components/Header'
import { render, screen, waitFor } from '../../helpers/test-utils.tsx'

describe('Header', () => {
  it('renders header component', async () => {
    const { container } = render(<Header />, { withRouter: true })

    await waitFor(() => {
      expect(container.firstChild).not.toBeEmptyDOMElement()
    })
  })

  it('renders header with Enhansome title', async () => {
    render(<Header />, { withRouter: true })

    await waitFor(() => {
      expect(screen.getByText('Enhansome')).toBeInTheDocument()
    })
  })

  it('renders Registry subtitle', async () => {
    render(<Header />, { withRouter: true })

    await waitFor(() => {
      expect(screen.getByText('Registry')).toBeInTheDocument()
    })
  })
})

