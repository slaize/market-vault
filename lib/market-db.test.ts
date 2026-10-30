import { describe, it, expect, beforeEach } from 'vitest'
import {
  getLocalLists,
  saveLocalList,
  deleteLocalList,
  getLocalItems,
  saveLocalItem,
  toggleLocalItem,
  deleteLocalItem,
  clearCheckedLocalItems,
  getMarketSettings,
  saveMarketSettings,
} from './market-db'

// Polyfill in-memory IndexedDB for jsdom environment if not provided
if (typeof indexedDB === 'undefined') {
  const dbs = new Map<string, any>()
  const mockIDB = {
    databases: async () => Array.from(dbs.keys()).map(name => ({ name })),
    deleteDatabase: (name: string) => {
      dbs.delete(name)
      return { onsuccess: null, onerror: null }
    },
    open: (name: string, _version?: number) => {
      const req: any = {
        result: null,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      }
      setTimeout(() => {
        let db = dbs.get(name)
        let isNew = false
        if (!db) {
          isNew = true
          db = {
            stores: new Map<string, Map<any, any>>(),
            storeConfigs: new Map<string, { keyPath?: string; indices: Map<string, string> }>(),
            objectStoreNames: {
              contains: (sName: string) => db.stores.has(sName),
            },
            createObjectStore: (sName: string, options: { keyPath?: string } = {}) => {
              db.stores.set(sName, new Map())
              const indices = new Map<string, string>()
              db.storeConfigs.set(sName, { keyPath: options.keyPath, indices })
              return {
                createIndex: (idxName: string, keyPath: string) => {
                  indices.set(idxName, keyPath)
                },
              }
            },
          }
          dbs.set(name, db)
        }

        req.result = {
          objectStoreNames: db.objectStoreNames,
          createObjectStore: db.createObjectStore,
          transaction: (_storeNames: string | string[], _mode: string) => {
            let pending = 0
            let completed = false
            let completeTimer: any = null
            let oncompleteCb: (() => void) | null = null

            function scheduleComplete() {
              clearTimeout(completeTimer)
              completeTimer = setTimeout(() => {
                if (pending === 0) {
                  completed = true
                  if (oncompleteCb) {
                    oncompleteCb()
                  }
                }
              }, 10)
            }

            const tx: any = {
              onerror: null,
              objectStore: (sName: string) => {
                const storeData = db.stores.get(sName) || new Map()
                const config = db.storeConfigs.get(sName) || { indices: new Map() }

                return {
                  put: (val: any, key?: any) => {
                    const actualKey = key !== undefined ? key : (config.keyPath ? val[config.keyPath] : undefined)
                    storeData.set(actualKey, JSON.parse(JSON.stringify(val)))
                    scheduleComplete()
                  },
                  get: (key: any) => {
                    pending++
                    const getReq: any = { result: undefined, onsuccess: null, onerror: null }
                    setTimeout(() => {
                      getReq.result = storeData.has(key) ? JSON.parse(JSON.stringify(storeData.get(key))) : undefined
                      getReq.onsuccess?.({ target: getReq })
                      pending--
                      scheduleComplete()
                    }, 0)
                    return getReq
                  },
                  getAll: () => {
                    pending++
                    const getReq: any = { result: [], onsuccess: null, onerror: null }
                    setTimeout(() => {
                      getReq.result = Array.from(storeData.values()).map(v => JSON.parse(JSON.stringify(v)))
                      getReq.onsuccess?.({ target: getReq })
                      pending--
                      scheduleComplete()
                    }, 0)
                    return getReq
                  },
                  delete: (key: any) => {
                    storeData.delete(key)
                    scheduleComplete()
                  },
                  index: (idxName: string) => {
                    const field = config.indices.get(idxName) || idxName
                    return {
                      getAll: (val: any) => {
                        pending++
                        const idxReq: any = { result: [], onsuccess: null, onerror: null }
                        setTimeout(() => {
                          idxReq.result = Array.from(storeData.values())
                            .filter((item: any) => item[field] === val)
                            .map(v => JSON.parse(JSON.stringify(v)))
                          idxReq.onsuccess?.({ target: idxReq })
                          pending--
                          scheduleComplete()
                        }, 0)
                        return idxReq
                      },
                      getAllKeys: (val: any) => {
                        pending++
                        const idxReq: any = { result: [], onsuccess: null, onerror: null }
                        setTimeout(() => {
                          const entries = Array.from(storeData.entries()) as [any, any][]
                          idxReq.result = entries
                            .filter(([, item]) => item[field] === val)
                            .map(([k]) => k)
                          idxReq.onsuccess?.({ target: idxReq })
                          pending--
                          scheduleComplete()
                        }, 0)
                        return idxReq
                      },
                    }
                  },
                }
              },
            }

            Object.defineProperty(tx, 'oncomplete', {
              get: () => oncompleteCb,
              set: (fn: (() => void) | null) => {
                oncompleteCb = fn
                if (completed && fn) {
                  fn()
                }
              },
            })

            return tx
          },
        }

        if (isNew && req.onupgradeneeded) {
          req.onupgradeneeded({ target: req })
        }
        req.onsuccess?.({ target: req })
      }, 0)
      return req
    },
  }

  ;(globalThis as any).indexedDB = mockIDB
}

