import { categorize, type ShoppingCategory } from './shopping'

export interface MarketList {
  id: string
  name: string
  week_start: string | null
  is_archived: boolean
  remote_list_id: string | null
  created_at: string
  updated_at: string
}

export interface MarketItem {
  id: string
  list_id: string
  remote_item_id?: string | null
  name: string
  quantity: number | null
  unit: string | null
  category: ShoppingCategory
  is_checked: boolean
  sort_order: number
  updated_at: string
}

export interface MarketSettings {
  active_list_id: string | null
  sync_mode: 'local_only' | 'user_account' | 'paired_household'
  paired_code: string | null
  paired_token?: string | null
  last_synced_at: string | null
}

export interface ProductHistoryItem {
  name: string
  name_normalized: string
  category: ShoppingCategory
  default_unit?: string | null
  count: number
  last_used: string
}

export const COMMON_STAPLES: Array<{ name: string; category: ShoppingCategory; default_unit?: string }> = [
  { name: 'Leche entera', category: 'lacteos', default_unit: 'l' },
  { name: 'Leche desnatada', category: 'lacteos', default_unit: 'l' },
  { name: 'Huevos camperos', category: 'lacteos', default_unit: 'docena' },
  { name: 'Pan de barra', category: 'cereales-pan', default_unit: 'barras' },
  { name: 'Pan de molde', category: 'cereales-pan' },
  { name: 'Aceite de oliva virgen extra', category: 'despensa', default_unit: 'l' },
  { name: 'Plátanos de Canarias', category: 'frutas-verduras', default_unit: 'kg' },
  { name: 'Tomates', category: 'frutas-verduras', default_unit: 'kg' },
  { name: 'Cebollas', category: 'frutas-verduras', default_unit: 'kg' },
  { name: 'Patatas', category: 'frutas-verduras', default_unit: 'kg' },
  { name: 'Ajos', category: 'frutas-verduras', default_unit: 'cabeza' },
  { name: 'Pechuga de pollo', category: 'carniceria', default_unit: 'kg' },
  { name: 'Carne picada', category: 'carniceria', default_unit: 'g' },
  { name: 'Arroz', category: 'cereales-pan', default_unit: 'kg' },
  { name: 'Pasta / Espaguetis', category: 'cereales-pan', default_unit: 'paquete' },
  { name: 'Café', category: 'bebidas', default_unit: 'paquete' },
  { name: 'Azúcar', category: 'despensa', default_unit: 'kg' },
  { name: 'Mantequilla', category: 'lacteos', default_unit: 'g' },
  { name: 'Queso rallado', category: 'lacteos', default_unit: 'bolsa' },
  { name: 'Yogures naturales', category: 'lacteos', default_unit: 'pack' },
  { name: 'Atún en lata', category: 'despensa', default_unit: 'latas' },
  { name: 'Tomate frito', category: 'despensa', default_unit: 'brik' },
  { name: 'Papel higiénico', category: 'otros', default_unit: 'rollo' },
  { name: 'Detergente lavadora', category: 'otros', default_unit: 'botella' },
  { name: 'Cerveza', category: 'bebidas', default_unit: 'pack' },
  { name: 'Agua mineral', category: 'bebidas', default_unit: 'botella' },
]

export function normalizeProductText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const DB_NAME = 'marketvault_local_v1'
const DB_VERSION = 2

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'))
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('lists')) {
        const store = db.createObjectStore('lists', { keyPath: 'id' })
        store.createIndex('updated_at', 'updated_at')
      }
      if (!db.objectStoreNames.contains('items')) {
        const store = db.createObjectStore('items', { keyPath: 'id' })
        store.createIndex('list_id', 'list_id')
        store.createIndex('sort_order', 'sort_order')
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('product_history')) {
        const pStore = db.createObjectStore('product_history', { keyPath: 'name_normalized' })
        pStore.createIndex('count', 'count')
        pStore.createIndex('last_used', 'last_used')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getLocalLists(): Promise<MarketList[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lists', 'readonly')
    const store = tx.objectStore('lists')
    const req = store.getAll()
    req.onsuccess = () => {
      const lists = (req.result as MarketList[]) || []
      lists.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      resolve(lists.filter(l => !l.is_archived))
    }
    req.onerror = () => reject(req.error)
  })
}

