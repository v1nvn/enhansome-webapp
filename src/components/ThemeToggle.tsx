import { Monitor, Moon, Sun } from 'lucide-react'

import type { Theme } from '../contexts/ThemeContext'

import { useThemeContext } from '../hooks/useThemeContext'

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeContext()

  const themes: { icon: typeof Sun; label: string; value: Theme }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ]

  return (
    <div className="bg-muted flex items-center gap-1 rounded-lg p-1">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          aria-label={`Switch to ${label} theme`}
          className={`rounded-md p-2 transition-colors ${
            theme === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
          }`}
          key={value}
          onClick={() => {
            setTheme(value)
          }}
          title={`${label} theme`}
          type="button"
        >
          <Icon size={18} />
        </button>
      ))}
    </div>
  )
}
