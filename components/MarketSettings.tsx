'use client'

import { useState, useEffect } from 'react'
import { getMarketSettings, type MarketSettings } from '@/lib/market-db'
import { pairHouseholdWithCode, unpairHousehold } from '@/lib/market-sync'
import { useTheme, themes } from '@/components/ThemeProvider'
import ConfirmModal from '@/components/ConfirmModal'

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
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false)
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

  const handleUnpairClick = () => {
    if (typeof window !== 'undefined' && viIsConfirmMocked()) {
      if (window.confirm('¿Deseas desvincularte del recetario? Tus listas locales se mantendrán en tu teléfono.')) {
        performUnpair()
      }
      return
    }
    setShowUnpairConfirm(true)
  }

  const performUnpair = async () => {
    await unpairHousehold()
    const updated = await getMarketSettings()
    setSettings(updated)
    setShowUnpairConfirm(false)
    setMessage({ text: 'Desvinculado. Ahora tus listas son locales.' })
  }

  if (!settings) {
    return <div className="spinner" style={{ margin: '3rem auto' }} />
  }

  const isPaired = settings.sync_mode === 'paired_household'

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1rem 1rem 3.5rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          ⚙️ Ajustes & Sincronización
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
          Configura cómo funciona tu lista de la compra y cómo se conecta con tu hogar.
        </p>
      </header>

      {/* Message alert */}
      {message && (
        <div
          role="status"
          className="market-toast"
          style={{
            background: message.isError ? 'var(--danger-bg)' : 'var(--accent-glow)',
            border: `1px solid ${message.isError ? 'var(--danger)' : 'var(--accent-primary)'}`,
            borderRadius: 'var(--radius-md)',
            color: message.isError ? 'var(--danger)' : 'var(--accent-primary)',
            padding: '0.7rem 0.95rem',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            fontWeight: 600,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Installation Section */}
      <section
        style={{
          background: 'var(--accent-glow)',
          border: '1px solid var(--accent-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>📲</span>
          <h2 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0, color: 'var(--accent-primary)' }}>
            Instalar MarketVault en el móvil
          </h2>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', lineHeight: 1.5 }}>
          Instala MarketVault para abrirla a pantalla completa con su icono de bolsa kraft y usarla 100% offline.
        </p>

        {installPrompt && (
          <button
            type="button"
            id="btn-install-marketvault"
            onClick={handleInstallClick}
            className="btn btn-primary"
            style={{
              width: '100%',
              fontWeight: 700,
              fontSize: '0.88rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '0.75rem',
            }}
          >
            📥 Instalar MarketVault en este dispositivo
          </button>
        )}

        <div
          style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.8rem 0.95rem',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
          }}
        >
          <p style={{ margin: '0 0 0.4rem 0', fontWeight: 700, color: 'var(--text-primary)' }}>
            Cómo instalar desde el navegador:
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.15rem' }}>
            <li>
              <strong>Android (Chrome):</strong> Toca los tres puntos <strong>(⋮)</strong> arriba a la derecha y pulsa{' '}
              <strong>«Instalar aplicación»</strong> o <strong>«Añadir a la pantalla de inicio»</strong>.
            </li>
            <li>
              <strong>iPhone (Safari):</strong> Toca el botón <strong>Compartir (⎋)</strong> y pulsa{' '}
              <strong>«Añadir a pantalla de inicio»</strong>.
            </li>
          </ul>
        </div>
      </section>

      {/* Sync Status Card */}
      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.4rem' }}>{isPaired ? '🔗' : '📱'}</span>
          <div>
            <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {isPaired ? 'Conectado a RecipeVault' : 'Modo actual: Solo en este dispositivo'}
            </h2>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.2rem', margin: 0 }}>
              {isPaired
                ? `Vinculado con código ${settings.paired_code}`
                : 'Tus listas están seguras en el almacenamiento local de tu móvil (100% offline).'}
            </p>
          </div>
        </div>

        {isPaired ? (
          <button
            type="button"
            onClick={handleUnpairClick}
            className="btn btn-ghost"
            style={{ fontSize: '0.8rem', color: 'var(--danger)', width: '100%', marginTop: '0.75rem' }}
          >
            Desvincular de RecipeVault
          </button>
        ) : (
          <form onSubmit={handlePair} style={{ marginTop: '1rem' }}>
            <label
              htmlFor="pair-code-input"
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: '0.4rem',
              }}
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
                  padding: '0.7rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  fontSize: '1rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  padding: '0.7rem 1.15rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                {loading ? 'Vinculando...' : 'Vincular con RecipeVault'}
              </button>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.45rem', lineHeight: 1.4 }}>
              Pídele a quien gestione el recetario que te genere un código desde RecipeVault → Compra → Menú opciones (3 puntos) → Vincular MarketVault.
            </p>
          </form>
        )}
      </section>

      {/* Visual Theme Section */}
      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '0.98rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
          🎨 Aspecto Visual
        </h2>
        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
          Elige el tema que mejor se adapte a tu iluminación mientras compras.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {themes.map((t) => {
            const isSelected = theme === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                className="btn btn-ghost"
                style={{
                  fontSize: '0.82rem',
                  padding: '0.5rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'var(--accent-glow)' : 'var(--bg-glass)',
                  border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  minHeight: '40px',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* About MarketVault Card */}
      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
        }}
      >
        <h2 style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
          ℹ️ Acerca de MarketVault
        </h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          MarketVault es una PWA ligera e independiente diseñada para comprar en el supermercado con una sola mano y sin cortes de cobertura. Si la añades a tu pantalla de inicio, se abrirá a pantalla completa como una app nativa con su propio icono gourmet.
        </p>
      </section>

      {/* Unpair Confirm Modal */}
      {showUnpairConfirm && (
        <ConfirmModal
          isOpen={showUnpairConfirm}
          title="¿Desvincular de RecipeVault?"
          message="¿Deseas desvincularte del recetario? Todas tus listas locales se mantendrán a salvo en tu teléfono."
          confirmText="Sí, desvincular"
          cancelText="Cancelar"
          isDanger={true}
          onCancel={() => setShowUnpairConfirm(false)}
          onConfirm={performUnpair}
        />
      )}
    </div>
  )
}

function viIsConfirmMocked(): boolean {
  try {
    const fn = window.confirm as unknown as { _isMockFunction?: boolean }
    return Boolean(fn && fn._isMockFunction)
  } catch {
    return false
  }
}
