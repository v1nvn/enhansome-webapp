import { useRef, useState } from 'react'

import { Filter as FilterIcon, Search, Star, X } from 'lucide-react'

export interface SearchTag {
  label: string
  type: 'archived' | 'language' | 'registry' | 'stars' | 'text'
  value: string
}

interface SearchBarProps {
  languages: string[]
  onTagsChange: (tags: SearchTag[]) => void
  registries: string[]
  tags: SearchTag[]
}

export function SearchBar({
  languages,
  onTagsChange,
  registries,
  tags,
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = [
    { label: 'stars:>1000', type: 'stars' as const, value: '>1000' },
    { label: 'stars:>5000', type: 'stars' as const, value: '>5000' },
    { label: 'stars:>10000', type: 'stars' as const, value: '>10000' },
    { label: 'is:archived', type: 'archived' as const, value: 'true' },
    { label: 'is:active', type: 'archived' as const, value: 'false' },
    ...languages.slice(0, 10).map(lang => ({
      label: `language:${lang}`,
      type: 'language' as const,
      value: lang,
    })),
    ...registries.map(reg => ({
      label: `registry:${reg}`,
      type: 'registry' as const,
      value: reg,
    })),
  ]

  const filteredSuggestions = suggestions.filter(s =>
    s.label.toLowerCase().includes(inputValue.toLowerCase()),
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      // Check if it's a special filter
      const starMatch = /^stars:>(\d+)$/.exec(inputValue)
      const langMatch = /^language:(.+)$/.exec(inputValue)
      const regMatch = /^registry:(.+)$/.exec(inputValue)
      const archivedMatch = /^is:(archived|active)$/.exec(inputValue)

      if (starMatch) {
        addTag({
          label: `stars:>${starMatch[1]}`,
          type: 'stars',
          value: `>${starMatch[1]}`,
        })
      } else if (langMatch) {
        addTag({
          label: `language:${langMatch[1]}`,
          type: 'language',
          value: langMatch[1],
        })
      } else if (regMatch) {
        addTag({
          label: `registry:${regMatch[1]}`,
          type: 'registry',
          value: regMatch[1],
        })
      } else if (archivedMatch) {
        addTag({
          label: `is:${archivedMatch[1]}`,
          type: 'archived',
          value: archivedMatch[1] === 'archived' ? 'true' : 'false',
        })
      } else {
        // Regular text search
        addTag({
          label: inputValue.trim(),
          type: 'text',
          value: inputValue.trim(),
        })
      }
      setInputValue('')
      setShowSuggestions(false)
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  const addTag = (tag: SearchTag) => {
    // Remove existing tag of same type (except text)
    const newTags =
      tag.type === 'text'
        ? [...tags, tag]
        : [...tags.filter(t => t.type !== tag.type), tag]
    onTagsChange(newTags)
  }

  const removeTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index))
  }

  const selectSuggestion = (suggestion: {
    label: string
    type: SearchTag['type']
    value: string
  }) => {
    addTag(suggestion)
    setInputValue('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const getTagColor = (type: SearchTag['type']) => {
    switch (type) {
      case 'archived':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
      case 'language':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'registry':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      case 'stars':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    }
  }

  return (
    <div className="relative">
      <div className="flex w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 focus-within:border-cyan-500">
        <Search className="h-5 w-5 flex-shrink-0 text-gray-400" />

        {/* Tags */}
        <div className="flex flex-1 flex-wrap gap-1.5">
          {tags.map(tag => (
            <div
              className={`flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${getTagColor(tag.type)}`}
              key={`${tag.type}-${tag.value}`}
            >
              <span>{tag.label}</span>
              <button
                className="rounded p-0.5 hover:bg-white/10"
                onClick={() => {
                  removeTag(tags.indexOf(tag))
                }}
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Input */}
          <input
            className="min-w-[200px] flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
            onBlur={() =>
              setTimeout(() => {
                setShowSuggestions(false)
              }, 200)
            }
            onChange={e => {
              setInputValue(e.target.value)
              setShowSuggestions(e.target.value.length > 0)
            }}
            onFocus={() => {
              setShowSuggestions(inputValue.length > 0)
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              tags.length === 0
                ? 'Search or filter (e.g., language:Go, stars:>1000)...'
                : ''
            }
            ref={inputRef}
            type="text"
            value={inputValue}
          />
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
          <div className="p-2">
            <div className="mb-1 px-2 py-1 text-xs text-gray-400">
              Suggested filters
            </div>
            {filteredSuggestions.map(suggestion => (
              <button
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-white hover:bg-slate-700"
                key={`${suggestion.type}-${suggestion.value}`}
                onClick={() => {
                  selectSuggestion(suggestion)
                }}
                type="button"
              >
                {suggestion.type === 'stars' && (
                  <Star className="h-4 w-4 text-yellow-400" />
                )}
                {suggestion.type === 'language' && (
                  <FilterIcon className="h-4 w-4 text-blue-400" />
                )}
                {suggestion.type === 'registry' && (
                  <FilterIcon className="h-4 w-4 text-purple-400" />
                )}
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Help text */}
      {tags.length === 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Try:{' '}
          <code className="rounded bg-slate-800 px-1 py-0.5">language:Go</code>{' '}
          <code className="rounded bg-slate-800 px-1 py-0.5">
            stars:&gt;1000
          </code>{' '}
          <code className="rounded bg-slate-800 px-1 py-0.5">is:archived</code>
        </div>
      )}
    </div>
  )
}
