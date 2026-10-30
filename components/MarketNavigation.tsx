'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UiIcon } from '@/components/icons'

export default function MarketNavigation() {
  const pathname = usePathname()

  const tabs = [
    { href: '/', label: 'Mis Listas', icon: 'list' as const },
    { href: '/compra', label: 'Mi Compra', icon: 'cart' as const },
    { href: '/ajustes', label: 'Ajustes', icon: 'settings' as const },
  ]

  return (
    <nav
      aria-label="Navegación de MarketVault"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'var(--bg-header)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0.45rem 0.5rem max(0.45rem, env(safe-area-inset-bottom))',
      }}
    >
      {tabs.map((tab) => {
        const isActive =
          tab.href === '/'
            ? pathname === '/' || pathname === '/listas'
            : pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.2rem',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.74rem',
              fontWeight: isActive ? 700 : 500,
              padding: '0.4rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: isActive ? 'var(--accent-glow)' : 'transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <UiIcon name={tab.icon} size="1.25em" />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
