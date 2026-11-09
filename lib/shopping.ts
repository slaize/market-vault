/**
 * Shopping list engine: consolidation, categorization, normalization.
 */

export type ShoppingCategory =
  | 'frutas-verduras'
  | 'panaderia'
  | 'carniceria'
  | 'charcuteria'
  | 'pescaderia'
  | 'lacteos'
  | 'cereales-pan'
  | 'especias-condimentos'
  | 'despensa'
  | 'snacks-dulces'
  | 'bebidas'
  | 'congelados'
  | 'limpieza-hogar'
  | 'higiene-cuidado'
  | 'mascotas'
  | 'bebes-infantil'
  | 'otros'

export interface ConsolidatedItem {
  name: string
  quantities: { quantity: number | null; unit: string | null }[]
  category: ShoppingCategory
  is_custom: boolean
}

export const CATEGORY_LABELS: Record<ShoppingCategory, { label: string; emoji: string }> = {
  'frutas-verduras':     { label: 'Frutas y Verduras',          emoji: '🥦' },
  'panaderia':           { label: 'Panadería y Bollería',       emoji: '🥖' },
  'carniceria':          { label: 'Carnicería',                 emoji: '🥩' },
  'charcuteria':         { label: 'Charcutería y Embutidos',    emoji: '🥓' },
  'pescaderia':          { label: 'Pescadería',                 emoji: '🐟' },
  'lacteos':             { label: 'Lácteos y Huevos',           emoji: '🧀' },
  'cereales-pan':        { label: 'Pastas, Arroces y Harinas',  emoji: '🌾' },
  'especias-condimentos':{ label: 'Especias y Condimentos',     emoji: '🧂' },
  'despensa':            { label: 'Despensa y Conservas',       emoji: '🥫' },
  'snacks-dulces':       { label: 'Snacks y Dulces',            emoji: '🍫' },
  'bebidas':             { label: 'Bebidas',                    emoji: '🥤' },
  'congelados':          { label: 'Congelados',                 emoji: '🧊' },
  'limpieza-hogar':      { label: 'Limpieza y Hogar',           emoji: '🧹' },
  'higiene-cuidado':     { label: 'Higiene y Cuidado Personal', emoji: '🧴' },
  'mascotas':            { label: 'Mascotas',                   emoji: '🐾' },
  'bebes-infantil':      { label: 'Bebé e Infantil',            emoji: '🍼' },
  'otros':               { label: 'Otros',                      emoji: '🛒' },
}

export const CATEGORY_ORDER: ShoppingCategory[] = [
  'frutas-verduras',
  'panaderia',
  'carniceria',
  'charcuteria',
  'pescaderia',
  'lacteos',
  'cereales-pan',
  'especias-condimentos',
  'despensa',
  'snacks-dulces',
  'bebidas',
  'congelados',
  'limpieza-hogar',
  'higiene-cuidado',
  'mascotas',
  'bebes-infantil',
  'otros',
]

