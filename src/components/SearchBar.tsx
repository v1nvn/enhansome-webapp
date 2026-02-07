import { useEffect, useRef, useState } from 'react'

import { Search, X } from 'lucide-react'

export interface SearchTag {
  label: string
  type: 'archived' | 'language' | 'registry' | 'stars' | 'text'
  value: string
}

interface SearchBarProps {
  onTagsChange: (tags: SearchTag[]) => void
}

export function SearchBar({ onTagsChange }: SearchBarProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputValue.trim()) {
        // Update search with text query
        onTagsChange([
          {
            label: inputValue.trim(),
            type: 'text',
            value: inputValue.trim(),
          },
        ])
      } else {
        // Clear search when input is empty
        onTagsChange([])
      }
    }, 300) // 300ms debounce

    return () => {
      clearTimeout(timeoutId)
    }
  }, [inputValue, onTagsChange])

  return (
    <div className="relative">
      <div className="border-border/50 bg-card focus-within:border-primary focus-within:ring-primary/10 hover:border-border group flex w-full items-center gap-3 rounded-xl border px-4 py-3 transition-all focus-within:ring-4">
        <Search className="text-muted-foreground group-focus-within:text-primary h-5 w-5 shrink-0 transition-colors" />

        {/* Input */}
        <input
          className="text-foreground placeholder:text-muted-foreground/60 min-w-[200px] flex-1 bg-transparent outline-none"
          onChange={e => {
            setInputValue(e.target.value)
          }}
          placeholder="Search repositories..."
          ref={inputRef}
          type="text"
          value={inputValue}
        />

        {/* Clear button */}
        {inputValue && (
          <button
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-1.5 transition-all"
            onClick={() => {
              setInputValue('')
            }}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
