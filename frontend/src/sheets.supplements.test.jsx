// @vitest-environment happy-dom
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { supplementsSheet } from './sheets.jsx'
import { withSupp, withTaken } from './lib/supplements.js'

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

const setS = (over = {}) => useStore.setState(s => ({
  S: { ...s.S, supplements: {}, suppLog: {}, ...over },
  user: null,
}))

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useUI.setState({ sheets: [], toastMsg: '' })
  document.body.innerHTML = ''
})

afterEach(() => {
  act(() => { mounted.splice(0).forEach(r => r.unmount()) })
})

describe('SupplementsSheet', () => {
  it('renders empty state when no supplements configured', () => {
    setS()
    supplementsSheet('2026-10-10')
    const host = renderTop()
    expect(host.querySelector('h3').textContent).toBe('Supplements')
    expect(host.textContent).toContain('No supplements added yet.')
  })

  it('renders supplements list and toggles taken status', () => {
    let supplements = withSupp({}, 's1', { name: 'Creatine', dose: '5 g', time: '08:00' })
    supplements = withSupp(supplements, 's2', { name: 'Vitamin D' })
    setS({ supplements })

    supplementsSheet('2026-10-10')
    const host = renderTop()

    const items = host.querySelectorAll('.list .item')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toContain('Creatine')
    expect(items[0].textContent).toContain('5 g')
    expect(items[0].textContent).toContain('08:00')

    // Click checkbox of the first item
    const checkBtn = items[0].querySelector('button')
    act(() => { checkBtn.click() })

    // Check store updated
    const S = useStore.getState().S
    expect(S.suppLog['2026-10-10|s1']).toMatchObject({ on: 1 })
  })

  it('can open add form and save a new supplement', () => {
    setS()
    supplementsSheet('2026-10-10')
    const host = renderTop()

    // Click "Add supplement"
    const addBtn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Add supplement'))
    act(() => { addBtn.click() })

    expect(host.textContent).toContain('Supplement name')

    // Fill inputs
    const inputs = host.querySelectorAll('input')
    act(() => {
      inputs[0].value = 'Omega 3'
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }))
      inputs[0].dispatchEvent(new Event('change', { bubbles: true }))

      inputs[1].value = '1000 mg'
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }))
      inputs[1].dispatchEvent(new Event('change', { bubbles: true }))
    })

    const saveBtn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Save'))
    act(() => { saveBtn.click() })

    const S = useStore.getState().S
    const supps = Object.values(S.supplements).filter(s => s.name)
    expect(supps).toHaveLength(1)
    expect(supps[0].name).toBe('Omega 3')
    expect(supps[0].dose).toBe('1000 mg')
  })
})
