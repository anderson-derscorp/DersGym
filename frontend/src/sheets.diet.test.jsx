// @vitest-environment happy-dom
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { dietSheet } from './sheets.jsx'
import { withDietMeal, withDietItemChecked } from './lib/diet.js'

const mounted = []

function renderTop() {
  const sheet = useUI.getState().sheets.at(-1)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
  return host
}

const setS = (over = {}) =>
  useStore.setState(s => ({
    S: { ...s.S, dietMeals: {}, dietLog: {}, workouts: [], ...over },
    user: null,
  }))

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useUI.setState({ sheets: [], toastMsg: '' })
  document.body.innerHTML = ''
})

afterEach(() => {
  act(() => {
    mounted.splice(0).forEach(r => r.unmount())
  })
})

describe('DietSheet', () => {
  it('renders empty diet view when no meals exist', () => {
    setS()
    dietSheet('2026-10-10')
    const host = renderTop()

    expect(host.querySelector('h3').textContent).toBe('Diet')
    expect(host.textContent).toContain('No diet plan configured yet.')
    expect(host.textContent).toContain('Load starter plan')
  })

  it('renders meals, checks items, and displays macros', () => {
    const meal = {
      title: '10h30 - Manhã',
      time: '10:30',
      optional: false,
      items: [
        { id: 'it1', name: 'Whey Protein', qty: '1 dose', cals: 140, p: 24, c: 4, f: 2 },
      ],
    }
    const dietMeals = withDietMeal({}, 'm1', meal, 100)
    const dietLog = withDietItemChecked({}, '2026-10-10', 'it1', true, 200)

    setS({ dietMeals, dietLog })
    dietSheet('2026-10-10')
    const host = renderTop()

    expect(host.textContent).toContain('10h30 - Manhã')
    expect(host.textContent).toContain('Whey Protein')
    expect(host.textContent).toContain('140')
    expect(host.textContent).toContain('100%')
  })

  it('can enter edit mode and click load starter plan', () => {
    setS()
    dietSheet('2026-10-10')
    const host = renderTop()

    const buttons = Array.from(host.querySelectorAll('button'))
    const editBtn = buttons.find(b => b.textContent.includes('Edit'))
    expect(editBtn).toBeDefined()
    act(() => {
      editBtn.click()
    })

    expect(host.textContent).toContain('Done')
    expect(host.textContent).toContain('Add meal')
  })
})
