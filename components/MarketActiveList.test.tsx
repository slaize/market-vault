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
    vi.mocked(marketDb.getFrequentProducts).mockResolvedValue([])
    vi.mocked(marketDb.getProductSuggestions).mockResolvedValue([])
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

  it('renders frequent product chips and adds a product on chip click', async () => {
    vi.mocked(marketDb.getFrequentProducts).mockResolvedValue([
      {
        name: 'Huevos camperos',
        name_normalized: 'huevos camperos',
        category: 'lacteos',
        default_unit: 'docena',
        count: 5,
        last_used: new Date().toISOString(),
      },
    ])
    vi.mocked(marketDb.saveLocalItem).mockResolvedValue({
      id: 'item-h',
      list_id: 'list-1',
      name: 'Huevos camperos',
      quantity: 1,
      unit: 'docena',
      category: 'lacteos',
      is_checked: false,
      sort_order: 2,
      updated_at: new Date().toISOString(),
    })

    render(<MarketActiveList />)
    await waitFor(() => screen.getByText('Huevos camperos'))

    const chip = screen.getByText('Huevos camperos')
    fireEvent.click(chip)

    await waitFor(() => {
      expect(marketDb.saveLocalItem).toHaveBeenCalledWith(
        expect.objectContaining({
          list_id: 'list-1',
          name: 'Huevos camperos',
        })
      )
    })
  })

  it('shows autocomplete suggestions dropdown when typing and selects on click', async () => {
    vi.mocked(marketDb.getProductSuggestions).mockResolvedValue([
      {
        name: 'Leche entera',
        name_normalized: 'leche entera',
        category: 'lacteos',
        default_unit: 'l',
        count: 4,
        last_used: new Date().toISOString(),
      },
    ])

    render(<MarketActiveList />)
    await waitFor(() => screen.getByPlaceholderText(/Añadir producto.../i))

    const input = screen.getByPlaceholderText(/Añadir producto.../i)
    fireEvent.change(input, { target: { value: 'Lec' } })

    await waitFor(() => {
      expect(screen.getByTestId('product-suggestions-dropdown')).toBeInTheDocument()
      expect(screen.getByText('Leche entera')).toBeInTheDocument()
    })

    const suggestionItem = screen.getByText('Leche entera')
    fireEvent.click(suggestionItem)

    await waitFor(() => {
      expect(input).toHaveValue('Leche entera')
    })
  })

  it('renders custom icon image when ingredient emoji is an image path (e.g. /icons/oil.png)', async () => {
    vi.mocked(marketDb.getProductSuggestions).mockResolvedValue([
      {
        name: 'Aceite de oliva virgen extra',
        name_normalized: 'aceite de oliva virgen extra',
        category: 'despensa',
        default_unit: 'l',
        count: 8,
        last_used: new Date().toISOString(),
      },
    ])

    render(<MarketActiveList />)
    await waitFor(() => screen.getByPlaceholderText(/Añadir producto.../i))

    const input = screen.getByPlaceholderText(/Añadir producto.../i)
    fireEvent.change(input, { target: { value: 'Ace' } })

    await waitFor(() => {
      expect(screen.getByTestId('product-suggestions-dropdown')).toBeInTheDocument()
      expect(screen.getByText('Aceite de oliva virgen extra')).toBeInTheDocument()
    })

    // Must NOT render raw text "/icons/oil.png"
    expect(screen.queryByText('/icons/oil.png')).not.toBeInTheDocument()
    // Must render an img element with src="/icons/oil.png"
    const img = document.querySelector('img[src="/icons/oil.png"]')
    expect(img).toBeInTheDocument()
  })
})
