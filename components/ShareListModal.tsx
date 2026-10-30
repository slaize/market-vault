'use client'

import { useState } from 'react'
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
  onToast: (msg: string) => void
}

export default function ShareListModal({
  isOpen,
  onClose,
  listName,
  items,
  pairedToken,
  onToast,
}: ShareListModalProps) {
  const [copiedText, setCopiedText] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  if (!isOpen) return null

  const shareText = formatShareListText(listName, items)
  const liveShareUrl = pairedToken ? `${RECIPE_VAULT_URL}/s/${pairedToken}` : null

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
          borderRadius: 'var(--radius-xl) var(--radius-xl) var(--radius-md) var(--radius-md)',
          padding: '1.5rem',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 id="share-modal-title" style={{ fontSize: '1.15rem', fontWeight: 800 }}>
              📤 Compartir lista
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              «{listName}» ({items.filter((i) => !i.is_checked).length} productos)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
            style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%' }}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsApp}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: '#25D366',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>💬</span>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div>Enviar por WhatsApp</div>
              <div style={{ fontSize: '0.74rem', opacity: 0.9, fontWeight: 500 }}>
                Texto limpio y organizado por pasillos con emojis
              </div>
            </div>
          </button>

          {/* Native Mobile Share */}
          <button
            type="button"
            onClick={handleNativeShare}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>📱</span>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div>Compartir con el móvil...</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                AirDrop, Telegram, Mensajes, Correo, Notas
              </div>
            </div>
          </button>

          {/* Copy Text */}
          <button
            type="button"
            onClick={handleCopyText}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>📋</span>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div>{copiedText ? '✓ ¡Copiado!' : 'Copiar texto formateado'}</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Para pegar en cualquier chat o bloc de notas
              </div>
            </div>
          </button>

          {/* Live Link (if paired) */}
          {liveShareUrl && (
            <button
              type="button"
              onClick={handleCopyLiveLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-glow)',
                border: '1px solid var(--accent-primary)',
                color: 'var(--accent-primary)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>🔗</span>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div>{copiedLink ? '✓ ¡Enlace interactivo copiado!' : 'Copiar enlace interactivo en vivo'}</div>
                <div style={{ fontSize: '0.74rem', opacity: 0.85, fontWeight: 500 }}>
                  Abre la lista interactiva para que tu acompañante tache en tiempo real
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
