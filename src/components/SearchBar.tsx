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
      <div className="flex w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 focus-within:border-cyan-500">
        <Search className="h-5 w-5 flex-shrink-0 text-slate-400" />

        {/* Input */}
        <input
          className="min-w-[200px] flex-1 bg-transparent text-slate-900 placeholder-slate-400 outline-none"
          onChange={e => {
            setInputValue(e.target.value)
          }}
          placeholder="Search packages..."
          ref={inputRef}
          type="text"
          value={inputValue}
        />

        {/* Clear button */}
        {inputValue && (
          <button
            className="rounded p-1 hover:bg-slate-100"
            onClick={() => {
              setInputValue('')
            }}
            type="button"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>
    </div>
  )
}
