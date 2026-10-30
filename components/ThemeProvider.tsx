'use client'

import { createContext, useContext, useEffect, useState, useTransition } from 'react'

export type Theme = 'light' | 'dark' | 'halloween' | 'navidad'

export const THEME_HEX_MAP: Record<Theme, string> = {
  light: '#FAF6EE',
  dark: '#0F172A',
  halloween: '#23152C',
  navidad: '#0F2219',
}

export const THEME_ICON_MAP: Record<Theme, string> = {
  light: '/icons/icon-light.svg',
  dark: '/icons/icon-dark.svg',
  halloween: '/icons/icon-halloween.svg',
  navidad: '/icons/icon-navidad.svg',
}

export const themes: { value: Theme; label: string }[] = [
  { value: 'light', label: '☀️ Claro' },
  { value: 'dark', label: '🌙 Oscuro' },
  { value: 'halloween', label: '🎃 Halloween' },
  { value: 'navidad', label: '🎄 Navidad' },
]

export const THEME_COOKIE_NAME = 'recipevault_theme'
export const THEME_STORAGE_KEY = 'recipevault_theme'

export function isValidTheme(val: unknown): val is Theme {
  return typeof val === 'string' && ['light', 'dark', 'halloween', 'navidad'].includes(val)
}

function setClientThemeCookie(theme: Theme) {
  if (typeof document === 'undefined') return
  // 400 days lifetime in seconds
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=34560000; SameSite=Lax`
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  isPending: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  isPending: false,
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
}: {
  children: React.ReactNode
  defaultTheme?: Theme
}) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY)
        if (isValidTheme(stored)) return stored
      } catch {
        // LocalStorage access restricted (e.g. private mode)
      }
    }
    return defaultTheme
  })
  const [isPending, startTransition] = useTransition()

  // Ensure client localStorage and cookie match on mount if SSR passed a different default
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (isValidTheme(stored) && stored !== theme) {
        setTheme(stored)
        setClientThemeCookie(stored)
      } else if (!stored && isValidTheme(defaultTheme)) {
        localStorage.setItem(THEME_STORAGE_KEY, defaultTheme)
        setClientThemeCookie(defaultTheme)
      }
    } catch {
      // LocalStorage access restricted
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply theme to <html> and update <meta name="theme-color"> immediately
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', THEME_HEX_MAP[theme] || '#FAF6EE')
    }
    const iconLink = document.querySelector('link[rel="icon"]')
    if (iconLink) {
      iconLink.setAttribute('href', THEME_ICON_MAP[theme] || '/icons/icon.svg')
    }
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]')
    if (appleIcon) {
      appleIcon.setAttribute('href', THEME_ICON_MAP[theme] || '/icons/icon.svg')
    }
  }, [theme])

  const selectTheme = (next: Theme) => {
    if (!isValidTheme(next)) return
    setTheme(next)

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
      setClientThemeCookie(next)
    } catch {
      // LocalStorage access restricted
    }

    startTransition(async () => {
      try {
        await fetch('/api/user/theme', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme: next }),
        })
      } catch {
        // Non-critical: local state and cookie are already updated
      }
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: selectTheme, isPending }}>
      {children}
    </ThemeContext.Provider>
  )
}
