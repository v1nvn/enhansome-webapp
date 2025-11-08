import { createContext } from 'react'

import type { Theme } from '../hooks/useTheme'

export interface ThemeContextValue {
  effectiveTheme: 'dark' | 'light'
  setTheme: (theme: Theme) => void
  theme: Theme
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
)
