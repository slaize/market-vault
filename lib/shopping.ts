/**
 * Shopping list engine: consolidation, categorization, normalization.
 */

export type ShoppingCategory =
  | 'carniceria'
  | 'pescaderia'
  | 'frutas-verduras'
  | 'lacteos'
  | 'cereales-pan'
  | 'despensa'
  | 'congelados'
  | 'bebidas'
  | 'otros'

export interface ConsolidatedItem {
  name: string
  quantities: { quantity: number | null; unit: string | null }[]
  category: ShoppingCategory
  is_custom: boolean
}

export const CATEGORY_LABELS: Record<ShoppingCategory, { label: string; emoji: string }> = {
  'carniceria':      { label: 'Carnicería',         emoji: '🥩' },
  'pescaderia':      { label: 'Pescadería',          emoji: '🐟' },
  'frutas-verduras': { label: 'Frutas y Verduras',  emoji: '🥦' },
  'lacteos':         { label: 'Lácteos',             emoji: '🧀' },
  'cereales-pan':    { label: 'Cereales y Pan',      emoji: '🌾' },
  'despensa':        { label: 'Despensa',             emoji: '🥫' },
  'congelados':      { label: 'Congelados',           emoji: '🧊' },
  'bebidas':         { label: 'Bebidas',              emoji: '🥤' },
  'otros':           { label: 'Otros',                emoji: '🛒' },
}

export const CATEGORY_ORDER: ShoppingCategory[] = [
  'frutas-verduras',
  'carniceria',
  'pescaderia',
  'lacteos',
  'cereales-pan',
  'despensa',
  'bebidas',
  'congelados',
  'otros',
]

export const INGREDIENT_EMOJI_MAP: Record<string, string> = {
  'aceite de oliva': '/icons/oil.png',
  'aceite': '/icons/oil.png',
  'olive oil': '/icons/oil.png',
  'oil': '/icons/oil.png',
  'vinagre': '🍾',
  'sal': '🧂',
  'pimienta': '🧂',
  'azúcar': '🍬',
  'miel': '🍯',
  'ajo': '🧄',
  'cebolla': '🧅',
  'tomate': '🍅',
  'patata': '🥔',
  'papa': '🥔',
  'zanahoria': '🥕',
  'lechuga': '🥬',
  'espinaca': '🥬',
  'acelga': '🥬',
  'brócoli': '🥦',
  'coliflor': '🥦',
  'pimiento': '🫑',
  'calabacín': '🥒',
  'pepino': '🥒',
  'berenjena': '🍆',
  'aguacate': '🥑',
  'champiñón': '🍄',
  'seta': '🍄',
  'limón': '🍋',
  'lima': '🍋',
  'naranja': '🍊',
  'manzana': '🍎',
  'pera': '🍐',
  'plátano': '🍌',
  'fresa': '🍓',
  'kiwi': '🥝',
  'melocotón': '🍑',
  'uva': '🍇',
  'cereza': '🍒',
  'huevo': '🥚',
  'huevos': '🥚',
  'queso': '🧀',
  'leche': '🥛',
  'yogur': '🥛',
  'mantequilla': '🧈',
  'nata': '🥛',
  'pollo': '🍗',
  'pavo': '🍗',
  'ternera': '🥩',
  'cerdo': '🥩',
  'carne': '🥩',
  'jamón': '🥓',
  'bacon': '🥓',
  'panceta': '🥓',
  'salchicha': '🌭',
  'chorizo': '🌭',
  'pescado': '🐟',
  'atún': '🐟',
  'salmón': '🐟',
  'sardina': '🐟',
  'dorada': '🐟',
  'lubina': '🐟',
  'bacalao': '🐟',
  'gamba': '🍤',
  'langostino': '🍤',
  'pulpo': '🐙',
  'calamar': '🦑',
  'mejillón': '🦪',
  'almeja': '🦪',
  'arroz': '🍚',
  'pan': '🍞',
  'harina': '🌾',
  'pasta': '🍝',
  'espagueti': '🍝',
  'macarrón': '🍝',
  'fideos': '🍝',
  'quinoa': '🌾',
  'avena': '🌾',
  'lentejas': '🫘',
  'garbanzos': '🫘',
  'alubias': '🫘',
  'judías': '🫘',
  'guisantes': '🫛',
  'café': '☕',
  'té': '🍵',
  'chocolate': '🍫',
  'cacao': '🍫',
  'cerveza': '🍺',
  'vino': '🍷',
  'refresco': '🥤',
  'agua': '💧',
  'pan de molde': '🍞',
  'galletas': '🍪',
  'nuez': '🥜',
  'almendra': '🥜',
  'cacahuete': '🥜',
  'avellana': '🥜',
}

