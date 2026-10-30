'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import {
  getLocalLists,
  getLocalItems,
  saveLocalList,
  saveLocalItem,
  toggleLocalItem,
  deleteLocalItem,
  clearCheckedLocalItems,
  getMarketSettings,
  saveMarketSettings,
  type MarketList,
  type MarketItem,
} from '@/lib/market-db'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '@/lib/shopping'
import { UiIcon } from '@/components/icons'

export default function MarketActiveList() {
  const [lists, setLists] = useState<MarketList[]>([])
  const [activeList, setActiveList] = useState<MarketList | null>(null)
  const [items, setItems] = useState<MarketItem[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [showCheckedSection, setShowCheckedSection] = useState(false)
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()

  const loadData = useCallback(async () => {
    try {
      let allLists = await getLocalLists()
      if (allLists.length === 0) {
        const defaultList = await saveLocalList({ name: 'Mi Lista de Compra' })
        allLists = [defaultList]
      }
      setLists(allLists)

      const settings = await getMarketSettings()
      const current = allLists.find((l) => l.id === settings.active_list_id) || allLists[0]
      setActiveList(current)

      const listItems = await getLocalItems(current.id)
      setItems(listItems)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSelectActiveList = async (listId: string) => {
    const selected = lists.find((l) => l.id === listId)
    if (!selected) return
    setActiveList(selected)
    await saveMarketSettings({ active_list_id: selected.id })
    const listItems = await getLocalItems(selected.id)
    setItems(listItems)
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = newItemName.trim()
    if (!clean || !activeList) return
    setNewItemName('')

    const saved = await saveLocalItem({
      list_id: activeList.id,
      name: clean,
    })
    setItems((prev) => [...prev, saved])
  }

  const handleToggle = async (item: MarketItem) => {
    const nextState = !item.is_checked
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_checked: nextState } : i))
    )
    startTransition(async () => {
      await toggleLocalItem(item.id, nextState)
    })
  }

  const handleDelete = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    await deleteLocalItem(itemId)
  }

  const handleClearChecked = async () => {
    if (!activeList) return
    setItems((prev) => prev.filter((i) => !i.is_checked))
    await clearCheckedLocalItems(activeList.id)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  const pendingItems = items.filter((i) => !i.is_checked)
  const checkedItems = items.filter((i) => i.is_checked)
  const total = items.length
  const completed = checkedItems.length
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0

  // Group pending by aisle
  const groupedPending = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat]?.label || cat,
    emoji: CATEGORY_LABELS[cat]?.emoji || '🛒',
    items: pendingItems.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0)

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1rem 1rem 3rem' }}>
      {/* Sticky Top Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0.75rem 0',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.15rem' }}>🛒</span>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
                {activeList?.name || 'Mi Compra'}
              </h1>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
              {completed}/{total} completados ({progressPct}%)
            </p>
          </div>

          {lists.length > 1 && (
            <select
              value={activeList?.id}
              onChange={(e) => handleSelectActiveList(e.target.value)}
              style={{
                fontSize: '0.78rem',
                padding: '0.35rem 0.6rem',
                borderRadius: 'var(--radius-sm, 6px)',
                background: 'rgba(255, 255, 255, 0.06)',
                color: 'inherit',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Progress Bar */}
        <div
          style={{
            height: '4px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '999px',
            marginTop: '0.65rem',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </header>

      {/* Quick Add Input */}
      <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="Añadir producto... (ej: Plátanos 1kg)"
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
            cursor: 'pointer',
          }}
        >
          + Añadir
        </button>
      </form>

      {/* Empty State */}
      {items.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            borderRadius: 'var(--radius-lg, 12px)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
          }}
        >
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🧺</span>
          <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Tu lista está vacía</p>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Añade productos arriba para empezar a comprar.</p>
        </div>
      )}

      {/* Pending Items by Aisle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {groupedPending.map((group) => (
          <section key={group.category}>
            <h2
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#10b981',
                marginBottom: '0.45rem',
              }}
            >
              {group.label} ({group.items.length})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {group.items.map((item) => (
                <div
                  key={item.id}
                  data-testid="market-item-row"
                  onClick={() => handleToggle(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.9rem',
                    borderRadius: 'var(--radius-md, 8px)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <input
                      type="checkbox"
                      checked={item.is_checked}
                      readOnly
                      style={{ cursor: 'pointer', accentColor: '#10b981' }}
                    />
                    <span style={{ fontSize: '0.92rem' }}>{item.name}</span>
                    {(item.quantity || item.unit) && (
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        ({item.quantity ?? ''} {item.unit ?? ''})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(item.id, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '0.2rem',
                    }}
                    title="Eliminar"
                    aria-label={`Eliminar ${item.name}`}
                  >
                    <UiIcon name="trash" size="0.95em" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Completed Accordion Section */}
      {checkedItems.length > 0 && (
        <section style={{ marginTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setShowCheckedSection(!showCheckedSection)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
              }}
            >
              <span>{showCheckedSection ? '▼' : '▶'}</span> Comprados ({checkedItems.length})
            </button>
            <button
              type="button"
              onClick={handleClearChecked}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Limpiar comprados
            </button>
          </div>

          {showCheckedSection && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {checkedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggle(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md, 8px)',
                    background: 'rgba(255, 255, 255, 0.015)',
                    opacity: 0.6,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'line-through' }}>
                    <input type="checkbox" checked={item.is_checked} readOnly style={{ accentColor: '#10b981' }} />
                    <span style={{ fontSize: '0.88rem' }}>{item.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(item.id, e)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                    title="Eliminar"
                    aria-label={`Eliminar ${item.name}`}
                  >
                    <UiIcon name="trash" size="0.9em" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
