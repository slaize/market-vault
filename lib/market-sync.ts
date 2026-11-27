import {
  saveLocalList,
  saveLocalItem,
  getLocalLists,
  getLocalItems,
  getMarketSettings,
  saveMarketSettings,
  findLocalListByRemoteId,
  updateLocalItemRemoteId,
  normalizeProductText,
} from './market-db'

export const RECIPE_VAULT_URL = (
  process.env.NEXT_PUBLIC_RECIPE_VAULT_URL || 'https://recipe-vault-pro.vercel.app'
).replace(/\/$/, '')

export async function pairHouseholdWithCode(code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const cleanCode = code.trim().toUpperCase()
    const res = await fetch(`${RECIPE_VAULT_URL}/api/shopping/pair/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: cleanCode }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: json.error || 'Código inválido' }

    const token = json.token
    if (token) {
      try {
        const listRes = await fetch(`${RECIPE_VAULT_URL}/api/s/${token}`)
        if (listRes.ok) {
          const listJson = await listRes.json().catch(() => ({}))
          const remote = listJson?.data
          if (remote) {
            // Check if we already have this remote list locally
            const existing = await findLocalListByRemoteId(remote.id)
            const localList = await saveLocalList({
              id: existing?.id,
              name: remote.name,
              remote_list_id: remote.id,
            })

            // Existing local items mapped by remote_item_id or normalized name
            const currentLocalItems = (await getLocalItems(localList.id)) || []
            const localByRemoteId = new Map(currentLocalItems.map((i) => [i.remote_item_id, i]))
            const localByName = new Map(currentLocalItems.map((i) => [normalizeProductText(i.name), i]))

            for (const item of remote.shopping_list_items || []) {
              const match = localByRemoteId.get(item.id) || localByName.get(normalizeProductText(item.name))
              await saveLocalItem({
                id: match?.id,
                list_id: localList.id,
                remote_item_id: item.id,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                category: item.category,
                is_checked: item.is_checked,
                sort_order: match?.sort_order,
              })
            }

            await saveMarketSettings({
              active_list_id: localList.id,
              sync_mode: 'paired_household',
              paired_code: cleanCode,
              paired_token: token,
              last_synced_at: new Date().toISOString(),
            })
            return { ok: true }
          }
        }
      } catch (err) {
        console.warn('[pairHouseholdWithCode] Could not fetch remote list content:', err)
      }
    }

    await saveMarketSettings({
      sync_mode: 'paired_household',
      paired_code: cleanCode,
      paired_token: token || null,
      last_synced_at: new Date().toISOString(),
    })
    return { ok: true }
  } catch (err) {
    console.error('[pairHouseholdWithCode] Error:', err)
    return { ok: false, error: 'Error de conexión al vincular' }
  }
}

// Sequential queue for remote mutations so rapid deletes/toggles/adds never race
let mutationQueue: Promise<void> = Promise.resolve()
let localMutationEpoch = 0
const recentlyDeletedRemoteIds = new Set<string>()

export function markLocalMutation(): void {
  localMutationEpoch++
}

function enqueueRemoteTask<T>(fn: () => Promise<T>): Promise<T> {
  localMutationEpoch++
  const run = mutationQueue.then(fn)
  mutationQueue = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

async function addPendingRemoteDelete(remoteItemId: string): Promise<void> {
  try {
    const settings = await getMarketSettings()
    const current = new Set(settings.pending_remote_deletes || [])
    if (!current.has(remoteItemId)) {
      current.add(remoteItemId)
      await saveMarketSettings({ pending_remote_deletes: Array.from(current) })
    }
  } catch {
    // Ignore storage error
  }
}

async function removePendingRemoteDelete(remoteItemId: string): Promise<void> {
  try {
    const settings = await getMarketSettings()
    const current = settings.pending_remote_deletes || []
    if (current.includes(remoteItemId)) {
      await saveMarketSettings({
        pending_remote_deletes: current.filter((id) => id !== remoteItemId),
      })
    }
  } catch {
    // Ignore storage error
  }
}

export async function syncActiveListWithRemote(): Promise<{ ok: boolean; synced: boolean; error?: string }> {
  try {
    // Wait for any in-flight local remote mutations (deletes, toggles, adds) before fetching
    await mutationQueue
    const startEpoch = localMutationEpoch

    const settings = await getMarketSettings()
    if (settings.sync_mode !== 'paired_household' || !settings.paired_token || !settings.active_list_id) {
      return { ok: true, synced: false }
    }

    const allLists = await getLocalLists()
    const activeList = allLists.find((l) => l.id === settings.active_list_id)
    if (!activeList || !activeList.remote_list_id) {
      // Local-only list (e.g. Farmacia, Ferretería): do not contaminate with RecipeVault items
      return { ok: true, synced: false }
    }

    // 1. Flush any persisted remote deletes that failed/aborted when the PWA closed
    const pendingDeletes = new Set([
      ...recentlyDeletedRemoteIds,
      ...(settings.pending_remote_deletes || []),
    ])
    for (const delId of pendingDeletes) {
      try {
        const delRes = await fetch(
          `${RECIPE_VAULT_URL}/api/s/${settings.paired_token}?item_id=${encodeURIComponent(delId)}`,
          { method: 'DELETE' }
        )
        if (delRes.ok || delRes.status === 404) {
          recentlyDeletedRemoteIds.delete(delId)
          pendingDeletes.delete(delId)
          await removePendingRemoteDelete(delId)
        }
      } catch {
        // Keep in pendingDeletes to retry next sync
      }
    }

    const res = await fetch(`${RECIPE_VAULT_URL}/api/s/${settings.paired_token}`)
    if (!res.ok) {
      if (res.status === 404) {
        return { ok: false, synced: false, error: 'El enlace con RecipeVault ha expirado o no es válido' }
      }
      return { ok: false, synced: false, error: 'Error al conectar con RecipeVault' }
    }

    const json = await res.json().catch(() => ({}))
    const remote = json?.data
    if (!remote) return { ok: true, synced: false }

    // If the user modified/deleted items while the GET request was in flight, abort applying stale snapshot
    if (localMutationEpoch !== startEpoch) {
      return { ok: true, synced: false }
    }

    const localItems = (await getLocalItems(settings.active_list_id)) || []
    const localByRemoteId = new Map(
      localItems.filter((i) => i.remote_item_id).map((i) => [i.remote_item_id!, i])
    )
    const localByName = new Map(localItems.map((i) => [normalizeProductText(i.name), i]))
    const matchedLocalIds = new Set<string>()

    for (const remoteItem of remote.shopping_list_items || []) {
      if (pendingDeletes.has(remoteItem.id) || recentlyDeletedRemoteIds.has(remoteItem.id)) continue
      const match =
        localByRemoteId.get(remoteItem.id) || localByName.get(normalizeProductText(remoteItem.name))

      if (match) {
        matchedLocalIds.add(match.id)
      }

      // If this item was newly added locally (no remote_item_id yet) as pending,
      // do NOT let an old checked item on RecipeVault hide it under "Comprados".
      const localNewlyAddedOverCheckedRemote = Boolean(
        match && !match.remote_item_id && !match.is_checked && remoteItem.is_checked
      )

      if (localNewlyAddedOverCheckedRemote && match) {
        const mergedQty = match.quantity ?? remoteItem.quantity ?? null
        const mergedUnit = match.unit ?? remoteItem.unit ?? null
        await saveLocalItem({
          id: match.id,
          list_id: settings.active_list_id,
          remote_item_id: remoteItem.id,
          name: match.name,
          quantity: mergedQty,
          unit: mergedUnit,
          category: match.category,
          is_checked: false,
          sort_order: match.sort_order,
        })
        try {
          await fetch(`${RECIPE_VAULT_URL}/api/s/${settings.paired_token}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              item_id: remoteItem.id,
              is_checked: false,
              name: match.name,
              quantity: mergedQty,
              unit: mergedUnit,
              category: match.category,
            }),
          })
        } catch {
          // Will reconcile on next sync
        }
        continue
      }

      await saveLocalItem({
        id: match?.id,
        list_id: settings.active_list_id,
        remote_item_id: remoteItem.id,
        name: remoteItem.name,
        quantity: remoteItem.quantity,
        unit: remoteItem.unit,
        category: remoteItem.category,
        is_checked: remoteItem.is_checked,
        sort_order: match?.sort_order,
      })
    }

    // 2. Push any unsynced local items (added offline or before Android PWA was suspended) up to RecipeVault
    for (const localItem of localItems) {
      if (localItem.remote_item_id || matchedLocalIds.has(localItem.id)) continue
      if (localMutationEpoch !== startEpoch) break
      try {
        const pushRes = await fetch(`${RECIPE_VAULT_URL}/api/s/${settings.paired_token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: localItem.name,
            quantity: localItem.quantity,
            unit: localItem.unit,
            category: localItem.category,
          }),
        })
        if (pushRes.ok) {
          const pushJson = await pushRes.json().catch(() => ({}))
          const newRemoteId = pushJson?.data?.id
          if (newRemoteId) {
            await updateLocalItemRemoteId(localItem.id, newRemoteId)
            if (localItem.is_checked) {
              await fetch(`${RECIPE_VAULT_URL}/api/s/${settings.paired_token}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: newRemoteId, is_checked: true }),
              }).catch(() => {})
            }
          }
        }
      } catch {
        // Offline or transient error: keep local item, retry on next sync
      }
    }

    await saveMarketSettings({
      last_synced_at: new Date().toISOString(),
    })

    return { ok: true, synced: true }
  } catch (err) {
    console.warn('[syncActiveListWithRemote] Network error (offline):', err)
    return { ok: false, synced: false, error: 'Sin conexión a internet' }
  }
}

