'use client'

import { useState, useEffect } from 'react'
import { UiIcon } from '@/components/icons'
import { formatShareListText } from '@/lib/shopping'
import { RECIPE_VAULT_URL } from '@/lib/market-sync'
import type { MarketItem } from '@/lib/market-db'

interface ShareListModalProps {
  isOpen: boolean
  onClose: () => void
  listName: string
  items: MarketItem[]
  pairedToken?: string | null
  isRemote?: boolean
  customIcons?: Record<string, string>
  onToast: (msg: string) => void
}

export default function ShareListModal({
  isOpen,
  onClose,
  listName,
  items,
  pairedToken,
  isRemote = true,
  customIcons,
  onToast,
}: ShareListModalProps) {
  const [copiedText, setCopiedText] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const shareText = formatShareListText(listName, items, customIcons)
  const liveShareUrl = isRemote && pairedToken ? `${RECIPE_VAULT_URL}/s/${pairedToken}` : null

  const handleWhatsApp = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(waUrl, '_blank')
    onClose()
  }

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: listName,
          text: shareText,
        })
        onClose()
        return
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return
      }
    }
    // Fallback: copy to clipboard
    handleCopyText()
  }

  const handleCopyText = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareText)
      setCopiedText(true)
      onToast('¡Lista copiada al portapapeles!')
      setTimeout(() => setCopiedText(false), 2000)
    }
  }

  const handleCopyLiveLink = async () => {
    if (!liveShareUrl) return
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(liveShareUrl)
      setCopiedLink(true)
      onToast('¡Enlace interactivo copiado!')
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 0 max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '540px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) var(--radius-md) var(--radius-md)',
          padding: '20px',
          boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.25)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 id="share-modal-title" style={{ fontSize: '18px', lineHeight: '24px', fontWeight: 500 }}>
              Compartir lista
            </h2>
            <p className="mono-num" style={{ fontSize: '12px', lineHeight: '16px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {listName} · {items.filter((i) => !i.is_checked).length} productos
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
            style={{ width: '36px', height: '36px', minHeight: '36px', padding: 0, borderRadius: 'var(--radius-sm)' }}
            aria-label="Cerrar modal"
          >
            <UiIcon name="x" size={18} />
          </button>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsApp}
            className="btn btn-primary"
            style={{
              justifyContent: 'flex-start',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
            }}
          >
            <UiIcon name="share" size={18} />
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontWeight: 500 }}>Enviar por WhatsApp</div>
              <div style={{ fontSize: '12px', opacity: 0.78, fontWeight: 400 }}>
                Texto ordenado por pasillos
              </div>
            </div>
          </button>

          {/* Native Mobile Share */}
          <button
            type="button"
            onClick={handleNativeShare}
            className="btn btn-secondary"
            style={{
              justifyContent: 'flex-start',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
            }}
          >
            <UiIcon name="share" size={18} style={{ color: 'var(--text-muted)' }} />
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontWeight: 500 }}>Compartir con el móvil</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>
                AirDrop, Telegram, Mensajes o Notas
              </div>
            </div>
          </button>

          {/* Copy Text */}
          <button
            type="button"
            onClick={handleCopyText}
            className="btn btn-secondary"
            style={{
              justifyContent: 'flex-start',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
            }}
          >
            <UiIcon name={copiedText ? 'check' : 'copy'} size={18} style={{ color: copiedText ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{copiedText ? 'Copiado' : 'Copiar texto formateado'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>
                Para pegar en cualquier chat o nota
              </div>
            </div>
          </button>

          {/* Live Link (if paired) */}
          {liveShareUrl && (
            <button
              type="button"
              onClick={handleCopyLiveLink}
              className="btn btn-secondary"
              style={{
                justifyContent: 'flex-start',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                borderColor: 'var(--border-strong)',
                fontSize: '14px',
              }}
            >
              <UiIcon name={copiedLink ? 'check' : 'link'} size={18} style={{ color: 'var(--accent-primary)' }} />
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontWeight: 500, color: 'var(--accent-primary)' }}>
                  {copiedLink ? 'Enlace copiado' : 'Copiar enlace interactivo en vivo'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>
                  Permite tachar productos en tiempo real
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Footer info */}
        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1.25rem' }}>
          MarketVault — Lista rápida, offline y compartible
        </p>
      </div>
    </div>
  )
}