export const INGREDIENT_EMOJI_MAP: Record<string, string> = {
  // Aceites y Aceitunas
  'aceite de oliva': '/icons/oil.png',
  'aceite': '/icons/oil.png',
  'olive oil': '/icons/oil.png',
  'oil': '/icons/oil.png',
  'aceituna': '🫒',
  'aceitunas': '🫒',
  'oliva': '🫒',
  'olivas': '🫒',

  // Limpieza y Hogar (evita que 'vinagre de limpieza' use 🍾 de champán)
  'vinagre de limpieza': '🧴',
  'papel de horno': '📜',
  'papel vegetal': '📜',
  'papel de aluminio': '🧻',
  'papel albal': '🧻',
  'albal': '🧻',
  'film transparente': '🧻',
  'papel film': '🧻',
  'papel higiénico': '🧻',
  'papel higienico': '🧻',
  'papel de cocina': '🧻',
  'servilletas': '🧻',
  'friegaplatos': '🧴',
  'lavavajillas': '🧴',
  'detergente': '🧴',
  'lejía': '🧴',
  'lejia': '🧴',
  'suavizante': '🧴',
  'fregasuelos': '🧴',
  'limpieza': '🧴',
  'estropajo': '🧽',
  'bayeta': '🧽',
  'jabón': '🧼',
  'jabon': '🧼',

  // Higiene y Cuidado Personal
  'pasta de dientes': '🪥',
  'dentífrico': '🪥',
  'dentifrico': '🪥',
  'cepillo de dientes': '🪥',
  'champú': '🧴',
  'champu': '🧴',
  'desodorante': '🧴',
  'colonia': '🧴',
  'perfume': '🧴',

  // Mascotas
  'comida de perro': '🐶',
  'comida perro': '🐶',
  'comida de gato': '🐱',
  'comida gato': '🐱',
  'pienso': '🐾',
  'arena de gato': '🐾',
  'arena gato': '🐾',

  // Bebé e Infantil
  'pañal': '👶',
  'pañales': '👶',
  'toallitas de bebe': '👶',
  'toallitas bebe': '👶',
  'potito': '🍼',
  'potitos': '🍼',
  'papilla': '🥣',
  'biberón': '🍼',
  'biberon': '🍼',

  // Salsas y Condimentos (declaradas antes de 'sal' para evitar falsos positivos con 'salsa')
  'salsa bbq': '🥫',
  'barbacoa': '🥫',
  'salsa': '🥫',
  'kétchup': '🥫',
  'ketchup': '🥫',
  'mostaza': '🥫',
  'mayonesa': '🥫',
  'mahonesa': '🥫',
  'alioli': '🥫',
  'soja': '🥫',
  'vinagre': '🍾',

  // Sales y Especias
  'sal de ajo': '🧂',
  'sal gorda': '🧂',
  'sal marina': '🧂',
  'sal fina': '🧂',
  'sal': '🧂',
  'pimienta': '🧂',
  'canela': '🧂',
  'comino': '🧂',
  'pimentón': '🧂',
  'pimenton': '🧂',
  'curry': '🧂',
  'cúrcuma': '🧂',
  'curcuma': '🧂',
  'nuez moscada': '🧂',
  'clavo': '🧂',
  'azafrán': '🧂',
  'azafran': '🧂',

  // Hierbas aromáticas
  'tomillo': '🌿',
  'romero': '🌿',
  'eneldo': '🌿',
  'albahaca': '🌿',
  'perejil': '🌿',
  'cilantro': '🌿',
  'orégano': '🌿',
  'oregano': '🌿',
  'laurel': '🌿',
  'hierbabuena': '🌿',
  'menta': '🌿',
  'hierba': '🌿',
  'hierbas': '🌿',

  // Snacks, Dulces y Postres
  'helados': '🍨',
  'helado': '🍨',
  'azúcar': '🍬',
  'azucar': '🍬',
  'miel': '🍯',
  'sirope': '🍯',
  'chocolate': '🍫',
  'cacao': '🍫',
  'bombones': '🍫',
  'turrón': '🍫',
  'turron': '🍫',
  'galletas': '🍪',
  'patatas fritas': '🍟',
  'chips': '🍟',
  'nachos': '🧀',
  'palomitas': '🍿',
  'gominolas': '🍬',
  'chuches': '🍬',
  'caramelo': '🍬',
  'caramelos': '🍬',

  // Frutas y Verduras
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
  'brocoli': '🥦',
  'coliflor': '🥦',
  'pimiento': '🫑',
  'calabacín': '🥒',
  'calabacin': '🥒',
  'pepino': '🥒',
  'berenjena': '🍆',
  'aguacate': '🥑',
  'champiñón': '🍄',
  'champinon': '🍄',
  'seta': '🍄',
  'limón': '🍋',
  'limon': '🍋',
  'lima': '🍋',
  'naranja': '🍊',
  'manzana': '🍎',
  'pera': '🍐',
  'plátano': '🍌',
  'platano': '🍌',
  'fresa': '🍓',
  'kiwi': '🥝',
  'melocotón': '🍑',
  'melocoton': '🍑',
  'uva': '🍇',
  'cereza': '🍒',

  // Lácteos y Huevos
  'creme fraiche': '🧀',
  'crème fraîche': '🧀',
  'crema agria': '🧀',
  'sour cream': '🧀',
  'mascarpone': '🧀',
  'burrata': '🧀',
  'philadelphia': '🧀',
  'queso crema': '🧀',
  'queso': '🧀',
  'huevo': '🥚',
  'huevos': '🥚',
  'leche': '🥛',
  'yogur': '🥛',
  'mantequilla': '🧈',
  'nata': '🥛',

  // Carnicería
  'pollo': '🍗',
  'pavo': '🍗',
  'ternera': '🥩',
  'cerdo': '🥩',
  'carne': '🥩',

  // Charcutería y Embutidos
  'fuet': '🥓',
  'jamón': '🥓',
  'jamon': '🥓',
  'bacon': '🥓',
  'panceta': '🥓',
  'salchicha': '🌭',
  'chorizo': '🌭',
  'salchichón': '🥓',
  'salchichon': '🥓',
  'mortadela': '🥓',
  'lomo embuchado': '🥓',
  'cecina': '🥓',
  'salami': '🥓',
  'sobrasada': '🥓',
  'paté': '🥫',
  'pate': '🥫',

  // Pescadería
  'pescado': '🐟',
  'atún': '🐟',
  'atun': '🐟',
  'salmón': '🐟',
  'salmon': '🐟',
  'sardina': '🐟',
  'dorada': '🐟',
  'lubina': '🐟',
  'bacalao': '🐟',
  'gamba': '🍤',
  'langostino': '🍤',
  'pulpo': '🐙',
  'calamar': '🦑',
  'mejillón': '🦪',
  'mejillon': '🦪',
  'almeja': '🦪',

  // Panadería y Bollería
  'pan burger': '🍔',
  'burger': '🍔',
  'pan de molde': '🍞',
  'pan': '🍞',
  'croissant': '🥐',
  'croissants': '🥐',
  'magdalena': '🧁',
  'magdalenas': '🧁',
  'donut': '🍩',
  'donuts': '🍩',
  'baguette': '🥖',
  'barra de pan': '🥖',
  'bizcocho': '🥮',
  'brioche': '🍞',
  'empanada': '🥟',

  // Pastas, Arroces, Harinas y Legumbres
  'spatze': '🍝',
  'spaetzle': '🍝',
  'spätzle': '🍝',
  'espagueti': '🍝',
  'macarrón': '🍝',
  'macarron': '🍝',
  'fideos': '🍝',
  'pasta': '🍝',
  'harina': '🌾',
  'arroz': '🍚',
  'avena': '🌾',
  'quinoa': '🌾',
  'lentejas': '🫘',
  'garbanzos': '🫘',
  'alubias': '🫘',
  'judías': '🫘',
  'judias': '🫘',
  'guisantes': '🫛',

  // Bebidas
  'café': '☕',
  'cafe': '☕',
  'té': '🍵',
  'te': '🍵',
  'cerveza': '🍺',
  'vino': '🍷',
  'refresco': '🥤',
  'agua': '💧',

  // Frutos secos
  'nuez': '🥜',
  'almendra': '🥜',
  'cacahuete': '🥜',
  'avellana': '🥜',
}

