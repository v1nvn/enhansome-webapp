import { useState } from 'react'

import { useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'

interface SimpleSearchBarProps {
  defaultValue?: string
  placeholder?: string
}

export function SimpleSearchBar({
  defaultValue = '',
  placeholder = 'Search repositories...',
}: SimpleSearchBarProps) {
  const [query, setQuery] = useState(defaultValue)
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedQuery = query.trim()
    void navigate({
      to: '/browse',
      search: trimmedQuery ? { q: trimmedQuery } : {},
    })
  }

  return (
    <form className="w-full max-w-2xl" onSubmit={handleSubmit}>
      <div className="relative">
        <Search className="text-muted-foreground absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
        <input
          className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 w-full rounded-xl border-2 px-4 py-3 pl-12 text-base shadow-sm transition-all focus:outline-none focus:ring-4"
          onChange={e => {
            setQuery(e.target.value)
          }}
          placeholder={placeholder}
          type="text"
          value={query}
        />
        <button
          className="bg-primary hover:bg-primary/90 text-primary-foreground absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-4 py-2 text-sm font-semibold transition-all"
          type="submit"
        >
          Search
        </button>
      </div>
    </form>
  )
}
