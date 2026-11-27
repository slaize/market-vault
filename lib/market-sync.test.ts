import { describe, it, expect, vi, beforeEach } from 'vitest'
import { syncActiveListWithRemote } from './market-sync'
import * as marketDb from './market-db'

vi.mock('./market-db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./market-db')>()
  return {
    ...actual,
    getMarketSettings: vi.fn(),
    saveMarketSettings: vi.fn(),
    getLocalLists: vi.fn(),
    getLocalItems: vi.fn(),
    saveLocalItem: vi.fn(),
    updateLocalItemRemoteId: vi.fn(),
  }
})

describe('syncActiveListWithRemote', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.fetch = fetchMock as unknown as typeof fetch

    vi.mocked(marketDb.getMarketSettings).mockResolvedValue({
      active_list_id: 'list-1',
      sync_mode: 'paired_household',
      paired_code: 'RV-1234',
      paired_token: 'tok-123',
      last_synced_at: null,
      pending_remote_deletes: [],
    })
    vi.mocked(marketDb.saveMarketSettings).mockResolvedValue({
      active_list_id: 'list-1',
      sync_mode: 'paired_household',
      paired_code: 'RV-1234',
      paired_token: 'tok-123',
      last_synced_at: new Date().toISOString(),
    })
    vi.mocked(marketDb.getLocalLists).mockResolvedValue([
      {
        id: 'list-1',
        name: 'Compra Semanal',
        week_start: null,
        is_archived: false,
        remote_list_id: 'remote-list-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    vi.mocked(marketDb.saveLocalItem).mockImplementation(async (input) => ({
      id: input.id || 'saved-id',
      list_id: input.list_id,
      remote_item_id: input.remote_item_id ?? null,
      name: input.name,
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      category: input.category || 'otros',
      is_checked: Boolean(input.is_checked),
      sort_order: input.sort_order ?? 1,
      updated_at: new Date().toISOString(),
    }))
    vi.mocked(marketDb.updateLocalItemRemoteId).mockResolvedValue(undefined)
  })

  it('pushes unsynced local items up to RecipeVault during sync', async () => {
    vi.mocked(marketDb.getLocalItems).mockResolvedValue([
      {
        id: 'local-only-1',
        list_id: 'list-1',
        remote_item_id: null,
        name: 'Aguacates',
        quantity: null,
        unit: null,
        category: 'frutas-verduras',
        is_checked: false,
        sort_order: 10,
        updated_at: new Date().toISOString(),
      },
    ])

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'remote-list-1', shopping_list_items: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'remote-new-99' } }),
      })

    const result = await syncActiveListWithRemote()
    expect(result).toEqual({ ok: true, synced: true })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/s/tok-123'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Aguacates'),
      })
    )
    expect(marketDb.updateLocalItemRemoteId).toHaveBeenCalledWith('local-only-1', 'remote-new-99')
  })

  it('keeps a newly added local pending item unchecked when remote has an old checked copy', async () => {
    vi.mocked(marketDb.getLocalItems).mockResolvedValue([
      {
        id: 'local-milk',
        list_id: 'list-1',
        remote_item_id: null,
        name: 'Leche entera',
        quantity: null,
        unit: null,
        category: 'lacteos',
        is_checked: false,
        sort_order: 20,
        updated_at: new Date().toISOString(),
      },
    ])

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'remote-list-1',
            shopping_list_items: [
              {
                id: 'rem-milk-1',
                name: 'Leche entera',
                quantity: 1,
                unit: 'l',
                category: 'lacteos',
                is_checked: true,
              },
            ],
          },
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    const result = await syncActiveListWithRemote()
    expect(result).toEqual({ ok: true, synced: true })

    expect(marketDb.saveLocalItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'local-milk',
        remote_item_id: 'rem-milk-1',
        is_checked: false,
      })
    )
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/s/tok-123'),
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"is_checked":false'),
      })
    )
  })
})
