'use client'

import { useState, useEffect } from 'react'
import { getMarketSettings, type MarketSettings } from '@/lib/market-db'
import { pairHouseholdWithCode, unpairHousehold } from '@/lib/market-sync'
import { useTheme, themes, THEME_HEX_MAP, type Theme } from '@/components/ThemeProvider'
import { UiIcon } from '@/components/icons'
import ConfirmModal from '@/components/ConfirmModal'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const THEME_NAMES: Record<Theme, string> = {
  light: 'Claro',
  dark: 'Oscuro',
  halloween: 'Halloween',
  navidad: 'Navidad',
}

const THEME_ACCENTS: Record<Theme, string> = {
  light: '#059669',
  dark: '#10B981',
  halloween: '#F97316',
  navidad: '#F43F5E',
}

export default function MarketSettingsComponent() {
  const [settings, setSettings] = useState<MarketSettings | null>(null)
  const [pairingCode, setPairingCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showInstallGuide, setShowInstallGuide] = useState(false)
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    getMarketSettings().then(setSettings)

    const standalone =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean })?.standalone === true)
    setIsStandalone(Boolean(standalone))

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
    <div
      style={{
        maxWidth: '640px',
        margin: '0 auto',
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: '3.5rem',
        paddingLeft: '1rem',
        paddingRight: '1rem',
      }}
    >
      <header style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          Ajustes
        </h1>
      </header>

      {/* Message alert */}
      {message && (
        <div
          role="status"
          className="market-banner"
          style={{
            background: message.isError ? 'var(--danger-bg)' : 'var(--accent-glow)',
            border: `1px solid ${message.isError ? 'var(--danger)' : 'var(--accent-primary)'}`,
            borderRadius: 'var(--radius-md)',
            color: message.isError ? 'var(--danger)' : 'var(--accent-primary)',
            padding: '0.7rem 0.95rem',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            fontWeight: 600,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Sync Section */}
      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.1rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: isPaired ? 'var(--accent-glow)' : 'var(--bg-glass)',
                color: isPaired ? 'var(--accent-primary)' : 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <UiIcon name={isPaired ? 'link' : 'unlink'} size="1.15em" />
            </span>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {isPaired ? 'Conectado a RecipeVault' : 'Solo en este dispositivo'}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
                {isPaired
                  ? `Vinculado con código ${settings.paired_code}`
                  : 'Almacenamiento local · 100% offline'}
              </p>
            </div>
          </div>

          {isPaired && (
            <button
              type="button"
              onClick={handleUnpairClick}
              className="btn btn-ghost"
              aria-label="Desvincular de RecipeVault"
              style={{
                fontSize: '0.8rem',
                color: 'var(--danger)',
                padding: '0.45rem 0.75rem',
                flexShrink: 0,
              }}
            >
              Desvincular
            </button>
          )}
        </div>

        {!isPaired && (
          <form onSubmit={handlePair} style={{ marginTop: '0.9rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id="pair-code-input"
                type="text"
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value)}
                placeholder="RV-XXXXXX"
                aria-label="Código de vinculación de RecipeVault"
                maxLength={9}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                aria-label="Vincular con RecipeVault"
                style={{
                  padding: '0.65rem 1.1rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  flexShrink: 0,
                  minHeight: '44px',
                }}
              >
                {loading ? 'Vinculando...' : 'Vincular'}
              </button>
            </div>
            <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.45rem', marginBottom: 0 }}>
              Genera el código desde RecipeVault → Compra → Vincular MarketVault.
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
          padding: '1.1rem',
          marginBottom: '1rem',
        }}
      >
        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
          Apariencia
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {themes.map((t) => {
            const isSelected = theme === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                className="btn btn-ghost"
                style={{
                  fontSize: '0.84rem',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'var(--accent-glow)' : 'var(--bg-glass)',
                  border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  minHeight: '44px',
                  justifyContent: 'flex-start',
                  gap: '0.55rem',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: THEME_HEX_MAP[t.value],
                    border: `2px solid ${THEME_ACCENTS[t.value]}`,
                    flexShrink: 0,
                  }}
                />
                <span>{THEME_NAMES[t.value]}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Compact Installation Section (hidden when already installed as PWA) */}
      {!isStandalone && (
        <section
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ color: 'var(--accent-primary)', display: 'inline-flex' }}>
                <UiIcon name="download" size="1.15em" />
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Instalar aplicación
              </span>
            </div>

            {installPrompt ? (
              <button
                type="button"
                id="btn-install-marketvault"
                onClick={handleInstallClick}
                className="btn btn-primary"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.4rem 0.85rem',
                  minHeight: '36px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                Instalar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowInstallGuide((prev) => !prev)}
                className="btn btn-ghost"
                aria-expanded={showInstallGuide}
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  padding: '0.35rem 0.65rem',
                  minHeight: '34px',
                }}
              >
                <span>Cómo instalar</span>
                <span
                  style={{
                    display: 'inline-flex',
                    transform: showInstallGuide ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <UiIcon name="chevDown" size="0.95em" />
                </span>
              </button>
            )}
          </div>

          {showInstallGuide && !installPrompt && (
            <ul
              style={{
                margin: '0.75rem 0 0',
                paddingLeft: '1.15rem',
                fontSize: '0.76rem',
                color: 'var(--text-muted)',
                lineHeight: 1.55,
              }}
            >
              <li>
                <strong>Android (Chrome):</strong> Menú <strong>⋮</strong> → <strong>Instalar aplicación</strong>.
              </li>
              <li>
                <strong>iPhone (Safari):</strong> <strong>Compartir (⎋)</strong> → <strong>Añadir a pantalla de inicio</strong>.
              </li>
            </ul>
          )}
        </section>
      )}

      <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', opacity: 0.7, marginTop: '1.5rem' }}>
        MarketVault · Offline-first PWA
      </p>

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
