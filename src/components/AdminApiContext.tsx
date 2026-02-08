import { createContext, use } from 'react'

interface AdminApiContextValue {
  apiKey: null | string
  onClearAuth: () => void
}

export const AdminApiContext = createContext<AdminApiContextValue | null>(null)

export function useAdminApi(): AdminApiContextValue {
  const context = use(AdminApiContext)
  if (!context) {
    throw new Error('useAdminApi must be used within AdminApiProvider')
  }
  return context
}
