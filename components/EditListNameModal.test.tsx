import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EditListNameModal from './EditListNameModal'

describe('EditListNameModal Component', () => {
  it('renders initial name and saves on submit', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined)
    const handleClose = vi.fn()

    render(
      <EditListNameModal
        isOpen={true}
        initialName="Compra Vieja"
        onClose={handleClose}
        onSave={handleSave}
      />
    )

    const input = screen.getByPlaceholderText(/Nombre de la lista.../i) as HTMLInputElement
    expect(input.value).toBe('Compra Vieja')

    fireEvent.change(input, { target: { value: 'Compra Nueva' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith('Compra Nueva')
      expect(handleClose).toHaveBeenCalled()
    })
  })

  it('does not render when closed', () => {
    const { container } = render(
      <EditListNameModal
        isOpen={false}
        initialName="Compra"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
