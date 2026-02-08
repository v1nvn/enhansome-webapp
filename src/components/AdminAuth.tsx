import { useState } from 'react'

import { useMutation } from '@tanstack/react-query'
import { Loader2, Shield } from 'lucide-react'

import { validateAdminApiKey } from '@/lib/server-functions'

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
    <div className="bg-background min-h-screen p-8">
      {/* Header Section */}
      <section className="border-border relative overflow-hidden border-b">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="bg-accent absolute right-0 top-0 h-[400px] w-[400px] -translate-y-1/4 translate-x-1/4 rounded-full blur-3xl" />
          <div className="bg-primary/20 absolute bottom-0 left-0 h-[300px] w-[300px] -translate-x-1/4 translate-y-1/4 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="mx-auto max-w-4xl">
            {/* Badge */}
            <div className="border-border bg-card text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm">
              <Shield className="h-4 w-4" />
              <span>Admin Tools</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display text-foreground mb-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              {mutation.error
                ? 'Authentication Failed'
                : 'Authentication Required'}
            </h1>

            {/* Subtitle */}
            <p className="font-body text-muted-foreground text-lg leading-relaxed">
              {mutation.error
                ? 'The API key you provided is invalid. Please check and try again.'
                : 'Please enter your admin API key to access the registry indexing tools.'}
            </p>
          </div>
        </div>
      </section>

      {/* API Key Input Section */}
      <section className="border-border bg-muted/30 border-b">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
              <div className="border-border border-b px-6 py-4">
                <h2 className="font-display text-foreground text-xl font-bold">
                  Enter API Key
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {/* API Key Input */}
                  <div>
                    <label
                      className="text-foreground mb-2 block text-sm font-medium"
                      htmlFor="authApiKeyInput"
                    >
                      Admin API Key
                    </label>
                    <div className="relative">
                      <input
                        className="border-border bg-background text-foreground focus:border-primary focus:ring-primary w-full rounded-lg border px-4 py-2 pr-20 text-sm focus:outline-none focus:ring-2"
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
                          className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 p-1 text-sm transition-colors"
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
                    className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary disabled:hover:bg-primary flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
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
