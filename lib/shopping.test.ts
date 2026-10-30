import { describe, it, expect } from 'vitest'
import {
  parseItemInput,
  formatShareListText,
  categorize,
  getIngredientEmoji,
} from './shopping'

describe('Shopping Utilities in MarketVault', () => {
  describe('parseItemInput', () => {
    it('parses leading quantity and unit (e.g. "1kg plátanos")', () => {
      const res = parseItemInput('1kg plátanos')
      expect(res.name).toBe('Plátanos')
      expect(res.quantity).toBe(1)
      expect(res.unit).toBe('kg')
      expect(res.category).toBe('frutas-verduras')
    })

    it('parses leading quantity with comma and unit (e.g. "2,5 l de leche")', () => {
      const res = parseItemInput('2,5 l de leche')
      expect(res.name).toBe('Leche')
      expect(res.quantity).toBe(2.5)
      expect(res.unit).toBe('l')
      expect(res.category).toBe('lacteos')
    })

    it('parses trailing quantity (e.g. "Tomates 500g")', () => {
      const res = parseItemInput('Tomates 500g')
      expect(res.name).toBe('Tomates')
      expect(res.quantity).toBe(500)
      expect(res.unit).toBe('g')
      expect(res.category).toBe('frutas-verduras')
    })

    it('parses unitless item count (e.g. "3 manzanas")', () => {
      const res = parseItemInput('3 manzanas')
      expect(res.name).toBe('Manzanas')
      expect(res.quantity).toBe(3)
      expect(res.unit).toBeNull()
      expect(res.category).toBe('frutas-verduras')
    })

    it('falls back cleanly when no quantity is specified (e.g. "Pechuga de pollo")', () => {
      const res = parseItemInput('Pechuga de pollo')
      expect(res.name).toBe('Pechuga de pollo')
      expect(res.quantity).toBeNull()
      expect(res.unit).toBeNull()
      expect(res.category).toBe('carniceria')
    })
  })

  describe('formatShareListText', () => {
    it('formats shopping list grouped by aisle with emojis for WhatsApp', () => {
      const text = formatShareListText('Compra Mercadona', [
        { name: 'Plátanos', quantity: 1, unit: 'kg', is_checked: false, category: 'frutas-verduras' },
        { name: 'Pechuga de pollo', quantity: 500, unit: 'g', is_checked: false, category: 'carniceria' },
        { name: 'Leche entera', quantity: 2, unit: 'l', is_checked: false, category: 'lacteos' },
        { name: 'Manzanas', quantity: 4, unit: null, is_checked: true, category: 'frutas-verduras' },
      ])

      expect(text).toContain('🛒 *Compra Mercadona* (3 productos pendientes):')
      expect(text).toContain('🥦 *Frutas y Verduras*:')
      expect(text).toContain('Plátanos')
      expect(text).toContain('🥩 *Carnicería*:')
      expect(text).toContain('Pechuga de pollo')
      expect(text).toContain('🧀 *Lácteos*:')
      expect(text).toContain('Leche entera')
      // Excludes checked items from pending share
      expect(text).not.toContain('Manzanas')
    })

    it('returns friendly message if list has no pending items', () => {
      const text = formatShareListText('Compra Mercadona', [
        { name: 'Manzanas', quantity: 4, unit: null, is_checked: true },
      ])
      expect(text).toContain('¡La lista está vacía o ya se ha comprado todo! 🎉')
    })
  })

  describe('categorize & getIngredientEmoji', () => {
    it('correctly maps ingredients to emojis', () => {
      expect(getIngredientEmoji('tomate frito', 'despensa')).toBe('🍅')
      expect(getIngredientEmoji('plátano de canarias', 'frutas-verduras')).toBe('🍌')
      expect(getIngredientEmoji('merluza fresca', 'pescaderia')).toBe('🐟')
      expect(getIngredientEmoji('desconocido x', 'otros')).toBe('🛒')
    })
  })
})
