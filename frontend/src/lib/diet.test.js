import { describe, it, expect } from 'vitest'
import {
  isDietDay,
  readDietItem,
  readDietMeal,
  newDietMealId,
  newDietItemId,
  mealsOf,
  withDietMeal,
  withDietMealItem,
  withoutDietMealItem,
  isDietItemChecked,
  withDietItemChecked,
  withMealChecked,
  dietDay,
  buildStarterDietMap,
} from './diet.js'

describe('diet domain logic', () => {
  it('validates calendar days', () => {
    expect(isDietDay('2026-10-10')).toBe(true)
    expect(isDietDay('2026-02-29')).toBe(true)
    expect(isDietDay('2026-1-1')).toBe(false)
    expect(isDietDay('')).toBe(false)
    expect(isDietDay(null)).toBe(false)
  })

  it('generates unique IDs', () => {
    const mId = newDietMealId(1000, () => 0.5)
    expect(mId.startsWith('m')).toBe(true)
    const iId = newDietItemId(1000, () => 0.5)
    expect(iId.startsWith('di')).toBe(true)
  })

  it('reads and cleans diet items', () => {
    expect(readDietItem(null)).toBeNull()
    expect(readDietItem({})).toBeNull()
    expect(readDietItem({ name: '   ' })).toBeNull()

    const item = readDietItem({
      id: 'custom_id',
      name: '  Whey Protein  ',
      qty: ' 1 dose ',
      cals: '120.5',
      p: '24',
      c: 3,
      f: -10, // clamped to 0
    })
    expect(item).toEqual({
      id: 'custom_id',
      name: 'Whey Protein',
      qty: '1 dose',
      cals: 120.5,
      p: 24,
      c: 3,
      f: 0,
    })
  })

  it('reads and cleans diet meals', () => {
    expect(readDietMeal(null)).toBeNull()
    expect(readDietMeal({})).toBeNull()
    expect(readDietMeal({ title: '' })).toBeNull()

    const meal = readDietMeal({
      title: '  Almoço  ',
      time: '12:30',
      optional: true,
      note: '  Sem sal  ',
      items: [
        { name: 'Arroz', qty: '100g', cals: 130, p: 2.5, c: 28, f: 0.3 },
        { name: '' }, // invalid item ignored
      ],
    })
    expect(meal.title).toBe('Almoço')
    expect(meal.time).toBe('12:30')
    expect(meal.optional).toBe(true)
    expect(meal.note).toBe('Sem sal')
    expect(meal.items.length).toBe(1)
    expect(meal.items[0].name).toBe('Arroz')
  })

  it('orders meals by time then title', () => {
    const S = {
      dietMeals: {
        m3: { title: 'Jantar', time: '20:00', items: [] },
        m1: { title: 'Manhã', time: '08:00', items: [] },
        m2: { title: 'Almoço', time: '13:00', items: [] },
        m4: { title: 'Lanche sem hora', items: [] },
      },
    }
    const list = mealsOf(S)
    expect(list.map(m => m.id)).toEqual(['m1', 'm2', 'm3', 'm4'])
  })

  it('updates and removes meals with stamps', () => {
    let map = {}
    map = withDietMeal(map, 'm1', { title: 'Café', time: '08:00' }, 100)
    expect(map.m1.title).toBe('Café')
    expect(map.m1._ts).toBe(100)

    // Clear meal (removal stamp)
    map = withDietMeal(map, 'm1', null, 200)
    expect(map.m1).toEqual({ _ts: 200 })
    expect(mealsOf({ dietMeals: map })).toHaveLength(0)
  })

  it('adds, updates, and removes items inside a meal', () => {
    let map = {
      m1: { title: 'Café', time: '08:00', items: [{ id: 'it1', name: 'Ovos', qty: '2 un', cals: 140, p: 12, c: 1, f: 10 }] },
    }

    // Add new item
    map = withDietMealItem(map, 'm1', { id: 'it2', name: 'Pão', qty: '1 fatia', cals: 70, p: 2, c: 14, f: 1 }, 150)
    expect(map.m1.items).toHaveLength(2)
    expect(map.m1._ts).toBe(150)

    // Update existing item
    map = withDietMealItem(map, 'm1', { id: 'it1', name: 'Ovos mexidos', qty: '3 un', cals: 210, p: 18, c: 1.5, f: 15 }, 160)
    expect(map.m1.items[0].name).toBe('Ovos mexidos')
    expect(map.m1.items[0].qty).toBe('3 un')

    // Remove item
    map = withoutDietMealItem(map, 'm1', 'it2', 170)
    expect(map.m1.items).toHaveLength(1)
    expect(map.m1.items[0].id).toBe('it1')
  })

  it('tracks checked items, meal-level ticking, adherence and macros for a date', () => {
    const meal1 = {
      id: 'm1',
      title: 'Café',
      time: '08:00',
      items: [
        { id: 'it1', name: 'Ovo', qty: '2', cals: 140, p: 12, c: 1, f: 10 },
        { id: 'it2', name: 'Pão', qty: '1', cals: 70, p: 2, c: 14, f: 1 },
      ],
    }
    const S = {
      dietMeals: { m1: meal1 },
      dietLog: {},
    }

    // Day with 0 checked items
    let day = dietDay(S, '2026-10-10')
    expect(day.totalItems).toBe(2)
    expect(day.checkedItems).toBe(0)
    expect(day.pct).toBe(0)
    expect(day.planned.cals).toBe(210)
    expect(day.planned.p).toBe(14)
    expect(day.consumed.cals).toBe(0)

    // Check item 1
    S.dietLog = withDietItemChecked(S.dietLog, '2026-10-10', 'it1', true, 100)
    expect(isDietItemChecked(S, '2026-10-10', 'it1')).toBe(true)
    expect(isDietItemChecked(S, '2026-10-10', 'it2')).toBe(false)

    day = dietDay(S, '2026-10-10')
    expect(day.checkedItems).toBe(1)
    expect(day.pct).toBe(50)
    expect(day.consumed.cals).toBe(140)
    expect(day.consumed.p).toBe(12)

    // Check entire meal at once
    S.dietLog = withMealChecked(S.dietLog, '2026-10-10', meal1, true, 200)
    day = dietDay(S, '2026-10-10')
    expect(day.checkedItems).toBe(2)
    expect(day.pct).toBe(100)
    expect(day.meals[0].allChecked).toBe(true)
    expect(day.consumed.cals).toBe(210)

    // Uncheck item 1
    S.dietLog = withDietItemChecked(S.dietLog, '2026-10-10', 'it1', false, 300)
    day = dietDay(S, '2026-10-10')
    expect(day.checkedItems).toBe(1)
    expect(day.pct).toBe(50)
    expect(day.meals[0].allChecked).toBe(false)
  })

  it('builds starter diet map correctly', () => {
    const starter = buildStarterDietMap(500)
    const mealKeys = Object.keys(starter)
    expect(mealKeys.length).toBeGreaterThan(3)
    const firstMeal = starter[mealKeys[0]]
    expect(firstMeal.title).toBeDefined()
    expect(firstMeal.items.length).toBeGreaterThan(0)
    expect(firstMeal._ts).toBe(500)
  })
})