export function getIngredientEmoji(name: string, category: string): string {
  const normalized = name.toLowerCase().trim()
  for (const [keyword, emoji] of Object.entries(INGREDIENT_EMOJI_MAP)) {
    if (normalized.includes(keyword)) {
      return emoji
    }
  }
  const cat = category as ShoppingCategory
  return CATEGORY_LABELS[cat]?.emoji ?? '🛒'
}

// ── Categorization ─────────────────────────────────────────────

const CATEGORY_MAP: [ShoppingCategory, string[]][] = [
  ['carniceria', ['pollo', 'pechuga', 'muslo', 'ternera', 'cerdo', 'carne', 'filete', 'lomo', 'jamón', 'bacon', 'panceta', 'chorizo', 'salchicha', 'buey', 'cordero', 'chuletón', 'hamburguesa', 'alita']],
  ['pescaderia', ['pescado', 'merluza', 'bacalao', 'atún', 'salmón', 'sardina', 'dorada', 'lubina', 'gamba', 'langostino', 'pulpo', 'calamar', 'mejillón', 'almeja', 'marisco', 'anchoa']],
  ['frutas-verduras', ['tomate', 'cebolla', 'ajo', 'zanahoria', 'patata', 'papa', 'lechuga', 'espinaca', 'pimiento', 'brócoli', 'calabacín', 'berenjena', 'champiñón', 'seta', 'puerro', 'apio', 'pepino', 'manzana', 'naranja', 'limón', 'plátano', 'fresa', 'aguacate', 'verdura', 'fruta', 'kiwi', 'pera', 'melocotón']],
  ['lacteos', ['leche', 'queso', 'yogur', 'mantequilla', 'nata', 'crema', 'mozzarella', 'parmesano', 'cheddar', 'feta', 'ricotta', 'kéfir', 'nata']],
  ['cereales-pan', ['harina', 'pan', 'pasta', 'arroz', 'avena', 'cereales', 'espagueti', 'macarrón', 'fideos', 'lasaña', 'cous-cous', 'quinoa', 'pan de molde', 'galletas', 'levadura']],
  ['despensa', ['aceite', 'sal', 'azúcar', 'vinagre', 'salsa', 'ketchup', 'mostaza', 'mayonesa', 'soja', 'pimienta', 'orégano', 'comino', 'pimentón', 'canela', 'laurel', 'especia', 'hierba', 'caldo', 'tomate frito', 'conserva', 'lata', 'almendra', 'nuez', 'avellana', 'cacahuete', 'miel', 'mermelada', 'chocolate', 'cacao']],
  ['bebidas', ['agua', 'zumo', 'refresco', 'cerveza', 'vino', 'leche vegetal', 'café', 'té', 'alcohol']],
  ['congelados', ['helado', 'congelado', 'guisante congelado', 'espinaca congelada']],
]

/**
 * Heuristically classifies an ingredient name into a shopping category
 * (carniceria, pescaderia, frutas-verduras, lacteos, cereales-pan, despensa,
 * bebidas, congelados or 'otros' as fallback).
 *
 * The function is keyword-based and intentionally conservative: dry/ground
 * spices always go to `despensa` regardless of base food category, and
 * unknown items fall through to `otros`.
 *
 * @param name - Free-text ingredient name.
 * @returns The best-guess category.
 */
export function categorize(name: string): ShoppingCategory {
  const n = name.toLowerCase()

  // Especias secas, extractos y condimentos deshidratados van a despensa
  if (
    n.includes('en polvo') ||
    n.includes('molido') ||
    n.includes('molida') ||
    n.includes('seco') ||
    n.includes('seca') ||
    n.includes('extracto') ||
    n.includes('colorante')
  ) {
    return 'despensa'
  }

  for (const [cat, keywords] of CATEGORY_MAP) {
    if (keywords.some((k) => n.includes(k))) return cat
  }
  return 'otros'
}

// ── Name normalization ─────────────────────────────────────────

const PREPARATION_WORDS = [
  'frescos?', 'frescas?', 'picados?', 'picadas?', 'rallados?', 'ralladas?', 'molidos?', 'molidas?',
  'cocidos?', 'cocidas?', 'crudos?', 'crudas?', 'en trozos', 'troceados?', 'troceadas?', 'al gusto',
  'grandes?', 'medianos?', 'pequeños?', 'pequeñas?', 'lavados?', 'lavadas?', 'pelados?', 'peladas?',
  'limpios?', 'limpias?', 'rebanadas?', 'miga de', 'dientes? de', 'cabeza de', 'cabezas? de', 'unidades?'
]

const PREPARATION_WORDS_REGEX = new RegExp(`\\b(?:${PREPARATION_WORDS.join('|')})\\b`, 'gi')

