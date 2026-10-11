// Diet: meals and meal items with nutrition macros (protein, carbs, fat, calories),
// and a daily log of checked items for any calendar date.
//
// Stored as two stamped maps, merged across devices key by key (lib/sync-merge.js STAMPED_MAPS):
//   S.dietMeals = { 'm1a2b': { title: '10h30 - Manhã', time: '10:30', optional: false, items: [...], _ts }, … }
//   S.dietLog   = { '2026-10-10|di1a2b': { on: 1, _ts }, … }
//
// Each entry carries its edit time. Removals are stamped empty entries (`{ _ts }`) so
// the removal survives sync across offline devices.

export const MEAL_TITLE_MAX = 50
export const MEAL_NOTE_MAX = 200
export const ITEM_NAME_MAX = 60
export const ITEM_QTY_MAX = 40

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const ISO = /^\d{4}-\d{2}-\d{2}$/
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export const isDietDay = iso => ISO.test(String(iso || ''))

export const newDietMealId = (now = Date.now(), rnd = Math.random) =>
  'm' + now.toString(36) + Math.floor(rnd() * 1296).toString(36).padStart(2, '0')

export const newDietItemId = (now = Date.now(), rnd = Math.random) =>
  'di' + now.toString(36) + Math.floor(rnd() * 1296).toString(36).padStart(2, '0')

const clampNum = (val, max = 99999) => {
  const n = Number(val)
  if (isNaN(n) || n < 0) return 0
  return Math.min(Math.round(n * 10) / 10, max)
}

/** Validates and cleans a diet item. Returns null if invalid or missing name. */
export function readDietItem(raw) {
  if (!isMap(raw)) return null
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, ITEM_NAME_MAX) : ''
  if (!name) return null
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : newDietItemId()
  const qty = typeof raw.qty === 'string' ? raw.qty.trim().slice(0, ITEM_QTY_MAX) : ''
  const cals = clampNum(raw.cals ?? raw.calories)
  const p = clampNum(raw.p ?? raw.protein)
  const c = clampNum(raw.c ?? raw.carbs)
  const f = clampNum(raw.f ?? raw.fat)
  return { id, name, qty, cals, p, c, f }
}

/** Validates and cleans a diet meal. Returns null if cleared or missing title. */
export function readDietMeal(entry) {
  if (!isMap(entry)) return null
  const title = typeof entry.title === 'string' ? entry.title.trim().slice(0, MEAL_TITLE_MAX) : ''
  if (!title) return null
  const time = typeof entry.time === 'string' && (HHMM.test(entry.time) || entry.time.length <= 12) ? entry.time.trim() : ''
  const optional = Boolean(entry.optional || entry.isOptional)
  const note = typeof entry.note === 'string' ? entry.note.trim().slice(0, MEAL_NOTE_MAX) : ''
  const items = Array.isArray(entry.items)
    ? entry.items.map(readDietItem).filter(Boolean)
    : []
  return { title, time, optional, note, items }
}

/** Returns all active meals from S.dietMeals, ordered by time then title. */
export function mealsOf(S) {
  const map = isMap(S?.dietMeals) ? S.dietMeals : {}
  return Object.entries(map)
    .map(([id, e]) => {
      const m = readDietMeal(e)
      return m ? { id, ...m } : null
    })
    .filter(Boolean)
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99') || a.title.localeCompare(b.title))
}

/** Stamped update for a meal in S.dietMeals. Pass empty/null fields to mark as removed. */
export function withDietMeal(map, id, fields, now = Date.now()) {
  const clean = readDietMeal(fields)
  const entry = clean
    ? {
        title: clean.title,
        ...(clean.time ? { time: clean.time } : {}),
        ...(clean.optional ? { optional: true } : {}),
        ...(clean.note ? { note: clean.note } : {}),
        items: clean.items,
        _ts: now,
      }
    : { _ts: now }
  return { ...(isMap(map) ? map : {}), [id]: entry }
}

/** Adds or updates an item within a meal. */
export function withDietMealItem(map, mealId, itemRaw, now = Date.now()) {
  const existing = isMap(map?.[mealId]) ? readDietMeal(map[mealId]) : null
  if (!existing) return map || {}
  const cleanItem = readDietItem(itemRaw)
  if (!cleanItem) return map

  const index = existing.items.findIndex(it => it.id === cleanItem.id)
  let updatedItems
  if (index >= 0) {
    updatedItems = [...existing.items]
    updatedItems[index] = cleanItem
  } else {
    updatedItems = [...existing.items, cleanItem]
  }

  return withDietMeal(map, mealId, { ...existing, items: updatedItems }, now)
}

/** Removes an item from a meal. */
export function withoutDietMealItem(map, mealId, itemId, now = Date.now()) {
  const existing = isMap(map?.[mealId]) ? readDietMeal(map[mealId]) : null
  if (!existing) return map || {}
  const updatedItems = existing.items.filter(it => it.id !== itemId)
  return withDietMeal(map, mealId, { ...existing, items: updatedItems }, now)
}

