import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MarketSettingsComponent from './MarketSettings'
import * as marketDb from '@/lib/market-db'

vi.mock('@/lib/market-db')

describe('MarketSettings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(marketDb.getMarketSettings).mockResolvedValue({
      active_list_id: 'list-1',
      sync_mode: 'local_only',
      paired_code: null,
      last_synced_at: null,
    })
  })

  it('renders pairing input when currently in local_only mode', async () => {
    render(<MarketSettingsComponent />)
    await waitFor(() => {
      expect(screen.getByText(/Modo actual: Solo en este dispositivo/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/RV-XXXXXX/i)).toBeInTheDocument()
    })
  })

  it('links household with valid code', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/shopping/pair/claim')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, listId: 'remote-1', token: 'token-123' }),
        } as Response)
      }
      if (url.includes('/api/s/token-123')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                id: 'remote-1',
                name: 'Compra Casa Remota',
                shopping_list_items: [
                  { name: 'Leche', quantity: 2, unit: 'L', category: 'lacteos', is_checked: false },
                ],
              },
            }),
        } as Response)
      }
      return Promise.reject(new Error('Unknown url'))
    })

    vi.mocked(marketDb.saveLocalList).mockResolvedValue({
      id: 'local-1',
      name: 'Compra Casa Remota',
      week_start: null,
      is_archived: false,
      remote_list_id: 'remote-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    render(<MarketSettingsComponent />)
    await waitFor(() => screen.getByPlaceholderText(/RV-XXXXXX/i))

    const input = screen.getByPlaceholderText(/RV-XXXXXX/i)
    fireEvent.change(input, { target: { value: 'RV-8421AB' } })
    fireEvent.click(screen.getByRole('button', { name: /Vincular con RecipeVault/i }))

    await waitFor(() => {
      expect(marketDb.saveMarketSettings).toHaveBeenCalledWith(
        expect.objectContaining({ sync_mode: 'paired_household', paired_code: 'RV-8421AB' })
      )
    })
  })

  it('displays error message when linking fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Código de vinculación inválido o caducado' }),
    } as Response)

    render(<MarketSettingsComponent />)
    await waitFor(() => screen.getByPlaceholderText(/RV-XXXXXX/i))

    const input = screen.getByPlaceholderText(/RV-XXXXXX/i)
    fireEvent.change(input, { target: { value: 'RV-INVALID' } })
    fireEvent.click(screen.getByRole('button', { name: /Vincular con RecipeVault/i }))

    await waitFor(() => {
      expect(screen.getByText(/Código de vinculación inválido o caducado/i)).toBeInTheDocument()
    })
  })

  it('renders paired state and handles unpairing', async () => {
    vi.mocked(marketDb.getMarketSettings).mockResolvedValue({
      active_list_id: 'list-1',
      sync_mode: 'paired_household',
      paired_code: 'RV-ABC123',
      last_synced_at: new Date().toISOString(),
    })

    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<MarketSettingsComponent />)
    await waitFor(() => {
      expect(screen.getByText(/Conectado a RecipeVault/i)).toBeInTheDocument()
      expect(screen.getByText(/Vinculado con código RV-ABC123/i)).toBeInTheDocument()
    })

    const unpairBtn = screen.getByRole('button', { name: /Desvincular de RecipeVault/i })
    fireEvent.click(unpairBtn)

    await waitFor(() => {
      expect(marketDb.saveMarketSettings).toHaveBeenCalledWith(
        expect.objectContaining({ sync_mode: 'local_only', paired_code: null })
      )
    })
  })
})
