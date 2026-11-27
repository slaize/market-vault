'use client'

import { useState, useEffect, useCallback, useTransition, useRef } from 'react'
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
  updateLocalItemRemoteId,
  getProductSuggestions,
  getFrequentProducts,
  saveCustomProductIcon,
  normalizeProductText,
  requestPersistentStorage,
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
  remoteUpdateItem,
  markLocalMutation,
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
import EditItemModal from '@/components/EditItemModal'
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

function normalizeItemName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
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
  const [editingItem, setEditingItem] = useState<MarketItem | null>(null)
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({})
  const deletedLocalIdsRef = useRef<Set<string>>(new Set())

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
      setCustomIcons(settings.custom_icons || {})

      const current = allLists.find((l) => l.id === settings.active_list_id) || allLists[0]
      setActiveList(current)
      if (settings.active_list_id !== current.id) {
        Promise.resolve(saveMarketSettings({ active_list_id: current.id })).catch(() => {})
      }

      const listItems = await getLocalItems(current.id)
      setItems(listItems)

      // Load frequent products
      getFrequentProducts(8).then(setFrequentProducts)

      // Request persistent storage so Android/mobile browsers never evict IndexedDB
      Promise.resolve(requestPersistentStorage()).catch(() => {})

      // Background sync if paired
      if (settings.sync_mode === 'paired_household' && settings.paired_token) {
        syncActiveListWithRemote().then((res) => {
          if (res.synced) {
            getLocalItems(current.id).then((fresh) => {
              setItems(fresh.filter((i) => !deletedLocalIdsRef.current.has(i.id)))
            })
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

  // Screen Wake Lock API to prevent screen timeout while shopping in supermarket
  useEffect(() => {
    let sentinel: any = null
    const requestWakeLock = async () => {
      try {
        if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && (navigator as any).wakeLock?.request) {
          sentinel = await (navigator as any).wakeLock.request('screen')
        }
      } catch {
        // Battery saver or background mode can reject
      }
    }
    requestWakeLock()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
        loadData()
      }
    }
    const handleOnline = () => {
      loadData()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online', handleOnline)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online', handleOnline)
      if (sentinel && typeof sentinel.release === 'function') {
        sentinel.release().catch(() => {})
      }
    }
  }, [loadData])

  const triggerHaptic = (pattern: number | number[] = 15) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern)
      }
    } catch {
      // ignore
    }
  }

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

  const addOrReuseItem = async (input: {
    name: string
    quantity?: number | null
    unit?: string | null
    category?: ShoppingCategory
  }) => {
    if (!activeList) return
    const targetNorm = normalizeItemName(input.name)
    if (!targetNorm) return

    const isRemoteActiveList = Boolean(isPaired && pairedToken && activeList.remote_list_id)
    const existing = items.find((i) => normalizeItemName(i.name) === targetNorm)

    if (existing) {
      if (existing.is_checked) {
        const nextQty = input.quantity ?? existing.quantity ?? null
        const nextUnit =
          input.unit !== undefined && input.unit !== null ? input.unit : existing.unit ?? null
        const reactivated = await saveLocalItem({
          id: existing.id,
          list_id: activeList.id,
          remote_item_id: existing.remote_item_id,
          name: existing.name,
          quantity: nextQty,
          unit: nextUnit,
          category: input.category || existing.category,
          is_checked: false,
          sort_order: Date.now(),
        })
        setItems((prev) => prev.map((i) => (i.id === existing.id ? reactivated : i)))
        showToast(`«${existing.name}» reactivado en tu lista`)
        getFrequentProducts(8).then(setFrequentProducts)

        if (isRemoteActiveList) {
          if (existing.remote_item_id) {
            remoteToggleItem(existing.remote_item_id, false)
            if (nextQty !== existing.quantity || nextUnit !== existing.unit) {
              remoteUpdateItem(existing.remote_item_id, {
                name: reactivated.name,
                quantity: reactivated.quantity,
                unit: reactivated.unit,
                category: reactivated.category,
              })
            }
          } else {
            remoteAddItem({
              name: reactivated.name,
              quantity: reactivated.quantity,
              unit: reactivated.unit,
              category: reactivated.category,
            }).then((remoteId) => {
              if (!remoteId) return
              if (deletedLocalIdsRef.current.has(reactivated.id)) {
                remoteDeleteItem(remoteId)
              } else {
                updateLocalItemRemoteId(reactivated.id, remoteId).catch(() => {})
                setItems((prev) =>
                  prev.map((i) => (i.id === reactivated.id ? { ...i, remote_item_id: remoteId } : i))
                )
              }
            })
          }
        }
        return
      }

      const existingUnit = (existing.unit || '').toLowerCase()
      const incomingUnit = (input.unit || '').toLowerCase()
      const unitsCompatible = !incomingUnit || !existingUnit || incomingUnit === existingUnit

      if (input.quantity && unitsCompatible) {
        const mergedQty = Math.round(((existing.quantity || 0) + input.quantity) * 100) / 100
        const mergedUnit = existing.unit || input.unit || null
        const updated = await saveLocalItem({
          id: existing.id,
          list_id: activeList.id,
          remote_item_id: existing.remote_item_id,
          name: existing.name,
          quantity: mergedQty,
          unit: mergedUnit,
          category: existing.category,
          is_checked: false,
          sort_order: existing.sort_order,
        })
        setItems((prev) => prev.map((i) => (i.id === existing.id ? updated : i)))
        showToast(
          `Cantidad actualizada: ${mergedQty}${mergedUnit ? ' ' + mergedUnit : ''} ${existing.name}`
        )

        if (isRemoteActiveList && existing.remote_item_id) {
          remoteUpdateItem(existing.remote_item_id, {
            name: updated.name,
            quantity: updated.quantity,
            unit: updated.unit,
            category: updated.category,
          })
        }
        return
      }

      showToast(`«${existing.name}» ya está en tu lista`)
      return
    }

    const saved = await saveLocalItem({
      list_id: activeList.id,
      name: input.name,
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      category: input.category,
    })
    deletedLocalIdsRef.current.delete(saved.id)
    setItems((prev) => [...prev, saved])
    showToast(`«${saved.name}» añadido`)
    getFrequentProducts(8).then(setFrequentProducts)

    if (isRemoteActiveList) {
      remoteAddItem({
        name: saved.name,
        quantity: saved.quantity,
        unit: saved.unit,
        category: saved.category,
      }).then((remoteId) => {
        if (!remoteId) return
        if (deletedLocalIdsRef.current.has(saved.id)) {
          remoteDeleteItem(remoteId)
        } else {
          updateLocalItemRemoteId(saved.id, remoteId).catch(() => {})
          setItems((prev) =>
            prev.map((i) => (i.id === saved.id ? { ...i, remote_item_id: remoteId } : i))
          )
        }
      })
    }
  }

  const handleAddProductDirectly = async (
    name: string,
    category?: ShoppingCategory
  ) => {
    await addOrReuseItem({
      name,
      category,
      unit: null,
      quantity: null,
    })
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = newItemName.trim()
    if (!clean || !activeList) return
    setNewItemName('')
    setShowSuggestions(false)

    const parsed = parseItemInput(clean)
    await addOrReuseItem({
      name: parsed.name,
      quantity: parsed.quantity,
      unit: parsed.unit,
      category: parsed.category,
    })
  }

  const handleToggle = async (item: MarketItem) => {
    const nextState = !item.is_checked
    triggerHaptic(15)

    // Set undo state if marking as checked
    if (nextState) {
      setUndoItem({ item, action: 'checked' })
      setTimeout(() => {
        setUndoItem((current) => (current?.item.id === item.id ? null : current))
      }, 6000)
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
    deletedLocalIdsRef.current.add(item.id)
    markLocalMutation()
    triggerHaptic([20, 50, 20])
    setUndoItem({ item, action: 'deleted' })
    setTimeout(() => {
      setUndoItem((current) => (current?.item.id === item.id ? null : current))
    }, 6000)

    setItems((prev) => prev.filter((i) => i.id !== item.id))
    await deleteLocalItem(item.id)

    if (item.remote_item_id && isPaired && pairedToken && activeList?.remote_list_id) {
      remoteDeleteItem(item.remote_item_id)
    }
  }

  const handleSaveItemEdit = async (
    itemId: string,
    updates: {
      name: string
      category: ShoppingCategory
      quantity: number | null
      unit: string | null
    }
  ) => {
    const existing = items.find((i) => i.id === itemId)
    if (!existing) return

    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              name: updates.name,
              category: updates.category,
              quantity: updates.quantity,
              unit: updates.unit,
            }
          : i
      )
    )

    await saveLocalItem({
      ...existing,
      name: updates.name,
      category: updates.category,
      quantity: updates.quantity,
      unit: updates.unit,
    })

    if (existing.remote_item_id) {
      remoteUpdateItem(existing.remote_item_id, {
        name: updates.name,
        category: updates.category,
        quantity: updates.quantity,
        unit: updates.unit,
      })
    }

    showToast('Producto actualizado')
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
      deletedLocalIdsRef.current.delete(item.id)
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
      if (isPaired && pairedToken && activeList.remote_list_id) {
        remoteAddItem({
          name: restored.name,
          quantity: restored.quantity,
          unit: restored.unit,
          category: restored.category,
        }).then((remoteId) => {
          if (remoteId) {
            updateLocalItemRemoteId(restored.id, remoteId).catch(() => {})
            setItems((prev) =>
              prev.map((i) => (i.id === restored.id ? { ...i, remote_item_id: remoteId } : i))
            )
          }
        })
      }
      showToast('Deshecho: producto restaurado')
    }
  }

  const handleClearChecked = async () => {
    if (!activeList) return
    setItems((prev) => prev.filter((i) => !i.is_checked))
    await clearCheckedLocalItems(activeList.id)
    if (isPaired && pairedToken && activeList.remote_list_id) {
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

  const getProgressMessage = () => {
    if (total === 0) return 'Lista vacía'
    if (isAllDone) return 'Compra completada'
    if (completed === 0) {
      return total === 1 ? '1 producto pendiente' : `${total} productos pendientes`
    }
    return `${pendingItems.length} pendientes · ${completed} en la cesta`
  }

  // Group pending by aisle
  const groupedPending = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat]?.label || cat,
    emoji: CATEGORY_LABELS[cat]?.emoji || '🛒',
    items: pendingItems.filter((i) => (i.category || 'otros') === cat),
  })).filter((g) => g.items.length > 0)

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 20px 64px' }}>
      {/* Sticky Top Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'var(--bg-header)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-subtle)',
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          paddingBottom: '12px',
          marginLeft: '-20px',
          marginRight: '-20px',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1
                style={{
                  fontSize: '20px',
                  lineHeight: '26px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  letterSpacing: '-0.01em',
                }}
              >
                {activeList?.name || 'Mi Compra'}
              </h1>
              {isPaired && (
                <span
                  title="Sincronizada con RecipeVault"
                  aria-label="Sincronizada con RecipeVault"
                  style={{
                    color: 'var(--accent-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <UiIcon name="link" size={16} />
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="btn btn-ghost"
                style={{
                  width: '28px',
                  height: '28px',
                  minHeight: '28px',
                  padding: 0,
                  color: 'var(--text-muted)',
                  borderRadius: 'var(--radius-xs)',
                  flexShrink: 0,
                }}
                title="Editar nombre de la lista"
                aria-label="Editar nombre de la lista"
              >
                <UiIcon name="edit" size={15} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <p
                style={{
                  fontSize: '13px',
                  lineHeight: '18px',
                  color: isAllDone ? 'var(--accent-primary)' : 'var(--text-muted)',
                  fontWeight: isAllDone ? 500 : 400,
                  margin: 0,
                  transition: 'color 150ms var(--ease-out)',
                }}
              >
                {getProgressMessage()}
              </p>
              {total > 0 && (
                <span
                  className="mono-num"
                  style={{
                    fontSize: '12px',
                    lineHeight: '16px',
                    color: 'var(--text-muted)',
                  }}
                >
                  {completed}/{total}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {/* Sync Button */}
            {isPaired && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="btn btn-ghost"
                style={{
                  width: '36px',
                  height: '36px',
                  minHeight: '36px',
                  padding: 0,
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                }}
                title="Sincronizar con RecipeVault"
                aria-label="Sincronizar con RecipeVault"
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: isSyncing ? 'rotate(360deg)' : 'none',
                    transition: isSyncing ? 'transform 600ms linear' : 'none',
                  }}
                >
                  <UiIcon name="refresh" size={18} />
                </span>
              </button>
            )}

            {/* Share Button */}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="btn btn-ghost"
              style={{
                width: '36px',
                height: '36px',
                minHeight: '36px',
                padding: 0,
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
              }}
              title="Compartir lista"
              aria-label="Compartir lista"
            >
              <UiIcon name="share" size={18} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {total > 0 && (
          <div
            style={{
              height: '2px',
              background: 'var(--border-subtle)',
              borderRadius: '2px',
              marginTop: '12px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'var(--accent-primary)',
                borderRadius: '2px',
                transition: 'width 240ms var(--ease-out)',
              }}
            />
          </div>
        )}
      </header>

      {/* Quick Add Form */}
      <form
        onSubmit={handleAddItem}
        style={{
          position: 'relative',
          display: 'flex',
          gap: '8px',
          marginBottom: frequentProducts.length > 0 ? '16px' : '24px',
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
            placeholder="Añadir producto"
            aria-label="Añadir producto"
            style={{
              width: '100%',
              height: '44px',
              padding: '0 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--input-bg)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontSize: '15px',
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
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                maxHeight: '260px',
                overflowY: 'auto',
              }}
            >
              {suggestions.map((sug) => {
                const emoji = getIngredientEmoji(sug.name, sug.category, customIcons)
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
                      minHeight: '44px',
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'background-color 150ms var(--ease-out)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-glass-hover)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <span style={{ width: '24px', fontSize: '16px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        {renderIngredientIcon(emoji, '18px')}
                      </span>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sug.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddProductDirectly(sug.name, sug.category)
                        setNewItemName('')
                        setShowSuggestions(false)
                      }}
                      className="btn btn-secondary"
                      style={{
                        fontSize: '12px',
                        padding: '0 10px',
                        borderRadius: 'var(--radius-xs)',
                        fontWeight: 500,
                        minHeight: '28px',
                        height: '28px',
                        marginLeft: '8px',
                      }}
                      title={`Añadir ${sug.name}`}
                    >
                      Añadir
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
            height: '44px',
            padding: '0 16px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 500,
            fontSize: '14px',
            flexShrink: 0,
          }}
        >
          <UiIcon name="plus" size={16} />
          <span>Añadir</span>
        </button>
      </form>

      {/* Frequent products quick chips */}
      {frequentProducts.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '12px',
                lineHeight: '16px',
                fontWeight: 500,
                color: 'var(--text-muted)',
              }}
            >
              Habituales
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '4px',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}
          >
            {frequentProducts.map((p) => {
              const isAlreadyPending = pendingItems.some(
                (item) => normalizeItemName(item.name) === normalizeItemName(p.name)
              )
              return (
                <button
                  key={p.name_normalized}
                  type="button"
                  onClick={() => handleAddProductDirectly(p.name, p.category)}
                  className="btn btn-ghost"
                  style={{
                    flexShrink: 0,
                    fontSize: '13px',
                    fontWeight: isAlreadyPending ? 500 : 400,
                    height: '36px',
                    minHeight: '36px',
                    padding: '0 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: isAlreadyPending ? 'var(--bg-raised)' : 'var(--bg-card)',
                    border: isAlreadyPending ? '1px solid var(--border-strong)' : '1px solid var(--border-subtle)',
                    color: isAlreadyPending ? 'var(--text-primary)' : 'var(--text-secondary)',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                  title={isAlreadyPending ? `${p.name} ya está en la lista` : `Añadir ${p.name}`}
                >
                  <UiIcon
                    name={isAlreadyPending ? 'check' : 'plus'}
                    size={14}
                    style={{ color: isAlreadyPending ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                  />
                  <span>{p.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State: 0 items total */}
      {items.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ color: 'var(--text-muted)', marginBottom: '12px', display: 'inline-flex' }}>
            <UiIcon name="cart" size={24} />
          </div>
          <p style={{ fontWeight: 500, fontSize: '15px', marginBottom: '4px', color: 'var(--text-primary)' }}>
            Tu lista está vacía
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Añade productos arriba para empezar
          </p>
        </div>
      )}

      {/* Completion State: All checked */}
      {isAllDone && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-default)',
            marginBottom: '24px',
          }}
        >
          <span
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--accent-subtle)',
              color: 'var(--accent-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <UiIcon name="check" size={18} />
          </span>
          <div>
            <h2 style={{ fontSize: '15px', lineHeight: '20px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
              Compra completada
            </h2>
            <p style={{ fontSize: '13px', lineHeight: '18px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Todos los productos están marcados
            </p>
          </div>
        </div>
      )}

      {/* Pending Items Grouped by Aisle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {groupedPending.map((group) => (
          <section key={group.category}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
                padding: '0 4px',
              }}
            >
              <h2
                style={{
                  fontSize: '13px',
                  lineHeight: '18px',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  margin: 0,
                }}
              >
                {group.label}
              </h2>
              <span className="mono-num" style={{ fontSize: '12px', lineHeight: '16px', color: 'var(--text-muted)' }}>
                {group.items.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {group.items.map((item) => {
                const itemEmoji = getIngredientEmoji(item.name, group.category, customIcons)
                const qtyText = [item.quantity ?? '', item.unit ?? ''].filter(Boolean).join(' ')
                return (
                  <div
                    key={item.id}
                    data-testid="market-item-row"
                    onClick={() => handleToggle(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: '48px',
                      padding: '8px 8px 8px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'background-color 150ms var(--ease-out), border-color 150ms var(--ease-out)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={item.is_checked}
                        readOnly
                        className="market-checkbox"
                        aria-label={`Marcar ${item.name}`}
                      />
                      <span
                        style={{
                          width: '24px',
                          fontSize: '17px',
                          flexShrink: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {renderIngredientIcon(itemEmoji, '20px')}
                      </span>
                      <span
                        style={{
                          fontSize: '15px',
                          lineHeight: '20px',
                          fontWeight: 400,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {item.name}
                      </span>
                      {qtyText && (
                        <span
                          className="mono-num"
                          style={{
                            fontSize: '12px',
                            lineHeight: '16px',
                            color: 'var(--text-muted)',
                            flexShrink: 0,
                            paddingLeft: '8px',
                          }}
                        >
                          {qtyText}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0, marginLeft: '4px' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingItem(item)
                        }}
                        className="btn btn-ghost"
                        style={{
                          width: '36px',
                          height: '36px',
                          minHeight: '36px',
                          padding: 0,
                          color: 'var(--text-muted)',
                        }}
                        title="Editar"
                        aria-label={`Editar ${item.name}`}
                      >
                        <UiIcon name="pencil" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(item, e)}
                        className="btn btn-ghost"
                        style={{
                          width: '36px',
                          height: '36px',
                          minHeight: '36px',
                          padding: 0,
                          color: 'var(--text-muted)',
                        }}
                        title="Eliminar"
                        aria-label={`Eliminar ${item.name}`}
                      >
                        <UiIcon name="trash" size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Completed Accordion Section */}
      {checkedItems.length > 0 && (
        <section style={{ marginTop: '32px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button
              type="button"
              onClick={() => setShowCheckedSection(!showCheckedSection)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  transform: showCheckedSection ? 'rotate(0deg)' : 'rotate(-90deg)',
                  transition: 'transform 150ms var(--ease-out)',
                }}
              >
                <UiIcon name="chevDown" size={16} />
              </span>
              <span>Comprados</span>
              <span className="mono-num" style={{ fontSize: '12px' }}>
                {checkedItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={handleClearChecked}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--danger)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              Limpiar comprados
            </button>
          </div>

          {showCheckedSection && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {checkedItems.map((item) => {
                const itemEmoji = getIngredientEmoji(item.name, item.category, customIcons)
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggle(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: '44px',
                      padding: '8px 8px 8px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'transparent',
                      opacity: 0.6,
                      cursor: 'pointer',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'line-through', flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={item.is_checked}
                        readOnly
                        className="market-checkbox"
                        aria-label={`Desmarcar ${item.name}`}
                      />
                      <span style={{ width: '24px', fontSize: '16px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        {renderIngredientIcon(itemEmoji, '18px')}
                      </span>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingItem(item)
                        }}
                        className="btn btn-ghost"
                        style={{ width: '36px', height: '36px', minHeight: '36px', padding: 0, color: 'var(--text-muted)' }}
                        title="Editar"
                        aria-label={`Editar ${item.name}`}
                      >
                        <UiIcon name="pencil" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(item, e)}
                        className="btn btn-ghost"
                        style={{ width: '36px', height: '36px', minHeight: '36px', padding: 0, color: 'var(--text-muted)' }}
                        title="Eliminar"
                        aria-label={`Eliminar ${item.name}`}
                      >
                        <UiIcon name="trash" size={16} />
                      </button>
                    </div>
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
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 8px 8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <UiIcon name={undoItem.action === 'checked' ? 'check' : 'trash'} size={15} style={{ color: 'var(--accent-primary)' }} />
            <span>{undoItem.action === 'checked' ? 'Producto marcado' : 'Producto eliminado'}</span>
          </span>
          <button
            type="button"
            onClick={handleUndo}
            className="btn btn-primary"
            style={{
              height: '32px',
              minHeight: '32px',
              borderRadius: 'var(--radius-xs)',
              padding: '0 12px',
              fontWeight: 500,
              fontSize: '13px',
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
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.24)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 16px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 500,
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
          isRemote={Boolean(activeList.remote_list_id)}
          customIcons={customIcons}
          onToast={showToast}
        />
      )}

      {/* Edit Item Modal */}
      <EditItemModal
        isOpen={Boolean(editingItem)}
        item={editingItem}
        customIcon={editingItem ? (customIcons[normalizeProductText(editingItem.name)] || null) : null}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveItemEdit}
        onSaveIcon={async (productName, icon) => {
          const next = await saveCustomProductIcon(productName, icon)
          setCustomIcons(next)
        }}
      />
    </div>
  )
}
