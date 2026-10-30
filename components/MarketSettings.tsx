'use client'

import { useState, useEffect } from 'react'
import { getMarketSettings, type MarketSettings } from '@/lib/market-db'
import { pairHouseholdWithCode, unpairHousehold } from '@/lib/market-sync'
import { useTheme, themes } from '@/components/ThemeProvider'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function MarketSettingsComponent() {
  const [settings, setSettings] = useState<MarketSettings | null>(null)
  const [pairingCode, setPairingCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    getMarketSettings().then(setSettings)

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    setInstallPrompt(null)
  }

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = pairingCode.trim().toUpperCase()
    if (!clean) return
    setLoading(true)
    setMessage(null)

    const result = await pairHouseholdWithCode(clean)
    setLoading(false)

    if (result.ok) {
      setMessage({ text: '¡Vinculado con éxito a RecipeVault!' })
      setPairingCode('')
      const updated = await getMarketSettings()
      setSettings(updated)
    } else {
      setMessage({ text: result.error || 'No se pudo vincular', isError: true })
    }
  }

  const handleUnpair = async () => {
    if (!window.confirm('¿Deseas desvincularte del recetario? Tus listas locales se mantendrán en tu teléfono.')) return
    await unpairHousehold()
    const updated = await getMarketSettings()
    setSettings(updated)
    setMessage({ text: 'Desvinculado. Ahora tus listas son locales.' })
  }

  if (!settings) {
    return <div className="spinner" style={{ margin: '3rem auto' }} />
  }

  const isPaired = settings.sync_mode === 'paired_household'

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1rem 1rem 3rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800 }}>⚙️ Ajustes & Sincronización</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.2rem' }}>
          Configura cómo funciona tu lista de la compra y cómo se conecta con tu hogar.
        </p>
      </header>

      {/* Message alert */}
      {message && (
        <div
          role="status"
          style={{
            background: message.isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${message.isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            borderRadius: 'var(--radius-md, 8px)',
            color: message.isError ? '#ef4444' : '#10b981',
            padding: '0.65rem 0.9rem',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Installation Section */}
      <section
        style={{
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>📲</span>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#10b981' }}>
            Instalar MarketVault en el móvil
          </h2>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.85rem', lineHeight: 1.5 }}>
          Instala MarketVault para abrirla a pantalla completa con su propio icono verde esmeralda y usarla sin conexión.
        </p>

        {installPrompt && (
          <button
            type="button"
            id="btn-install-marketvault"
            onClick={handleInstallClick}
            className="btn btn-primary"
            style={{
              width: '100%',
              background: '#059669',
              borderColor: '#059669',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-md, 8px)',
              cursor: 'pointer',
              marginBottom: '0.75rem',
            }}
          >
            📥 Instalar MarketVault en este dispositivo
          </button>
        )}

        <div style={{
          background: 'rgba(0, 0, 0, 0.25)',
          borderRadius: 'var(--radius-md, 8px)',
          padding: '0.75rem 0.85rem',
          fontSize: '0.76rem',
          color: '#cbd5e1',
          lineHeight: 1.55,
        }}>
          <p style={{ margin: '0 0 0.4rem 0', fontWeight: 600 }}>
            Si el navegador indica que ya está instalada RecipeVault:
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.15rem' }}>
            <li><strong>Android (Chrome):</strong> Toca los tres puntos <strong>(⋮)</strong> arriba a la derecha y pulsa <strong>«Añadir a la pantalla de inicio»</strong>.</li>
            <li><strong>iPhone (Safari):</strong> Toca el botón <strong>Compartir (⎋)</strong> y pulsa <strong>«Añadir a pantalla de inicio»</strong>.</li>
          </ul>
        </div>
      </section>

      {/* Sync Status Card */}
      <section
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.35rem' }}>{isPaired ? '🔗' : '📱'}</span>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              {isPaired ? 'Conectado a RecipeVault' : 'Modo actual: Solo en este dispositivo'}
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {isPaired
                ? `Vinculado con código ${settings.paired_code}`
                : 'Tus listas están seguras en el almacenamiento local de tu móvil (100% offline).'}
            </p>
          </div>
        </div>

        {isPaired ? (
          <button
            type="button"
            onClick={handleUnpair}
            className="btn btn-ghost"
            style={{ fontSize: '0.78rem', color: '#ef4444', width: '100%', marginTop: '0.5rem' }}
          >
            Desvincular de RecipeVault
          </button>
        ) : (
          <form onSubmit={handlePair} style={{ marginTop: '1rem' }}>
            <label
              htmlFor="pair-code-input"
              style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.35rem' }}
            >
              ¿Tienes un código de RecipeVault?
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id="pair-code-input"
                type="text"
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value)}
                placeholder="RV-XXXXXX"
                maxLength={9}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.8rem',
                  borderRadius: 'var(--radius-md, 8px)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'inherit',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  fontSize: '0.9rem',
                }}
              />
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  padding: '0.6rem 0.95rem',
                  borderRadius: 'var(--radius-md, 8px)',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                }}
              >
                {loading ? 'Vinculando...' : 'Vincular con RecipeVault'}
              </button>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.4rem' }}>
              Pídele a quien gestione el recetario que te genere un código desde RecipeVault → Compra → Vincular MarketVault.
            </p>
          </form>
        )}
      </section>

      {/* Visual Theme Section */}
      <section
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>🎨 Aspecto Visual</h2>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.85rem' }}>
          Elige el tema que mejor se adapte a tu iluminación mientras compras.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {themes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className="btn btn-ghost"
              style={{
                fontSize: '0.8rem',
                padding: '0.45rem 0.8rem',
                borderRadius: 'var(--radius-md, 8px)',
                background: theme === t.value ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: theme === t.value ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                color: theme === t.value ? '#10b981' : 'inherit',
                fontWeight: theme === t.value ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* About MarketVault Card */}
      <section
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '1.25rem',
        }}
      >
        <h2 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>ℹ️ Acerca de MarketVault</h2>
        <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>
          MarketVault es una PWA ligera e independiente diseñada para comprar en el supermercado con una sola mano y sin cortes de cobertura. Si la añades a tu pantalla de inicio, se abrirá a pantalla completa como una app nativa.
        </p>
      </section>
    </div>
  )
}
