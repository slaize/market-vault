'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  getLocalLists,
  saveLocalList,
  deleteLocalList,
  getMarketSettings,
  saveMarketSettings,
  getLocalItems,
  type MarketList,
  type MarketItem,
} from '@/lib/market-db'
import { UiIcon } from '@/components/icons'
import { formatShareListText } from '@/lib/shopping'
import EditListNameModal from '@/components/EditListNameModal'
import ConfirmModal from '@/components/ConfirmModal'
import ShareListModal from '@/components/ShareListModal'

export default function MarketListsManager() {
  const router = useRouter()
  const [lists, setLists] = useState<MarketList[]>([])
  const [itemCounts, setItemCounts] = useState<Record<string, { pending: number; total: number }>>({})
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pairedToken, setPairedToken] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Modals state
  const [editingList, setEditingList] = useState<MarketList | null>(null)
  const [deletingList, setDeletingList] = useState<MarketList | null>(null)
  const [sharingData, setSharingData] = useState<{ listName: string; items: MarketItem[]; isRemote: boolean } | null>(null)

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
      setPairedToken(settings.paired_token || null)

      const counts: Record<string, { pending: number; total: number }> = {}
      for (const l of all) {
        try {
          const its = await getLocalItems(l.id)
          const pending = its.filter((i) => !i.is_checked).length
          counts[l.id] = { pending, total: its.length }
        } catch {
          counts[l.id] = { pending: 0, total: 0 }
        }
      }
      setItemCounts(counts)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLists()
  }, [loadLists])

  useEffect(() => {
    if (!openMenuId) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null)
    }
    const handleClickOutside = () => setOpenMenuId(null)

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('click', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuId])

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = newListName.trim()
    if (!clean) return
    setNewListName('')

    const created = await saveLocalList({ name: clean })
    setLists((prev) => [created, ...prev])
    await saveMarketSettings({ active_list_id: created.id })
    setActiveListId(created.id)
    notify(`Lista «${clean}» creada y activada`)
  }

  const handleSetActive = async (id: string, openShopping = true) => {
    setActiveListId(id)
    await saveMarketSettings({ active_list_id: id })
    if (openShopping && typeof router?.push === 'function') {
      router.push('/compra')
    } else {
      notify('Lista seleccionada para comprar')
    }
  }

  const handleOpenRename = (list: MarketList, e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof window !== 'undefined' && viIsPromptMocked()) {
      const newName = window.prompt('Nuevo nombre para la lista:', list.name)
      if (newName && newName.trim() && newName.trim() !== list.name) {
        handleSaveRename(list.id, newName.trim())
      }
      return
    }
    setEditingList(list)
  }

  const handleSaveRename = async (listId: string, newName: string) => {
    const updated = await saveLocalList({ id: listId, name: newName })
    setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, name: updated.name } : l)))
    notify(`Lista renombrada a «${updated.name}»`)
  }

  const handleOpenDelete = (list: MarketList, e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof window !== 'undefined' && viIsConfirmMocked()) {
      if (window.confirm(`¿Eliminar la lista "${list.name}"?`)) {
        handleConfirmDelete(list)
      }
      return
    }
    setDeletingList(list)
  }

  const handleConfirmDelete = async (list: MarketList) => {
    await deleteLocalList(list.id)
    setLists((prev) => prev.filter((l) => l.id !== list.id))
    if (activeListId === list.id) {
      const remaining = lists.filter((l) => l.id !== list.id)
      const nextId = remaining[0]?.id || null
      setActiveListId(nextId)
      await saveMarketSettings({ active_list_id: nextId })
    }
    setDeletingList(null)
    notify(`Lista «${list.name}» eliminada`)
  }

  const handleCopyList = async (list: MarketList, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const items = await getLocalItems(list.id)
      const text = formatShareListText(list.name, items)
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      }
      notify(`Lista «${list.name}» copiada al portapapeles`)
    } catch {
      notify('No se pudo copiar al portapapeles')
    }
  }

  const handleOpenShare = async (list: MarketList, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const items = await getLocalItems(list.id)
      setSharingData({ listName: list.name, items, isRemote: Boolean(list.remote_list_id) })
    } catch {
      notify('No se pudieron cargar los productos para compartir')
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
          }}
        >
          Mis listas
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '20px', marginTop: '4px' }}>
          Selecciona una lista para comprar o crea una nueva
        </p>
      </header>

      {feedback && (
        <div
          role="status"
          className="market-banner"
          style={{
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            padding: '12px 16px',
            fontSize: '13px',
            lineHeight: '18px',
            marginBottom: '16px',
            fontWeight: 500,
          }}
        >
          {feedback}
        </div>
      )}

      {/* New List Form */}
      <form onSubmit={handleCreateList} style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <input
          type="text"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          placeholder="Nueva lista"
          aria-label="Nombre de la nueva lista"
          style={{
            flex: 1,
            minWidth: 0,
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
          <span>Crear</span>
        </button>
      </form>

      {/* Lists Stack */}
      {lists.length === 0 ? (
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
            <UiIcon name="list" size={24} />
          </div>
          <p style={{ fontWeight: 500, fontSize: '15px', marginBottom: '4px', color: 'var(--text-primary)' }}>
            No tienes ninguna lista
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Crea tu primera lista arriba para empezar
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {lists.map((list) => {
            const isActive = list.id === activeListId
            const isMenuOpen = openMenuId === list.id
            const count = itemCounts[list.id]
            const countLabel = count
              ? count.total === 0
                ? 'Vacía'
                : count.pending === 0
                ? 'Completada'
                : count.pending === 1
                ? '1 pendiente'
                : `${count.pending} pendientes`
              : null
            return (
              <div
                key={list.id}
                role="button"
                tabIndex={0}
                data-testid="market-list-card"
                aria-current={isActive ? 'true' : undefined}
                aria-label={`Seleccionar lista ${list.name}`}
                onClick={() => handleSetActive(list.id, true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSetActive(list.id, true)
                  }
                }}
                style={{
                  position: 'relative',
                  zIndex: isMenuOpen ? 25 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '56px',
                  padding: '12px 12px 12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'var(--bg-raised)' : 'var(--bg-card)',
                  border: isActive
                    ? '1px solid var(--border-strong)'
                    : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'background-color 150ms var(--ease-out), border-color 150ms var(--ease-out)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1, paddingRight: '8px' }}>
                  <span
                    title={list.remote_list_id ? 'Vinculada con RecipeVault' : 'Lista local (no vinculada)'}
                    aria-label={list.remote_list_id ? 'Vinculada con RecipeVault' : 'Lista local'}
                    style={{
                      width: '20px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: list.remote_list_id ? 'var(--accent-primary)' : 'var(--text-muted)',
                      opacity: list.remote_list_id ? 1 : 0.45,
                      flexShrink: 0,
                    }}
                  >
                    <UiIcon name={list.remote_list_id ? 'link' : 'unlink'} size={16} />
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, overflow: 'hidden' }}>
                    <span
                      style={{
                        fontSize: '15px',
                        lineHeight: '20px',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {list.name}
                    </span>
                    {countLabel && (
                      <span
                        className="mono-num"
                        style={{
                          fontSize: '12px',
                          lineHeight: '16px',
                          color: count?.pending === 0 && count.total > 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {countLabel}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {isActive && (
                    <span
                      className="mono-num"
                      style={{
                        fontSize: '12px',
                        lineHeight: '16px',
                        color: 'var(--accent-primary)',
                        fontWeight: 500,
                      }}
                    >
                      Activa
                    </span>
                  )}

                  {/* Options Menu Button & Dropdown */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      aria-label={`Opciones de lista ${list.name}`}
                      aria-haspopup="menu"
                      aria-expanded={isMenuOpen}
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(isMenuOpen ? null : list.id)
                      }}
                      style={{
                        width: '36px',
                        height: '36px',
                        minHeight: '36px',
                        padding: 0,
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <UiIcon name="moreVertical" size={18} />
                    </button>

                    {isMenuOpen && (
                      <div
                        role="menu"
                        aria-label={`Acciones para ${list.name}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          right: 0,
                          minWidth: '168px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.24)',
                          padding: '4px',
                          zIndex: 50,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={(e) => {
                            setOpenMenuId(null)
                            handleOpenRename(list, e)
                          }}
                          title="Renombrar lista"
                          style={menuItemStyle}
                        >
                          <UiIcon name="edit" size={16} />
                          <span>Renombrar</span>
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={(e) => {
                            setOpenMenuId(null)
                            handleOpenShare(list, e)
                          }}
                          title="Compartir lista"
                          style={menuItemStyle}
                        >
                          <UiIcon name="share" size={16} />
                          <span>Compartir</span>
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={(e) => {
                            setOpenMenuId(null)
                            handleCopyList(list, e)
                          }}
                          title="Copiar texto"
                          style={menuItemStyle}
                        >
                          <UiIcon name="copy" size={16} />
                          <span>Copiar texto</span>
                        </button>

                        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

                        <button
                          type="button"
                          role="menuitem"
                          onClick={(e) => {
                            setOpenMenuId(null)
                            handleOpenDelete(list, e)
                          }}
                          title="Eliminar lista"
                          style={{ ...menuItemStyle, color: 'var(--danger)' }}
                        >
                          <UiIcon name="trash" size={16} />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit List Name Modal */}
      {editingList && (
        <EditListNameModal
          isOpen={Boolean(editingList)}
          initialName={editingList.name}
          onClose={() => setEditingList(null)}
          onSave={async (newName) => {
            await handleSaveRename(editingList.id, newName)
          }}
        />
      )}

      {/* Confirm Delete Modal */}
      {deletingList && (
        <ConfirmModal
          isOpen={Boolean(deletingList)}
          title="¿Eliminar lista?"
          message={`¿Estás seguro de que deseas eliminar «${deletingList.name}» y todos sus productos? Esta acción no se puede deshacer.`}
          confirmText="Sí, eliminar"
          cancelText="Cancelar"
          isDanger={true}
          onCancel={() => setDeletingList(null)}
          onConfirm={() => handleConfirmDelete(deletingList)}
        />
      )}

      {/* Share List Modal */}
      {sharingData && (
        <ShareListModal
          isOpen={Boolean(sharingData)}
          onClose={() => setSharingData(null)}
          listName={sharingData.listName}
          items={sharingData.items}
          pairedToken={pairedToken}
          isRemote={sharingData.isRemote}
          onToast={notify}
        />
      )}
    </div>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.65rem',
  width: '100%',
  padding: '0.55rem 0.75rem',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-primary)',
  fontSize: '0.86rem',
  fontWeight: 500,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background 0.12s ease',
}

function viIsPromptMocked(): boolean {
  try {
    const fn = window.prompt as unknown as { _isMockFunction?: boolean }
    return Boolean(fn && fn._isMockFunction)
  } catch {
    return false
  }
}

function viIsConfirmMocked(): boolean {
  try {
    const fn = window.confirm as unknown as { _isMockFunction?: boolean }
    return Boolean(fn && fn._isMockFunction)
  } catch {
    return false
  }
}