export function getIngredientEmoji(name: string, category: string): string {
  const normalized = name.toLowerCase().trim()
  const unaccented = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  for (const [keyword, emoji] of Object.entries(INGREDIENT_EMOJI_MAP)) {
    const kNorm = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // Para palabras cortas (< 4 letras sin espacio, como 'sal', 'pan', 'te') requerimos límite de palabra (\b) para no confundir 'sal' con 'salsa'
    if (kNorm.length < 4 && !kNorm.includes(' ')) {
      const rx = new RegExp(`\\b${kNorm}\\b`, 'i')
      if (rx.test(normalized) || rx.test(unaccented)) {
        return emoji
      }
    } else {
      if (normalized.includes(keyword) || unaccented.includes(kNorm)) {
        return emoji
      }
    }
  }

  const cat = category as ShoppingCategory
  return CATEGORY_LABELS[cat]?.emoji ?? '🛒'
}

// ── Categorization ─────────────────────────────────────────────

const CATEGORY_MAP: [ShoppingCategory, string[]][] = [
  ['congelados', ['helado', 'helados', 'congelado', 'congelada', 'congelados', 'congeladas', 'hielo', 'cubitos de hielo']],
  ['limpieza-hogar', ['detergente', 'suavizante', 'lavavajillas', 'friegaplatos', 'estropajo', 'bayeta', 'esponja', 'lejía', 'lejia', 'fregasuelos', 'desengrasante', 'multiusos', 'bolsas de basura', 'bolsa de basura', 'papel higiénico', 'papel higienico', 'papel de cocina', 'servilletas', 'papel de aluminio', 'papel albal', 'albal', 'film transparente', 'papel film', 'papel de horno', 'papel vegetal', 'insecticida', 'ambientador', 'fregona', 'escoba', 'pastillas lavavajillas', 'pastillas lavavajilla', 'limpiacristales', 'limpieza']],
  ['higiene-cuidado', ['gel de ducha', 'gel de bano', 'gel de baño', 'champú', 'champu', 'acondicionador', 'mascarilla pelo', 'jabón de manos', 'jabon de manos', 'jabón', 'jabon', 'pasta de dientes', 'dentífrico', 'dentifrico', 'cepillo de dientes', 'desodorante', 'cuchilla de afeitar', 'cuchillas', 'espuma de afeitar', 'crema hidratante', 'crema solar', 'protector solar', 'toallitas húmedas', 'toallitas humedas', 'pañuelos', 'panuelos', 'compresas', 'tampones', 'disco desmaquillante', 'algodón', 'algodon', 'colonia', 'perfume', 'enjuague bucal', 'hilo dental']],
  ['mascotas', ['comida de perro', 'comida perro', 'comida de gato', 'comida gato', 'pienso', 'arena de gato', 'arena para gato', 'latas perro', 'latas gato', 'premios perro', 'premios gato', 'snack perro', 'snack gato', 'champu perro', 'champú perro', 'correa perro', 'mascota', 'mascotas']],
  ['bebes-infantil', ['pañal', 'pañales', 'panal', 'panales', 'toallitas de bebe', 'toallitas bebe', 'toallitas de bebé', 'toallitas bebé', 'potito', 'potitos', 'papilla', 'leche de formula', 'leche infantil', 'biberón', 'biberon', 'chupete', 'cereales bebe']],
  ['snacks-dulces', ['patatas fritas', 'chips', 'nachos', 'palomitas', 'doritos', 'pretzel', 'aperitivos', 'cortezas', 'gusanitos', 'frutos secos', 'almendra', 'almendras', 'nuez', 'nueces', 'avellana', 'avellanas', 'cacahuete', 'cacahuetes', 'pistacho', 'pistachos', 'pipas', 'anacardo', 'anacardos', 'castaña', 'castañas', 'chuches', 'gominolas', 'caramelo', 'caramelos', 'chicle', 'chicles', 'nubes', 'bombones', 'turrón', 'turron', 'nutella', 'nocilla', 'chocolate', 'cacao', 'galletas', 'cookies']],
  ['despensa', ['aceite', 'aceituna', 'aceitunas', 'oliva', 'olivas', 'azúcar', 'azucar', 'vinagre', 'salsa', 'ketchup', 'kétchup', 'mostaza', 'mayonesa', 'mahonesa', 'soja', 'caldo', 'tomate frito', 'tomate triturado', 'conserva', 'lata', 'miel', 'mermelada', 'confitura', 'sirope', 'alioli', 'tabasco', 'pesto', 'atún en lata', 'atun en lata', 'pepinillos', 'alcaparras']],
  ['charcuteria', ['jamón', 'jamon', 'bacon', 'panceta', 'chorizo', 'salchicha', 'salchichas', 'fuet', 'fiambre', 'salchichón', 'salchichon', 'mortadela', 'lomo embuchado', 'cecina', 'sobrasada', 'chistorra', 'morcilla', 'salami', 'pate', 'paté', 'butifarra']],
  ['carniceria', ['pollo', 'pavo', 'pechuga', 'muslo', 'muslos', 'ternera', 'cerdo', 'carne', 'filete', 'filetes', 'lomo', 'buey', 'cordero', 'chuletón', 'chuleton', 'chuleta', 'chuletas', 'hamburguesa', 'hamburguesas', 'alita', 'alitas', 'costilla', 'costillas', 'solomillo', 'carne picada', 'picada', 'conejo', 'secreto', 'presa', 'pluma']],
  ['pescaderia', ['pescado', 'merluza', 'bacalao', 'atún', 'atun', 'salmón', 'salmon', 'sardina', 'sardinas', 'dorada', 'lubina', 'gamba', 'gambas', 'langostino', 'langostinos', 'pulpo', 'calamar', 'calamares', 'mejillón', 'mejillon', 'mejillones', 'almeja', 'almejas', 'marisco', 'anchoa', 'anchoas', 'boquerón', 'boqueron', 'boquerones', 'trucha', 'rape', 'emperador', 'pez espada', 'sepia', 'chocos', 'chipirones', 'berberechos', 'navajas', 'buey de mar', 'centollo']],
  ['panaderia', ['pan', 'pan de molde', 'croissant', 'croissants', 'magdalena', 'magdalenas', 'bizcocho', 'bollo', 'bollos', 'ensaimada', 'ensaimadas', 'donut', 'donuts', 'brioche', 'pan rallado', 'hogaza', 'picos', 'colines', 'tostadas', 'biscotes', 'muffins', 'empanada', 'hojaldre', 'masa de pizza', 'masa hojaldre', 'masa quebrada', 'pan burger', 'pan de hamburguesa', 'panecillo', 'panecillos', 'baguette', 'barra de pan', 'tortillas de trigo', 'tortillas de maiz']],
  ['cereales-pan', ['harina', 'harina de fuerza', 'harina integral', 'maizena', 'pasta', 'espagueti', 'espaguetis', 'macarrón', 'macarron', 'macarrones', 'fideos', 'lasaña', 'lasana', 'canelones', 'tallarines', 'raviolis', 'tortellini', 'arroz', 'avena', 'cereales', 'quinoa', 'cuscús', 'cuscus', 'cous-cous', 'spatze', 'spaetzle', 'spätzle', 'lentejas', 'garbanzos', 'alubias', 'judías secas', 'judias secas', 'levadura']],
  ['lacteos', ['leche', 'queso', 'philadelphia', 'yogur', 'yogurt', 'mantequilla', 'nata', 'crema', 'creme fraiche', 'crème fraîche', 'crema agria', 'sour cream', 'mascarpone', 'burrata', 'ricotta', 'mozzarella', 'parmesano', 'cheddar', 'feta', 'kéfir', 'kefir', 'huevo', 'huevos', 'cuajada', 'requesón', 'requeson', 'bechamel', 'margarina']],
  ['bebidas', ['agua', 'agua mineral', 'agua con gas', 'zumo', 'jugo', 'refresco', 'coca-cola', 'cocacola', 'fanta', 'sprite', 'tónica', 'tonica', 'cerveza', 'vino', 'cava', 'champán', 'champan', 'sidra', 'leche vegetal', 'bebida de soja', 'bebida de avena', 'bebida de almendra', 'café', 'cafe', 'té', 'te', 'infusión', 'infusion', 'manzanilla', 'poleo', 'alcohol', 'ron', 'ginebra', 'vodka', 'whisky', 'licor', 'vermut']],
  ['especias-condimentos', ['sal', 'pimienta', 'canela', 'comino', 'pimentón', 'pimenton', 'curry', 'cúrcuma', 'curcuma', 'nuez moscada', 'clavo', 'azafrán', 'azafran', 'cardamomo', 'orégano', 'oregano', 'laurel', 'tomillo', 'romero', 'eneldo', 'albahaca', 'perejil', 'cilantro', 'hierbabuena', 'menta', 'estragón', 'estragon', 'hierbas', 'hierba', 'vainilla', 'páprika', 'paprika', 'cayena', 'guindilla', 'chile', 'sazonador', 'anís', 'anis', 'jengibre']],
  ['frutas-verduras', ['tomate', 'tomates', 'cebolla', 'cebollas', 'ajo', 'ajos', 'zanahoria', 'zanahorias', 'patata', 'patatas', 'papa', 'papas', 'lechuga', 'espinaca', 'espinacas', 'pimiento', 'pimientos', 'brócoli', 'brocoli', 'calabacín', 'calabacin', 'berenjena', 'berenjenas', 'champiñón', 'champinon', 'champiñones', 'seta', 'setas', 'puerro', 'puerros', 'apio', 'pepino', 'pepinos', 'manzana', 'manzanas', 'naranja', 'naranjas', 'limón', 'limon', 'limones', 'lima', 'limas', 'plátano', 'platano', 'plátanos', 'fresa', 'fresas', 'aguacate', 'aguacates', 'verdura', 'fruta', 'kiwi', 'kiwis', 'pera', 'peras', 'melocotón', 'melocoton', 'sandía', 'sandia', 'melón', 'melon', 'uva', 'uvas', 'cereza', 'cerezas', 'mango', 'piña', 'pina', 'mandarina', 'mandarinas', 'calabaza', 'espárrago', 'esparrago', 'espárragos', 'esparragos', 'alcachofa', 'alcachofas', 'judías verdes', 'judias verdes', 'judía verde', 'acelga', 'acelgas', 'coliflor', 'repollo', 'col', 'lombarda', 'rábano', 'rabano', 'jengibre fresco', 'arándanos', 'arandanos', 'frambuesas', 'moras']],
]

