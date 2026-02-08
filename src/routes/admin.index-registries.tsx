import { useMemo, useState } from 'react'

import { createFileRoute } from '@tanstack/react-router'

import { AdminApiContext } from '@/components/AdminApiContext'
import { AdminAuth } from '@/components/AdminAuth'
import { AdminIndexingHeader } from '@/components/AdminIndexingHeader'
import { IndexingHistoryTable } from '@/components/IndexingHistoryTable'
import { IndexingStatusCard } from '@/components/IndexingStatusCard'
import { IndexingTriggerCard } from '@/components/IndexingTriggerCard'

export const Route = createFileRoute('/admin/index-registries')({
  component: AdminIndexRegistries,
  loader: () => {
    // Get API key from localStorage on server-side (not available)
    // Skip preloading data, let the component handle it with the API key
  },
})

function AdminIndexRegistries() {
  const [authenticatedApiKey, setAuthenticatedApiKey] = useState<null | string>(
    null,
  )

  const handleAuthSuccess = (apiKey: string) => {
    setAuthenticatedApiKey(apiKey)
  }

  const handleClearAuth = () => {
    setAuthenticatedApiKey(null)
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line n/no-unsupported-features/node-builtins
      window.localStorage.removeItem('adminApiKey')
    }
  }

  const contextValue = useMemo(
    () => ({ apiKey: authenticatedApiKey, onClearAuth: handleClearAuth }),
    [authenticatedApiKey],
  )

  // Show auth screen if not authenticated
  if (!authenticatedApiKey) {
    const savedApiKey =
      typeof window !== 'undefined'
        ? // eslint-disable-next-line n/no-unsupported-features/node-builtins
          window.localStorage.getItem('adminApiKey') || undefined
        : undefined

    return (
      <AdminAuth onAuthSuccess={handleAuthSuccess} savedApiKey={savedApiKey} />
    )
  }

  return (
    <AdminApiContext value={contextValue}>
      <div className="bg-background min-h-screen">
        <AdminIndexingHeader />

        {/* Main Content */}
        <section className="border-border bg-muted/30 border-b">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Left Column: Status and Trigger */}
              <div className="space-y-6 lg:col-span-1">
                <IndexingStatusCard />
                <IndexingTriggerCard />
              </div>

              {/* Right Column: History */}
              <div className="lg:col-span-2">
                <IndexingHistoryTable />
              </div>
            </div>
          </div>
        </section>
      </div>
    </AdminApiContext>
  )
}
