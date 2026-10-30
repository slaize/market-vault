'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getLocalLists,
  saveLocalList,
  deleteLocalList,
  getMarketSettings,
  saveMarketSettings,
  getLocalItems,
  type MarketList,
} from '@/lib/market-db'
import { UiIcon } from '@/components/icons'
import { planToShoppingText } from '@/lib/shopping'

export default function MarketListsManager() {
  const [lists, setLists] = useState<MarketList[]>([])
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const notify = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 2500)
  }

  const loadLists = useCallback(async () => {
    try {
      const all = await getLocalLists()
      setLists(all)
      const settings = await getMarketSettings()
      setActiveListId(settings.active_list_id || all[0]?.id || null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLists()
  }, [loadLists])

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = newListName.trim()
    if (!clean) return
    setNewListName('')

    const created = await saveLocalList({ name: clean })
    setLists((prev) => [created, ...prev])
    await saveMarketSettings({ active_list_id: created.id })
    setActiveListId(created.id)
    notify(`Lista "${clean}" creada y activada`)
  }

  const handleSetActive = async (id: string) => {
    setActiveListId(id)
    await saveMarketSettings({ active_list_id: id })
    notify('Lista activada para comprar')
  }

  const handleRename = async (list: MarketList, e: React.MouseEvent) => {
    e.stopPropagation()
    const newName = window.prompt('Nuevo nombre para la lista:', list.name)
    if (!newName || !newName.trim() || newName.trim() === list.name) return
    const updated = await saveLocalList({ id: list.id, name: newName.trim() })
    setLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, name: updated.name } : l)))
    notify(`Lista renombrada a "${updated.name}"`)
  }

  const handleDelete = async (list: MarketList, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`¿Eliminar la lista "${list.name}"?`)) return
    await deleteLocalList(list.id)
    setLists((prev) => prev.filter((l) => l.id !== list.id))
    if (activeListId === list.id) {
      const remaining = lists.filter((l) => l.id !== list.id)
      const nextId = remaining[0]?.id || null
      setActiveListId(nextId)
      await saveMarketSettings({ active_list_id: nextId })
    }
  }

  const handleCopyList = async (list: MarketList, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const items = await getLocalItems(list.id)
      const text = `🛒 ${list.name}\n\n${planToShoppingText(
        items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          is_checked: i.is_checked,
        }))
      )}`
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      }
      notify(`Lista "${list.name}" copiada al portapapeles`)
    } catch {
      notify('No se pudo copiar al portapapeles')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1rem 1rem 3rem' }}>
      <header style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800 }}>📋 Mis Listas de Compra</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.2rem' }}>
          Gestiona listas independientes para cada supermercado u ocasión.
        </p>
      </header>

      {feedback && (
        <div
          role="status"
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md, 8px)',
            color: '#10b981',
            padding: '0.6rem 0.85rem',
            fontSize: '0.82rem',
            marginBottom: '1rem',
            textAlign: 'center',
          }}
        >
          {feedback}
        </div>
      )}

      {/* New List Form */}
      <form onSubmit={handleCreateList} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          placeholder="Nombre de la nueva lista... (ej: Farmacia)"
          style={{
            flex: 1,
            padding: '0.65rem 0.9rem',
            borderRadius: 'var(--radius-md, 8px)',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: 'inherit',
            fontSize: '0.9rem',
          }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-md, 8px)',
            background: '#10b981',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
          }}
        >
          Crear
        </button>
      </form>

      {/* Lists Grid / Stack */}
      {lists.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            borderRadius: 'var(--radius-lg, 12px)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
          }}
        >
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📋</span>
          <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>No tienes ninguna lista</p>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Crea tu primera lista arriba para comenzar.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {lists.map((list) => {
            const isActive = list.id === activeListId
            return (
              <div
                key={list.id}
                role="button"
                tabIndex={0}
                data-testid="market-list-card"
                aria-current={isActive ? 'true' : undefined}
                aria-label={`Seleccionar lista ${list.name}`}
                onClick={() => handleSetActive(list.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSetActive(list.id)
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.9rem 1rem',
                  borderRadius: 'var(--radius-md, 8px)',
                  background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  border: isActive
                    ? '1.5px solid rgba(16, 185, 129, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontSize: '1rem' }}>{isActive ? '🟢' : '⚪'}</span>
                    <strong style={{ fontSize: '0.95rem' }}>{list.name}</strong>
                    {isActive && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '999px',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#10b981',
                          fontWeight: 700,
                        }}
                      >
                        ACTIVA
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Toca para seleccionarla como lista activa de compra
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={(e) => handleRename(list, e)}
                    className="btn btn-ghost"
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                    title="Renombrar lista"
                    aria-label={`Renombrar lista ${list.name}`}
                  >
                    <UiIcon name="edit" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleCopyList(list, e)}
                    className="btn btn-ghost"
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                    title="Copiar texto"
                    aria-label={`Copiar lista ${list.name}`}
                  >
                    <UiIcon name="copy" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(list, e)}
                    className="btn btn-ghost"
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: '#ef4444' }}
                    title="Eliminar lista"
                    aria-label={`Eliminar lista ${list.name}`}
                  >
                    <UiIcon name="trash" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