const INGREDIENT_CANONICAL_MAP: Record<string, string> = {
  'cebolla dulce': 'cebolla',
  'cebolla blanca': 'cebolla',
  'cebolla tierna': 'cebolleta',
  'cebolletas': 'cebolleta',
  'cebollas': 'cebolla',
  'ajo': 'ajo',
  'ajos': 'ajo',
  'pimienta negra molida': 'pimienta negra',
  'pimienta molida': 'pimienta negra',
  'pimienta negra en grano': 'pimienta negra',
  'pimienta': 'pimienta negra',
  'aceite de oliva virgen extra': 'aceite de oliva',
  'aceite de oliva virgen': 'aceite de oliva',
  'aceite virgen extra': 'aceite de oliva',
  'aove': 'aceite de oliva',
  'aceite': 'aceite de oliva',
  'miga de pan': 'pan',
  'rebanada de pan de molde': 'pan',
  'pan de molde': 'pan',
  'sal fina': 'sal',
  'sal marina': 'sal',
  'sal gorda': 'sal',
  'perejil': 'perejil',
  'cilantro': 'cilantro',
  'huevos duros': 'huevo',
  'huevos': 'huevo',
  'limones': 'limón',
  'zanahorias': 'zanahoria',
  'aguacates': 'aguacate',
  'patatas': 'patata',
  'papas': 'patata',
  'papa': 'patata',
  'calabacines': 'calabacín',
  'pimientos': 'pimiento',
  'langostinos': 'langostino',
  'gambas': 'gamba',
  'guisantes': 'guisante',
  'caldo de verduras': 'caldo de verdura',
  'caldos de verduras': 'caldo de verdura',
  'tomates': 'tomate',
  'tomate cherry': 'tomates cherry',
}

export function normalizeIngredientName(name: string): string {
  let normalized = name
    .toLowerCase()
    .trim()
    // Remove leading quantities like "2 " or "1/2 "
    .replace(/^[\d/.,\s]+/, '')
    // Strip common measure words
    .replace(/\b(gramos?|gr?|kg|ml|l|litros?|taza|cucharad[ao]s?|pizca|unidades?|dientes? de|unidad(es)?)\b/gi, '')

  // Remove preparation words
  normalized = normalized.replace(PREPARATION_WORDS_REGEX, '')

  // Clean up double spaces
  normalized = normalized.replace(/\s+/g, ' ').trim()

  // Clean leading "de " or "del " that might remain
  normalized = normalized.replace(/^(de|del)\s+/gi, '').trim()

  // Apply canonical mapping if exists
  if (INGREDIENT_CANONICAL_MAP[normalized]) {
    return INGREDIENT_CANONICAL_MAP[normalized]
  }

  // Fallback direct key matches
  for (const [key, val] of Object.entries(INGREDIENT_CANONICAL_MAP)) {
    if (normalized === key || normalized === key + 's' || normalized + 's' === key) {
      return val
    }
  }

  return normalized
}

// ── Consolidation ──────────────────────────────────────────────

export interface RawIngredient {
  name: string
  quantity: number | null
  unit: string | null
}

/**
 * Groups ingredients by their normalized name and sums quantities when the
 * unit is identical. Items with different units are kept as separate entries
 * (no automatic unit conversion — e.g. 100g + 1 tbsp stay separate).
 *
 * Used when generating a shopping list from a meal plan to collapse
 * duplicates like "cebolla" + "cebolla morada" into a single line.
 *
 * @param ingredients - Raw ingredient list (typically from meal_plans).
 * @returns One consolidated entry per unique normalized name.
 */
export function consolidateIngredients(ingredients: RawIngredient[]): ConsolidatedItem[] {
  // Group by normalized name. Conservative: only merge if EXACT normalized name matches.
  const groups = new Map<string, ConsolidatedItem>()

  for (const ing of ingredients) {
    const key = normalizeIngredientName(ing.name)
    if (!key) continue

    if (groups.has(key)) {
      const existing = groups.get(key)!
      // Look for matching unit to merge quantities
      const matchingQty = existing.quantities.find(
        (q) => (q.unit ?? '') === (ing.unit ?? '')
      )
      if (matchingQty) {
        // Same unit — sum it
        if (matchingQty.quantity !== null && ing.quantity !== null) {
          matchingQty.quantity += ing.quantity
        } else {
          // One has no quantity — just show as separate entry
          existing.quantities.push({ quantity: ing.quantity, unit: ing.unit })
        }
      } else {
        // Different unit — add as separate quantity entry (don't try to convert)
        existing.quantities.push({ quantity: ing.quantity, unit: ing.unit })
      }
    } else {
      groups.set(key, {
        name: ing.name.trim(),
        quantities: [{ quantity: ing.quantity, unit: ing.unit }],
        category: categorize(ing.name),
        is_custom: false,
      })
    }
  }

  return Array.from(groups.values())
}

