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
      expect(text).toContain('🧀 *Lácteos y Huevos*:')
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
      expect(getIngredientEmoji('Creme Fraiche', 'lacteos')).toBe('🧀')
      expect(getIngredientEmoji('Crème fraîche', 'lacteos')).toBe('🧀')
      expect(getIngredientEmoji('croissant', 'panaderia')).toBe('🥐')
      expect(getIngredientEmoji('salchichón', 'charcuteria')).toBe('🥓')
      expect(getIngredientEmoji('patatas fritas', 'snacks-dulces')).toBe('🍟')
      expect(getIngredientEmoji('pienso', 'mascotas')).toBe('🐾')
      expect(getIngredientEmoji('pañal', 'bebes-infantil')).toBe('👶')
      expect(getIngredientEmoji('desconocido x', 'otros')).toBe('🛒')
    })

    it('categorizes Creme Fraiche and cheeses into lacteos', () => {
      expect(categorize('Creme Fraiche')).toBe('lacteos')
      expect(categorize('Crème fraîche')).toBe('lacteos')
      expect(categorize('crema agria')).toBe('lacteos')
      expect(categorize('mascarpone')).toBe('lacteos')
    })

    it('categorizes items into the new aisles', () => {
      expect(categorize('barra de pan')).toBe('panaderia')
      expect(categorize('croissant')).toBe('panaderia')
      expect(categorize('jamón serrano')).toBe('charcuteria')
      expect(categorize('fuet')).toBe('charcuteria')
      expect(categorize('sal fina')).toBe('especias-condimentos')
      expect(categorize('pimienta negra molida')).toBe('especias-condimentos')
      expect(categorize('patatas fritas')).toBe('snacks-dulces')
      expect(categorize('chocolate con leche')).toBe('snacks-dulces')
      expect(categorize('detergente para lavadora')).toBe('limpieza-hogar')
      expect(categorize('papel higiénico')).toBe('limpieza-hogar')
      expect(categorize('champú')).toBe('higiene-cuidado')
      expect(categorize('pasta de dientes')).toBe('higiene-cuidado')
      expect(categorize('pienso para perros')).toBe('mascotas')
      expect(categorize('arena para gato')).toBe('mascotas')
      expect(categorize('pañales')).toBe('bebes-infantil')
      expect(categorize('toallitas de bebé')).toBe('bebes-infantil')
    })
  })
})