export const dietLogKey = (iso, itemId) => `${iso}|${itemId}`

/** Checks if a specific meal item is logged as consumed on `iso`. */
export const isDietItemChecked = (S, iso, itemId) => {
  const e = isMap(S?.dietLog) ? S.dietLog[dietLogKey(iso, itemId)] : null
  return isMap(e) && e.on === 1
}

/** Stamps an item as consumed or unconsumed for `iso`. */
export function withDietItemChecked(log, iso, itemId, on, now = Date.now()) {
  return {
    ...(isMap(log) ? log : {}),
    [dietLogKey(iso, itemId)]: on ? { on: 1, _ts: now } : { _ts: now },
  }
}

/** Checks or unchecks all items in a meal at once. */
export function withMealChecked(log, iso, meal, on, now = Date.now()) {
  let next = { ...(isMap(log) ? log : {}) }
  const items = meal?.items || []
  for (const it of items) {
    next[dietLogKey(iso, it.id)] = on ? { on: 1, _ts: now } : { _ts: now }
  }
  return next
}

/** Computes the day view with item statuses, adherence percentage and macro summaries. */
export function dietDay(S, iso) {
  const allMeals = mealsOf(S)
  let totalItems = 0
  let checkedItems = 0

  const planned = { cals: 0, p: 0, c: 0, f: 0 }
  const consumed = { cals: 0, p: 0, c: 0, f: 0 }

  const meals = allMeals.map(m => {
    const items = m.items.map(it => {
      const checked = isDietItemChecked(S, iso, it.id)
      totalItems++
      planned.cals += it.cals
      planned.p += it.p
      planned.c += it.c
      planned.f += it.f

      if (checked) {
        checkedItems++
        consumed.cals += it.cals
        consumed.p += it.p
        consumed.c += it.c
        consumed.f += it.f
      }
      return { ...it, checked }
    })

    const allChecked = items.length > 0 && items.every(it => it.checked)
    return { ...m, items, allChecked }
  })

  // Round macros to 1 decimal
  const roundMacros = m => ({
    cals: Math.round(m.cals),
    p: Math.round(m.p * 10) / 10,
    c: Math.round(m.c * 10) / 10,
    f: Math.round(m.f * 10) / 10,
  })

  return {
    meals,
    totalItems,
    checkedItems,
    pct: totalItems ? Math.round((checkedItems / totalItems) * 100) : null,
    planned: roundMacros(planned),
    consumed: roundMacros(consumed),
  }
}

/** Starter template from Anderson's workout/diet routine. */
export const STARTER_MEALS = [
  {
    title: '10h30 - Manhã',
    time: '10:30',
    optional: false,
    note: '',
    items: [
      { name: 'Whey + Leite desnatado ou água', qty: '1 dose', cals: 140, p: 24, c: 4, f: 2 },
    ],
  },
  {
    title: '15h00 - Almoço',
    time: '15:00',
    optional: false,
    note: '',
    items: [
      { name: 'Peito de frango grelhado', qty: '150g', cals: 240, p: 46, c: 0, f: 5 },
      { name: 'Arroz branco ou integral', qty: '150g', cals: 195, p: 4, c: 42, f: 0.5 },
      { name: 'Salada verde com azeite', qty: '1 prato', cals: 80, p: 2, c: 5, f: 6 },
    ],
  },
  {
    title: '17h30 - Lanche (Opcional)',
    time: '17:30',
    optional: true,
    note: 'Consumir se sentir fome entre almoço e pré-treino (1h antes).',
    items: [
      { name: 'Protein Crisp Bar', qty: '1 unidade', cals: 160, p: 13, c: 15, f: 5 },
    ],
  },
  {
    title: '22h20 - Pré-treino',
    time: '22:20',
    optional: false,
    note: '10 a 15 min antes do treino.',
    items: [
      { name: 'Abissal Shark Pro Pré-treino', qty: '1 dose', cals: 20, p: 0, c: 5, f: 0 },
    ],
  },
  {
    title: '01h00 - Jantar pós-treino',
    time: '01:00',
    optional: false,
    note: '',
    items: [
      { name: 'Frango desfiado ou ovos mexidos', qty: '120g / 3 ovos', cals: 210, p: 28, c: 1, f: 10 },
      { name: 'Arroz ou batata doce', qty: '120g', cals: 150, p: 3, c: 33, f: 0.5 },
      { name: 'Legumes cozidos', qty: '1 porção', cals: 60, p: 2, c: 12, f: 0.5 },
    ],
  },
]

/** Returns a stamped map initialized with starter meals. */
export function buildStarterDietMap(now = Date.now()) {
  const map = {}
  STARTER_MEALS.forEach((template, i) => {
    const mealId = newDietMealId(now + i)
    const items = template.items.map((it, j) => ({
      id: newDietItemId(now + i * 100 + j),
      ...it,
    }))
    map[mealId] = {
      title: template.title,
      time: template.time,
      optional: template.optional,
      note: template.note,
      items,
      _ts: now,
    }
  })
  return map
}
