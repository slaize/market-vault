'use client'

import { useState, useEffect } from 'react'
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  type ShoppingCategory,
} from '@/lib/shopping'
import type { MarketItem } from '@/lib/market-db'

interface EditItemModalProps {
  isOpen: boolean
  item: MarketItem | null
  onClose: () => void
  onSave: (
    itemId: string,
    updates: {
      name: string
      category: ShoppingCategory
      quantity: number | null
      unit: string | null
    }
  ) => Promise<void> | void
}

export default function EditItemModal({
  isOpen,
  item,
  onClose,
  onSave,
}: EditItemModalProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ShoppingCategory>('otros')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && item) {
      setName(item.name || '')
      setCategory((item.category as ShoppingCategory) || 'otros')
      setQuantity(item.quantity != null ? String(item.quantity) : '')
      setUnit(item.unit || '')
    }
  }, [isOpen, item])

  if (!isOpen || !item) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) return

    setSaving(true)
    try {
      const qtyNum = quantity.trim() ? parseFloat(quantity.replace(',', '.')) : null
      await onSave(item.id, {
        name: cleanName,
        category,
        quantity: qtyNum !== null && !isNaN(qtyNum) ? qtyNum : null,
        unit: unit.trim() || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-item-title"
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
        <h2 id="edit-item-title" style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.35rem' }}>
          ✏️ Editar producto
        </h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Modifica el nombre, categoría o cantidad del producto.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label
              htmlFor="edit-item-name"
              style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}
            >
              Nombre
            </label>
            <input
              id="edit-item-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.65rem 0.85rem',
                fontSize: '0.9rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="edit-item-category"
              style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}
            >
              Categoría / Pasillo
            </label>
            <select
              id="edit-item-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ShoppingCategory)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.65rem 0.85rem',
                fontSize: '0.9rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {CATEGORY_ORDER.map((catKey) => {
                const info = CATEGORY_LABELS[catKey]
                return (
                  <option key={catKey} value={catKey}>
                    {info.emoji} {info.label}
                  </option>
                )
              })}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <div>
              <label
                htmlFor="edit-item-qty"
                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}
              >
                Cantidad
              </label>
              <input
                id="edit-item-qty"
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ej. 1 o 250"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label
                htmlFor="edit-item-unit"
                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}
              >
                Unidad
              </label>
              <input
                id="edit-item-unit"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Ej. g, ml, ud"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '0.55rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              style={{
                padding: '0.55rem 1.15rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--accent-primary)',
                color: '#fff',
                cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
                opacity: saving || !name.trim() ? 0.6 : 1,
              }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
