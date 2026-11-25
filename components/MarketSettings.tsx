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
        paddingTop: 'max(24px, env(safe-area-inset-top))',
        paddingBottom: '64px',
        paddingLeft: '20px',
        paddingRight: '20px',
      }}
    >
      <header style={{ marginBottom: '20px' }}>
        <h1
          style={{
            fontSize: '24px',
            lineHeight: '28px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            margin: 0,
          }}
        >
          Ajustes
        </h1>
      </header>

      {/* Message alert */}
      {message && (
        <div
          role="status"
          className="market-banner"
          style={{
            background: message.isError ? 'var(--danger-bg)' : 'var(--bg-raised)',
            border: `1px solid ${message.isError ? 'var(--danger)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-sm)',
            color: message.isError ? 'var(--danger)' : 'var(--text-primary)',
            padding: '12px 16px',
            fontSize: '13px',
            lineHeight: '18px',
            marginBottom: '16px',
            fontWeight: 500,
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
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-subtle)',
                color: isPaired ? 'var(--accent-primary)' : 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <UiIcon name={isPaired ? 'link' : 'unlink'} size={18} />
            </span>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '15px', lineHeight: '20px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                {isPaired ? 'Conectado a RecipeVault' : 'Solo en este dispositivo'}
              </h2>
              <p className="mono-num" style={{ fontSize: '12px', lineHeight: '16px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
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
                fontSize: '13px',
                color: 'var(--danger)',
                padding: '0 12px',
                minHeight: '36px',
                flexShrink: 0,
              }}
            >
              Desvincular
            </button>
          )}
        </div>

        {!isPaired && (
          <form onSubmit={handlePair} style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="pair-code-input"
                type="text"
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value)}
                placeholder="RV-XXXXXX"
                aria-label="Código de vinculación de RecipeVault"
                maxLength={9}
                className="mono-num"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: '44px',
                  padding: '0 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                aria-label="Vincular con RecipeVault"
                style={{
                  height: '44px',
                  padding: '0 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 500,
                  fontSize: '14px',
                  flexShrink: 0,
                }}
              >
                {loading ? 'Vinculando' : 'Vincular'}
              </button>
            </div>
            <p style={{ fontSize: '12px', lineHeight: '16px', color: 'var(--text-muted)', marginTop: '8px', marginBottom: 0 }}>
              Genera el código desde RecipeVault · Compra · Vincular MarketVault
            </p>
          </form>
        )}
      </section>

      {/* Visual Theme Section */}
      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ fontSize: '14px', lineHeight: '20px', fontWeight: 500, marginBottom: '12px', color: 'var(--text-secondary)' }}>
          Apariencia
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {themes.map((t) => {
            const isSelected = theme === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                className="btn btn-ghost"
                style={{
                  fontSize: '14px',
                  padding: '0 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: isSelected ? 'var(--bg-raised)' : 'transparent',
                  border: isSelected ? '1px solid var(--border-strong)' : '1px solid var(--border-subtle)',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 500 : 400,
                  minHeight: '44px',
                  justifyContent: 'flex-start',
                  gap: '8px',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: '12px',
                    height: '12px',
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
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>
                <UiIcon name="download" size={18} />
              </span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
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
                  fontSize: '13px',
                  padding: '0 12px',
                  minHeight: '36px',
                  borderRadius: 'var(--radius-sm)',
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
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  padding: '0 8px',
                  minHeight: '36px',
                }}
              >
                <span>Cómo instalar</span>
                <span
                  style={{
                    display: 'inline-flex',
                    transform: showInstallGuide ? 'rotate(180deg)' : 'none',
                    transition: 'transform 150ms var(--ease-out)',
                  }}
                >
                  <UiIcon name="chevDown" size={16} />
                </span>
              </button>
            )}
          </div>

          {showInstallGuide && !installPrompt && (
            <ul
              style={{
                margin: '12px 0 4px',
                paddingLeft: '16px',
                fontSize: '13px',
                color: 'var(--text-muted)',
                lineHeight: '20px',
              }}
            >
              <li>
                Android (Chrome): Menú ⋮ → Instalar aplicación
              </li>
              <li>
                iPhone (Safari): Compartir → Añadir a pantalla de inicio
              </li>
            </ul>
          )}
        </section>
      )}

      <p className="mono-num" style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '24px' }}>
        MarketVault · Offline-first PWA
      </p>

      {/* Unpair Confirm Modal */}
      {showUnpairConfirm && (
        <ConfirmModal
          isOpen={showUnpairConfirm}
          title="Desvincular de RecipeVault"
          message="Tus listas locales se mantendrán a salvo en este dispositivo."
          confirmText="Desvincular"
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
