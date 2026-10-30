import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MarketListsManager from './MarketListsManager'
import * as marketDb from '@/lib/market-db'

vi.mock('@/lib/market-db')

describe('MarketListsManager Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
      {
        id: 'list-2',
        name: 'Barbacoa Sábado',
        week_start: null,
        is_archived: false,
        remote_list_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    vi.mocked(marketDb.getMarketSettings).mockResolvedValue({
      active_list_id: 'list-1',
      sync_mode: 'local_only',
      paired_code: null,
      last_synced_at: null,
    })
  })

  it('renders all saved shopping lists', async () => {
    render(<MarketListsManager />)
    await waitFor(() => {
      expect(screen.getByText('Compra Semanal')).toBeInTheDocument()
      expect(screen.getByText('Barbacoa Sábado')).toBeInTheDocument()
    })
  })

  it('creates a new list', async () => {
    vi.mocked(marketDb.saveLocalList).mockResolvedValue({
      id: 'list-3',
      name: 'Farmacia',
      week_start: null,
      is_archived: false,
      remote_list_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    render(<MarketListsManager />)
    await waitFor(() => screen.getByPlaceholderText(/Nombre de la nueva lista.../i))

    const input = screen.getByPlaceholderText(/Nombre de la nueva lista.../i)
    fireEvent.change(input, { target: { value: 'Farmacia' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => {
      expect(marketDb.saveLocalList).toHaveBeenCalledWith({ name: 'Farmacia' })
      expect(marketDb.saveMarketSettings).toHaveBeenCalledWith({ active_list_id: 'list-3' })
    })
  })

  it('activates a list when clicked', async () => {
    render(<MarketListsManager />)
    await waitFor(() => screen.getByText('Barbacoa Sábado'))

    const barbacoaItem = screen.getByText('Barbacoa Sábado').closest('[data-testid="market-list-card"]')!
    fireEvent.click(barbacoaItem)

    await waitFor(() => {
      expect(marketDb.saveMarketSettings).toHaveBeenCalledWith({ active_list_id: 'list-2' })
    })
  })

  it('copies list contents to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    vi.mocked(marketDb.getLocalItems).mockResolvedValue([
      {
        id: 'item-1',
        list_id: 'list-1',
        name: 'Carbón',
        quantity: 2,
        unit: 'sacos',
        category: 'otros',
        is_checked: false,
        sort_order: 1,
        updated_at: new Date().toISOString(),
      },
    ])

    render(<MarketListsManager />)
    await waitFor(() => screen.getByText('Compra Semanal'))

    const copyButtons = screen.getAllByTitle('Copiar texto')
    fireEvent.click(copyButtons[0])

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('Compra Semanal'))
      expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('Carbón'))
    })
  })

  it('deletes a list when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(marketDb.deleteLocalList).mockResolvedValue(undefined)

    render(<MarketListsManager />)
    await waitFor(() => screen.getByText('Barbacoa Sábado'))

    const deleteButtons = screen.getAllByTitle('Eliminar lista')
    fireEvent.click(deleteButtons[1]) // list-2

    await waitFor(() => {
      expect(marketDb.deleteLocalList).toHaveBeenCalledWith('list-2')
    })
  })

  it('renames a list when edit button is clicked and user confirms new name', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Compra Familiar Semanal')
    vi.mocked(marketDb.saveLocalList).mockResolvedValue({
      id: 'list-1',
      name: 'Compra Familiar Semanal',
      week_start: null,
      is_archived: false,
      remote_list_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    render(<MarketListsManager />)
    await waitFor(() => screen.getByText('Compra Semanal'))

    const editButtons = screen.getAllByTitle('Renombrar lista')
    fireEvent.click(editButtons[0])

    await waitFor(() => {
      expect(marketDb.saveLocalList).toHaveBeenCalledWith({
        id: 'list-1',
        name: 'Compra Familiar Semanal',
      })
      expect(screen.getByText('Compra Familiar Semanal')).toBeInTheDocument()
    })
  })
})