// Background serialized remote update helpers (never block local UI, never race)
export function remoteToggleItem(remoteItemId: string | undefined | null, isChecked: boolean): Promise<void> {
  if (!remoteItemId) return Promise.resolve()
  return enqueueRemoteTask(async () => {
    const settings = await getMarketSettings()
    if (settings.sync_mode !== 'paired_household' || !settings.paired_token) return

    try {
      await fetch(`${RECIPE_VAULT_URL}/api/s/${settings.paired_token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: remoteItemId, is_checked: isChecked }),
      })
    } catch {
      // Graceful offline tolerance
    }
  })
}

export function remoteAddItem(
  item: { name: string; quantity: number | null; unit: string | null; category?: string }
): Promise<string | null> {
  return enqueueRemoteTask(async () => {
    const settings = await getMarketSettings()
    if (settings.sync_mode !== 'paired_household' || !settings.paired_token) return null

    try {
      const res = await fetch(`${RECIPE_VAULT_URL}/api/s/${settings.paired_token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
        }),
      })
      if (res.ok) {
        const json = await res.json().catch(() => ({}))
        return json?.data?.id || null
      }
    } catch {
      // Graceful offline tolerance
    }
    return null
  })
}

export function remoteUpdateItem(
  remoteItemId: string | undefined | null,
  updates: { name?: string; category?: string; quantity?: number | null; unit?: string | null }
): Promise<void> {
  if (!remoteItemId) return Promise.resolve()
  return enqueueRemoteTask(async () => {
    const settings = await getMarketSettings()
    if (settings.sync_mode !== 'paired_household' || !settings.paired_token) return

    try {
      await fetch(`${RECIPE_VAULT_URL}/api/s/${settings.paired_token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: remoteItemId,
          ...updates,
        }),
      })
    } catch {
      // Graceful offline tolerance
    }
  })
}

export function remoteDeleteItem(remoteItemId: string | undefined | null): Promise<void> {
  if (!remoteItemId) return Promise.resolve()
  recentlyDeletedRemoteIds.add(remoteItemId)
  return enqueueRemoteTask(async () => {
    await addPendingRemoteDelete(remoteItemId)
    const settings = await getMarketSettings()
    if (settings.sync_mode !== 'paired_household' || !settings.paired_token) return

    try {
      const res = await fetch(`${RECIPE_VAULT_URL}/api/s/${settings.paired_token}?item_id=${encodeURIComponent(remoteItemId)}`, {
        method: 'DELETE',
      })
      if (res.ok || res.status === 404) {
        recentlyDeletedRemoteIds.delete(remoteItemId)
        await removePendingRemoteDelete(remoteItemId)
      }
    } catch {
      // Graceful offline tolerance; persisted in pending_remote_deletes for next sync
    }
  })
}

export function remoteClearChecked(): Promise<void> {
  return enqueueRemoteTask(async () => {
    const settings = await getMarketSettings()
    if (settings.sync_mode !== 'paired_household' || !settings.paired_token) return

    try {
      await fetch(`${RECIPE_VAULT_URL}/api/s/${settings.paired_token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_checked' }),
      })
    } catch {
      // Graceful offline tolerance
    }
  })
}

export async function unpairHousehold(): Promise<void> {
  await saveMarketSettings({
    sync_mode: 'local_only',
    paired_code: null,
    paired_token: null,
  })
  try {
    const lists = await getLocalLists()
    for (const l of lists) {
      if (l.remote_list_id) {
        await saveLocalList({ id: l.id, name: l.name, remote_list_id: null })
      }
    }
  } catch {
    // Graceful cleanup error ignore
  }
}
