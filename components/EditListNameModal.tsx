'use client'

import { useState, useEffect, useRef } from 'react'

interface EditListNameModalProps {
  isOpen: boolean
  initialName: string
  onClose: () => void
  onSave: (newName: string) => Promise<void> | void
}

export default function EditListNameModal({
  isOpen,
  initialName,
  onClose,
  onSave,
}: EditListNameModalProps) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setName(initialName)
      setTimeout(() => inputRef.current?.select(), 50)
    }
  }, [isOpen, initialName])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = name.trim()
    if (!clean || clean === initialName) {
      onClose()
      return
    }
    setSaving(true)
    try {
      await onSave(clean)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-name-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
          color: 'var(--text-primary)',
        }}
      >
        <h2 id="edit-name-title" style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.35rem' }}>
          ✏️ Renombrar lista
        </h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Introduce el nuevo nombre para esta lista de la compra.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la lista..."
            maxLength={60}
            required
            style={{
              width: '100%',
              padding: '0.75rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--input-bg)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              marginBottom: '1.25rem',
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="btn btn-primary"
              style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 700 }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