export async function saveLocalList(
  input: Partial<MarketList> & { name: string }
): Promise<MarketList> {
  const db = await openDb()
  const now = new Date().toISOString()
  const list: MarketList = {
    id: input.id || crypto.randomUUID(),
    name: input.name.trim(),
    week_start: input.week_start || null,
    is_archived: Boolean(input.is_archived),
    remote_list_id: input.remote_list_id || null,
    created_at: input.created_at || now,
    updated_at: now,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('lists', 'readwrite')
    tx.objectStore('lists').put(list)
    tx.oncomplete = () => resolve(list)
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteLocalList(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['lists', 'items'], 'readwrite')
    tx.objectStore('lists').delete(id)
    const itemsStore = tx.objectStore('items')
    const index = itemsStore.index('list_id')
    const req = index.getAllKeys(id)
    req.onsuccess = () => {
      (req.result as string[]).forEach(k => itemsStore.delete(k))
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getLocalItems(listId: string): Promise<MarketItem[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('items', 'readonly')
    const store = tx.objectStore('items')
    const index = store.index('list_id')
    const req = index.getAll(listId)
    req.onsuccess = () => {
      const items = (req.result as MarketItem[]) || []
      items.sort((a, b) => a.sort_order - b.sort_order)
      resolve(items)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function updateLocalListName(id: string, name: string): Promise<MarketList | null> {
  const db = await openDb()
  const clean = name.trim()
  if (!clean) return null
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lists', 'readwrite')
    const store = tx.objectStore('lists')
    const req = store.get(id)
    req.onsuccess = () => {
      const list = req.result as MarketList | undefined
      if (!list) return resolve(null)
      list.name = clean
      list.updated_at = new Date().toISOString()
      store.put(list)
      tx.oncomplete = () => resolve(list)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function findLocalListByRemoteId(remoteId: string): Promise<MarketList | null> {
  const lists = await getLocalLists()
  return lists.find((l) => l.remote_list_id === remoteId) || null
}

export async function saveLocalItem(
  input: {
    id?: string
    list_id: string
    remote_item_id?: string | null
    name: string
    quantity?: number | null
    unit?: string | null
    category?: ShoppingCategory
    is_checked?: boolean
    sort_order?: number
  }
): Promise<MarketItem> {
  const db = await openDb()
  const cleanName = input.name.trim()
  const now = new Date().toISOString()
  const item: MarketItem = {
    id: input.id || crypto.randomUUID(),
    list_id: input.list_id,
    remote_item_id: input.remote_item_id ?? null,
    name: cleanName,
    quantity: input.quantity ?? null,
    unit: input.unit ?? null,
    category: input.category || (categorize(cleanName) as ShoppingCategory),
    is_checked: Boolean(input.is_checked),
    sort_order: input.sort_order ?? Date.now(),
    updated_at: now,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('items', 'readwrite')
    tx.objectStore('items').put(item)
    tx.oncomplete = () => {
      recordProductHistory(cleanName, item.category, item.unit).catch(() => {})
      resolve(item)
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function updateLocalItemRemoteId(id: string, remoteItemId: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('items', 'readwrite')
    const store = tx.objectStore('items')
    const req = store.get(id)
    req.onsuccess = () => {
      const item = req.result as MarketItem | undefined
      if (item) {
        item.remote_item_id = remoteItemId
        store.put(item)
      }
      tx.oncomplete = () => resolve()
    }
    req.onerror = () => reject(req.error)
  })
}

export async function toggleLocalItem(id: string, isChecked: boolean): Promise<MarketItem | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('items', 'readwrite')
    tx.onerror = () => reject(tx.error)
    const store = tx.objectStore('items')
    const req = store.get(id)
    req.onsuccess = () => {
      const item = req.result as MarketItem | undefined
      if (!item) return resolve(null)
      item.is_checked = isChecked
      item.updated_at = new Date().toISOString()
      store.put(item)
      tx.oncomplete = () => resolve(item)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function deleteLocalItem(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('items', 'readwrite')
    tx.onerror = () => reject(tx.error)
    tx.objectStore('items').delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearCheckedLocalItems(listId: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('items', 'readwrite')
    tx.onerror = () => reject(tx.error)
    const store = tx.objectStore('items')
    const index = store.index('list_id')
    const req = index.getAll(listId)
    req.onsuccess = () => {
      const items = (req.result as MarketItem[]) || []
      items.filter(i => i.is_checked).forEach(i => store.delete(i.id))
      tx.oncomplete = () => resolve()
    }
    req.onerror = () => reject(req.error)
  })
}

export { openDb as getMarketDb }

export async function getMarketSettings(): Promise<MarketSettings> {
  const defaultSettings: MarketSettings = {
    active_list_id: null,
    sync_mode: 'local_only',
    paired_code: null,
    last_synced_at: null,
  }
  try {
    const db = await openDb()
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly')
      const req = tx.objectStore('settings').get('main')
      req.onsuccess = () => resolve(req.result?.value || defaultSettings)
      req.onerror = () => resolve(defaultSettings)
    })
  } catch {
    return defaultSettings
  }
}

export async function saveMarketSettings(settings: Partial<MarketSettings>): Promise<MarketSettings> {
  const current = await getMarketSettings()
  const updated: MarketSettings = { ...current, ...settings }
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite')
    tx.objectStore('settings').put({ key: 'main', value: updated })
    tx.oncomplete = () => resolve(updated)
    tx.onerror = () => reject(tx.error)
  })
}

export async function recordProductHistory(
  name: string,
  category?: ShoppingCategory,
  unit?: string | null
): Promise<ProductHistoryItem | null> {
  const cleanName = name.trim()
  if (!cleanName) return null
  const normalized = normalizeProductText(cleanName)

  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('product_history', 'readwrite')
      const store = tx.objectStore('product_history')
      const req = store.get(normalized)

      req.onsuccess = () => {
        const existing = req.result as ProductHistoryItem | undefined
        const now = new Date().toISOString()
        const resolvedCategory = category || existing?.category || (categorize(cleanName) as ShoppingCategory)
        const resolvedUnit = unit !== undefined ? unit : (existing?.default_unit || null)

        const updated: ProductHistoryItem = {
          name: existing?.name || cleanName,
          name_normalized: normalized,
          category: resolvedCategory,
          default_unit: resolvedUnit,
          count: (existing?.count || 0) + 1,
          last_used: now,
        }

        store.put(updated)
        tx.oncomplete = () => resolve(updated)
      }

      req.onerror = () => reject(req.error)
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    return null
  }
}

export async function getProductSuggestions(
  query = '',
  limit = 8
): Promise<ProductHistoryItem[]> {
  try {
    const db = await openDb()
    const userHistory: ProductHistoryItem[] = await new Promise((resolve, reject) => {
      const tx = db.transaction('product_history', 'readonly')
      const store = tx.objectStore('product_history')
      const req = store.getAll()
      req.onsuccess = () => resolve((req.result as ProductHistoryItem[]) || [])
      req.onerror = () => reject(req.error)
    })

    const historyMap = new Map<string, ProductHistoryItem>()
    for (const item of userHistory) {
      historyMap.set(item.name_normalized, item)
    }

    // Blend in common staples if not yet in user history
    for (const staple of COMMON_STAPLES) {
      const norm = normalizeProductText(staple.name)
      if (!historyMap.has(norm)) {
        historyMap.set(norm, {
          name: staple.name,
          name_normalized: norm,
          category: staple.category,
          default_unit: staple.default_unit || null,
          count: 0,
          last_used: '',
        })
      }
    }

    const all = Array.from(historyMap.values())
    const qNorm = normalizeProductText(query)

    const filtered = qNorm
      ? all.filter(
          (item) =>
            item.name_normalized.includes(qNorm) ||
            normalizeProductText(item.name).includes(qNorm)
        )
      : all

    filtered.sort((a, b) => {
      // 1. Exact or prefix match prioritized when query is present
      if (qNorm) {
        const aPrefix = a.name_normalized.startsWith(qNorm) ? 1 : 0
        const bPrefix = b.name_normalized.startsWith(qNorm) ? 1 : 0
        if (aPrefix !== bPrefix) return bPrefix - aPrefix
      }
      // 2. Frequency of use (highest count first)
      if (b.count !== a.count) return b.count - a.count
      // 3. Recency of use
      if (b.last_used && a.last_used && b.last_used !== a.last_used) {
        return b.last_used.localeCompare(a.last_used)
      }
      // 4. Alphabetical
      return a.name.localeCompare(b.name, 'es')
    })

    return filtered.slice(0, limit)
  } catch {
    return []
  }
}

export async function getFrequentProducts(limit = 6): Promise<ProductHistoryItem[]> {
  try {
    const db = await openDb()
    const userHistory: ProductHistoryItem[] = await new Promise((resolve, reject) => {
      const tx = db.transaction('product_history', 'readonly')
      const store = tx.objectStore('product_history')
      const req = store.getAll()
      req.onsuccess = () => resolve((req.result as ProductHistoryItem[]) || [])
      req.onerror = () => reject(req.error)
    })

    userHistory.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return b.last_used.localeCompare(a.last_used)
    })

    const result = userHistory.filter((i) => i.count > 0).slice(0, limit)

    // If fewer than requested limit, pad with top staples
    if (result.length < limit) {
      const existingNorms = new Set(result.map((r) => r.name_normalized))
      for (const staple of COMMON_STAPLES) {
        const norm = normalizeProductText(staple.name)
        if (!existingNorms.has(norm)) {
          result.push({
            name: staple.name,
            name_normalized: norm,
            category: staple.category,
            default_unit: staple.default_unit || null,
            count: 0,
            last_used: '',
          })
          existingNorms.add(norm)
          if (result.length >= limit) break
        }
      }
    }

    return result
  } catch {
    return COMMON_STAPLES.slice(0, limit).map((s) => ({
      name: s.name,
      name_normalized: normalizeProductText(s.name),
      category: s.category,
      default_unit: s.default_unit || null,
      count: 0,
      last_used: '',
    }))
  }
}