// ── Format quantity for display ───────────────────────────────

export function formatQuantity(quantities: { quantity: number | null; unit: string | null }[]): string {
  return quantities
    .map(({ quantity, unit }) => {
      if (!quantity) return unit ?? ''
      const num = Number.isInteger(quantity) ? quantity : quantity.toFixed(1).replace(/\.0$/, '')
      return unit ? `${num} ${unit}` : `${num}`
    })
    .filter(Boolean)
    .join(' + ')
}

// ── Convert plan items to shopping items ──────────────────────

export function planToShoppingText(
  items: Array<{ name: string; quantity: number | null; unit: string | null; is_checked: boolean }>
): string {
  const unchecked = items.filter((i) => !i.is_checked)
  if (unchecked.length === 0) return '¡Lista vacía!'
  return unchecked
    .map((i) => {
      const qty = i.quantity ? `${i.quantity}${i.unit ? ' ' + i.unit : ''}` : ''
      return `• ${qty ? qty + ' ' : ''}${i.name}`
    })
    .join('\n')
}

// ── Smart Item Input Parser ───────────────────────────────────

export function parseItemInput(raw: string): {
  name: string
  quantity: number | null
  unit: string | null
  category: ShoppingCategory
} {
  const clean = raw.trim()
  if (!clean) {
    return { name: '', quantity: null, unit: null, category: 'otros' }
  }

  const unitWords = 'kg|kilos?|g|gr|gramos?|l|litros?|ml|botes?|latas?|bricks?|paquetes?|unidades?|uds?|botellas?'

  // Pattern 1: Leading quantity (e.g., "1kg platanos", "2 bricks de leche", "3 manzanas", "500g carne")
  const leadingMatch = clean.match(new RegExp(`^([\\d]+(?:[.,][\\d]+)?)\\s*(${unitWords})?\\s*(?:de\\s+)?(.*)$`, 'i'))
  if (leadingMatch && leadingMatch[3]?.trim()) {
    const qty = parseFloat(leadingMatch[1].replace(',', '.'))
    const rawUnit = leadingMatch[2]?.toLowerCase() || null
    const name = leadingMatch[3].trim()
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      quantity: isNaN(qty) ? null : qty,
      unit: rawUnit,
      category: categorize(name),
    }
  }

  // Pattern 2: Trailing quantity (e.g., "Platanos 1kg", "Leche 2 l", "Tomates 500g", "Huevos 12")
  const trailingMatch = clean.match(new RegExp(`^(.*?)(?:\\s+|-|:)\\s*([\\d]+(?:[.,][\\d]+)?)\\s*(${unitWords})?$`, 'i'))
  if (trailingMatch && trailingMatch[1]?.trim()) {
    const name = trailingMatch[1].trim()
    const qty = parseFloat(trailingMatch[2].replace(',', '.'))
    const rawUnit = trailingMatch[3]?.toLowerCase() || null
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      quantity: isNaN(qty) ? null : qty,
      unit: rawUnit,
      category: categorize(name),
    }
  }

  // Fallback
  return {
    name: clean.charAt(0).toUpperCase() + clean.slice(1),
    quantity: null,
    unit: null,
    category: categorize(clean),
  }
}

// ── Formatted Sharing Text (WhatsApp / Native Share) ──────────

export function formatShareListText(
  listName: string,
  items: Array<{ name: string; quantity: number | null; unit: string | null; is_checked: boolean; category?: string }>
): string {
  const pending = items.filter((i) => !i.is_checked)
  if (pending.length === 0) {
    return `🛒 *${listName}*\n\n¡La lista está vacía o ya se ha comprado todo! 🎉`
  }

  const lines: string[] = [`🛒 *${listName}* (${pending.length} productos pendientes):\n`]

  for (const cat of CATEGORY_ORDER) {
    const catItems = pending.filter((i) => (i.category || categorize(i.name)) === cat)
    if (catItems.length > 0) {
      const meta = CATEGORY_LABELS[cat] || { label: cat, emoji: '🛒' }
      lines.push(`${meta.emoji} *${meta.label}*:`)
      for (const item of catItems) {
        const rawEmoji = getIngredientEmoji(item.name, cat)
        const emoji = rawEmoji.startsWith('/') ? (rawEmoji.includes('oil') ? '🫒' : '🥫') : rawEmoji
        const qty = item.quantity ? `${item.quantity}${item.unit ? ' ' + item.unit : ''} ` : ''
        lines.push(`  • ${emoji} ${qty}${item.name}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n').trim()
}
