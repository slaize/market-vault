'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UiIcon } from '@/components/icons'

export default function MarketNavigation() {
  const pathname = usePathname()

  const tabs = [
    { href: '/', label: 'Mi Compra', icon: 'cart' as const },
    { href: '/listas', label: 'Listas', icon: 'list' as const },
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
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0.45rem 0.5rem max(0.45rem, env(safe-area-inset-bottom))',
      }}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href
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
              color: isActive ? '#10b981' : '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.72rem',
              fontWeight: isActive ? 700 : 500,
              padding: '0.35rem 1.25rem',
              borderRadius: 'var(--radius-md, 8px)',
              background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
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
