import { useState } from 'react'

import { useMutation } from '@tanstack/react-query'
import { Loader2, Shield } from 'lucide-react'

import { validateAdminApiKey } from '@/lib/api/server-functions'

interface AdminAuthProps {
  onAuthSuccess: (apiKey: string) => void
  savedApiKey?: string
}

export function AdminAuth({ onAuthSuccess, savedApiKey }: AdminAuthProps) {
  const [apiKey, setApiKey] = useState(savedApiKey || '')

  const mutation = useMutation({
    mutationFn: async (key: string) => {
      return validateAdminApiKey({
        headers: {
          'X-Admin-API-Key': key,
        },
      })
    },
    onSuccess: (_, key) => {
      // Save to localStorage
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        window.localStorage.setItem('adminApiKey', key)
      }
      // Notify parent of successful auth
      onAuthSuccess(key)
    },
  })

  const handleSubmit = () => {
    const trimmedKey = apiKey.trim()
    if (trimmedKey) {
      mutation.mutate(trimmedKey)
    }
  }

  const handleClear = () => {
    setApiKey('')
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line n/no-unsupported-features/node-builtins
      window.localStorage.removeItem('adminApiKey')
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header Section */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 h-[400px] w-[400px] translate-x-1/4 -translate-y-1/4 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[300px] w-[300px] -translate-x-1/4 translate-y-1/4 rounded-full bg-primary/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="mx-auto max-w-4xl">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
              <Shield className="h-4 w-4" />
              <span>Admin Tools</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display mb-4 text-4xl leading-tight font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              {mutation.error
                ? 'Authentication Failed'
                : 'Authentication Required'}
            </h1>

            {/* Subtitle */}
            <p className="font-body text-lg leading-relaxed text-muted-foreground">
              {mutation.error
                ? 'The API key you provided is invalid. Please check and try again.'
                : 'Please enter your admin API key to access the registry indexing tools.'}
            </p>
          </div>
        </div>
      </section>

      {/* API Key Input Section */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-6 py-4">
                <h2 className="font-display text-xl font-bold text-foreground">
                  Enter API Key
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {/* API Key Input */}
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-foreground"
                      htmlFor="authApiKeyInput"
                    >
                      Admin API Key
                    </label>
                    <div className="relative">
                      <input
                        className="w-full rounded-lg border border-border bg-background px-4 py-2 pr-20 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
                        disabled={mutation.isPending}
                        id="authApiKeyInput"
                        onChange={e => {
                          setApiKey(e.target.value)
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && apiKey.trim()) {
                            handleSubmit()
                          }
                        }}
                        placeholder="Enter API key..."
                        type="password"
                        value={apiKey}
                      />
                      {apiKey && !mutation.isPending && (
                        <button
                          className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                          onClick={handleClear}
                          type="button"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
                    disabled={!apiKey.trim() || mutation.isPending}
                    onClick={handleSubmit}
                    type="button"
                  >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4" />
                        <span>Authenticate</span>
                      </>
                    )}
                  </button>

                  {/* Error Message */}
                  {mutation.error && (
                    <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
                      {mutation.error.message ||
                        'Authentication failed. Please try again.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
