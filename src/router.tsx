import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'

import { getContext as getTanstackQueryContext } from './integrations/tanstack-query/context'
import { Provider as TanstackQueryProvider } from './integrations/tanstack-query/root-provider'
import { routeTree } from './routeTree.gen'

export const getRouter = () => {
  const rqContext = getTanstackQueryContext()

  const router = createRouter({
    context: { ...rqContext },
    defaultPreload: 'intent',
    routeTree,
    Wrap: (props: { children: React.ReactNode }) => {
      return (
        <TanstackQueryProvider {...rqContext}>
          {props.children}
        </TanstackQueryProvider>
      )
    },
  })

  setupRouterSsrQueryIntegration({ queryClient: rqContext.queryClient, router })

  return router
}
