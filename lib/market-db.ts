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

const DB_NAME = 'marketvault_local_v1'
const DB_VERSION = 1

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
    tx.oncomplete = () => resolve(item)
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
