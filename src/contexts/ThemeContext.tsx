import type { ReactNode } from 'react'

import { type Theme, useTheme } from '../hooks/useTheme'
import { ThemeContext } from './theme-context'

export type { Theme }

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeValue = useTheme()

  return <ThemeContext value={themeValue}>{children}</ThemeContext>
}
