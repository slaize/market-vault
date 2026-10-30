import {
  saveLocalList,
  saveLocalItem,
  saveMarketSettings,
} from './market-db'

const RECIPE_VAULT_URL = (
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

    // Fetch initial list items from external share API
    if (json.token) {
      try {
        const listRes = await fetch(`${RECIPE_VAULT_URL}/api/s/${json.token}`)
        if (listRes.ok) {
          const listJson = await listRes.json().catch(() => ({}))
          const remote = listJson?.data
          if (remote) {
            const localList = await saveLocalList({
              name: remote.name,
              remote_list_id: remote.id,
            })
            for (const item of remote.shopping_list_items || []) {
              await saveLocalItem({
                list_id: localList.id,
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
              last_synced_at: new Date().toISOString(),
            })
            return { ok: true }
          }
        }
      } catch (err) {
        console.warn('[pairHouseholdWithCode] Could not fetch remote list content:', err)
      }
    }

    // Fallback: update settings even if initial remote list fetch was empty or unavailable
    await saveMarketSettings({
      sync_mode: 'paired_household',
      paired_code: cleanCode,
      last_synced_at: new Date().toISOString(),
    })
    return { ok: true }
  } catch (err) {
    console.error('[pairHouseholdWithCode] Error:', err)
    return { ok: false, error: 'Error de conexión al vincular' }
  }
}

export async function unpairHousehold(): Promise<void> {
  await saveMarketSettings({
    sync_mode: 'local_only',
    paired_code: null,
  })
}
