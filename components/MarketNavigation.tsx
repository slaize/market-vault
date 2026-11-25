'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UiIcon } from '@/components/icons'

export default function MarketNavigation() {
  const pathname = usePathname()

  const tabs = [
    { href: '/', label: 'Listas', icon: 'list' as const },
    { href: '/compra', label: 'Compra', icon: 'cart' as const },
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
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '8px 16px max(8px, env(safe-area-inset-bottom))',
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
              justifyContent: 'center',
              gap: '4px',
              minWidth: '72px',
              minHeight: '44px',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '12px',
              lineHeight: '16px',
              fontWeight: isActive ? 500 : 400,
              padding: '4px 16px',
              borderRadius: 'var(--radius-sm)',
              background: isActive ? 'var(--bg-raised)' : 'transparent',
              border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
              transition: 'color 150ms var(--ease-out), background-color 150ms var(--ease-out), border-color 150ms var(--ease-out)',
            }}
          >
            <UiIcon
              name={tab.icon}
              size={18}
              style={{ color: isActive ? 'var(--accent-primary)' : 'inherit' }}
            />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
