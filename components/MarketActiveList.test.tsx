import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MarketActiveList from './MarketActiveList'
import * as marketDb from '@/lib/market-db'

vi.mock('@/lib/market-db')

describe('MarketActiveList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(marketDb.getMarketSettings).mockResolvedValue({
      active_list_id: 'list-1',
      sync_mode: 'local_only',
      paired_code: null,
      last_synced_at: null,
    })
    vi.mocked(marketDb.getLocalLists).mockResolvedValue([
      {
        id: 'list-1',
        name: 'Compra Semanal',
        week_start: null,
        is_archived: false,
        remote_list_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    vi.mocked(marketDb.getLocalItems).mockResolvedValue([
      {
        id: 'item-1',
        list_id: 'list-1',
        name: 'Manzanas Golden',
        quantity: 1,
        unit: 'kg',
        category: 'frutas-verduras',
        is_checked: false,
        sort_order: 1,
        updated_at: new Date().toISOString(),
      },
    ])
  })

  it('renders active list title and items', async () => {
    render(<MarketActiveList />)
    await waitFor(() => {
      expect(screen.getByText('Compra Semanal')).toBeInTheDocument()
      expect(screen.getByText('Manzanas Golden')).toBeInTheDocument()
      expect(screen.getByText(/0\/1 completados/i)).toBeInTheDocument()
    })
  })

  it('adds a new product via quick input', async () => {
    vi.mocked(marketDb.saveLocalItem).mockResolvedValue({
      id: 'item-2',
      list_id: 'list-1',
      name: 'Leche Desnatada',
      quantity: null,
      unit: null,
      category: 'lacteos',
      is_checked: false,
      sort_order: 2,
      updated_at: new Date().toISOString(),
    })

    render(<MarketActiveList />)
    await waitFor(() => screen.getByPlaceholderText(/Añadir producto.../i))

    const input = screen.getByPlaceholderText(/Añadir producto.../i)
    fireEvent.change(input, { target: { value: 'Leche Desnatada' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => {
      expect(marketDb.saveLocalItem).toHaveBeenCalledWith(
        expect.objectContaining({ list_id: 'list-1', name: 'Leche Desnatada' })
      )
    })
  })

  it('toggles item checked status when clicking anywhere on the row', async () => {
    vi.mocked(marketDb.toggleLocalItem).mockResolvedValue({
      id: 'item-1',
      list_id: 'list-1',
      name: 'Manzanas Golden',
      quantity: 1,
      unit: 'kg',
      category: 'frutas-verduras',
      is_checked: true,
      sort_order: 1,
      updated_at: new Date().toISOString(),
    })

    render(<MarketActiveList />)
    await waitFor(() => screen.getByText('Manzanas Golden'))

    const row = screen.getByText('Manzanas Golden').closest('[data-testid="market-item-row"]')!
    fireEvent.click(row)

    await waitFor(() => {
      expect(marketDb.toggleLocalItem).toHaveBeenCalledWith('item-1', true)
    })
  })
})
