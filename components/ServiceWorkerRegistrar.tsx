'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[MarketVault SW] Registered:', reg.scope))
        .catch((err) => console.warn('[MarketVault SW] Failed:', err))
    }
  }, [])
  return null
}
