import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import EditItemModal from './EditItemModal'
import type { MarketItem } from '@/lib/market-db'

describe('EditItemModal', () => {
  const mockItem: MarketItem = {
    id: 'item-123',
    list_id: 'list-1',
    name: 'Creme Fraiche',
    category: 'otros',
    quantity: 1,
    unit: 'bote',
    is_checked: false,
    sort_order: 1,
    updated_at: '2026-01-01',
  }

  it('renders item details when open', () => {
    render(
      <EditItemModal
        isOpen={true}
        item={mockItem}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    expect(screen.getByText(/Editar producto/i)).toBeInTheDocument()
    const nameInput = screen.getByLabelText(/Nombre/i) as HTMLInputElement
    expect(nameInput.value).toBe('Creme Fraiche')

    const categorySelect = screen.getByLabelText(/Categoría/i) as HTMLSelectElement
    expect(categorySelect.value).toBe('otros')
  })

  it('allows changing category to lacteos and saves', async () => {
    const handleSave = vi.fn()
    const handleClose = vi.fn()

    render(
      <EditItemModal
        isOpen={true}
        item={mockItem}
        onClose={handleClose}
        onSave={handleSave}
      />
    )

    const categorySelect = screen.getByLabelText(/Categoría/i) as HTMLSelectElement
    fireEvent.change(categorySelect, { target: { value: 'lacteos' } })
    expect(categorySelect.value).toBe('lacteos')

    const form = screen.getByRole('dialog').querySelector('form')!
    fireEvent.submit(form)
    await Promise.resolve()

    expect(handleSave).toHaveBeenCalledWith('item-123', {
      name: 'Creme Fraiche',
      category: 'lacteos',
      quantity: 1,
      unit: 'bote',
    })
    expect(handleClose).toHaveBeenCalled()
  })

  it('does not render when isOpen is false', () => {
    render(
      <EditItemModal
        isOpen={false}
        item={mockItem}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    expect(screen.queryByText(/Editar producto/i)).not.toBeInTheDocument()
  })
})
