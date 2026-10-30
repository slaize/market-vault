import type { Metadata, Viewport } from 'next'
import './globals.css'
import MarketNavigation from '@/components/MarketNavigation'
import { ThemeProvider } from '@/components/ThemeProvider'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'

export const metadata: Metadata = {
  title: 'MarketVault — Lista de la Compra',
  description: 'Lista de la compra inteligente, rápida y local-first para el supermercado.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MarketVault',
  },
}

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <ThemeProvider defaultTheme="dark">
          <ServiceWorkerRegistrar />
          <div
            style={{
              minHeight: '100dvh',
              background: 'var(--bg-base, #0b101b)',
              color: 'var(--text-primary, #f8fafc)',
              paddingBottom: '5rem',
            }}
          >
            <main id="market-main-content">{children}</main>
            <MarketNavigation />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
