import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'

import { getContext as getTanstackQueryContext } from './integrations/tanstack-query/context'
import { routeTree } from './routeTree.gen'

export const getRouter = () => {
  const rqContext = getTanstackQueryContext()

  const router = createRouter({
    context: { ...rqContext },
    defaultPreload: 'intent',
    scrollRestoration: true,
    routeTree,
  })

  setupRouterSsrQueryIntegration({ queryClient: rqContext.queryClient, router })

  return router
}
