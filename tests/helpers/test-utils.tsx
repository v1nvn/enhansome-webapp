import { render as rtlRender, RenderOptions, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { ReactElement, ReactNode } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Wrapper component for tests that need router
function RouterWrapper({ children }: { children: ReactNode }) {
  const rootRoute = createRootRoute({
    component: () => <>{children}</>,
  })

  const router = createRouter({
    history: createMemoryHistory({
      initialEntries: ['/'],
    }),
    routeTree: rootRoute,
  })

  return <RouterProvider router={router} />
}

// Combined wrapper for tests that need both router and theme
function AllProvidersWrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <RouterWrapper>{children}</RouterWrapper>
    </ThemeProvider>
  )
}

// Custom render function that wraps components with any providers needed
function render(ui: ReactElement, options?: RenderOptions & { withRouter?: boolean }) {
  const { withRouter, ...renderOptions} = options || {}

  const Wrapper = withRouter ? AllProvidersWrapper : ThemeProvider

  return {
    user: userEvent.setup(),
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

// Export commonly used testing library functions
export { render, screen, waitFor, within }

// Mock data generators
export const createMockRegistryItem = (overrides = {}) => ({
  children: [],
  description: 'Test description',
  repo_info: {
    archived: false,
    language: 'TypeScript',
    last_commit: '2025-01-15T12:00:00Z',
    owner: 'test-owner',
    repo: 'test-repo',
    stars: 1234,
  },
  title: 'Test Item',
  ...overrides,
})

export const createMockRegistrySection = (overrides = {}) => ({
  description: 'Test section description',
  items: [createMockRegistryItem()],
  title: 'Test Section',
  ...overrides,
})

export const createMockRegistryData = (overrides = {}) => ({
  items: [createMockRegistrySection()],
  metadata: {
    last_updated: '2025-01-15T12:00:00Z',
    source_repository: 'test/repo',
    source_repository_description: 'Test repository',
    title: 'Test Registry',
  },
  ...overrides,
})