/**
 * Heuristically classifies an ingredient name into a shopping category
 * (frutas-verduras, panaderia, carniceria, charcuteria, pescaderia, lacteos,
 * cereales-pan, especias-condimentos, despensa, snacks-dulces, bebidas,
 * congelados, limpieza-hogar, higiene-cuidado, mascotas, bebes-infantil,
 * or 'otros' as fallback).
 *
 * The function is keyword-based and intentionally conservative: dry/ground
 * spices, powders, extracts and colorings always go to `especias-condimentos`,
 * and unknown items fall through to `otros`.
 *
 * @param name - Free-text ingredient name.
 * @returns The best-guess category.
 */
export function categorize(name: string): ShoppingCategory {
  const n = name.toLowerCase()
  const nClean = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // Especias en polvo, molidas, extractos y sazonadores van a especias-condimentos
  if (
    nClean.includes('en polvo') ||
    nClean.includes('molido') ||
    nClean.includes('molida') ||
    nClean.includes('extracto') ||
    nClean.includes('colorante') ||
    nClean.includes('sazonador')
  ) {
    return 'especias-condimentos'
  }

  for (const [cat, keywords] of CATEGORY_MAP) {
    if (keywords.some((k) => {
      const kClean = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (kClean.length <= 4 && !kClean.includes(' ')) {
        const rx = new RegExp(`\\b${kClean}(?:s|es)?\\b`, 'i')
        return rx.test(nClean)
      }
      return nClean.includes(kClean)
    })) {
      return cat
    }
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

const UNIT_TOKENS = [
  'botellas?',
  'paquetes?',
  'unidades?',
  'gramos?',
  'litros?',
  'bricks?',
  'docenas?',
  'manojos?',
  'sobres?',
  'botes?',
  'latas?',
  'kilos?',
  'bolsas?',
  'tarrinas?',
  'uds?',
  'kg',
  'gr?',
  'ml',
  'l',
]

function normalizeUnit(rawUnit: string | null): string | null {
  if (!rawUnit) return null
  const u = rawUnit.toLowerCase().trim()
  if (/^kilos?$/i.test(u) || u === 'kg') return 'kg'
  if (/^litros?$/i.test(u) || u === 'l') return 'l'
  if (/^(?:gramos?|gr?)$/i.test(u)) return 'g'
  if (/^ml$/i.test(u)) return 'ml'
  if (/^latas?$/i.test(u)) return 'lata'
  if (/^botes?$/i.test(u)) return 'bote'
  if (/^botellas?$/i.test(u)) return 'botella'
  if (/^bricks?$/i.test(u)) return 'brick'
  if (/^paquetes?$/i.test(u)) return 'paquete'
  if (/^docenas?$/i.test(u)) return 'docena'
  if (/^sobres?$/i.test(u)) return 'sobre'
  if (/^manojos?$/i.test(u)) return 'manojo'
  if (/^bolsas?$/i.test(u)) return 'bolsa'
  if (/^tarrinas?$/i.test(u)) return 'tarrina'
  if (/^(?:unidades?|uds?)$/i.test(u)) return 'ud'
  return u
}

function parseQtyNumber(rawQty: string): number | null {
  if (!rawQty) return null
  if (rawQty.includes('/')) {
    const [num, den] = rawQty.split('/').map(Number)
    if (den && !isNaN(num) && !isNaN(den)) {
      return Math.round((num / den) * 100) / 100
    }
  }
  const parsed = parseFloat(rawQty.replace(',', '.'))
  return isNaN(parsed) ? null : parsed
}

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

  const unitWords = `(?:${UNIT_TOKENS.join('|')})\\b`
  const qtyPattern = '(\\d+\\/\\d+|\\d+(?:[.,]\\d+)?)'

  // Pattern 1: Leading quantity (e.g., "1kg platanos", "2 bricks de leche", "3 latas de atun", "1/2 kg patatas")
  const leadingMatch = clean.match(new RegExp(`^${qtyPattern}\\s*(${unitWords})?\\s*(?:de\\s+)?(.*)$`, 'i'))
  if (leadingMatch && leadingMatch[3]?.trim()) {
    const qty = parseQtyNumber(leadingMatch[1])
    const rawUnit = normalizeUnit(leadingMatch[2] || null)
    let name = leadingMatch[3].trim().replace(/^de\s+/i, '')
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      quantity: qty,
      unit: rawUnit,
      category: categorize(name),
    }
  }

  // Pattern 2: Trailing quantity (e.g., "Platanos 1kg", "Leche 2 l", "Tomates 500g", "Huevos 12")
  const trailingMatch = clean.match(new RegExp(`^(.*?)(?:\\s+|-|:)\\s*${qtyPattern}\\s*(${unitWords})?$`, 'i'))
  if (trailingMatch && trailingMatch[1]?.trim()) {
    const name = trailingMatch[1].trim()
    const qty = parseQtyNumber(trailingMatch[2])
    const rawUnit = normalizeUnit(trailingMatch[3] || null)
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      quantity: qty,
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
