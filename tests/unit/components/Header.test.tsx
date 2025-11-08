import { describe, expect, it } from 'vitest'

import Header from '@/components/Header'
import { render, screen, waitFor } from '../../helpers/test-utils.tsx'

describe('Header', () => {
  it('renders header with title', async () => {
    render(<Header />, { withRouter: true })
    await waitFor(() => {
      expect(screen.getByText('Enhansome Registry')).toBeInTheDocument()
    })
  })

  it('renders menu button', async () => {
    render(<Header />, { withRouter: true })
    await waitFor(() => {
      const menuButton = screen.getByLabelText('Open menu')
      expect(menuButton).toBeInTheDocument()
    })
  })

  it('opens sidebar when menu button is clicked', async () => {
    const { user } = render(<Header />, { withRouter: true })

    await waitFor(() => {
      expect(screen.getByLabelText('Open menu')).toBeInTheDocument()
    })

    const menuButton = screen.getByLabelText('Open menu')
    await user.click(menuButton)

    await waitFor(() => {
      expect(screen.getByText('Navigation')).toBeVisible()
      expect(screen.getByText('Home')).toBeVisible()
      expect(screen.getByText('Browse All')).toBeVisible()
    })
  })

  it('closes sidebar when close button is clicked', async () => {
    const { user } = render(<Header />, { withRouter: true })

    await waitFor(() => {
      expect(screen.getByLabelText('Open menu')).toBeInTheDocument()
    })

    // Open sidebar
    const menuButton = screen.getByLabelText('Open menu')
    await user.click(menuButton)

    await waitFor(() => {
      expect(screen.getByLabelText('Close menu')).toBeInTheDocument()
    })

    // Close sidebar
    const closeButton = screen.getByLabelText('Close menu')
    await user.click(closeButton)

    // Sidebar should be hidden (still in DOM but translated)
    await waitFor(() => {
      const sidebar = screen.getByRole('complementary')
      expect(sidebar).toHaveClass('-translate-x-full')
    })
  })

  it('renders navigation links', async () => {
    const { user } = render(<Header />, { withRouter: true })

    await waitFor(() => {
      expect(screen.getByLabelText('Open menu')).toBeInTheDocument()
    })

    const menuButton = screen.getByLabelText('Open menu')
    await user.click(menuButton)

    await waitFor(() => {
      const homeLink = screen.getByRole('link', { name: /home/i })
      const browseLink = screen.getByRole('link', { name: /browse all/i })

      expect(homeLink).toBeInTheDocument()
      expect(browseLink).toBeInTheDocument()
      expect(homeLink).toHaveAttribute('href', '/')
      expect(browseLink).toHaveAttribute('href', '/registry')
    })
  })

  it('closes sidebar when navigation link is clicked', async () => {
    const { user } = render(<Header />, { withRouter: true })

    await waitFor(() => {
      expect(screen.getByLabelText('Open menu')).toBeInTheDocument()
    })

    // Open sidebar
    const menuButton = screen.getByLabelText('Open menu')
    await user.click(menuButton)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    })

    // Click a navigation link
    const homeLink = screen.getByRole('link', { name: /home/i })
    await user.click(homeLink)

    // Sidebar should be hidden
    await waitFor(() => {
      const sidebar = screen.getByRole('complementary')
      expect(sidebar).toHaveClass('-translate-x-full')
    })
  })
})
