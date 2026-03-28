import {
  render as rtlRender,
  RenderOptions,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { ReactElement, ReactNode } from 'react'

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
  return <RouterWrapper>{children}</RouterWrapper>
}

// Custom render function that wraps components with any providers needed
function render(
  ui: ReactElement,
  options?: RenderOptions & { withRouter?: boolean },
) {
  const { withRouter, ...renderOptions } = options || {}


  return {
    user: userEvent.setup(),
    ...rtlRender(ui, { wrapper: AllProvidersWrapper, ...renderOptions }),
  }
}

// Export commonly used testing library functions
export { render, screen, waitFor }

