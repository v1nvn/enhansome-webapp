import { useEffect, useState } from 'react'

export type Theme = 'dark' | 'light' | 'system'

const STORAGE_KEY = 'theme-preference'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    // SSR-safe initialization
    if (typeof window === 'undefined') return 'system'
    return getStoredTheme()
  })

  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'light'
    return getEffectiveTheme(getStoredTheme())
  })

  useEffect(() => {
    const stored = getStoredTheme()
    // eslint-disable-next-line react-hooks/set-state-in-effect, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
    setThemeState(stored)
    // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
    setEffectiveTheme(getEffectiveTheme(stored))
  }, [])

  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      setEffectiveTheme(getSystemTheme())
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    const newEffective = getEffectiveTheme(theme)

    if (newEffective === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
    setEffectiveTheme(newEffective)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    localStorage.setItem(STORAGE_KEY, newTheme)
    setThemeState(newTheme)
  }

  return {
    theme,
    effectiveTheme,
    setTheme,
  }
}

function getEffectiveTheme(theme: Theme): 'dark' | 'light' {
  return theme === 'system' ? getSystemTheme() : theme
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}
