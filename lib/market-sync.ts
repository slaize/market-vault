import {
  saveLocalList,
  saveLocalItem,
  getLocalItems,
  getMarketSettings,
  saveMarketSettings,
  findLocalListByRemoteId,
  type MarketItem,
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

            // Existing local items mapped by remote_item_id or name
            const currentLocalItems = (await getLocalItems(localList.id)) || []
            const localByRemoteId = new Map(currentLocalItems.map((i) => [i.remote_item_id, i]))
            const localByName = new Map(currentLocalItems.map((i) => [i.name.toLowerCase().trim(), i]))

            for (const item of remote.shopping_list_items || []) {
              const match = localByRemoteId.get(item.id) || localByName.get(item.name.toLowerCase().trim())
              await saveLocalItem({
                id: match?.id,
                list_id: localList.id,
                remote_item_id: item.id,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                category: item.category,
                is_checked: item.is_checked,
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

export async function syncActiveListWithRemote(): Promise<{ ok: boolean; synced: boolean; error?: string }> {
  try {
    const settings = await getMarketSettings()
    if (settings.sync_mode !== 'paired_household' || !settings.paired_token || !settings.active_list_id) {
      return { ok: true, synced: false }
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

    const localItems = (await getLocalItems(settings.active_list_id)) || []
    const localByRemoteId = new Map(localItems.map((i) => [i.remote_item_id, i]))
    const localByName = new Map(localItems.map((i) => [i.name.toLowerCase().trim(), i]))

    for (const remoteItem of remote.shopping_list_items || []) {
      const match = localByRemoteId.get(remoteItem.id) || localByName.get(remoteItem.name.toLowerCase().trim())
      await saveLocalItem({
        id: match?.id,
        list_id: settings.active_list_id,
        remote_item_id: remoteItem.id,
        name: remoteItem.name,
        quantity: remoteItem.quantity,
        unit: remoteItem.unit,
        category: remoteItem.category,
        is_checked: remoteItem.is_checked,
      })
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

// Background fire-and-forget remote update helpers (never block local UI)
export async function remoteToggleItem(remoteItemId: string | undefined | null, isChecked: boolean): Promise<void> {
  if (!remoteItemId) return
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
}

export async function remoteAddItem(
  item: { name: string; quantity: number | null; unit: string | null }
): Promise<string | null> {
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
}

export async function remoteDeleteItem(remoteItemId: string | undefined | null): Promise<void> {
  if (!remoteItemId) return
  const settings = await getMarketSettings()
  if (settings.sync_mode !== 'paired_household' || !settings.paired_token) return

  try {
    await fetch(`${RECIPE_VAULT_URL}/api/s/${settings.paired_token}?item_id=${encodeURIComponent(remoteItemId)}`, {
      method: 'DELETE',
    })
  } catch {
    // Graceful offline tolerance
  }
}

export async function remoteClearChecked(): Promise<void> {
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
}

export async function unpairHousehold(): Promise<void> {
  await saveMarketSettings({
    sync_mode: 'local_only',
    paired_code: null,
    paired_token: null,
  })
}
