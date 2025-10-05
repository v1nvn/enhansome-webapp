import { useRef, useState } from 'react'
import { Filter as FilterIcon, Search, Star, X } from 'lucide-react'

export interface SearchTag {
  type: 'language' | 'stars' | 'archived' | 'registry' | 'text'
  value: string
  label: string
}

interface SearchBarProps {
  tags: Array<SearchTag>
  onTagsChange: (tags: Array<SearchTag>) => void
  languages: Array<string>
  registries: Array<string>
}

export function SearchBar({
  tags,
  onTagsChange,
  languages,
  registries,
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = [
    { type: 'stars' as const, label: 'stars:>1000', value: '>1000' },
    { type: 'stars' as const, label: 'stars:>5000', value: '>5000' },
    { type: 'stars' as const, label: 'stars:>10000', value: '>10000' },
    { type: 'archived' as const, label: 'is:archived', value: 'true' },
    { type: 'archived' as const, label: 'is:active', value: 'false' },
    ...languages.slice(0, 10).map((lang) => ({
      type: 'language' as const,
      label: `language:${lang}`,
      value: lang,
    })),
    ...registries.map((reg) => ({
      type: 'registry' as const,
      label: `registry:${reg}`,
      value: reg,
    })),
  ]

  const filteredSuggestions = suggestions.filter((s) =>
    s.label.toLowerCase().includes(inputValue.toLowerCase()),
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      // Check if it's a special filter
      const starMatch = inputValue.match(/^stars:>(\d+)$/)
      const langMatch = inputValue.match(/^language:(.+)$/)
      const regMatch = inputValue.match(/^registry:(.+)$/)
      const archivedMatch = inputValue.match(/^is:(archived|active)$/)

      if (starMatch) {
        addTag({
          type: 'stars',
          value: `>${starMatch[1]}`,
          label: `stars:>${starMatch[1]}`,
        })
      } else if (langMatch) {
        addTag({
          type: 'language',
          value: langMatch[1],
          label: `language:${langMatch[1]}`,
        })
      } else if (regMatch) {
        addTag({
          type: 'registry',
          value: regMatch[1],
          label: `registry:${regMatch[1]}`,
        })
      } else if (archivedMatch) {
        addTag({
          type: 'archived',
          value: archivedMatch[1] === 'archived' ? 'true' : 'false',
          label: `is:${archivedMatch[1]}`,
        })
      } else {
        // Regular text search
        addTag({ type: 'text', value: inputValue.trim(), label: inputValue.trim() })
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
        : [...tags.filter((t) => t.type !== tag.type), tag]
    onTagsChange(newTags)
  }

  const removeTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index))
  }

  const selectSuggestion = (suggestion: {
    type: SearchTag['type']
    label: string
    value: string
  }) => {
    addTag(suggestion)
    setInputValue('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const getTagColor = (type: SearchTag['type']) => {
    switch (type) {
      case 'language':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'stars':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'archived':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
      case 'registry':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus-within:border-cyan-500">
        <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 flex-1">
          {tags.map((tag, index) => (
            <div
              key={index}
              className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${getTagColor(tag.type)}`}
            >
              <span>{tag.label}</span>
              <button
                onClick={() => removeTag(index)}
                className="hover:bg-white/10 rounded p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setShowSuggestions(e.target.value.length > 0)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(inputValue.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={tags.length === 0 ? 'Search or filter (e.g., language:Go, stars:>1000)...' : ''}
            className="flex-1 min-w-[200px] bg-transparent outline-none text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-gray-400 px-2 py-1 mb-1">
              Suggested filters
            </div>
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => selectSuggestion(suggestion)}
                className="w-full text-left px-3 py-2 rounded hover:bg-slate-700 text-sm text-white flex items-center gap-2"
              >
                {suggestion.type === 'stars' && <Star className="w-4 h-4 text-yellow-400" />}
                {suggestion.type === 'language' && <FilterIcon className="w-4 h-4 text-blue-400" />}
                {suggestion.type === 'registry' && <FilterIcon className="w-4 h-4 text-purple-400" />}
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Help text */}
      {tags.length === 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Try: <code className="px-1 py-0.5 bg-slate-800 rounded">language:Go</code>{' '}
          <code className="px-1 py-0.5 bg-slate-800 rounded">stars:&gt;1000</code>{' '}
          <code className="px-1 py-0.5 bg-slate-800 rounded">is:archived</code>
        </div>
      )}
    </div>
  )
}
