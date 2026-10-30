import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ShareListModal from './ShareListModal'

describe('ShareListModal Component', () => {
  const mockItems = [
    {
      id: 'i-1',
      list_id: 'l-1',
      name: 'Plátanos',
      quantity: 1,
      unit: 'kg',
      category: 'frutas-verduras' as const,
      is_checked: false,
      sort_order: 1,
      updated_at: new Date().toISOString(),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    window.open = vi.fn()
  })

  it('renders sharing options when open', () => {
    render(
      <ShareListModal
        isOpen={true}
        onClose={vi.fn()}
        listName="Compra Semanal"
        items={mockItems}
        pairedToken="token-abc"
        onToast={vi.fn()}
      />
    )

    expect(screen.getByText(/📤 Compartir lista/i)).toBeInTheDocument()
    expect(screen.getByText(/Enviar por WhatsApp/i)).toBeInTheDocument()
    expect(screen.getByText(/Compartir con el móvil.../i)).toBeInTheDocument()
    expect(screen.getByText(/Copiar texto formateado/i)).toBeInTheDocument()
    expect(screen.getByText(/Copiar enlace interactivo en vivo/i)).toBeInTheDocument()
  })

  it('opens WhatsApp with encoded formatted text', () => {
    render(
      <ShareListModal
        isOpen={true}
        onClose={vi.fn()}
        listName="Compra Semanal"
        items={mockItems}
        onToast={vi.fn()}
      />
    )

    const waBtn = screen.getByText(/Enviar por WhatsApp/i).closest('button')!
    fireEvent.click(waBtn)

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/?text='),
      '_blank'
    )
  })

  it('copies live interactive link if paired', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    })
    const toastMock = vi.fn()

    render(
      <ShareListModal
        isOpen={true}
        onClose={vi.fn()}
        listName="Compra Semanal"
        items={mockItems}
        pairedToken="token-xyz"
        onToast={toastMock}
      />
    )

    const liveBtn = screen.getByText(/Copiar enlace interactivo en vivo/i).closest('button')!
    fireEvent.click(liveBtn)

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('/s/token-xyz'))
      expect(toastMock).toHaveBeenCalledWith('¡Enlace interactivo copiado!')
    })
  })
})
