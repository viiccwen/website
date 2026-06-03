import { useEffect } from 'react'

export type Theme = 'dark' | 'light'

export function getPreferredTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function useTheme(theme: Theme) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
}