describe('MarketVault Local-First IndexedDB Engine', () => {
  beforeEach(async () => {
    // Reset IndexedDB for clean state
    if (typeof indexedDB !== 'undefined') {
      const dbs = await indexedDB.databases?.()
      dbs?.forEach(db => db.name && indexedDB.deleteDatabase(db.name))
    }
  })

  it('creates and lists local shopping lists', async () => {
    const list = await saveLocalList({ name: 'Compra Semanal' })
    expect(list.id).toBeDefined()
    expect(list.name).toBe('Compra Semanal')

    const lists = await getLocalLists()
    expect(lists.length).toBe(1)
    expect(lists[0].id).toBe(list.id)

    await deleteLocalList(list.id)
    const remaining = await getLocalLists()
    expect(remaining.length).toBe(0)
  })

  it('adds items with automatic aisle categorization', async () => {
    const list = await saveLocalList({ name: 'Mercado' })
    const item = await saveLocalItem({
      list_id: list.id,
      name: 'Plátanos de Canarias',
      quantity: 1,
      unit: 'kg',
    })

    expect(item.id).toBeDefined()
    expect(item.category).toBe('frutas-verduras')
    expect(item.is_checked).toBe(false)

    const items = await getLocalItems(list.id)
    expect(items.length).toBe(1)
    expect(items[0].name).toBe('Plátanos de Canarias')
  })

  it('toggles item checked status instantly', async () => {
    const list = await saveLocalList({ name: 'Mercado' })
    const item = await saveLocalItem({ list_id: list.id, name: 'Leche entera' })
    expect(item.is_checked).toBe(false)

    const updated = await toggleLocalItem(item.id, true)
    expect(updated?.is_checked).toBe(true)

    const items = await getLocalItems(list.id)
    expect(items[0].is_checked).toBe(true)

    await deleteLocalItem(item.id)
    const remaining = await getLocalItems(list.id)
    expect(remaining.length).toBe(0)
  })

  it('clears checked items from a list', async () => {
    const list = await saveLocalList({ name: 'Mercado' })
    const item1 = await saveLocalItem({ list_id: list.id, name: 'Pan' })
    const item2 = await saveLocalItem({ list_id: list.id, name: 'Huevos' })

    await toggleLocalItem(item1.id, true)
    await clearCheckedLocalItems(list.id)

    const items = await getLocalItems(list.id)
    expect(items.length).toBe(1)
    expect(items[0].name).toBe('Huevos')
    expect(items[0].id).toBe(item2.id)
  })

  it('saves and retrieves market settings', async () => {
    const initial = await getMarketSettings()
    expect(initial.sync_mode).toBe('local_only')

    await saveMarketSettings({ sync_mode: 'paired_household', paired_code: 'RV-1234' })
    const updated = await getMarketSettings()
    expect(updated.sync_mode).toBe('paired_household')
    expect(updated.paired_code).toBe('RV-1234')
  })
})
