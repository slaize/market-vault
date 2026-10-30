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
  updateLocalListName,
  getProductSuggestions,
  getFrequentProducts,
  type MarketList,
  type MarketItem,
  type ProductHistoryItem,
} from '@/lib/market-db'
import {
  syncActiveListWithRemote,
  remoteToggleItem,
  remoteAddItem,
  remoteDeleteItem,
  remoteClearChecked,
} from '@/lib/market-sync'
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getIngredientEmoji,
  parseItemInput,
  type ShoppingCategory,
} from '@/lib/shopping'
import { UiIcon } from '@/components/icons'
import EditListNameModal from '@/components/EditListNameModal'
import ShareListModal from '@/components/ShareListModal'

function renderIngredientIcon(emoji: string, size = '1.25rem') {
  if (emoji && emoji.startsWith('/')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={emoji}
        alt=""
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          display: 'inline-block',
          verticalAlign: 'middle',
        }}
      />
    )
  }
  return emoji || '🛒'
}

export default function MarketActiveList() {
  const [lists, setLists] = useState<MarketList[]>([])
  const [activeList, setActiveList] = useState<MarketList | null>(null)
  const [items, setItems] = useState<MarketItem[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [frequentProducts, setFrequentProducts] = useState<ProductHistoryItem[]>([])
  const [suggestions, setSuggestions] = useState<ProductHistoryItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showCheckedSection, setShowCheckedSection] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isPaired, setIsPaired] = useState(false)
  const [pairedToken, setPairedToken] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Modals & Toasts
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [undoItem, setUndoItem] = useState<{ item: MarketItem; action: 'checked' | 'deleted' } | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const loadData = useCallback(async () => {
    try {
      let allLists = await getLocalLists()
      if (allLists.length === 0) {
        const defaultList = await saveLocalList({ name: 'Mi Lista de Compra' })
        allLists = [defaultList]
      }
      setLists(allLists)

      const settings = await getMarketSettings()
      setIsPaired(settings.sync_mode === 'paired_household')
      setPairedToken(settings.paired_token || null)

      const current = allLists.find((l) => l.id === settings.active_list_id) || allLists[0]
      setActiveList(current)

      const listItems = await getLocalItems(current.id)
      setItems(listItems)

      // Load frequent products
      getFrequentProducts(8).then(setFrequentProducts)

      // Background sync if paired
      if (settings.sync_mode === 'paired_household' && settings.paired_token) {
        syncActiveListWithRemote().then((res) => {
          if (res.synced) {
            getLocalItems(current.id).then(setItems)
          }
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Live suggestions query
  useEffect(() => {
    const q = newItemName.trim()
    if (q.length >= 1) {
      let active = true
      getProductSuggestions(q, 6).then((res) => {
        if (active) {
          setSuggestions(res)
          setShowSuggestions(res.length > 0)
        }
      })
      return () => {
        active = false
      }
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [newItemName])

  const handleManualSync = async () => {
    if (isSyncing || !activeList) return
    setIsSyncing(true)
    try {
      const res = await syncActiveListWithRemote()
      if (res.synced) {
        const refreshed = await getLocalItems(activeList.id)
        setItems(refreshed)
        showToast('Lista sincronizada con RecipeVault')
      } else if (res.error) {
        showToast(res.error)
      } else {
        showToast('Todo actualizado')
      }
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSelectActiveList = async (listId: string) => {
    const selected = lists.find((l) => l.id === listId)
    if (!selected) return
    setActiveList(selected)
    await saveMarketSettings({ active_list_id: selected.id })
    const listItems = await getLocalItems(selected.id)
    setItems(listItems)
  }

  const handleAddProductDirectly = async (
    name: string,
    category?: ShoppingCategory,
    unit?: string | null
  ) => {
    if (!activeList) return
    const saved = await saveLocalItem({
      list_id: activeList.id,
      name,
      category,
      unit,
      quantity: unit ? 1 : null,
    })
    setItems((prev) => [...prev, saved])
    showToast(`«${name}» añadido`)
    getFrequentProducts(8).then(setFrequentProducts)

    if (isPaired && pairedToken) {
      remoteAddItem({
        name,
        quantity: unit ? 1 : null,
        unit: unit ?? null,
      })
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = newItemName.trim()
    if (!clean || !activeList) return
    setNewItemName('')
    setShowSuggestions(false)

    const parsed = parseItemInput(clean)
    const saved = await saveLocalItem({
      list_id: activeList.id,
      name: parsed.name,
      quantity: parsed.quantity,
      unit: parsed.unit,
      category: parsed.category,
    })
    setItems((prev) => [...prev, saved])
    getFrequentProducts(8).then(setFrequentProducts)

    // Background sync to remote if paired
    if (isPaired && pairedToken) {
      remoteAddItem({
        name: parsed.name,
        quantity: parsed.quantity,
        unit: parsed.unit,
      })
    }
  }

  const handleToggle = async (item: MarketItem) => {
    const nextState = !item.is_checked

    // Set undo state if marking as checked
    if (nextState) {
      setUndoItem({ item, action: 'checked' })
      setTimeout(() => {
        setUndoItem((current) => (current?.item.id === item.id ? null : current))
      }, 4000)
    }

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_checked: nextState } : i))
    )

    startTransition(async () => {
      await toggleLocalItem(item.id, nextState)
      if (item.remote_item_id) {
        remoteToggleItem(item.remote_item_id, nextState)
      }
    })
  }

  const handleDelete = async (item: MarketItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setUndoItem({ item, action: 'deleted' })
    setTimeout(() => {
      setUndoItem((current) => (current?.item.id === item.id ? null : current))
    }, 4000)

    setItems((prev) => prev.filter((i) => i.id !== item.id))
    await deleteLocalItem(item.id)

    if (item.remote_item_id) {
      remoteDeleteItem(item.remote_item_id)
    }
  }

  const handleUndo = async () => {
    if (!undoItem || !activeList) return
    const { item, action } = undoItem
    setUndoItem(null)

    if (action === 'checked') {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_checked: false } : i))
      )
      await toggleLocalItem(item.id, false)
      if (item.remote_item_id) {
        remoteToggleItem(item.remote_item_id, false)
      }
      showToast('Deshecho: producto desmarcado')
    } else if (action === 'deleted') {
      const restored = await saveLocalItem({
        id: item.id,
        list_id: item.list_id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        is_checked: item.is_checked,
        sort_order: item.sort_order,
      })
      setItems((prev) => [...prev, restored])
      showToast('Deshecho: producto restaurado')
    }
  }

  const handleClearChecked = async () => {
    if (!activeList) return
    setItems((prev) => prev.filter((i) => !i.is_checked))
    await clearCheckedLocalItems(activeList.id)
    if (isPaired && pairedToken) {
      remoteClearChecked()
    }
    showToast('Productos comprados limpiados')
  }

  const handleSaveListName = async (newName: string) => {
    if (!activeList) return
    const updated = await updateLocalListName(activeList.id, newName)
    if (updated) {
      setActiveList(updated)
      setLists((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
      showToast(`Lista renombrada a «${updated.name}»`)
    }
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
  const isAllDone = total > 0 && pendingItems.length === 0

  // Group pending by aisle
  const groupedPending = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat]?.label || cat,
    emoji: CATEGORY_LABELS[cat]?.emoji || '🛒',
    items: pendingItems.filter((i) => (i.category || 'otros') === cat),
  })).filter((g) => g.items.length > 0)

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0.75rem 1rem 3.5rem' }}>
      {/* Sticky Top Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'var(--bg-header)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0.75rem 0 0.6rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🛒</span>
              <h1
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {activeList?.name || 'Mi Compra'}
              </h1>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="btn btn-ghost"
                style={{ minWidth: '32px', minHeight: '32px', padding: '0.2rem', color: 'var(--text-muted)' }}
                title="Editar nombre de la lista"
                aria-label="Editar nombre de la lista"
              >
                <UiIcon name="edit" size="0.85em" />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                {completed}/{total} completados ({progressPct}%)
              </p>
              {isPaired && (
                <span
                  style={{
                    fontSize: '0.66rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '999px',
                    background: 'var(--accent-glow)',
                    color: 'var(--accent-primary)',
                    fontWeight: 600,
                  }}
                >
                  🔗 Sincronizado
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {/* Sync Button */}
            {isPaired && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="btn btn-ghost"
                style={{ minWidth: '38px', minHeight: '38px', padding: '0.4rem', color: 'var(--accent-primary)' }}
                title="Sincronizar con RecipeVault"
                aria-label="Sincronizar con RecipeVault"
              >
                <span style={{ display: 'inline-block', transform: isSyncing ? 'rotate(360deg)' : 'none', transition: 'transform 0.6s linear' }}>
                  🔄
                </span>
              </button>
            )}

            {/* Share Button */}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="btn btn-ghost"
              style={{ minWidth: '38px', minHeight: '38px', padding: '0.4rem', color: 'var(--accent-primary)' }}
              title="Compartir lista"
              aria-label="Compartir lista"
            >
              <span style={{ fontSize: '1.15rem' }}>📤</span>
            </button>

            {/* List Selector */}
            {lists.length > 1 && (
              <select
                value={activeList?.id}
                onChange={(e) => handleSelectActiveList(e.target.value)}
                style={{
                  fontSize: '0.8rem',
                  padding: '0.4rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: '130px',
                }}
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                    {l.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            height: '4px',
            background: 'var(--border-subtle)',
            borderRadius: '999px',
            marginTop: '0.65rem',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-hover) 100%)',
              transition: 'width 0.25s ease',
            }}
          />
        </div>
      </header>

      {/* Quick Add Form */}
      <form
        onSubmit={handleAddItem}
        style={{
          position: 'relative',
          display: 'flex',
          gap: '0.5rem',
          marginBottom: frequentProducts.length > 0 ? '0.65rem' : '1.25rem',
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true)
            }}
            placeholder="Añadir producto... (ej: Plátanos 1kg)"
            style={{
              width: '100%',
              padding: '0.75rem 0.95rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--input-bg)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              outline: 'none',
            }}
          />

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              data-testid="product-suggestions-dropdown"
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                zIndex: 60,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.45), 0 4px 10px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                maxHeight: '260px',
                overflowY: 'auto',
              }}
            >
              {suggestions.map((sug) => {
                const emoji = getIngredientEmoji(sug.name, sug.category)
                return (
                  <div
                    key={sug.name_normalized}
                    onClick={() => {
                      setNewItemName(sug.name)
                      setShowSuggestions(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-glass-hover)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '1.1rem', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>
                        {renderIngredientIcon(emoji, '1.2rem')}
                      </span>
                      <strong
                        style={{
                          fontSize: '0.9rem',
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sug.name}
                      </strong>
                      {sug.default_unit && (
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          ({sug.default_unit})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddProductDirectly(sug.name, sug.category, sug.default_unit)
                        setNewItemName('')
                        setShowSuggestions(false)
                      }}
                      className="btn btn-ghost"
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        background: 'var(--accent-glow)',
                        color: 'var(--accent-primary)',
                        fontWeight: 700,
                        minHeight: '28px',
                        marginLeft: '0.5rem',
                      }}
                      title={`Añadir ${sug.name}`}
                    >
                      + Añadir
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{
            padding: '0.75rem 1.15rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          + Añadir
        </button>
      </form>

      {/* Frequent products quick chips */}
      {frequentProducts.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.45rem',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              ⚡ Habituales
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '0.45rem',
              overflowX: 'auto',
              paddingBottom: '0.35rem',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}
          >
            {frequentProducts.map((p) => (
              <button
                key={p.name_normalized}
                type="button"
                onClick={() => handleAddProductDirectly(p.name, p.category, p.default_unit)}
                className="btn btn-ghost"
                style={{
                  flexShrink: 0,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  whiteSpace: 'nowrap',
                }}
                title={`Añadir ${p.name}`}
              >
                <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>+</span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State: 0 items total */}
      {items.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-card)',
            border: '1px dashed var(--border-default)',
          }}
        >
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🧺</span>
          <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
            Tu lista está vacía
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Añade productos arriba o comparte tu lista para empezar.
          </p>
        </div>
      )}

      {/* Celebration Card: All checked */}
      {isAllDone && (
        <div
          style={{
            textAlign: 'center',
            padding: '2.25rem 1.25rem',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--accent-glow)',
            border: '1px solid var(--accent-primary)',
            marginBottom: '1.5rem',
          }}
        >
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.4rem' }}>🎉</span>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.2rem' }}>
            ¡Todo en el carro!
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Has marcado todos los productos de esta lista. ¡Buen provecho!
          </p>
        </div>
      )}

      {/* Pending Items Grouped by Aisle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {groupedPending.map((group) => (
          <section key={group.category}>
            <h2
              style={{
                fontSize: '0.82rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--accent-secondary)',
                marginBottom: '0.45rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>{group.emoji}</span>
              <span>{group.label}</span>
              <span style={{ opacity: 0.8, fontWeight: 600 }}>({group.items.length})</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {group.items.map((item) => {
                const itemEmoji = getIngredientEmoji(item.name, group.category)
                return (
                  <div
                    key={item.id}
                    data-testid="market-item-row"
                    onClick={() => handleToggle(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.8rem 0.95rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'background 0.12s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={item.is_checked}
                        readOnly
                        className="market-checkbox"
                        aria-label={`Marcar ${item.name}`}
                      />
                      <span style={{ fontSize: '1.2rem', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>
                        {renderIngredientIcon(itemEmoji, '1.35rem')}
                      </span>
                      <span
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.name}
                      </span>
                      {(item.quantity || item.unit) && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                          ({item.quantity ?? ''} {item.unit ?? ''})
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(item, e)}
                      className="btn btn-ghost"
                      style={{
                        minWidth: '40px',
                        minHeight: '40px',
                        padding: '0.35rem',
                        color: 'var(--text-muted)',
                        flexShrink: 0,
                      }}
                      title="Eliminar"
                      aria-label={`Eliminar ${item.name}`}
                    >
                      <UiIcon name="trash" size="0.95em" />
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Completed Accordion Section */}
      {checkedItems.length > 0 && (
        <section style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
            <button
              type="button"
              onClick={() => setShowCheckedSection(!showCheckedSection)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                padding: '0.3rem 0',
              }}
            >
              <span>{showCheckedSection ? '▼' : '▶'}</span>
              <span>Comprados ({checkedItems.length})</span>
            </button>

            <button
              type="button"
              onClick={handleClearChecked}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--danger)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0.3rem 0.5rem',
              }}
            >
              Limpiar comprados
            </button>
          </div>

          {showCheckedSection && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {checkedItems.map((item) => {
                const itemEmoji = getIngredientEmoji(item.name, item.category)
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggle(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.7rem 0.9rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-glass)',
                      opacity: 0.65,
                      cursor: 'pointer',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'line-through', flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={item.is_checked}
                        readOnly
                        className="market-checkbox"
                        aria-label={`Desmarcar ${item.name}`}
                      />
                      <span style={{ fontSize: '1.1rem', flexShrink: 0, opacity: 0.6, display: 'inline-flex', alignItems: 'center' }}>
                        {renderIngredientIcon(itemEmoji, '1.25rem')}
                      </span>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(item, e)}
                      className="btn btn-ghost"
                      style={{ minWidth: '38px', minHeight: '38px', padding: '0.3rem', color: 'var(--text-muted)' }}
                      title="Eliminar"
                      aria-label={`Eliminar ${item.name}`}
                    >
                      <UiIcon name="trash" size="0.9em" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Undo Floating Toast */}
      {undoItem && (
        <div
          role="status"
          className="market-toast"
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--accent-primary)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
            borderRadius: '999px',
            padding: '0.6rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            whiteSpace: 'nowrap',
          }}
        >
          <span>
            {undoItem.action === 'checked' ? '✓ Producto marcado' : '🗑️ Producto eliminado'}
          </span>
          <button
            type="button"
            onClick={handleUndo}
            style={{
              background: 'var(--accent-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '999px',
              padding: '0.25rem 0.75rem',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
          >
            Deshacer
          </button>
        </div>
      )}

      {/* General Notification Toast */}
      {toastMessage && (
        <div
          role="status"
          className="market-toast"
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
            borderRadius: '999px',
            padding: '0.6rem 1.15rem',
            color: 'var(--text-primary)',
            fontSize: '0.84rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Edit List Name Modal */}
      {activeList && (
        <EditListNameModal
          isOpen={isEditModalOpen}
          initialName={activeList.name}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveListName}
        />
      )}

      {/* Share List Modal */}
      {activeList && (
        <ShareListModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          listName={activeList.name}
          items={items}
          pairedToken={pairedToken}
          onToast={showToast}
        />
      )}
    </div>
  )
}
